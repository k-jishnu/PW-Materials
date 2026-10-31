// api/recognize.ts
// Vercel Serverless Function for secure server-side AI Vision processing (Gemini & OpenAI)
// Completely self-contained: no relative imports outside api/ to guarantee zero bundling or module resolution failures.

export class AIRecognitionError extends Error {
  statusCode: number;
  code: string;
  retryable: boolean;
  retryAfter?: number;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'AI_RECOGNITION_ERROR',
    retryable: boolean = false,
    retryAfter?: number
  ) {
    super(message);
    this.name = 'AIRecognitionError';
    this.statusCode = statusCode;
    this.code = code;
    this.retryable = retryable;
    this.retryAfter = retryAfter;
  }
}

export interface ExtractedLineItem {
  item_name: string;
  description?: string | null;
  quantity: number | null;
  unit: string;
  unit_price: number | null;
  tax_amount?: number | null;
  line_total: number | null;
  confidence_score: number;
}

export interface StructuredRecognitionResult {
  document_type: 'invoice' | 'receipt' | 'material_photo' | 'unknown';
  item_name: string;
  rate: number | null;
  vendor: string | null;
  quantity: number | null;
  gst_tax: number | null;
  company_ref: string | null;
  supplier_name: string | null;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  currency: string;
  subtotal: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  notes: string | null;
  line_items: ExtractedLineItem[];
  rawText?: string;
}

const OPENAI_VISION_SYSTEM_PROMPT = `You are a high-precision AI vision recognition engine for PW Materials, specialized in construction materials, supplies, and invoices.
Analyze the image and return strictly valid JSON matching the schema below.

1. DOCUMENT IDENTIFICATION:
- Distinguish a physical construction material photo from an invoice or receipt.
- Set "document_type" to "material_photo" when the image shows physical construction materials, tools, equipment, or building products.
- Set "document_type" to "invoice" or "receipt" when the image shows a bill, invoice, tax invoice, delivery note, or store receipt.
- Set "document_type" to "unknown" if unreadable or neither.

2. EXTRACTION RULES FOR PHYSICAL MATERIAL PHOTOS:
When the image is a photo of physical construction material, extract and return these exact fields:
- item_name: Identify the actual product name from visible labels, packaging, markings, and visual characteristics. Include all technically meaningful specifications: cable cross-section (e.g. 6.0 sq.mm), voltage rating, product series, material type, grade. Preserve technical specifications exactly as printed. If uncertain, provide a best-effort prediction for the user to edit.
- rate: Extract the unit price ONLY if explicitly printed on the product packaging, price tag, or label. If not visible, return null. NEVER invent, fabricate, estimate, or assume a price.
- vendor: CRITICAL - Identify the PRODUCT MANUFACTURER OR BRAND from visible packaging, product labels, printed cable markings, or logos (e.g. "GM", "Havells", "Schneider Electric"). This is the PRODUCT BRAND, NOT the shop where it was purchased. Return null if the brand is not clearly visible. Never use "PW" as a manufacturer.
- supplier_name: ALWAYS return null for material photos. The supplier who sold the item is NOT extractable from a product photo.
- quantity: Count visible items when clearly distinguishable. For cables and wires, return 1 unless multiple distinct rolls or coils are visible. Return null if uncountable or ambiguous.
- unit: Return the appropriate selling unit ("metres", "rolls", "bags", "pieces", "kg", "litres", default: "nos").
- gst_tax: Return null. Do not guess or calculate GST.
- company_ref: Return null.

3. EXTRACTION RULES FOR INVOICES & RECEIPTS:
When the image is an invoice or receipt, preserve full invoice recognition behavior:
- supplier_name: The vendor/seller/shop company name from the invoice header, or null.
- vendor: The manufacturer/brand of the primary product, or null.
- invoice_number: Invoice identifier or bill number, or null.
- invoice_date: Purchase date in YYYY-MM-DD format, or null.
- due_date: Payment due date in YYYY-MM-DD format, or null.
- currency: Currency code (default: "INR").
- subtotal: Subtotal before tax, or null.
- tax_amount: Total tax / GST amount, or null.
- total_amount: Grand total invoice amount, or null.
- gst_tax: Overall GST rate percentage (e.g. 18), or null.
- company_ref: Return null.
- line_items: Array of extracted line items.

IMPORTANT SAFEGUARDS:
- NEVER set company_ref, supplier_name, or vendor to "PW" for a material photo.
- Never fabricate prices, GST, vendor names, or quantities.
- Use actual extracted values where supported by evidence in the image.
- Use null for missing or uncertain values, NOT strings such as "Unknown", "N/A", or "Not found".
- Return valid JSON only without markdown formatting.
- For material_photo documents: supplier_name MUST always be null.
- For material_photo documents: company_ref MUST be null.`;

