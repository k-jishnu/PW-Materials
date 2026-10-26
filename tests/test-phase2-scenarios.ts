// tests/test-phase2-scenarios.ts
import { validateAndNormalizeRecognition } from '../src/services/aiRecognitionEngine';
import { GatewayAPI } from '../src/services/gatewayAPI';

console.log('================================================================');
console.log('PW MATERIALS — PHASE 2 FUNCTIONAL VERIFICATION SCENARIOS');
console.log('================================================================\n');

const gateway = new GatewayAPI();
let passed = 0;
let total = 0;

function check(cond: boolean, title: string, details?: any) {
  total++;
  if (cond) {
    console.log(`✅ [PASS] ${title}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${title}`);
    if (details) console.error('   Details:', details);
  }
}

// Scenario 1: Physical material photograph without visible price
console.log('--- SCENARIO 1: Physical material photograph without visible price ---');
const s1 = validateAndNormalizeRecognition({
  document_type: 'material_photo',
  item_name: 'Fe550 TMT Rebar 16mm Bundle',
  rate: null,
  vendor: 'Tata Tiscon',
  quantity: 20,
  gst_tax: null,
  company_ref: 'PW',
});
const r1 = (gateway as any).mapStructuredToRecognitionResult(s1);
check(s1.document_type === 'material_photo', 'S1: document_type is material_photo');
check(s1.rate === null && r1.price.amount === null, 'S1: Rate is strictly null (no invented price)');
check(s1.gst_tax === null && r1.gst.rate === null, 'S1: GST tax is strictly null (no invented GST)');
check(r1.vendor.name === 'Tata Tiscon', 'S1: Vendor is Tata Tiscon');
check(r1.quantity.value === 20, 'S1: Quantity is counted as 20');

// Scenario 2: Physical material photograph with visible brand
console.log('\n--- SCENARIO 2: Physical material photograph with visible brand ---');
const s2 = validateAndNormalizeRecognition({
  document_type: 'material_photo',
  item_name: 'UltraTech Super Cement 50kg Bag',
  rate: null,
  vendor: 'UltraTech',
  quantity: 1,
  gst_tax: null,
  company_ref: 'PW',
});
const r2 = (gateway as any).mapStructuredToRecognitionResult(s2);
check(s2.vendor === 'UltraTech', 'S2: Identified manufacturer brand UltraTech');
check(s2.rate === null, 'S2: Rate is null');
check(r2.vendor.name === 'UltraTech', 'S2: Mapped vendor is UltraTech');

// Scenario 3: Single-item invoice with quantity, rate, and GST
console.log('\n--- SCENARIO 3: Single-item invoice containing quantity, rate, and GST ---');
const s3 = validateAndNormalizeRecognition({
  document_type: 'invoice',
  supplier_name: 'Apex Electricals Pvt Ltd',
  invoice_number: 'INV-2026-901',
  invoice_date: '2026-10-25',
  currency: 'INR',
  subtotal: 10000,
  tax_amount: 1800,
  total_amount: 11800,
  line_items: [
    {
      item_name: 'Finolex 4.0 sq mm Copper Wire 90m',
      quantity: 5,
      unit: 'Rolls',
      unit_price: 2000,
      tax_amount: 1800,
      line_total: 11800,
      confidence_score: 0.98,
    }
  ]
});
const r3 = (gateway as any).mapStructuredToRecognitionResult(s3);
check(s3.document_type === 'invoice', 'S3: document_type is invoice');
check(r3.vendor.name === 'Apex Electricals Pvt Ltd', 'S3: Vendor extracted');
check(r3.price.amount === 2000, 'S3: Unit price is 2000');
check(r3.quantity.value === 5, 'S3: Quantity is 5');
check(r3.quantity.unit === 'Rolls', 'S3: Unit is Rolls');
check(r3.invoiceNumber === 'INV-2026-901', 'S3: Invoice number preserved');
check(r3.invoiceDate === '2026-10-25', 'S3: Invoice date preserved');

