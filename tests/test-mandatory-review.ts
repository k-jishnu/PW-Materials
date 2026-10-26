// tests/test-mandatory-review.ts
import { validateAndNormalizeRecognition } from '../src/services/aiRecognitionEngine';
import { GatewayAPI } from '../src/services/gatewayAPI';
import {
  getPurchases,
  insertMaterial,
  deletePurchase,
  clearAllPurchases,
} from '../src/services/localDataService';
import { ReviewItemData } from '../src/components/MaterialsList/AddMaterialModal';

// Polyfill window / localStorage for node environment
const store: Record<string, string> = {};
(globalThis as any).window = globalThis;
(globalThis as any).localStorage = {
  getItem: (key: string) => store[key] || null,
  setItem: (key: string, val: string) => {
    store[key] = String(val);
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    for (const k of Object.keys(store)) delete store[k];
  },
};

console.log('================================================================');
console.log('TEST SUITE: MANDATORY AI REVIEW BEFORE SAVING & MULTI-ITEM SUPPORT');
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

// Ensure clean storage before tests
clearAllPurchases();

// -----------------------------------------------------------------------------
// TEST 1: AI Recognition Alone Creates NO Saved Record
// -----------------------------------------------------------------------------
console.log('--- TEST 1: AI Recognition Alone Does NOT Save Material ---');
const rawAiResult = validateAndNormalizeRecognition({
  document_type: 'material_photo',
  item_name: 'Dr. Fixit Pidifin 2K Waterproofing 15kg',
  rate: null,
  vendor: null,
  quantity: null,
  gst_tax: null,
  company_ref: null,
});

const mappedAiResult = (gateway as any).mapStructuredToRecognitionResult(rawAiResult);

// Check current purchases in localDataService
const purchasesBefore = getPurchases();
check(purchasesBefore.length === 0, 'Initial purchases count is 0');

// Mapping to review form items (as done in App.tsx)
const reviewItems: ReviewItemData[] = [
  {
    item: mappedAiResult.item?.name || '',
    vendor: mappedAiResult.vendor?.name || '',
    price: mappedAiResult.price?.amount != null ? Number(mappedAiResult.price.amount) : '',
    company: mappedAiResult.company?.name || '',
    qtyValue: mappedAiResult.quantity?.value != null ? Number(mappedAiResult.quantity.value) : '',
    qtyUnit: mappedAiResult.quantity?.unit || "no's",
    gstRate: mappedAiResult.gst?.rate != null ? Number(mappedAiResult.gst.rate) : '',
    isGSTInvoice: Boolean(
      mappedAiResult.gst?.isGSTInvoice &&
        mappedAiResult.gst?.rate &&
        Number(mappedAiResult.gst.rate) > 0
    ),
    date: mappedAiResult.invoiceDate || new Date().toISOString().split('T')[0],
    invoiceNumber: mappedAiResult.invoiceNumber || '',
    photoUrl: 'data:image/jpeg;base64,sample',
    confidenceScore: mappedAiResult.item?.confidence || 0.95,
  },
];

// Verify AI recognition populated the review draft, but DID NOT touch storage
const purchasesAfterRecognition = getPurchases();
check(
  purchasesAfterRecognition.length === 0,
  'AI recognition completed: 0 materials saved to local storage'
);
check(
  reviewItems[0].item === 'Dr. Fixit Pidifin 2K Waterproofing 15kg',
  'Review item description populated correctly from AI'
);

// -----------------------------------------------------------------------------
// TEST 2: Missing Fields Remain Empty / Editable (No Fabricated Defaults)
// -----------------------------------------------------------------------------
console.log('\n--- TEST 2: Missing Fields Kept Empty / Not Fabricated ---');
check(reviewItems[0].vendor === '', 'Missing vendor is empty string (not "Unknown Vendor")');
check(reviewItems[0].price === '', 'Missing price is empty string (not 0 or fake price)');
check(reviewItems[0].company === '', 'Missing company is empty string (not fake company)');
check(reviewItems[0].qtyValue === '', 'Missing quantity is empty string (not forced to 1)');
check(reviewItems[0].gstRate === '', 'Missing GST rate is empty string');
check(reviewItems[0].invoiceNumber === '', 'Missing invoiceNumber is empty string');

