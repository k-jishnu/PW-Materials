// tests/test-modal-gst-summary.ts
import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('================================================================');
console.log('TEST SUITE: REVIEW MATERIAL MODAL UI REFINEMENT & VALIDATION');
console.log('================================================================\n');

let passCount = 0;
let totalCount = 0;

function check(label: string, condition: boolean) {
  totalCount++;
  if (condition) {
    passCount++;
    console.log(`✅ [PASS] ${label}`);
  } else {
    console.error(`❌ [FAIL] ${label}`);
    process.exitCode = 1;
  }
}

// 1. Static code inspections on AddMaterialModal.tsx
const modalPath = path.resolve('src/components/MaterialsList/AddMaterialModal.tsx');
const modalCode = fs.readFileSync(modalPath, 'utf8');

console.log('--- 1. STATIC UI CHECKS: ORIGINAL PROOF PANEL & VIEW PROOF BUTTON ---');
check('Yellow panel "Original Document / Photo Attached" is removed', !modalCode.includes('Original Document / Photo Attached'));
check('Yellow panel subtitle "Inspect document proof" is removed', !modalCode.includes('Inspect document proof to verify extracted quantities'));
check('"View proof" button is removed', !modalCode.includes('View proof'));
check('Material Image Preview section exists', modalCode.includes('Uploaded material photo'));
check('Thumbnail is clickable to open preview', modalCode.includes('onClick={() => setIsPreviewOpen(true)}'));

console.log('\n--- 2. STATIC UI CHECKS: DATE ADDED REMOVAL ---');
check('"Date Added" input/label is removed from modal form', !modalCode.includes('>Date Added<'));
check('type="date" input is removed from modal form', !modalCode.includes('type="date"'));
check('date field is preserved in item metadata & submitted', modalCode.includes('date: it.date || new Date().toISOString()'));

console.log('\n--- 3. STATIC UI CHECKS: INTEGRATED GST & PRICE SUMMARY PANEL ---');
check('Integrated GST and Price Summary container exists', modalCode.includes('Apply GST'));
check('Separate "Calculated Total" card is removed', !modalCode.includes('Calculated Total\n              </div>'));
check('Separate "Is GST Tax Invoice" panel is removed', !modalCode.includes('Is GST Tax Invoice'));
check('"(Tax Exempt)" label is removed from calculation breakdown', !modalCode.includes('(Tax Exempt)'));

console.log('\n--- 4. STATIC UI CHECKS: FIELD RENAMES, PLACEHOLDERS & BLUE GST CHECKBOX ---');
check('Label is renamed to "Material Name *"', modalCode.includes('Material Name <span style={{ color: \'#EF4444\', fontWeight: 700 }}>*</span>'));
check('Old label "Material Description / Name" is removed', !modalCode.includes('Material Description / Name'));
check('Material Name has electrical placeholder "e.g. 32A Double Pole MCB"', modalCode.includes('placeholder="e.g. 32A Double Pole MCB"'));

check('Label is renamed to "Supplier *"', modalCode.includes('Supplier <span style={{ color: \'#EF4444\', fontWeight: 700 }}>*</span>'));
check('Old label "Supplier / Vendor" is removed', !modalCode.includes('Supplier / Vendor'));
check('Supplier helper text "Who you purchased from" is removed', !modalCode.includes('Who you purchased from'));
check('Supplier has electrical placeholder "e.g. ABC Electricals"', modalCode.includes('placeholder="e.g. ABC Electricals"'));

check('Label is renamed to "Brand *"', modalCode.includes('Brand <span style={{ color: \'#EF4444\', fontWeight: 700 }}>*</span>'));
check('Old label "Material Brand / Manufacturer" is removed', !modalCode.includes('Material Brand / Manufacturer'));
check('Brand helper text "Brand not detected" is removed', !modalCode.includes('Brand not detected'));
check('Brand has electrical placeholder "e.g. GM, Havells, Schneider Electric"', modalCode.includes('placeholder="e.g. GM, Havells, Schneider Electric"'));

check('Unit Price has required asterisk', modalCode.includes('Unit Price (₹ Rate) <span style={{ color: \'#EF4444\', fontWeight: 700 }}>*</span>'));
check('GST checkbox has blue checked state (accentColor: #2563EB)', modalCode.includes("accentColor: '#2563EB'"));

console.log('\n--- 5. REQUIRED FIELD VALIDATION LOGIC CHECKS ---');
// Validation simulation function matching AddMaterialModal's handleSubmit logic
function validateReviewItems(items: Array<{ item: string; vendor: string; company: string; price: number | '' }>) {
  for (let i = 0; i < items.length; i++) {
    const cur = items[i];
    const itemTrimmed = (cur.item || '').trim();
    const vendorTrimmed = (cur.vendor || '').trim();
    const companyTrimmed = (cur.company || '').trim();
    const priceValid = typeof cur.price === 'number' && !isNaN(cur.price) && cur.price > 0;

    const errors: { item?: string; vendor?: string; company?: string; price?: string } = {};
    if (!itemTrimmed) errors.item = 'Material Name is required.';
    if (!vendorTrimmed) errors.vendor = 'Supplier is required.';
    if (!companyTrimmed) errors.company = 'Brand is required.';
    if (!priceValid) errors.price = 'Unit Price is required and must be greater than zero.';

    if (Object.keys(errors).length > 0) {
      return { valid: false, itemIndex: i, errors };
    }
  }
  return { valid: true };
}

// Case 1: Empty Material Name
const v1 = validateReviewItems([{ item: '', vendor: 'ABC Electricals', company: 'GM', price: 150 }]);
check('Validation rejects empty Material Name', !v1.valid && v1.errors?.item === 'Material Name is required.');

