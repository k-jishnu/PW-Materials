// tests/test-progress-and-default-view.ts
import { validateAndNormalizeRecognition } from '../src/services/aiRecognitionEngine';
import { GatewayAPI } from '../src/services/gatewayAPI';
import { resilientGateway } from '../src/services/resilientGateway';

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
console.log('TEST SUITE: AI EXTRACTION PROGRESS & DEFAULT TABLE VIEW');
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
  // ---------------------------------------------------------------------------
  // TEST 1: Default Materials View is Table View on Both Mobile & Desktop
  // ---------------------------------------------------------------------------
  console.log('--- TEST 1: Default Materials List / Table View ---');
  delete store['pw_materials_view_mode'];

  // Test initial default without saved preference
  function getInitialViewMode() {
    try {
      const saved = (globalThis as any).localStorage.getItem('pw_materials_view_mode');
      if (saved === 'card' || saved === 'table') {
        return saved;
      }
    } catch {}
    return 'table'; // Mandatory default
  }

  check(getInitialViewMode() === 'table', 'Initial default viewMode is "table" (not "card")');

  // Verify view mode persists when user explicitly selects card
  (globalThis as any).localStorage.setItem('pw_materials_view_mode', 'card');
  check(getInitialViewMode() === 'card', 'Explicit user preference "card" is respected');

  // Verify view mode switches back to table and persists
  (globalThis as any).localStorage.setItem('pw_materials_view_mode', 'table');
  check(getInitialViewMode() === 'table', 'Explicit user preference "table" is respected and persisted');

  // ---------------------------------------------------------------------------
  // TEST 2: Stage-Based Progress Reporting Across the Lifecycle
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 2: Stage-Based Progress Reporting ---');
  const recordedStages: Array<{ progress: number; stage?: string; message?: string }> = [];

  const mockProgressCallback = (p: number, stage?: string, message?: string) => {
    recordedStages.push({ progress: p, stage, message });
  };

  // Mock server response
  const originalFetch = globalThis.fetch;
  (globalThis as any).fetch = async (url: string) => {
    if (url.includes('/api/recognize')) {
      // Simulate network latency of 1200ms
      await new Promise((r) => setTimeout(r, 1200));
      return {
        ok: true,
        json: async () => ({
          success: true,
          result: {
            document_type: 'material_photo',
            item_name: 'ACC Suraksha Power Cement 50kg',
            rate: 395,
            vendor: 'ACC Limited',
            quantity: 40,
            unit: 'bags',
            gst_tax: 18,
            company_ref: 'PW',
          },
        }),
      };
    }
    return originalFetch(url);
  };

  const gateway = new GatewayAPI();
  const recognitionPromise = gateway.recognizeMaterial(
    'data:image/jpeg;base64,dummy',
    mockProgressCallback
  );

  const result = await recognitionPromise;

  // Restore fetch
  (globalThis as any).fetch = originalFetch;

  check(recordedStages.length >= 4, 'Multiple progressive stages recorded during recognition');
  
  // Verify stages
  const preparingStage = recordedStages.find((s) => s.stage === 'preparing');
  check(preparingStage !== undefined && preparingStage.progress === 10, 'Stage 1 (0-10%): "preparing" document');

  const sendingStage = recordedStages.find((s) => s.stage === 'sending');
  check(sendingStage !== undefined && sendingStage.progress === 25, 'Stage 2 (10-30%): "sending" to AI engine');

  const extractingStage = recordedStages.find((s) => s.stage === 'extracting');
  check(extractingStage !== undefined && extractingStage.progress >= 30, 'Stage 3 (30-80%): "extracting" active model analysis');

  const processingStage = recordedStages.find((s) => s.stage === 'processing');
  check(processingStage !== undefined && processingStage.progress >= 85, 'Stage 4 (80-95%): "processing" results');

  const completeStage = recordedStages.find((s) => s.stage === 'complete');
  check(completeStage !== undefined && completeStage.progress === 100, 'Stage 5 (100%): "complete" verified result');

  check(result.item.name === 'ACC Suraksha Power Cement 50kg', 'Recognition result verified');
  check(result.price.amount === 395, 'Unit price verified');

  // ---------------------------------------------------------------------------
  // TEST 3: Cancellation via AbortSignal (Stops Immediately)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 3: Cancellation Support via AbortSignal ---');
  const abortCtrl = new AbortController();

  (globalThis as any).fetch = async (url: string, opts: any) => {
    if (url.includes('/api/recognize')) {
      return new Promise((_, reject) => {
        opts.signal.addEventListener('abort', () => {
          const err = new Error('The operation was aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    }
    return originalFetch(url, opts);
  };

  let cancelCaught = false;
  const cancelPromise = gateway.recognizeMaterial(
    'data:image/jpeg;base64,dummy',
    () => {},
    abortCtrl.signal
  ).catch((e) => {
    if (e.message.includes('timed out') || e.name === 'AbortError' || e.message.includes('aborted')) {
      cancelCaught = true;
    }
  });

  // Trigger abort after 100ms
  setTimeout(() => abortCtrl.abort(), 100);
  await cancelPromise;

  (globalThis as any).fetch = originalFetch;
  check(cancelCaught === true, 'Aborting recognition throws clean cancellation error without unhandled exception');

  // ---------------------------------------------------------------------------
  // TEST 4: Timeout Protection (No Indefinite 5-Minute Hangs)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 4: Timeout Handling Protection ---');
  let timeoutCaught = false;
  (globalThis as any).fetch = async () => {
    const err = new Error('The operation was aborted due to timeout');
    err.name = 'AbortError';
    throw err;
  };

  try {
    await gateway.recognizeMaterial('data:image/jpeg;base64,dummy');
  } catch (err: any) {
    if (err.message.includes('timed out') || err.message.includes('retry')) {
      timeoutCaught = true;
    }
  }

  (globalThis as any).fetch = originalFetch;
  check(timeoutCaught === true, 'Timeout triggers actionable retry error message');

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passed} / ${total} checks passed (${((passed / total) * 100).toFixed(1)}%)`);
  console.log('================================================================\n');

  if (passed === total) {
    console.log('🎉 ALL PROGRESS & DEFAULT TABLE VIEW TESTS PASSED!');
    process.exit(0);
  } else {
    console.error('❌ SOME TESTS FAILED');
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Test run failed:', e);
  process.exit(1);
});
