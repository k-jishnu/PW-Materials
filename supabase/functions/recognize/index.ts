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
            content: `You are an AI vision recognition engine for construction invoices and materials.
Extract strict JSON:
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
      "item_name": "Material name",
      "description": "Short description",
      "quantity": 1,
      "unit": "Nos",
      "unit_price": 100.00,
      "tax_amount": 18.00,
      "line_total": 118.00,
      "confidence_score": 0.95
    }
  ]
}`
          },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract invoice or material details from this image." },
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
