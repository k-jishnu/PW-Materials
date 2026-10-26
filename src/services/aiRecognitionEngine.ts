// src/services/aiRecognitionEngine.ts
// Secure server-side engine for OpenAI Vision document & material extraction

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
  company_ref: string;
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

export const OPENAI_VISION_SYSTEM_PROMPT = `You are a high-precision AI vision recognition engine for PW Materials, specialized in construction materials, supplies, and invoices.
Analyze the image and return strictly valid JSON matching the schema below.

1. DOCUMENT IDENTIFICATION:
- Distinguish a physical construction material photo from an invoice or receipt.
- Set "document_type" to "material_photo" when the image shows physical construction materials, tools, equipment, or building products.
- Set "document_type" to "invoice" or "receipt" when the image shows a bill, invoice, tax invoice, delivery note, or store receipt.
- Set "document_type" to "unknown" if unreadable or neither.

2. EXTRACTION RULES FOR PHYSICAL MATERIAL PHOTOS:
When the image is a photo of physical construction material, extract and return these exact fields:
- item_name: Predict the most likely material name from the image. Use visible labels, packaging, markings, and visual characteristics (e.g., "UltraTech 53 Grade Portland Cement", "Fe550 TMT Rebar 12mm", "Finolex 2.5 sq mm PVC Insulated Copper Wire", "Red Clay Bricks"). If uncertain, provide a best-effort prediction for the user to edit.
- rate: Extract the unit price only if explicitly visible or mentioned on the product packaging, price tag, or label. If not provided or not visible, return null. NEVER invent, fabricate, or assume a price.
- vendor: Identify the product's manufacturer or brand/company from visible packaging, labels, or logos (e.g., "UltraTech", "Tata Tiscon", "Supreme", "Havells"). Do not confuse the manufacturer with a third-party seller or supplier. If unknown or not clearly visible, return null. Never use placeholder strings like "Unknown", "N/A", or "Not found".
- quantity: Count the visible items in the picture when they can be distinguished reliably. Return the count as a number (e.g., 1, 5, 20). If the image shows loose, overlapping, piled, or uncountable materials (such as loose gravel, bulk sand, or a tangled rebar pile), return null instead of guessing. Do not assume quantity from packaging unless the quantity is clearly printed.
- gst_tax: Do not guess or calculate GST from the image. Return null and let the user enter or edit it manually. Extract a GST rate (as a numeric percentage, e.g. 18) only if it is explicitly visible and clearly associated with the item in the image.
- company_ref: Default to "PW". This is a fixed application default, not an AI prediction.

3. INVOICE / RECEIPT EXTRACTION RULES:
When the image is an invoice or receipt, preserve full invoice recognition behavior:
- supplier_name: Vendor or supplier company name, or null.
- invoice_number: Invoice identifier or bill number, or null.
- invoice_date: Date in YYYY-MM-DD format, or null.
- due_date: Due date in YYYY-MM-DD format, or null.
- currency: Currency code (default "INR" for Indian rupees if ₹ or GST mentioned).
- subtotal: Numeric subtotal before tax, or null.
- tax_amount: Total tax amount, or null.
- total_amount: Grand total amount, or null.
- notes: Summary remarks or invoice notes, or null.
- line_items: Array of extracted line items:
  [
    {
      "item_name": "Name of material/item",
      "description": "Short description or specification, or null",
      "quantity": number or null,
      "unit": "Nos" | "Bags" | "Kg" | "Meters" | "Pcs" | "Tons" etc.,
      "unit_price": number or null,
      "tax_amount": number or null,
      "line_total": number or null,
      "confidence_score": 0.0 to 1.0
    }
  ]
- Map the primary line item to the required top-level fields:
  - item_name: Name of the primary item.
  - rate: Unit price of the primary item, or null.
  - vendor: Supplier/vendor company name, or null.
  - quantity: Quantity of primary item, or null.
  - gst_tax: Explicit or inferred GST rate percentage (e.g. 18), or null.
  - company_ref: "PW".

4. REQUIRED OUTPUT FORMAT:
Return valid JSON only, matching this structure:
{
  "document_type": "material_photo" | "invoice" | "receipt" | "unknown",
  "item_name": "Predicted material name",
  "rate": null,
  "vendor": null,
  "quantity": null,
  "gst_tax": null,
  "company_ref": "PW",
  "supplier_name": null,
  "invoice_number": null,
  "invoice_date": null,
  "due_date": null,
  "currency": "INR",
  "subtotal": null,
  "tax_amount": null,
  "total_amount": null,
  "notes": null,
  "line_items": []
}

IMPORTANT SAFEGUARDS:
- Never fabricate prices, GST, vendor names, or quantities.
- Use actual extracted values where supported by evidence.
- Use null for missing or uncertain values, NOT strings such as "Unknown", "N/A", or "Not found".
- Return valid JSON only without markdown formatting.`;

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

