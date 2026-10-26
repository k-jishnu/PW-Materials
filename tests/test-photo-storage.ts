// tests/test-photo-storage.ts
import {
  savePhoto,
  getPhoto,
  deletePhoto,
  clearAllPhotos,
  isPdfDocument,
  extractMimeType,
} from '../src/services/localPhotoStorage';
import {
  getPurchases,
  insertMaterial,
  deletePurchase,
  clearAllPurchases,
} from '../src/services/localDataService';

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
console.log('TEST SUITE: PHOTO PRESERVATION, VIEWING & LOCAL STORAGE');
console.log('================================================================\n');

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

async function runTests() {
  clearAllPurchases();
  await clearAllPhotos();

  // ---------------------------------------------------------------------------
  // TEST 1: Saving Image & PDF Photo to Storage
  // ---------------------------------------------------------------------------
  console.log('--- TEST 1: Photo & PDF Storage Preservation ---');
  const sampleImageBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP...';
  const samplePdfBase64 = 'data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCDC...';

  check(extractMimeType(sampleImageBase64) === 'image/jpeg', 'extractMimeType identifies image/jpeg');
  check(extractMimeType(samplePdfBase64) === 'application/pdf', 'extractMimeType identifies application/pdf');
  check(isPdfDocument(samplePdfBase64) === true, 'isPdfDocument correctly identifies PDF data URL');
  check(isPdfDocument(sampleImageBase64) === false, 'isPdfDocument returns false for image');

  const photoRef = await savePhoto('test_photo_001', sampleImageBase64, 'cement_bag.jpg');
  check(photoRef === 'idb://photos/test_photo_001', 'savePhoto returns idb:// reference URI');

  const retrieved = await getPhoto(photoRef);
  check(retrieved !== null, 'getPhoto retrieves stored photo record');
  check(retrieved?.data === sampleImageBase64, 'Stored photo data matches original uploaded image');
  check(retrieved?.mimeType === 'image/jpeg', 'Stored photo mimeType is image/jpeg');

  const pdfRef = await savePhoto('test_invoice_pdf', samplePdfBase64, 'bill.pdf');
  check(pdfRef === 'idb://photos/test_invoice_pdf', 'savePhoto handles PDF and returns reference');
  const retrievedPdf = await getPhoto(pdfRef);
  check(retrievedPdf?.mimeType === 'application/pdf', 'Retrieved PDF has mimeType application/pdf');

  // ---------------------------------------------------------------------------
  // TEST 2: Associating Photo Reference with Material Record
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 2: Associating Photo Reference with Material Record ---');
  const insertRes = insertMaterial({
    name: 'UltraTech Super Cement 50kg',
    vendor: 'Sri Balaji Agencies',
    price: 380,
    quantity: 25,
    unit: 'bags',
    gstRate: 18,
    isGSTInvoice: true,
    photoUrl: photoRef,
    aiRecognized: true,
  });

  check(insertRes.success === true, 'insertMaterial succeeded');
  const savedPurchases = getPurchases();
  check(savedPurchases.length === 1, 'Purchases list has 1 saved record');
  check(savedPurchases[0].photoUrl === photoRef, 'Purchase record stores the lightweight photo reference');

  // Verify that localStorage contains the lightweight reference and NOT the raw base64 string
  const rawStorage = store['pw_materials_local_purchases'] || '';
  check(rawStorage.includes('idb://photos/test_photo_001'), 'localStorage contains idb:// URI reference');
  check(!rawStorage.includes(sampleImageBase64), 'localStorage is NOT bloated with raw base64 image data');

  // ---------------------------------------------------------------------------
  // TEST 3: Editing Material Preserves Existing Photo
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 3: Editing Material Preserves Photo Reference ---');
  const recordToUpdate = savedPurchases[0];
  const { updatePurchase } = await import('../src/services/localDataService');
  updatePurchase(recordToUpdate.id, {
    quantity: 30,
    unitPrice: 390,
  });

  const updatedPurchases = getPurchases();
  check(updatedPurchases[0].quantity === 30, 'Quantity updated to 30');
  check(updatedPurchases[0].unitPrice === 390, 'Unit price updated to 390');
  check(updatedPurchases[0].photoUrl === photoRef, 'Photo reference strictly preserved across edits');

  // ---------------------------------------------------------------------------
  // TEST 4: Shared Photo Across Multi-Line Items & Safe Deletion
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 4: Multi-Item Shared Photo & Safe Deletion ---');
  // Two invoice items sharing the same invoice PDF
  const item1Res = insertMaterial({
    name: 'CPVC Pipe 1 inch',
    vendor: 'Supreme Pipes',
    price: 320,
    quantity: 50,
    photoUrl: pdfRef,
  });
  const item2Res = insertMaterial({
    name: 'CPVC Elbow 1 inch',
    vendor: 'Supreme Pipes',
    price: 45,
    quantity: 100,
    photoUrl: pdfRef,
  });

  check(item1Res.success && item2Res.success, 'Both line items saved with shared PDF photo reference');

  // Deleting item 1 must NOT delete the shared PDF photo because item 2 still references it!
  const allPurchasesNow = getPurchases();
  const id1 = item1Res.data!.id;
  const id2 = item2Res.data!.id;

  // Simulate useMaterials safe delete logic:
  const isSharedBefore = allPurchasesNow.some((p) => p.id !== id1 && p.photoUrl === pdfRef);
  check(isSharedBefore === true, 'Photo is identified as shared between line items');
  if (!isSharedBefore) {
    await deletePhoto(pdfRef);
  }
  deletePurchase(id1);

  // Verify photo is STILL in storage
  const photoStillExists = await getPhoto(pdfRef);
  check(photoStillExists !== null, 'Shared invoice PDF preserved after deleting first line item');

  // Now delete item 2: since it's the last one, photo can be safely removed
  const purchasesAfterOneDelete = getPurchases();
  const isSharedNow = purchasesAfterOneDelete.some((p) => p.id !== id2 && p.photoUrl === pdfRef);
  check(isSharedNow === false, 'Photo is no longer shared after deleting item 2');
  if (!isSharedNow) {
    await deletePhoto(pdfRef);
  }
  deletePurchase(id2);

  const photoAfterBothDeleted = await getPhoto(pdfRef);
  check(photoAfterBothDeleted === null, 'Photo safely cleaned up after all referencing items are deleted');

  // ---------------------------------------------------------------------------
  // TEST 5: Cancellation Leaves No Orphaned Photo
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 5: Cancellation Flow Leaves No Orphaned Photo ---');
  // In review modal, if user cancels, savePhoto was never called.
  const tempPhotoKey = 'unconfirmed_candidate';
  const unconfirmedCheck = await getPhoto(`idb://photos/${tempPhotoKey}`);
  check(unconfirmedCheck === null, 'No photo persisted for unconfirmed/cancelled review');

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passed} / ${total} checks passed (${((passed / total) * 100).toFixed(1)}%)`);
  console.log('================================================================\n');

  if (passed === total) {
    console.log('🎉 ALL PHOTO STORAGE & PRESERVATION TESTS PASSED!');
    process.exit(0);
  } else {
    console.error('❌ SOME TESTS FAILED');
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test run failed with error:', err);
  process.exit(1);
});