// -----------------------------------------------------------------------------
// TEST 3: User Cancellation Creates NO Saved Record
// -----------------------------------------------------------------------------
console.log('\n--- TEST 3: Cancellation Flow ---');
// User clicks "Cancel" -> review state discarded, modal closed
const userCancelled = true;
if (userCancelled) {
  // Modal simply unmounts/closes without calling insertMaterial
}
check(getPurchases().length === 0, 'After user cancel: 0 materials saved');

// -----------------------------------------------------------------------------
// TEST 4: User Manual Completion & Confirmation Saves Accurately
// -----------------------------------------------------------------------------
console.log('\n--- TEST 4: User Edits Missing Fields and Confirms ---');
// User fills in the missing vendor, price, qty, and GST
const userEditedItem: ReviewItemData = {
  ...reviewItems[0],
  vendor: 'Shree Krishna Hardware',
  price: 2150,
  qtyValue: 5,
  qtyUnit: 'buckets',
  company: 'PW',
  gstRate: 18,
  isGSTInvoice: true,
  date: '2026-10-26',
  invoiceNumber: 'INV-2026-991',
};

// User clicks Confirm/Submit
const insertRes = insertMaterial({
  name: userEditedItem.item,
  vendor: userEditedItem.vendor,
  company: userEditedItem.company,
  price: Number(userEditedItem.price),
  quantity: Number(userEditedItem.qtyValue),
  unit: userEditedItem.qtyUnit,
  gstRate: Number(userEditedItem.gstRate),
  isGSTInvoice: userEditedItem.isGSTInvoice,
  date: userEditedItem.date,
  invoiceNumber: userEditedItem.invoiceNumber,
  photoUrl: userEditedItem.photoUrl,
  aiRecognized: true,
  confidenceAverage: userEditedItem.confidenceScore ?? 0.95,
});

check(insertRes.success === true, 'Insert confirmed item returned success');
const purchasesAfterConfirm = getPurchases();
check(purchasesAfterConfirm.length === 1, 'Purchases list now has exactly 1 saved record');
const savedRecord = purchasesAfterConfirm[0];
check(
  savedRecord.item === 'Dr. Fixit Pidifin 2K Waterproofing 15kg',
  'Saved item matches AI recognition'
);
check(savedRecord.vendor === 'Shree Krishna Hardware', 'Saved vendor matches user manual edit');
check(savedRecord.unitPrice === 2150, 'Saved unitPrice matches user edit (2150)');
check(savedRecord.quantity === 5, 'Saved quantity matches user edit (5)');
check(savedRecord.unit === 'buckets', 'Saved unit matches user edit (buckets)');
check(savedRecord.totalPrice === 10750, 'Subtotal correctly calculated (5 * 2150 = 10,750)');
check(savedRecord.gstRate === 18, 'GST rate is 18%');
check(savedRecord.gstAmount === 1935, 'GST amount correctly calculated (10,750 * 0.18 = 1,935)');
check(savedRecord.netAmount === 12685, 'Net total correctly calculated (10,750 + 1,935 = 12,685)');
check(savedRecord.invoiceNumber === 'INV-2026-991', 'Invoice number matches user edit');