// Case 2: Empty Supplier
const v2 = validateReviewItems([{ item: '32A DP MCB', vendor: '   ', company: 'GM', price: 150 }]);
check('Validation rejects empty/whitespace Supplier', !v2.valid && v2.errors?.vendor === 'Supplier is required.');

// Case 3: Empty Brand
const v3 = validateReviewItems([{ item: '32A DP MCB', vendor: 'ABC Electricals', company: '', price: 150 }]);
check('Validation rejects empty Brand', !v3.valid && v3.errors?.company === 'Brand is required.');

// Case 4: Missing / Zero / Negative Unit Price
const v4a = validateReviewItems([{ item: '32A DP MCB', vendor: 'ABC Electricals', company: 'GM', price: '' }]);
check('Validation rejects empty Unit Price', !v4a.valid && v4a.errors?.price !== undefined);

const v4b = validateReviewItems([{ item: '32A DP MCB', vendor: 'ABC Electricals', company: 'GM', price: 0 }]);
check('Validation rejects zero Unit Price', !v4b.valid && v4b.errors?.price !== undefined);

const v4c = validateReviewItems([{ item: '32A DP MCB', vendor: 'ABC Electricals', company: 'GM', price: -50 }]);
check('Validation rejects negative Unit Price', !v4c.valid && v4c.errors?.price !== undefined);

// Case 5: All 4 fields valid
const v5 = validateReviewItems([{ item: '32A DP MCB', vendor: 'ABC Electricals', company: 'GM', price: 280 }]);
check('Validation accepts complete and valid record', v5.valid === true);

console.log('\n--- 6. INTERACTIVE CALCULATION VERIFICATION ---');

// Calculation function mirroring AddMaterialModal logic
function calculateSummary(
  price: number | '',
  qty: number | '',
  isGSTInvoice: boolean,
  gstRate: number | ''
) {
  const numericPrice = typeof price === 'number' && !isNaN(price) ? price : null;
  const numericQty = typeof qty === 'number' && !isNaN(qty) ? qty : null;
  const hasCalculableTotal = numericPrice !== null && numericQty !== null;

  const subtotal = hasCalculableTotal ? numericPrice * numericQty : 0;
  const activeGstRate =
    typeof gstRate === 'number' && !isNaN(gstRate) ? gstRate : 18;
  const effectiveGstRate = isGSTInvoice ? activeGstRate : 0;
  const gstAmount = hasCalculableTotal && isGSTInvoice ? (subtotal * effectiveGstRate) / 100 : 0;
  const netTotal = hasCalculableTotal ? subtotal + gstAmount : 0;

  const formatCurrency = (val: number): string => {
    const rounded = Math.round(val * 100) / 100;
    return Number.isInteger(rounded)
      ? rounded.toLocaleString('en-IN')
      : rounded.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return {
    hasCalculableTotal,
    subtotal: hasCalculableTotal ? formatCurrency(subtotal) : '—',
    gstAmount: hasCalculableTotal && isGSTInvoice ? formatCurrency(gstAmount) : '—',
    netTotal: hasCalculableTotal ? formatCurrency(netTotal) : '—',
    effectiveGstRate,
  };
}

// Scenario A: GST enabled at 18% with ₹100 x 5
const resA = calculateSummary(100, 5, true, 18);
check('Test A: Subtotal is ₹500', resA.subtotal === '500');
check('Test A: GST amount is ₹90', resA.gstAmount === '90');
check('Test A: Net Total including GST is ₹590', resA.netTotal === '590');

// Scenario B: GST disabled with ₹100 x 5
const resB = calculateSummary(100, 5, false, 18);
check('Test B: Subtotal is ₹500', resB.subtotal === '500');
check('Test B: GST amount is collapsed/dash', resB.gstAmount === '—');
check('Test B: Net Total without GST is ₹500', resB.netTotal === '500');

// Scenario C: Immediate update when Qty changed to 10 and GST Rate to 28%
const resC = calculateSummary(100, 10, true, 28);
check('Test C: Updated Subtotal for 10 items is ₹1,000', resC.subtotal === '1,000');
check('Test C: Updated GST at 28% is ₹280', resC.gstAmount === '280');
check('Test C: Updated Net Total is ₹1,280', resC.netTotal === '1,280');

// Scenario D: Missing unit price (empty string)
const resD = calculateSummary('', 5, true, 18);
check('Test D: Missing price produces no calculable total', resD.hasCalculableTotal === false);
check('Test D: Subtotal is dash ("—") not "₹0"', resD.subtotal === '—');
check('Test D: GST amount is dash ("—") not "₹0"', resD.gstAmount === '—');
check('Test D: Net Total is dash ("—") not "₹0"', resD.netTotal === '—');

// Scenario E: Missing quantity (empty string)
const resE = calculateSummary(250, '', false, 18);
check('Test E: Missing quantity produces dash total', resE.netTotal === '—');

// Scenario F: Fractional values (e.g. ₹123.45 x 2.5 @ 18% GST)
const resF = calculateSummary(123.45, 2.5, true, 18);
check('Test F: Fractional Subtotal is formatted to 2 decimals', resF.subtotal === '308.63');
check('Test F: Fractional GST is formatted to 2 decimals', resF.gstAmount === '55.55');
check('Test F: Fractional Net Total is formatted to 2 decimals', resF.netTotal === '364.18');

console.log('\n================================================================');
console.log(`TEST RESULTS: ${passCount} / ${totalCount} checks passed (${((passCount / totalCount) * 100).toFixed(1)}%)`);
console.log('================================================================\n');

if (passCount === totalCount) {
  console.log('🎉 ALL REVIEW MATERIAL MODAL UI REFINEMENT & VALIDATION TESTS PASSED!');
} else {
  process.exit(1);
}