function cleanStringOrNull(val: any): string | null {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (['unknown', 'n/a', 'na', 'not found', 'none', 'null', 'undefined', '-', 'nil'].includes(lower)) {
    return null;
  }
  return trimmed;
}

function cleanNumberOrNull(val: any): number | null {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  if (isNaN(num)) return null;
  return num;
}

function validateAndNormalizeRecognition(rawJson: any): StructuredRecognitionResult {
  if (!rawJson || typeof rawJson !== 'object') {
    throw new Error('AI output is not a valid JSON object');
  }

  const document_type: 'invoice' | 'receipt' | 'material_photo' | 'unknown' =
    ['invoice', 'receipt', 'material_photo', 'unknown'].includes(rawJson.document_type)
      ? rawJson.document_type
      : (rawJson.invoice_number || (Array.isArray(rawJson.line_items) && rawJson.line_items.length > 1) ? 'invoice' : 'material_photo');

  const rawItemName = cleanStringOrNull(rawJson.item_name) ||
    (Array.isArray(rawJson.line_items) && rawJson.line_items[0] ? cleanStringOrNull(rawJson.line_items[0].item_name) : null);
  const item_name = rawItemName || (document_type === 'material_photo' ? 'Identified Material' : 'Invoice Item');

  const rate = cleanNumberOrNull(rawJson.rate !== undefined ? rawJson.rate : rawJson.line_items?.[0]?.unit_price);
  const rawVendor = document_type === 'material_photo'
    ? cleanStringOrNull(rawJson.vendor)
    : (cleanStringOrNull(rawJson.vendor) || cleanStringOrNull(rawJson.supplier_name));
  const vendor = (rawVendor && rawVendor.toUpperCase() === 'PW' && document_type === 'material_photo') ? null : rawVendor;
  const quantity = cleanNumberOrNull(rawJson.quantity !== undefined ? rawJson.quantity : rawJson.line_items?.[0]?.quantity);
  const gst_tax = cleanNumberOrNull(rawJson.gst_tax);
  const company_ref = cleanStringOrNull(rawJson.company_ref) || cleanStringOrNull(rawJson.company) || null;

  const supplier_name = document_type === 'material_photo'
    ? null
    : (cleanStringOrNull(rawJson.supplier_name) || cleanStringOrNull(rawJson.vendor));
  const invoice_number = cleanStringOrNull(rawJson.invoice_number);

  let invoice_date: string | null = null;
  if (typeof rawJson.invoice_date === 'string' && rawJson.invoice_date.trim()) {
    const d = new Date(rawJson.invoice_date.trim());
    if (!isNaN(d.getTime())) {
      invoice_date = d.toISOString().split('T')[0];
    }
  }

  let due_date: string | null = null;
  if (typeof rawJson.due_date === 'string' && rawJson.due_date.trim()) {
    const d = new Date(rawJson.due_date.trim());
    if (!isNaN(d.getTime())) {
      due_date = d.toISOString().split('T')[0];
    }
  }

  const currency = typeof rawJson.currency === 'string' && rawJson.currency.trim() ? rawJson.currency.trim() : 'INR';
  const subtotal = cleanNumberOrNull(rawJson.subtotal);
  const tax_amount = cleanNumberOrNull(rawJson.tax_amount);
  const total_amount = cleanNumberOrNull(rawJson.total_amount);
  const notes = cleanStringOrNull(rawJson.notes);

  const rawItems = Array.isArray(rawJson.line_items) ? rawJson.line_items : [];
  const line_items: ExtractedLineItem[] = [];

  for (const item of rawItems) {
    if (!item || typeof item !== 'object') continue;
    const item_name_clean = cleanStringOrNull(item.item_name) || 'Unspecified Material';
    const item_qty = cleanNumberOrNull(item.quantity);
    const rawUnit = typeof item.unit === 'string' && item.unit.trim() ? item.unit.trim() : null;
    const topLevelUnit = typeof rawJson.unit === 'string' && rawJson.unit.trim() ? rawJson.unit.trim() : null;
    const unit = rawUnit || topLevelUnit || 'nos';
    const item_rate = cleanNumberOrNull(item.unit_price);
    const item_tax = cleanNumberOrNull(item.tax_amount);
    const item_total = cleanNumberOrNull(item.line_total) ??
      (item_qty !== null && item_rate !== null ? item_qty * item_rate + (item_tax || 0) : null);

    const confidence_score = typeof item.confidence_score === 'number' && !isNaN(item.confidence_score)
      ? Math.min(1.0, Math.max(0.0, item.confidence_score))
      : 0.90;

    line_items.push({
      item_name: item_name_clean,
      description: cleanStringOrNull(item.description),
      quantity: item_qty,
      unit,
      unit_price: item_rate,
      tax_amount: item_tax,
      line_total: item_total,
      confidence_score,
    });
  }

  const topUnit = typeof rawJson.unit === 'string' && rawJson.unit.trim() ? rawJson.unit.trim() : 'nos';
  if (line_items.length === 0) {
    line_items.push({
      item_name,
      description: notes || null,
      quantity,
      unit: topUnit,
      unit_price: rate,
      tax_amount: tax_amount || null,
      line_total: total_amount || (rate !== null && quantity !== null ? rate * quantity : null),
      confidence_score: 0.88,
    });
  }

  return {
    document_type,
    item_name,
    rate,
    vendor,
    quantity,
    gst_tax,
    company_ref,
    supplier_name,
    invoice_number,
    invoice_date,
    due_date,
    currency,
    subtotal,
    tax_amount,
    total_amount,
    notes,
    line_items,
  };
}