/**
 * Validates and normalizes the parsed JSON output from the AI model
 */
export function validateAndNormalizeRecognition(rawJson: any): StructuredRecognitionResult {
  if (!rawJson || typeof rawJson !== 'object') {
    throw new Error('AI output is not a valid JSON object');
  }

  const document_type: 'invoice' | 'receipt' | 'material_photo' | 'unknown' =
    ['invoice', 'receipt', 'material_photo', 'unknown'].includes(rawJson.document_type)
      ? rawJson.document_type
      : (rawJson.invoice_number || (Array.isArray(rawJson.line_items) && rawJson.line_items.length > 1) ? 'invoice' : 'material_photo');

  // Top-level mapped fields with null-safety and sanitization
  const rawItemName = cleanStringOrNull(rawJson.item_name) ||
    (Array.isArray(rawJson.line_items) && rawJson.line_items[0] ? cleanStringOrNull(rawJson.line_items[0].item_name) : null);
  const item_name = rawItemName || (document_type === 'material_photo' ? 'Predicted Material' : 'Invoice Item');

  const rate = cleanNumberOrNull(rawJson.rate !== undefined ? rawJson.rate : rawJson.line_items?.[0]?.unit_price);
  const vendor = cleanStringOrNull(rawJson.vendor) || cleanStringOrNull(rawJson.supplier_name);
  const quantity = cleanNumberOrNull(rawJson.quantity !== undefined ? rawJson.quantity : rawJson.line_items?.[0]?.quantity);
  const gst_tax = cleanNumberOrNull(rawJson.gst_tax);
  const company_ref = 'PW'; // Fixed application default

  const supplier_name = cleanStringOrNull(rawJson.supplier_name) || vendor;
  const invoice_number = cleanStringOrNull(rawJson.invoice_number);

  // Date validation (YYYY-MM-DD or parseable)
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

  // Normalize line items
  const rawItems = Array.isArray(rawJson.line_items) ? rawJson.line_items : [];
  const line_items: ExtractedLineItem[] = [];

  for (const item of rawItems) {
    if (!item || typeof item !== 'object') continue;
    const item_name_clean = cleanStringOrNull(item.item_name) || 'Unspecified Material';
    const item_qty = cleanNumberOrNull(item.quantity);
    const unit = typeof item.unit === 'string' && item.unit.trim() ? item.unit.trim() : 'Nos';
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

  // If no items were extracted, construct a primary line item from top-level fields
  if (line_items.length === 0) {
    line_items.push({
      item_name,
      description: notes || null,
      quantity,
      unit: 'Nos',
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

/**
 * Execute vision recognition via OpenAI API
 */
export async function executeOpenAIVisionRecognition(
  imageBase64: string,
  apiKey: string,
  modelName: string = 'gpt-4o-mini'
): Promise<StructuredRecognitionResult> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('OPENAI_API_KEY is not configured on the server.');
  }

  if (imageBase64.startsWith('data:application/pdf')) {
    throw new Error('OpenAI Vision does not support PDF documents directly. Please upload an image format (JPEG, PNG, WebP) or configure GEMINI_API_KEY for native PDF invoice recognition.');
  }

  // Ensure clean data URL format for OpenAI
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
      {
        role: 'system',
        content: OPENAI_VISION_SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Identify the construction material or invoice details from this image. Return valid JSON only following the schema and extraction rules.',
          },
          {
            type: 'image_url',
            image_url: {
              url: formattedImageUrl,
              detail: 'high',
            },
          },
        ],
      },
    ],
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    let errBody = '';
    try {
      const errJson = await response.json();
      errBody = errJson.error?.message || JSON.stringify(errJson);
    } catch {
      errBody = await response.text();
    }
    throw new Error(`OpenAI Vision API error (${response.status}): ${errBody || response.statusText}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0];
  const content = choice?.message?.content;

  if (!content) {
    throw new Error('OpenAI returned an empty response.');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch (e: any) {
    throw new Error(`Failed to parse OpenAI JSON response: ${e.message}`);
  }

  const validated = validateAndNormalizeRecognition(parsed);
  validated.rawText = content;
  return validated;
}

/**
 * Execute vision recognition via Google Gemini API
 * Supports Gemini 1.5 Pro, Gemini 1.5 Flash, Gemini 2.0 Flash, etc.
 */
export async function executeGeminiVisionRecognition(
  imageBase64: string,
  apiKey: string,
  modelName: string = 'gemini-3.8-flash'
): Promise<StructuredRecognitionResult> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('GEMINI_API_KEY is not configured on the server.');
  }

  // Extract pure base64 data and mimeType
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

  // Model candidates with fallback if primary experiences temporary capacity (503) or deprecation (404)
  let primaryModel = modelName.trim().replace(/^models\//, '') || 'gemini-3.5-flash';
  const modelCandidates = [primaryModel];
  if (primaryModel !== 'gemini-3.5-flash') {
    modelCandidates.push('gemini-3.5-flash');
  }

  const promptText = mimeType === 'application/pdf'
    ? `${OPENAI_VISION_SYSTEM_PROMPT}\n\nAnalyze this PDF invoice document and extract all available information into valid JSON matching the schema:`
    : `${OPENAI_VISION_SYSTEM_PROMPT}\n\nAnalyze this image and return the structured JSON data:`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: promptText,
          },
          {
            inline_data: {
              mime_type: mimeType,
              data: pureBase64,
            },
          },
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

  for (const modelToTry of modelCandidates) {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelToTry}:generateContent?key=${apiKey.trim()}`;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        break;
      }

      let errBody = '';
      try {
        const errJson = await response.json();
        errBody = errJson.error?.message || JSON.stringify(errJson);
      } catch {
        errBody = await response.text();
      }
      lastErr = `Gemini Vision API error (${response.status}): ${errBody || response.statusText}`;

      // Only fallback on 503 (high demand) or 404 (model not found/deprecated)
      if (response.status !== 503 && response.status !== 404) {
        throw new Error(lastErr);
      }
    } catch (e: any) {
      lastErr = e.message || String(e);
      // If network error or fatal error not related to 503/404, throw
      if (!lastErr.includes('503') && !lastErr.includes('404')) {
        throw e;
      }
    }
  }

  if (!response || !response.ok) {
    throw new Error(lastErr || 'Gemini Vision recognition failed.');
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  const content = candidate?.content?.parts?.[0]?.text;

  if (!content) {
    throw new Error('Gemini returned an empty response.');
  }

  // Strip markdown code fences if Gemini added them despite response_mime_type
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
    throw new Error(`Failed to parse Gemini JSON response: ${e.message}`);
  }

  const validated = validateAndNormalizeRecognition(parsed);
  validated.rawText = cleaned;
  return validated;
}