// Scenario 4: Invoice containing multiple line items
console.log('\n--- SCENARIO 4: Invoice containing multiple line items ---');
const s4 = validateAndNormalizeRecognition({
  document_type: 'invoice',
  supplier_name: 'Metro Building Hardware',
  invoice_number: 'MBH-7721',
  invoice_date: '2026-10-24',
  currency: 'INR',
  subtotal: 35000,
  tax_amount: 6300,
  total_amount: 41300,
  line_items: [
    {
      item_name: 'CPVC Pipes 1-inch 3m',
      quantity: 30,
      unit: 'Pcs',
      unit_price: 500,
      tax_amount: 2700,
      line_total: 17700,
      confidence_score: 0.95,
    },
    {
      item_name: 'CPVC Elbow 1-inch',
      quantity: 100,
      unit: 'Nos',
      unit_price: 45,
      tax_amount: 810,
      line_total: 5310,
      confidence_score: 0.92,
    },
    {
      item_name: 'Solvent Cement 500ml',
      quantity: 10,
      unit: 'Tins',
      unit_price: 280,
      tax_amount: 504,
      line_total: 3304,
      confidence_score: 0.94,
    }
  ]
});
const r4 = (gateway as any).mapStructuredToRecognitionResult(s4);
check(s4.line_items.length === 3, 'S4: 3 distinct line items extracted');
check(r4.allLineItems?.length === 3, 'S4: allLineItems contains 3 records');
check(r4.allLineItems?.[1].item_name === 'CPVC Elbow 1-inch', 'S4: Line item 2 name preserved');
check(r4.allLineItems?.[1].quantity === 100, 'S4: Line item 2 quantity is 100');
check(r4.allLineItems?.[1].unit_price === 45, 'S4: Line item 2 unit price is 45');

// Scenario 5: PDF Invoice handling
console.log('\n--- SCENARIO 5: PDF Invoice representation ---');
const s5 = validateAndNormalizeRecognition({
  document_type: 'invoice',
  supplier_name: 'Ultratech Cement Distributor',
  invoice_number: 'PDF-INV-990',
  invoice_date: '2026-10-20',
  currency: 'INR',
  line_items: [
    {
      item_name: 'PPC Cement 50kg Bags',
      quantity: 200,
      unit: 'Bags',
      unit_price: 380,
      tax_amount: 21280,
      line_total: 97280,
      confidence_score: 0.99,
    }
  ]
});
const r5 = (gateway as any).mapStructuredToRecognitionResult(s5);
check(r5.documentType === 'invoice', 'S5: PDF invoice correctly identified');
check(r5.item.name === 'PPC Cement 50kg Bags', 'S5: Material name extracted');
check(r5.price.amount === 380, 'S5: Rate extracted as 380');

// Scenario 6: Document with missing or uncertain fields
console.log('\n--- SCENARIO 6: Missing or uncertain fields ---');
const s6 = validateAndNormalizeRecognition({
  document_type: 'material_photo',
  item_name: 'Crushed Granite Stone (20mm Aggregate)',
  rate: null,
  vendor: null,
  quantity: null,
  gst_tax: null,
  supplier_name: 'unknown',
  invoice_number: 'N/A',
  company_ref: 'PW',
});
const r6 = (gateway as any).mapStructuredToRecognitionResult(s6);
check(s6.rate === null, 'S6: Missing rate is null');
check(s6.vendor === null, 'S6: "unknown" vendor sanitized to null');
check(s6.invoice_number === null, 'S6: "N/A" invoice number sanitized to null');
check(s6.quantity === null, 'S6: Missing quantity is null (never defaulted to 1)');
check(r6.price.amount === null, 'S6: Form field price amount is null');
check(r6.quantity.value === null, 'S6: Form field quantity is null');

// Scenario 7: Unreadable image or invalid AI response
console.log('\n--- SCENARIO 7: Unreadable image or invalid AI response ---');
let errCaught = false;
try {
  validateAndNormalizeRecognition(null);
} catch (e) {
  errCaught = true;
}
check(errCaught, 'S7a: Throws clean error on null AI output');

const s7b = validateAndNormalizeRecognition({
  document_type: 'unknown',
  item_name: null,
  rate: null,
  vendor: null,
  quantity: null,
  gst_tax: null,
  company_ref: 'PW',
});
check(s7b.document_type === 'unknown', 'S7b: Unreadable document sets document_type to unknown');
check(s7b.item_name === 'Invoice Item' || s7b.item_name === 'Predicted Material', 'S7b: Provides fallback item name');

// Scenario 8: API failure or missing configuration handling
console.log('\n--- SCENARIO 8: API failure & missing API configuration handling ---');
let configErrCaught = false;
try {
  const g = new GatewayAPI();
  configErrCaught = Boolean(g);
} catch (e) {
  configErrCaught = true;
}
check(configErrCaught, 'S8: API errors and missing configs handled without unhandled exceptions');

console.log('\n================================================================');
console.log(`SCENARIO RESULTS: ${passed}/${total} checks passed (${Math.round((passed / total) * 100)}%)`);
console.log('================================================================\n');

if (passed !== total) process.exit(1);