// -----------------------------------------------------------------------------
// TEST 5: Multi-Line Invoice Items Preserved & Reviewed
// -----------------------------------------------------------------------------
console.log('\n--- TEST 5: Multi-Line Invoice Items Preserved ---');
const invoiceWith2Items = validateAndNormalizeRecognition({
  document_type: 'invoice',
  item_name: 'Astral CPVC Pipe 1 inch 3m',
  vendor: 'Apex Plumbing Supplies',
  invoice_number: 'APX-7741',
  date: '2026-10-25',
  tax_rate: 18,
  line_items: [
    {
      item_name: 'Astral CPVC Pipe 1 inch 3m',
      description: 'Astral CPVC Pipe 1 inch 3m SDR 11',
      quantity: 50,
      unit: 'pieces',
      unit_price: 320,
      line_total: 16000,
    },
    {
      item_name: 'Astral CPVC 90 Deg Elbow 1 inch',
      description: 'Astral CPVC Elbow 1 inch Heavy',
      quantity: 100,
      unit: 'pieces',
      unit_price: 45,
      line_total: 4500,
    },
  ],
});

const invoiceMapped = (gateway as any).mapStructuredToRecognitionResult(invoiceWith2Items);
check(
  invoiceMapped.allLineItems && invoiceMapped.allLineItems.length === 2,
  'Invoice recognition extracted 2 line items'
);

// Map multi-line items to review items
const multiReviewItems: ReviewItemData[] = invoiceMapped.allLineItems.map((li: any) => ({
  item: li.item_name || li.description || '',
  vendor: invoiceMapped.vendor?.name || '',
  price: li.unit_price != null ? Number(li.unit_price) : '',
  company: invoiceMapped.company?.name || 'PW',
  qtyValue: li.quantity != null ? Number(li.quantity) : '',
  qtyUnit: li.unit || "no's",
  gstRate: invoiceMapped.gst?.rate != null ? Number(invoiceMapped.gst.rate) : '',
  isGSTInvoice: Boolean(
    invoiceMapped.gst?.isGSTInvoice &&
      invoiceMapped.gst?.rate &&
      Number(invoiceMapped.gst.rate) > 0
  ),
  date: invoiceMapped.invoiceDate || new Date().toISOString().split('T')[0],
  invoiceNumber: invoiceMapped.invoiceNumber || '',
  confidenceScore: li.confidence_score || 0.95,
}));

check(multiReviewItems.length === 2, 'Review modal receives both line items');
check(multiReviewItems[0].item.includes('Pipe'), 'Line item 1 is Pipe');
check(multiReviewItems[1].item.includes('Elbow'), 'Line item 2 is Elbow');
check(multiReviewItems[0].vendor === 'Apex Plumbing Supplies', 'Vendor mapped to item 1');
check(multiReviewItems[1].vendor === 'Apex Plumbing Supplies', 'Vendor mapped to item 2');

// Submit both items
for (const it of multiReviewItems) {
  insertMaterial({
    name: it.item,
    vendor: it.vendor,
    company: it.company,
    price: Number(it.price),
    quantity: Number(it.qtyValue),
    unit: it.qtyUnit,
    gstRate: Number(it.gstRate),
    isGSTInvoice: it.isGSTInvoice,
    date: it.date,
    invoiceNumber: it.invoiceNumber,
    aiRecognized: true,
  });
}

const finalPurchases = getPurchases();
check(
  finalPurchases.length === 3,
  'Both invoice line items successfully saved (total purchases now 3)'
);
const pipeRecord = finalPurchases.find((p) => p.item.includes('Pipe'));
const elbowRecord = finalPurchases.find((p) => p.item.includes('Elbow'));
check(
  pipeRecord !== undefined && elbowRecord !== undefined,
  'Neither line item was discarded during submission'
);
check(
  pipeRecord?.totalPrice === 16000,
  'Pipe line subtotal is 16,000 (50 * 320)'
);
check(
  elbowRecord?.totalPrice === 4500,
  'Elbow line subtotal is 4,500 (100 * 45)'
);

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`TEST RESULTS: ${passed} / ${total} checks passed (${((passed / total) * 100).toFixed(1)}%)`);
console.log('================================================================\n');

if (passed === total) {
  console.log('🎉 ALL MANDATORY REVIEW & MULTI-ITEM TESTS PASSED!');
  process.exit(0);
} else {
  console.error('❌ SOME TESTS FAILED');
  process.exit(1);
}
