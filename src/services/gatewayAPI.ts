import { MaterialRecognitionResult, GatewayConfig } from '@/types';
import { StructuredRecognitionResult } from './aiRecognitionEngine';

const CONFIG_STORAGE_KEY = 'pw_materials_gateway_config';

const DEFAULT_CONFIG: GatewayConfig = {
  baseUrl: 'https://gateway.example.com',
  apiKey: '',
  model: 'gpt-4o-mini',
  useLiveClaudeGateway: false,
};

export class GatewayAPI {
  private config: GatewayConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  public getConfig(): GatewayConfig {
    return { ...this.config };
  }

  public saveConfig(newConfig: Partial<GatewayConfig>): void {
    this.config = { ...this.config, ...newConfig };
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.config));
    } catch {
      // Ignore
    }
  }

  private loadConfig(): GatewayConfig {
    try {
      const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
    } catch {
      // Ignore
    }
    return DEFAULT_CONFIG;
  }

  public async recognizeMaterial(
    imageBase64: string,
    onProgress?: (progress: number) => void
  ): Promise<MaterialRecognitionResult> {
    onProgress?.(15);

    // 1. First attempt: call secure server-side OpenAI Vision endpoint (/api/recognize)
    try {
      onProgress?.(30);
      const res = await fetch('/api/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
      });

      onProgress?.(70);

      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.result) {
          onProgress?.(95);
          return this.mapStructuredToRecognitionResult(data.result);
        }
        throw new Error('Malformed recognition response from server.');
      } else {
        const errData = await res.json().catch(() => ({}));
        if (errData.code === 'MISSING_API_KEY') {
          throw new Error('OPENAI_API_KEY is missing. Please configure OPENAI_API_KEY in your server environment (.env).');
        }
        throw new Error(errData.error || `AI Recognition failed (HTTP ${res.status}: ${res.statusText})`);
      }
    } catch (networkErr: any) {
      // Re-throw if it's already an explicit API or configuration error
      if (
        networkErr.message?.includes('OPENAI_API_KEY') ||
        networkErr.message?.includes('AI Recognition failed') ||
        networkErr.message?.includes('OpenAI Vision API') ||
        networkErr.message?.includes('Malformed recognition')
      ) {
        throw networkErr;
      }
      throw new Error(`AI Recognition server unreachable: ${networkErr.message || 'Network error'}`);
    }
  }

  /**
   * Maps server-side structured output to client-side MaterialRecognitionResult
   */
  private mapStructuredToRecognitionResult(
    structured: StructuredRecognitionResult
  ): MaterialRecognitionResult {
    const firstItem = structured.line_items?.[0];
    const itemName = structured.item_name || firstItem?.item_name || 'Captured Material';
    const rate = structured.rate !== undefined ? structured.rate : (firstItem?.unit_price ?? null);
    const vendorName = structured.vendor !== undefined ? structured.vendor : (structured.supplier_name ?? null);
    const quantityVal = structured.quantity !== undefined ? structured.quantity : (firstItem?.quantity ?? null);
    const gstRateVal = structured.gst_tax !== undefined ? structured.gst_tax : null;
    const isGST = gstRateVal !== null ? (gstRateVal > 0) : ((firstItem?.tax_amount ?? 0) > 0 || (structured.tax_amount ?? 0) > 0);

    return {
      documentType: structured.document_type,
      item: {
        name: itemName,
        confidence: firstItem?.confidence_score ?? 0.92,
      },
      vendor: {
        name: vendorName,
        confidence: vendorName ? 0.92 : 0.4,
      },
      price: {
        amount: rate,
        currency: structured.currency || 'INR',
        confidence: rate !== null ? 0.95 : 0.0,
      },
      gst: {
        rate: gstRateVal,
        isGSTInvoice: isGST,
        confidence: gstRateVal !== null ? 0.9 : 0.0,
      },
      company: {
        name: structured.company_ref || '',
        confidence: structured.company_ref ? 0.95 : 0.0,
      },
      quantity: {
        value: quantityVal,
        unit: firstItem?.unit || 'Nos',
        confidence: quantityVal !== null ? 0.95 : 0.0,
      },
      invoiceNumber: structured.invoice_number || undefined,
      invoiceDate: structured.invoice_date || undefined,
      dueDate: structured.due_date || undefined,
      subtotal: structured.subtotal ?? undefined,
      taxAmount: structured.tax_amount ?? undefined,
      totalAmount: structured.total_amount ?? undefined,
      notes: structured.notes || undefined,
      rawText: structured.rawText || JSON.stringify(structured, null, 2),
      allLineItems: structured.line_items ? structured.line_items.map((li) => ({
        ...li,
        quantity: li.quantity !== undefined ? li.quantity : null,
        unit_price: li.unit_price !== undefined ? li.unit_price : null,
        line_total: li.line_total !== undefined ? li.line_total : (li.quantity !== null && li.unit_price !== null && li.quantity !== undefined && li.unit_price !== undefined ? li.quantity * li.unit_price : null),
      })) : undefined,
    };
  }

  private async callLiveGateway(
    imageBase64: string,
    onProgress?: (progress: number) => void
  ): Promise<MaterialRecognitionResult> {
    onProgress?.(30);

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const response = await fetch(`${this.config.baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model || 'gpt-4o-mini',
        max_tokens: 1024,
        temperature: 0.2,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: cleanBase64,
                },
              },
              {
                type: 'text',
                text: 'Extract invoice or material details into JSON.',
              },
            ],
          },
        ],
      }),
    });

    onProgress?.(70);

    if (!response.ok) {
      throw new Error(`Gateway Error (${response.status}): ${response.statusText}`);
    }

    const data = await response.json();
    onProgress?.(90);
    return this.parseLegacyGatewayResponse(data);
  }

  private async simulateRecognition(
    imageBase64: string,
    onProgress?: (progress: number) => void
  ): Promise<MaterialRecognitionResult> {
    await new Promise((r) => setTimeout(r, 300));
    onProgress?.(40);

    await new Promise((r) => setTimeout(r, 400));
    onProgress?.(75);

    await new Promise((r) => setTimeout(r, 250));
    onProgress?.(95);

    const randomSeed = imageBase64.length % 4;
    const heuristics = [
      {
        item: 'Galvanized Iron Pipes (Class B) 2-Inch',
        vendor: 'Jindal Steel & Tube Mart',
        company: 'PW Engineering & Infra',
        amount: 38400,
        gstRate: 18,
        isGST: true,
        qty: 40,
        unit: 'Pieces',
        confidence: 0.91,
      },
      {
        item: 'Coromandel King 53 Grade Portland Cement',
        vendor: 'Sri Lakshmi Building Suppliers',
        company: 'PW Site Gamma',
        amount: 22800,
        gstRate: 28,
        isGST: true,
        qty: 60,
        unit: 'Bags',
        confidence: 0.89,
      },
      {
        item: 'Finolex 3-Core Submersible Cable 4.0sqmm',
        vendor: 'Apex Electrical Hardware',
        company: 'PW Electro Mech Unit',
        amount: 12500,
        gstRate: 18,
        isGST: true,
        qty: 2,
        unit: 'Bundles (100m)',
        confidence: 0.84,
      },
      {
        item: 'River Sand & Aggregate Mix (10mm)',
        vendor: 'Sai Ram Quarry Works',
        company: 'PW Foundations',
        amount: 18000,
        gstRate: 5,
        isGST: false,
        qty: 3,
        unit: 'Brass',
        confidence: 0.76,
      },
    ];

    const chosen = heuristics[randomSeed];

    return {
      documentType: 'invoice',
      item: { name: chosen.item, confidence: chosen.confidence },
      vendor: { name: chosen.vendor, confidence: chosen.confidence - 0.03 },
      price: { amount: chosen.amount, currency: 'INR', confidence: chosen.confidence },
      gst: { rate: chosen.gstRate, isGSTInvoice: chosen.isGST, confidence: chosen.confidence },
      company: { name: chosen.company, confidence: chosen.confidence - 0.05 },
      quantity: { value: chosen.qty, unit: chosen.unit, confidence: chosen.confidence - 0.02 },
      invoiceNumber: `INV-${Date.now().toString().slice(-5)}`,
      invoiceDate: new Date().toISOString().split('T')[0],
      rawText: `[Heuristic OCR]: ${chosen.item}, Vendor: ${chosen.vendor}, Price: ₹${chosen.amount}`,
    };
  }

  private parseLegacyGatewayResponse(apiResponse: any): MaterialRecognitionResult {
    try {
      const content = apiResponse.content?.[0];
      const text = content?.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

      return {
        item: { name: parsed.item?.name || 'Unspecified Material', confidence: 0.85 },
        vendor: { name: parsed.vendor?.name || 'Local Vendor', confidence: 0.85 },
        price: { amount: Number(parsed.price?.amount) || 0, currency: 'INR', confidence: 0.85 },
        gst: { rate: 18, isGSTInvoice: true, confidence: 0.85 },
        company: { name: 'PW Materials', confidence: 0.85 },
        quantity: { value: Number(parsed.quantity?.value) || 1, unit: 'Nos', confidence: 0.85 },
        rawText: text,
      };
    } catch {
      throw new Error('Invalid response from AI Vision gateway');
    }
  }

  public async healthCheck(): Promise<boolean> {
    if (!this.config.useLiveClaudeGateway) return true;
    try {
      const res = await fetch(`${this.config.baseUrl}/v1/health`, {
        headers: { Authorization: `Bearer ${this.config.apiKey}` },
      });
      return res.status === 200;
    } catch {
      return false;
    }
  }

  public async getModels(): Promise<string[]> {
    return ['gpt-4o-mini', 'gpt-4o', 'claude-opus-4', 'claude-sonnet-4'];
  }
}

export const gatewayAPI = new GatewayAPI();
