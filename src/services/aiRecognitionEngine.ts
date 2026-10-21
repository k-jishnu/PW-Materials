// src/services/aiRecognitionEngine.ts
// Secure server-side engine for OpenAI Vision document & material extraction

export interface ExtractedLineItem {
  item_name: string;
  description?: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  tax_amount?: number | null;
  line_total: number;
  confidence_score: number;
}

export interface StructuredRecognitionResult {
  document_type: 'invoice' | 'receipt' | 'material_photo' | 'unknown';
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

export const OPENAI_VISION_SYSTEM_PROMPT = `You are a high-precision AI vision recognition engine for construction, industrial procurement, and invoice management.
Your task is to analyze images of purchase invoices, store bills, receipts, or photos of physical materials/supplies.

STRICT INSTRUCTIONS:
1. DOCUMENT IDENTIFICATION:
   - If the image is a bill, invoice, delivery note, or purchase receipt, set "document_type" to "invoice" or "receipt".
   - If the image is a photo of a physical material, tool, equipment, or building product (e.g., steel rebars, cement bags, PVC pipes, cables, bricks), set "document_type" to "material_photo".
   - If unreadable, set "document_type" to "unknown".

2. INVOICE EXTRACTION:
   - Extract supplier/vendor name, invoice/bill number, invoice date (YYYY-MM-DD), currency (default "INR" for Indian rupees if ₹ or GST mentioned), subtotal, tax amount, and total amount.
   - Extract individual line items with item name, quantity, unit (e.g. Nos, Bags, Kg, Meters, Pcs, Bundles, Tons), unit price, tax amount, and line total.
   - Calculate confidence_score between 0.0 and 1.0 for each item.
   - Do NOT fabricate information. If a field is not visible, set it to null.

3. PHYSICAL MATERIAL PHOTO RULES:
   - Identify visible material characteristics, grade, brand, size, or type (e.g. "Fe550 TMT Steel Rebar 12mm", "UltraTech 53 Grade Portland Cement").
   - Propose a clean item_name and description.
   - DO NOT fabricate supplier names, invoice numbers, prices, or purchase dates from a physical material photo. Set supplier_name, invoice_number, and invoice_date to null.
   - Set quantity to 1 (or count visible distinct items if clearly countable), unit to appropriate unit (Nos, Bags, etc.), unit_price to 0.
   - In notes, write: "Identified from material photo. Please verify details and enter supplier/price."

4. OUTPUT FORMAT:
   Return strictly valid JSON matching this schema:
   {
     "document_type": "invoice" | "receipt" | "material_photo" | "unknown",
     "supplier_name": string or null,
     "invoice_number": string or null,
     "invoice_date": "YYYY-MM-DD" or null,
     "due_date": "YYYY-MM-DD" or null,
     "currency": "INR",
     "subtotal": number or null,
     "tax_amount": number or null,
     "total_amount": number or null,
     "notes": string or null,
     "line_items": [
       {
         "item_name": "Name of material",
         "description": "Short description",
         "quantity": 1,
         "unit": "Nos",
         "unit_price": 100.00,
         "tax_amount": 18.00,
         "line_total": 118.00,
         "confidence_score": 0.95
       }
     ]
   }`;

/**
 * Validates and normalizes the parsed JSON output from the AI model
 */
export function validateAndNormalizeRecognition(rawJson: any): StructuredRecognitionResult {
  if (!rawJson || typeof rawJson !== 'object') {
    throw new Error('AI output is not a valid JSON object');
  }

  const document_type = ['invoice', 'receipt', 'material_photo', 'unknown'].includes(rawJson.document_type)
    ? rawJson.document_type
    : 'unknown';

  const supplier_name = typeof rawJson.supplier_name === 'string' ? rawJson.supplier_name.trim() : null;
  const invoice_number = typeof rawJson.invoice_number === 'string' ? rawJson.invoice_number.trim() : null;

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
  const subtotal = typeof rawJson.subtotal === 'number' && !isNaN(rawJson.subtotal) ? Math.max(0, rawJson.subtotal) : null;
  const tax_amount = typeof rawJson.tax_amount === 'number' && !isNaN(rawJson.tax_amount) ? Math.max(0, rawJson.tax_amount) : null;
  const total_amount = typeof rawJson.total_amount === 'number' && !isNaN(rawJson.total_amount) ? Math.max(0, rawJson.total_amount) : null;
  const notes = typeof rawJson.notes === 'string' ? rawJson.notes.trim() : null;

  // Normalize line items
  const rawItems = Array.isArray(rawJson.line_items) ? rawJson.line_items : [];
  const line_items: ExtractedLineItem[] = [];

  for (const item of rawItems) {
    if (!item || typeof item !== 'object') continue;
    const item_name = typeof item.item_name === 'string' && item.item_name.trim()
      ? item.item_name.trim()
      : 'Unspecified Material';

    const quantity = typeof item.quantity === 'number' && !isNaN(item.quantity) && item.quantity > 0
      ? item.quantity
      : 1;

    const unit = typeof item.unit === 'string' && item.unit.trim() ? item.unit.trim() : 'Nos';

    const unit_price = typeof item.unit_price === 'number' && !isNaN(item.unit_price) && item.unit_price >= 0
      ? item.unit_price
      : 0;

    const item_tax = typeof item.tax_amount === 'number' && !isNaN(item.tax_amount)
      ? item.tax_amount
      : null;

    let line_total = typeof item.line_total === 'number' && !isNaN(item.line_total) && item.line_total >= 0
      ? item.line_total
      : quantity * unit_price + (item_tax || 0);

    const confidence_score = typeof item.confidence_score === 'number' && !isNaN(item.confidence_score)
      ? Math.min(1.0, Math.max(0.0, item.confidence_score))
      : 0.90;

    line_items.push({
      item_name,
      description: typeof item.description === 'string' ? item.description.trim() : null,
      quantity,
      unit,
      unit_price,
      tax_amount: item_tax,
      line_total,
      confidence_score,
    });
  }

  // If no items were extracted but document was recognized, provide a fallback item
  if (line_items.length === 0) {
    line_items.push({
      item_name: document_type === 'material_photo' ? 'Captured Material' : 'Invoice Item',
      description: notes || null,
      quantity: 1,
      unit: 'Nos',
      unit_price: total_amount || 0,
      tax_amount: tax_amount || 0,
      line_total: total_amount || 0,
      confidence_score: 0.85,
    });
  }

  return {
    document_type,
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
            text: 'Extract the document and purchase/material information from this image into strict JSON according to the schema.',
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