async function executeOpenAIVision(imageBase64: string, apiKey: string, modelName: string = 'gpt-4o-mini'): Promise<StructuredRecognitionResult> {
  if (!apiKey || !apiKey.trim()) {
    throw new AIRecognitionError('OPENAI_API_KEY is not configured on the server.', 422, 'MISSING_API_KEY', false);
  }

  if (imageBase64.startsWith('data:application/pdf')) {
    throw new AIRecognitionError('OpenAI Vision does not support PDF documents directly. Please upload an image format or configure GEMINI_API_KEY.', 400, 'UNSUPPORTED_MEDIA_TYPE', false);
  }

  let formattedImageUrl = imageBase64;
  if (!formattedImageUrl.startsWith('data:')) {
    formattedImageUrl = `data:image/jpeg;base64,${formattedImageUrl}`;
  }

  const endpoint = 'https://api.openai.com/v1/chat/completions';
  const requestBody = {
    model: modelName.trim() || 'gpt-4o-mini',
    temperature: 0.1,
    max_tokens: 1500,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: OPENAI_VISION_SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Identify the construction material or invoice details from this image. Return valid JSON only.' },
          { type: 'image_url', image_url: { url: formattedImageUrl, detail: 'high' } },
        ],
      },
    ],
  };

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(40000),
    });
  } catch (netErr: any) {
    if (netErr.name === 'TimeoutError' || netErr.name === 'AbortError' || netErr.message?.includes('timeout')) {
      throw new AIRecognitionError('OpenAI Vision request timed out.', 504, 'TIMEOUT', true);
    }
    throw new AIRecognitionError(`OpenAI connection failed: ${netErr.message || 'Network error'}`, 503, 'UPSTREAM_UNAVAILABLE', true);
  }

  if (!response.ok) {
    let errBody = '';
    try {
      const errJson = await response.json();
      errBody = errJson.error?.message || JSON.stringify(errJson);
    } catch {
      errBody = await response.text();
    }
    const status = response.status;
    const retryAfter = parseInt(response.headers.get('retry-after') || '5', 10);
    if (status === 401 || status === 403) throw new AIRecognitionError('OpenAI API authentication failed.', 401, 'AUTH_FAILED', false);
    if (status === 429) throw new AIRecognitionError('OpenAI rate limit exceeded.', 429, 'RATE_LIMIT_EXCEEDED', true, retryAfter);
    if (status === 400) throw new AIRecognitionError(`OpenAI rejected input: ${errBody}`, 400, 'INVALID_INPUT', false);
    if (status >= 500) throw new AIRecognitionError('OpenAI service temporarily unavailable.', 502, 'UPSTREAM_UNAVAILABLE', true);
    throw new AIRecognitionError(`OpenAI Vision API error (${status}): ${errBody}`, status, 'AI_PROVIDER_ERROR', false);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new AIRecognitionError('OpenAI returned an empty response.', 502, 'AI_RESPONSE_PARSE_ERROR', true);

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch (e: any) {
    throw new AIRecognitionError(`Failed to parse OpenAI JSON response: ${e.message}`, 502, 'AI_RESPONSE_PARSE_ERROR', true);
  }

  const validated = validateAndNormalizeRecognition(parsed);
  validated.rawText = content;
  return validated;
}

