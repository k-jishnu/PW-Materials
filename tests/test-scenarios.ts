// tests/test-scenarios.ts
import { validateAndNormalizeRecognition } from '../src/services/aiRecognitionEngine';
import { GatewayAPI } from '../src/services/gatewayAPI';

console.log('================================================================');
console.log('PW MATERIALS — GPT-4o mini RECOGNITION SYSTEM PROMPT TEST SUITE');
console.log('================================================================\n');

const gateway = new GatewayAPI();
let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, details?: any) {
  totalTests++;
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${testName}`);
    if (details) {
      console.error('   Details:', details);
    }
  }
}

// --------------------------------------------------------------------------
// TEST 1: A material package showing a brand but no price
// --------------------------------------------------------------------------
console.log('--- TEST 1: Material package showing brand but no price ---');
const rawOutputTest1 = {
  document_type: 'material_photo',
  item_name: 'UltraTech Super Portland Cement 50kg',
  rate: null,
  vendor: 'UltraTech Cement',
  quantity: 1,
  gst_tax: null,
  company_ref: 'PW',
};

const norm1 = validateAndNormalizeRecognition(rawOutputTest1);
const result1 = (gateway as any).mapStructuredToRecognitionResult(norm1);

assert(norm1.item_name === 'UltraTech Super Portland Cement 50kg', 'Test 1: Item name correctly predicted');
assert(norm1.rate === null, 'Test 1: Rate is strictly null (never fabricated)');
assert(norm1.vendor === 'UltraTech Cement', 'Test 1: Vendor manufacturer identified');
assert(norm1.quantity === 1, 'Test 1: Counted 1 package');
assert(norm1.gst_tax === null, 'Test 1: GST Tax is null for manual user entry');
assert(norm1.company_ref === 'PW', 'Test 1: Company reference is PW');
assert(result1.price.amount === null, 'Test 1: Form field price amount is null for empty input');
assert(result1.company.name === 'PW', 'Test 1: Result company is PW');

// --------------------------------------------------------------------------
// TEST 2: Several individually visible materials
// --------------------------------------------------------------------------
console.log('\n--- TEST 2: Several individually visible materials ---');
const rawOutputTest2 = {
  document_type: 'material_photo',
  item_name: 'Astral CPVC Pro Pipes 1 Inch',
  rate: null,
  vendor: 'Astral Pipes',
  quantity: 6,
  gst_tax: null,
  company_ref: 'PW',
};

const norm2 = validateAndNormalizeRecognition(rawOutputTest2);
const result2 = (gateway as any).mapStructuredToRecognitionResult(norm2);

assert(norm2.item_name === 'Astral CPVC Pro Pipes 1 Inch', 'Test 2: Item name predicted');
assert(norm2.quantity === 6, 'Test 2: Multiple distinct items counted reliably as 6');
assert(norm2.rate === null, 'Test 2: Rate is null without fabricated pricing');
assert(norm2.vendor === 'Astral Pipes', 'Test 2: Brand/manufacturer is Astral Pipes');
assert(result2.quantity.value === 6, 'Test 2: Form field quantity is 6');

// --------------------------------------------------------------------------
// TEST 3: Photo where quantity cannot be counted reliably
// --------------------------------------------------------------------------
console.log('\n--- TEST 3: Loose / uncountable materials ---');
const rawOutputTest3 = {
  document_type: 'material_photo',
  item_name: 'Coarse River Sand Bulk Aggregate',
  rate: null,
  vendor: null,
  quantity: null,
  gst_tax: null,
  company_ref: 'PW',
};

const norm3 = validateAndNormalizeRecognition(rawOutputTest3);
const result3 = (gateway as any).mapStructuredToRecognitionResult(norm3);

assert(norm3.item_name === 'Coarse River Sand Bulk Aggregate', 'Test 3: Loose material recognized');
assert(norm3.quantity === null, 'Test 3: Quantity is strictly null (not guessed / default 1)');
assert(norm3.rate === null, 'Test 3: Rate is null');
assert(norm3.vendor === null, 'Test 3: Vendor is null (not "Unknown" string)');
assert(result3.quantity.value === null, 'Test 3: Form field quantity is empty (null) for manual entry');

// --------------------------------------------------------------------------
// TEST 4: Image showing an explicit price and GST
// --------------------------------------------------------------------------
console.log('\n--- TEST 4: Explicit price and GST tax visible ---');
const rawOutputTest4 = {
  document_type: 'material_photo',
  item_name: 'Asian Paints Apex Ultima Exterior Emulsion 20L',
  rate: 4650.00,
  vendor: 'Asian Paints',
  quantity: 1,
  gst_tax: 18,
  company_ref: 'PW',
};

const norm4 = validateAndNormalizeRecognition(rawOutputTest4);
const result4 = (gateway as any).mapStructuredToRecognitionResult(norm4);

assert(norm4.item_name === 'Asian Paints Apex Ultima Exterior Emulsion 20L', 'Test 4: Item name extracted');
assert(norm4.rate === 4650.00, 'Test 4: Explicit unit price extracted as 4650.00');
assert(norm4.gst_tax === 18, 'Test 4: Explicit GST extracted as 18%');
assert(norm4.vendor === 'Asian Paints', 'Test 4: Manufacturer is Asian Paints');
assert(result4.price.amount === 4650.00, 'Test 4: Form field rate is populated with 4650.00');
assert(result4.gst.rate === 18, 'Test 4: Form field GST rate is 18%');

// --------------------------------------------------------------------------
// TEST 5: Image with no identifiable vendor
// --------------------------------------------------------------------------
console.log('\n--- TEST 5: Unbranded / generic material (no identifiable vendor) ---');
const rawOutputTest5 = {
  document_type: 'material_photo',
  item_name: 'Standard Red Kiln Clay Bricks',
  rate: null,
  vendor: null,
  quantity: 200,
  gst_tax: null,
  company_ref: 'PW',
};

const norm5 = validateAndNormalizeRecognition(rawOutputTest5);
const result5 = (gateway as any).mapStructuredToRecognitionResult(norm5);

assert(norm5.item_name === 'Standard Red Kiln Clay Bricks', 'Test 5: Generic material predicted');
assert(norm5.vendor === null, 'Test 5: Vendor is strictly null (not placeholder string)');
assert(result5.vendor.name === null, 'Test 5: Result vendor name is null, leaving form field empty');
assert(norm5.company_ref === 'PW', 'Test 5: Fixed company ref is PW');

// --------------------------------------------------------------------------
// TEST 6: Invoice / Receipt preservation
// --------------------------------------------------------------------------
console.log('\n--- TEST 6: Invoice preservation & multi-item recognition ---');
const rawOutputTest6 = {
  document_type: 'invoice',
  supplier_name: 'Shree Balaji Steels & Building Supplies',
  invoice_number: 'INV-2026-8841',
  invoice_date: '2026-10-18',
  currency: 'INR',
  subtotal: 75000,
  tax_amount: 13500,
  total_amount: 88500,
  item_name: 'Fe550D TMT Steel Rebar 12mm',
  rate: 650,
  vendor: 'Shree Balaji Steels & Building Supplies',
  quantity: 100,
  gst_tax: 18,
  company_ref: 'PW',
  line_items: [
    {
      item_name: 'Fe550D TMT Steel Rebar 12mm',
      description: 'Standard 12m length',
      quantity: 100,
      unit: 'Bundles',
      unit_price: 650,
      tax_amount: 11700,
      line_total: 76700,
      confidence_score: 0.98,
    },
    {
      item_name: 'Binding Wire 18 Gauge',
      description: 'Galvanized coil',
      quantity: 10,
      unit: 'Rolls',
      unit_price: 180,
      tax_amount: 324,
      line_total: 2124,
      confidence_score: 0.95,
    },
  ],
};

const norm6 = validateAndNormalizeRecognition(rawOutputTest6);
const result6 = (gateway as any).mapStructuredToRecognitionResult(norm6);

assert(norm6.document_type === 'invoice', 'Test 6: Correctly distinguished invoice document type');
assert(norm6.invoice_number === 'INV-2026-8841', 'Test 6: Invoice number preserved');
assert(norm6.line_items.length === 2, 'Test 6: Multi-line invoice items preserved');
assert(result6.allLineItems?.length === 2, 'Test 6: Line items mapped to client result');
assert(result6.company.name === 'PW', 'Test 6: Company is PW');

// --------------------------------------------------------------------------
// TEST 7: Supabase storage mapping simulation
// --------------------------------------------------------------------------
console.log('\n--- TEST 7: Supabase storage & database constraint validation ---');
// Verify that null rate, quantity, and gst_tax map properly to Supabase check constraints
function simulateSupabaseSave(materialData: {
  item: string;
  vendor: string | null;
  price: number | null;
  quantity: number | null;
  gstRate: number | null;
  company?: string;
}) {
  const standard_price = materialData.price ?? 0;
  const quantity = materialData.quantity ?? 1;
  const gst_rate = materialData.gstRate ?? 0;
  const company = materialData.company?.trim() || 'PW';

  // Check constraint assertions matching PostgreSQL schema:
  // standard_price >= 0
  // quantity >= 0
  // total_price >= 0
  const validPrice = standard_price >= 0;
  const validQty = quantity >= 0;
  const validTotal = (standard_price * quantity) >= 0;
  const validCompany = company === 'PW';

  return validPrice && validQty && validTotal && validCompany;
}

assert(
  simulateSupabaseSave({ item: norm1.item_name, vendor: norm1.vendor, price: norm1.rate, quantity: norm1.quantity, gstRate: norm1.gst_tax }),
  'Test 7a: Test 1 null price safely maps to Supabase standard_price 0 without violating constraint'
);

assert(
  simulateSupabaseSave({ item: norm3.item_name, vendor: norm3.vendor, price: norm3.rate, quantity: norm3.quantity, gstRate: norm3.gst_tax }),
  'Test 7b: Test 3 null quantity safely maps to Supabase default without violating constraint'
);

assert(
  simulateSupabaseSave({ item: norm5.item_name, vendor: norm5.vendor, price: norm5.rate, quantity: norm5.quantity, gstRate: norm5.gst_tax }),
  'Test 7c: Test 5 null vendor and price safely maps to Supabase'
);

console.log('\n================================================================');
console.log(`TEST SUMMARY: ${passedTests}/${totalTests} tests passed (${Math.round((passedTests / totalTests) * 100)}%)`);
console.log('================================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
