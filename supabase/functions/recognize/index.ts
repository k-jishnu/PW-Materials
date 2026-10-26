// supabase/functions/recognize/index.ts
// Supabase Edge Function for server-side OpenAI Vision recognition

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing required imageBase64 in request body." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    const model = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "OPENAI_API_KEY is not configured in Supabase Edge Function secrets.",
          code: "MISSING_API_KEY",
          model,
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let formattedImageUrl = imageBase64;
    if (!formattedImageUrl.startsWith("data:")) {
      formattedImageUrl = `data:image/jpeg;base64,${formattedImageUrl}`;
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: 1500,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are a high-precision AI vision recognition engine for PW Materials, specialized in construction materials, supplies, and invoices.
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
- Return valid JSON only without markdown formatting.`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Identify the construction material or invoice details from this image. Return valid JSON only following the schema and extraction rules." },
              { type: "image_url", image_url: { url: formattedImageUrl, detail: "high" } }
            ]
          }
        ]
      }),
    });

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text();
      return new Response(
        JSON.stringify({ error: `OpenAI error: ${errText}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await openaiResponse.json();
    const content = data.choices?.[0]?.message?.content;
    const result = JSON.parse(content || "{}");

    return new Response(
      JSON.stringify({ success: true, model, result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Recognition processing failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
