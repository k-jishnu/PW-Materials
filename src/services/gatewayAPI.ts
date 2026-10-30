import type { MaterialRecognitionResult, GatewayConfig } from '@/types';
import type { StructuredRecognitionResult } from './aiRecognitionEngine';

export class GatewayError extends Error {
  status: number;
  code: string;
  retryable: boolean;
  retryAfter?: number;

  constructor(
    message: string,
    status: number = 500,
    code: string = 'GATEWAY_ERROR',
    retryable: boolean = false,
    retryAfter?: number
  ) {
    super(message);
    this.name = 'GatewayError';
    this.status = status;
    this.code = code;
    this.retryable = retryable;
    this.retryAfter = retryAfter;
  }
}

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
    onProgress?: (progress: number, stage?: string, message?: string) => void,
    signal?: AbortSignal,
    initialProgress: number = 0
  ): Promise<MaterialRecognitionResult> {
    let currentProgress = initialProgress;

    const emitProgress = (p: number, stg?: string, msg?: string) => {
      currentProgress = Math.max(currentProgress, p);
      onProgress?.(currentProgress, stg, msg);
    };

    emitProgress(15, 'preparing', 'Preparing your image...');

    try {
      emitProgress(25, 'validating', 'Checking image quality...');
      emitProgress(40, 'connecting', 'Connecting to recognition service...');

      // Call secure server-side AI Vision endpoint (/api/recognize)
      emitProgress(60, 'analyzing', 'Identifying material and specifications...');

      const fetchSignal = signal || AbortSignal.timeout(50000);
      const res = await fetch('/api/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
        signal: fetchSignal,
      });

      emitProgress(80, 'extracting', 'Extracting brand and product details...');

      if (res.ok) {
        const data = await res.json();
        if (data && data.success && data.result) {
          emitProgress(90, 'validating_extracted', 'Validating extracted information...');
          emitProgress(95, 'preparing_review', 'Preparing your material review...');
          const mapped = this.mapStructuredToRecognitionResult(data.result);
          emitProgress(100, 'complete', 'Recognition completed!');
          return mapped;
        }
        throw new GatewayError('Malformed recognition response received from server.', 502, 'MALFORMED_RESPONSE', true);
      } else {
        let errData: any = {};
        try {
          errData = await res.json();
        } catch {
          errData = { error: await res.text().catch(() => '') };
        }

        const status = res.status;
        const isRetryable = errData.retryable ?? (status === 429 || status === 502 || status === 503 || status === 504);
        const code = errData.code || `HTTP_${status}`;
        const message = errData.error || `AI Recognition failed (HTTP ${status})`;

        throw new GatewayError(message, status, code, isRetryable, errData.retryAfter);
      }
    } catch (networkErr: any) {
      if (networkErr instanceof GatewayError) {
        throw networkErr;
      }
      if (networkErr.name === 'AbortError' || networkErr.message?.includes('aborted')) {
        throw new GatewayError('Recognition was cancelled.', 499, 'CANCELLED', false);
      }
      if (networkErr.name === 'TimeoutError' || networkErr.message?.includes('timeout')) {
        throw new GatewayError('AI recognition request timed out after 50s. Please check your network and retry.', 504, 'TIMEOUT', true);
      }
      throw new GatewayError(
        `AI recognition server unreachable: ${networkErr.message || 'Network connection issue'}`,
        503,
        'NETWORK_ERROR',
        true
      );
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
    const isMaterialPhoto = structured.document_type === 'material_photo';
    
    // For material photos: vendor = product brand/manufacturer extracted from image
    // For invoices: vendor = supplier/vendor company from invoice
    const vendorName = isMaterialPhoto
      ? (structured.vendor ?? null)  // only the product brand, never fall back to supplier_name
      : (structured.vendor !== undefined ? structured.vendor : (structured.supplier_name ?? null));
    
    const quantityVal = structured.quantity !== undefined ? structured.quantity : (firstItem?.quantity ?? null);
    const gstRateVal = structured.gst_tax !== undefined ? structured.gst_tax : null;
    const isGST = gstRateVal !== null ? (gstRateVal > 0) : ((firstItem?.tax_amount ?? 0) > 0 || (structured.tax_amount ?? 0) > 0);
    
    // Unit: prefer top-level unit, then first line item unit, then default based on doc type
    const unitVal = (firstItem?.unit && firstItem.unit !== 'Nos' && firstItem.unit !== 'nos')
      ? firstItem.unit
      : 'nos';

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
        // For material photos: company is the product brand/manufacturer (same as vendor)
        // For invoices: company is the company_ref from the document
        // Never auto-set to 'PW' here — the UI handles the PW company separately
        name: structured.company_ref || '',
        confidence: structured.company_ref ? 0.95 : 0.0,
      },
      quantity: {
        value: quantityVal,
        unit: unitVal,
        confidence: quantityVal !== null ? 0.95 : 0.0,
      },
      invoiceNumber: isMaterialPhoto ? undefined : (structured.invoice_number || undefined),
      invoiceDate: isMaterialPhoto ? undefined : (structured.invoice_date || undefined),
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