async function executeGeminiVision(imageBase64: string, apiKey: string, modelName: string = 'gemini-3.5-flash'): Promise<StructuredRecognitionResult> {
  if (!apiKey || !apiKey.trim()) {
    throw new AIRecognitionError('GEMINI_API_KEY is not configured on the server.', 422, 'MISSING_API_KEY', false);
  }

  let mimeType = 'image/jpeg';
  let pureBase64 = imageBase64.trim();

  if (pureBase64.startsWith('data:')) {
    const match = pureBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      mimeType = match[1];
      pureBase64 = match[2];
    } else {
      pureBase64 = pureBase64.replace(/^data:[^;]+;base64,/, '');
    }
  }

  let primaryModel = modelName.trim().replace(/^models\//, '') || 'gemini-3.5-flash';
  const modelCandidates = [
    primaryModel,
    'gemini-3.5-flash-lite',
    'gemini-flash-lite-latest',
  ].filter((m, idx, arr) => arr.indexOf(m) === idx);

  const promptText = mimeType === 'application/pdf'
    ? `${OPENAI_VISION_SYSTEM_PROMPT}\n\nAnalyze this PDF invoice document and extract all available information into valid JSON matching the schema:`
    : `${OPENAI_VISION_SYSTEM_PROMPT}\n\nAnalyze this image and return the structured JSON data:`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: promptText },
          { inline_data: { mime_type: mimeType, data: pureBase64 } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      response_mime_type: 'application/json',
    },
  };

  let response: Response | null = null;
  let lastErr = '';
  let lastStatus = 500;
  let lastRetryAfter: number | undefined;

  for (const modelToTry of modelCandidates) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelToTry}:generateContent?key=${apiKey.trim()}`;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(35000),
      });

      if (response.ok) break;

      let errBody = '';
      try {
        const errJson = await response.json();
        errBody = errJson.error?.message || JSON.stringify(errJson);
      } catch {
        errBody = await response.text();
      }
      lastStatus = response.status;
      lastRetryAfter = parseInt(response.headers.get('retry-after') || '5', 10);
      lastErr = `Gemini Vision API error (${response.status}): ${errBody || response.statusText}`;

      if (response.status === 401 || response.status === 403) {
        throw new AIRecognitionError('Gemini API key is invalid or unauthorized.', 401, 'AUTH_FAILED', false);
      }
      if (response.status === 400) {
        throw new AIRecognitionError(`Invalid image content for Gemini Vision: ${errBody}`, 400, 'INVALID_INPUT', false);
      }
      if (response.status === 429) {
        throw new AIRecognitionError('Gemini API rate limit exceeded.', 429, 'RATE_LIMIT_EXCEEDED', true, lastRetryAfter);
      }
      if (response.status !== 503 && response.status !== 404) {
        throw new AIRecognitionError(lastErr, response.status, 'UPSTREAM_ERROR', false);
      }
    } catch (e: any) {
      if (e instanceof AIRecognitionError) throw e;
      lastErr = e.message || String(e);
      if (e.name === 'TimeoutError' || e.name === 'AbortError' || lastErr.includes('timeout')) {
        throw new AIRecognitionError('Gemini Vision request timed out.', 504, 'TIMEOUT', true);
      }
      if (!lastErr.includes('503') && !lastErr.includes('404')) {
        throw new AIRecognitionError(`Gemini connection error: ${lastErr}`, 503, 'UPSTREAM_UNAVAILABLE', true);
      }
    }
  }

  if (!response || !response.ok) {
    throw new AIRecognitionError(lastErr || 'Gemini Vision recognition failed.', lastStatus, 'UPSTREAM_UNAVAILABLE', true, lastRetryAfter);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new AIRecognitionError('Gemini returned an empty response.', 502, 'AI_RESPONSE_PARSE_ERROR', true);

  let cleaned = content.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e: any) {
    throw new AIRecognitionError(`Failed to parse Gemini JSON response: ${e.message}`, 502, 'AI_RESPONSE_PARSE_ERROR', true);
  }

  const validated = validateAndNormalizeRecognition(parsed);
  validated.rawText = cleaned;
  return validated;
}

async function getRequestBody(req: any): Promise<any> {
  if (!req) return {};
  if (typeof req.json === 'function' && !req.body) {
    try {
      return await req.json();
    } catch {
      return {};
    }
  }
  if (req.body) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch {
        return {};
      }
    }
    if (Buffer.isBuffer(req.body)) {
      try {
        return JSON.parse(req.body.toString('utf-8'));
      } catch {
        return {};
      }
    }
    if (typeof req.body === 'object') {
      return req.body;
    }
  }
  if (typeof req.on === 'function') {
    return new Promise((resolve) => {
      let raw = '';
      req.on('data', (chunk: any) => {
        raw += chunk;
      });
      req.on('end', () => {
        try {
          resolve(JSON.parse(raw || '{}'));
        } catch {
          resolve({});
        }
      });
      req.on('error', () => resolve({}));
    });
  }
  return {};
}

function sendResponse(res: any, statusCode: number, data: any) {
  if (res && typeof res.status === 'function') {
    if (typeof res.setHeader === 'function') {
      res.setHeader('Content-Type', 'application/json');
    }
    return res.status(statusCode).json(data);
  }
  return new Response(JSON.stringify(data), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default async function handler(req: any, res?: any) {
  const reqId = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const startTime = Date.now();

  const method = req?.method || (req instanceof Request ? req.method : 'POST');
  if (method !== 'POST') {
    return sendResponse(res, 405, {
      error: 'Method Not Allowed. Use POST.',
      code: 'METHOD_NOT_ALLOWED',
      retryable: false,
    });
  }

  try {
    const body = await getRequestBody(req);
    const { imageBase64 } = body || {};

    if (!imageBase64 || typeof imageBase64 !== 'string' || !imageBase64.trim()) {
      return sendResponse(res, 400, {
        error: 'Missing or empty imageBase64 payload in request body.',
        code: 'INVALID_INPUT',
        retryable: false,
      });
    }

    if (imageBase64.length > 14 * 1024 * 1024) {
      console.warn(`[AI Vision] [${reqId}] Image payload exceeds size limit: ${imageBase64.length} chars`);
      return sendResponse(res, 413, {
        error: 'Image payload exceeds the 10MB limit. Please upload a smaller or compressed photograph.',
        code: 'PAYLOAD_TOO_LARGE',
        retryable: false,
      });
    }

    let mimeType = 'image/jpeg';
    if (imageBase64.startsWith('data:')) {
      const match = imageBase64.match(/^data:([^;]+);base64,/);
      if (match) {
        mimeType = match[1].toLowerCase().trim();
      }
    }
    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (!supportedTypes.includes(mimeType)) {
      console.warn(`[AI Vision] [${reqId}] Unsupported format: ${mimeType}`);
      return sendResponse(res, 400, {
        error: `Unsupported document format "${mimeType}". Please upload a JPEG, PNG, WebP, GIF, or PDF document.`,
        code: 'UNSUPPORTED_MEDIA_TYPE',
        retryable: false,
      });
    }

    const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
    const geminiModel = (process.env.GEMINI_MODEL || 'gemini-3.5-flash').trim();

    const openaiKey = (process.env.OPENAI_API_KEY || '').trim();
    const openaiModel = (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim();

    if (!geminiKey && !openaiKey) {
      console.error(`[AI Vision] [${reqId}] Missing API keys (GEMINI_API_KEY / OPENAI_API_KEY) in environment.`);
      return sendResponse(res, 422, {
        error: 'Neither GEMINI_API_KEY nor OPENAI_API_KEY is configured on the server.',
        code: 'MISSING_API_KEY',
        retryable: false,
      });
    }

    console.log(`[AI Vision] [${reqId}] Processing request. Mime: ${mimeType}, Size: ${(imageBase64.length / 1024).toFixed(1)} KB`);

    let result;
    let usedModel = '';

    if (geminiKey) {
      usedModel = geminiModel;
      console.log(`[AI Vision] [${reqId}] Connecting to Gemini provider (${usedModel})...`);
      result = await executeGeminiVision(imageBase64, geminiKey, geminiModel);
    } else {
      usedModel = openaiModel;
      console.log(`[AI Vision] [${reqId}] Connecting to OpenAI provider (${usedModel})...`);
      result = await executeOpenAIVision(imageBase64, openaiKey, openaiModel);
    }

    const duration = Date.now() - startTime;
    console.log(`[AI Vision] [${reqId}] Successfully recognized material in ${duration}ms using ${usedModel}`);

    return sendResponse(res, 200, {
      success: true,
      reqId,
      model: usedModel,
      durationMs: duration,
      result,
    });
  } catch (err: any) {
    const duration = Date.now() - startTime;
    const statusCode = err instanceof AIRecognitionError ? err.statusCode : (err.statusCode || 500);
    const errorCode = err instanceof AIRecognitionError ? err.code : (err.code || 'AI_RECOGNITION_FAILED');
    const isRetryable = err instanceof AIRecognitionError ? err.retryable : (statusCode === 429 || statusCode === 502 || statusCode === 503 || statusCode === 504);

    let safeMessage = err.message || 'Vision recognition processing failed.';
    safeMessage = safeMessage.replace(/(?:key=|Bearer\s+)[A-Za-z0-9._-]+/gi, '[REDACTED]');

    console.error(`[AI Vision] [${reqId}] Error after ${duration}ms (HTTP ${statusCode} / ${errorCode}): ${safeMessage}`);

    return sendResponse(res, statusCode, {
      error: safeMessage,
      code: errorCode,
      retryable: isRetryable,
      retryAfter: err.retryAfter,
      reqId,
      status: statusCode,
    });
  }
}
