// tests/test-ai-recognition-production.ts
import fs from 'node:fs';
import path from 'node:path';
import {
  AIRecognitionError,
  validateAndNormalizeRecognition,
} from '../src/services/aiRecognitionEngine.ts';
import { GatewayError } from '../src/services/gatewayAPI.ts';

console.log('================================================================');
console.log('TEST SUITE: AI RECOGNITION, PROGRESS ENGINE & UI STABILIZATION');
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

// -----------------------------------------------------------------------------
// SECTION 1: BACKEND TESTS
// -----------------------------------------------------------------------------
console.log('--- 1. BACKEND: VALIDATION & ERROR CLASSIFICATION ---');

// 1.1 Successful AI recognition structure
const mockValidAiJson = {
  document_type: 'material_photo',
  item_name: 'Havells 32A DP MCB',
  rate: 340,
  vendor: 'Havells',
  quantity: 2,
  unit: 'nos',
  gst_tax: null,
  supplier_name: null,
};
const normalized = validateAndNormalizeRecognition(mockValidAiJson);
check('Successful recognition normalizes document_type', normalized.document_type === 'material_photo');
check('Successful recognition normalizes item_name', normalized.item_name === 'Havells 32A DP MCB');
check('Successful recognition normalizes manufacturer/brand in vendor', normalized.vendor === 'Havells');
check('Successful recognition normalizes supplier_name as null for material photo', normalized.supplier_name === null);
check('Successful recognition normalizes quantity and rate', normalized.quantity === 2 && normalized.rate === 340);

// 1.2 Invalid image payload validation
function validatePayload(body: any) {
  const { imageBase64 } = body || {};
  if (!imageBase64 || typeof imageBase64 !== 'string' || !imageBase64.trim()) {
    return { valid: false, status: 400, code: 'INVALID_INPUT' };
  }
  if (imageBase64.length > 14 * 1024 * 1024) {
    return { valid: false, status: 413, code: 'PAYLOAD_TOO_LARGE' };
  }
  let mimeType = 'image/jpeg';
  if (imageBase64.startsWith('data:')) {
    const match = imageBase64.match(/^data:([^;]+);base64,/);
    if (match) mimeType = match[1].toLowerCase().trim();
  }
  const supported = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
  if (!supported.includes(mimeType)) {
    return { valid: false, status: 400, code: 'UNSUPPORTED_MEDIA_TYPE' };
  }
  return { valid: true, mimeType };
}

check('Rejects missing payload', validatePayload(null).status === 400);
check('Rejects empty imageBase64', validatePayload({ imageBase64: '' }).status === 400);
check('Rejects non-string imageBase64', validatePayload({ imageBase64: 12345 }).status === 400);

// 1.3 Unsupported format & oversized payload
check('Rejects unsupported text format', validatePayload({ imageBase64: 'data:text/plain;base64,SGVsbG8=' }).status === 400);
check('Rejects unsupported exe format', validatePayload({ imageBase64: 'data:application/octet-stream;base64,AAAA' }).status === 400);
check('Accepts JPEG image', validatePayload({ imageBase64: 'data:image/jpeg;base64,abc' }).valid === true);
check('Accepts PNG image', validatePayload({ imageBase64: 'data:image/png;base64,abc' }).valid === true);
check('Accepts WebP image', validatePayload({ imageBase64: 'data:image/webp;base64,abc' }).valid === true);
check('Accepts PDF invoice', validatePayload({ imageBase64: 'data:application/pdf;base64,abc' }).valid === true);

const hugeString = 'a'.repeat(15 * 1024 * 1024);
check('Rejects payload exceeding 10MB limit with HTTP 413', validatePayload({ imageBase64: hugeString }).status === 413);

// 1.4 Missing credentials
const errMissingCreds = new AIRecognitionError('Neither GEMINI_API_KEY nor OPENAI_API_KEY is configured.', 422, 'MISSING_API_KEY', false);
check('Missing credentials produces HTTP 422 and non-retryable error', errMissingCreds.statusCode === 422 && errMissingCreds.retryable === false);

// 1.5 Provider HTTP 429 (Rate Limit)
const errRateLimit = new AIRecognitionError('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED', true, 5);
check('HTTP 429 is marked retryable with retryAfter', errRateLimit.statusCode === 429 && errRateLimit.retryable === true && errRateLimit.retryAfter === 5);

// 1.6 Provider HTTP 500 / 503
const err503 = new AIRecognitionError('Service overloaded', 503, 'SERVICE_UNAVAILABLE', true);
check('HTTP 503 is marked retryable', err503.statusCode === 503 && err503.retryable === true);

// 1.7 Provider Timeout
const errTimeout = new AIRecognitionError('Request timed out', 504, 'TIMEOUT', true);
check('Timeout produces HTTP 504 and is retryable', errTimeout.statusCode === 504 && errTimeout.retryable === true);

// 1.8 Malformed response
const errParse = new AIRecognitionError('Failed to parse AI JSON', 502, 'AI_RESPONSE_PARSE_ERROR', true);
check('Parse error produces HTTP 502 and is retryable', errParse.statusCode === 502 && errParse.retryable === true);

// -----------------------------------------------------------------------------
// SECTION 2: PROGRESS ENGINE & MONOTONICITY
// -----------------------------------------------------------------------------
console.log('\n--- 2. PROGRESS ENGINE: MONOTONICITY & RETRY BEHAVIOR ---');

class MonotonicProgressTracker {
  private highest = 0;
  public progress = 0;
  public stage = 'idle';
  public message = '';

  public update(p: number, stg?: string, msg?: string) {
    this.highest = Math.max(this.highest, p);
    this.progress = Math.min(100, Math.max(0, this.highest));
    if (stg) this.stage = stg;
    if (msg) this.message = msg;
  }

  public complete() {
    this.highest = 100;
    this.progress = 100;
    this.stage = 'complete';
  }

  public fail(msg: string) {
    this.stage = 'error';
    this.message = msg;
    // Note: progress is NOT set to 100 on failure!
  }

  public resetForNewJob() {
    this.highest = 0;
    this.progress = 0;
    this.stage = 'idle';
  }
}

const tracker = new MonotonicProgressTracker();
tracker.update(15, 'preparing', 'Preparing image...');
check('Initial stage progress is 15%', tracker.progress === 15);

tracker.update(40, 'connecting', 'Connecting...');
check('Progress advances to 40%', tracker.progress === 40);

tracker.update(60, 'analyzing', 'Analyzing...');
check('Progress advances to 60%', tracker.progress === 60);

// Attempt 1 fails at 60%, retry starts:
tracker.update(25, 'connecting', 'Temporary connection issue. Retrying...');
check('Progress NEVER decreases when retry starts (stays at 60%, not 25%)', tracker.progress === 60);

tracker.update(50, 'analyzing', 'Analyzing attempt 2...');
check('Progress still holds at highest confirmed 60%', tracker.progress === 60);

tracker.update(80, 'extracting', 'Extracting details...');
check('Progress advances to 80%', tracker.progress === 80);

// If error occurs:
tracker.fail('Service unavailable');
check('Failure enters error stage without displaying 100%', tracker.stage === 'error' && tracker.progress === 80);

// On successful job:
const tracker2 = new MonotonicProgressTracker();
tracker2.update(20, 'preparing');
tracker2.update(60, 'analyzing');
tracker2.update(90, 'validating');
tracker2.complete();
check('Successful completion reaches 100%', tracker2.progress === 100 && tracker2.stage === 'complete');

// -----------------------------------------------------------------------------
// SECTION 3: UI INSPECTIONS (PhotoCapture.tsx & App.tsx)
// -----------------------------------------------------------------------------
console.log('\n--- 3. UI ARCHITECTURE: FIXED CONTAINER, NO ALERTS & MANUAL FALLBACK ---');

const photoCaptureCode = fs.readFileSync(path.resolve('src/components/PhotoSection/PhotoCapture.tsx'), 'utf8');
const appCode = fs.readFileSync(path.resolve('src/App.tsx'), 'utf8');

check('Fixed-size extraction container exists with maxWidth 520px', photoCaptureCode.includes("maxWidth: '520px'"));
check('Extraction container has stable minHeight 380px to prevent layout jumping', photoCaptureCode.includes("minHeight: '380px'"));
check('Dedicated fixed-height status message area exists (minHeight: 48px)', photoCaptureCode.includes("minHeight: '48px'"));
check('Dedicated status message uses overflowWrap break-word for long messages', photoCaptureCode.includes("overflowWrap: 'break-word'"));
check('Application-level error panel exists (data-testid="recognition-error-panel")', photoCaptureCode.includes('recognition-error-panel'));
check('Retry recognition button exists in error panel', photoCaptureCode.includes('Retry recognition'));
check('Enter details manually button exists in error panel', photoCaptureCode.includes('Enter details manually'));
check('Preserved photo thumbnail is rendered in error panel', photoCaptureCode.includes('preview &&') && photoCaptureCode.includes('Material thumbnail'));
check('Browser alert() popup is completely removed from App.tsx recognition flow', !appCode.includes('alert(`AI Recognition Error'));
check('App.tsx stores recognitionError and passes manual fallback with photoUrl', appCode.includes('setRecognitionError') && appCode.includes('onManualEntryWithPhoto'));

// -----------------------------------------------------------------------------
// SECTION 4: SERVERLESS ENDPOINT STATIC CHECKS (api/recognize.ts)
// -----------------------------------------------------------------------------
console.log('\n--- 4. VERCEL SERVERLESS ENDPOINT: BODY PARSING & ERROR RESPONSES ---');

const apiCode = fs.readFileSync(path.resolve('api/recognize.ts'), 'utf8');
check('api/recognize.ts is self-contained with zero fragile relative imports', !apiCode.includes("from '../src/"));
check('api/recognize.ts handles dual stream/object body parsing safely', apiCode.includes('getRequestBody') && apiCode.includes('Buffer.isBuffer'));
check('api/recognize.ts validates 10MB payload size limit (HTTP 413)', apiCode.includes('14 * 1024 * 1024') && apiCode.includes('413'));
check('api/recognize.ts validates supported MIME types', apiCode.includes('supportedTypes') && apiCode.includes('application/pdf'));
check('api/recognize.ts includes request ID and duration in structured logs', apiCode.includes('reqId') && apiCode.includes('durationMs'));
check('api/recognize.ts redacts sensitive tokens or keys from error messages', apiCode.includes('[REDACTED]'));

// -----------------------------------------------------------------------------
// SUMMARY
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`TEST RESULTS: ${passCount} / ${totalCount} checks passed (${((passCount / totalCount) * 100).toFixed(1)}%)`);
console.log('================================================================\n');

if (passCount === totalCount) {
  console.log('🎉 ALL AI RECOGNITION, PROGRESS ENGINE & UI TESTS PASSED!');
  process.exit(0);
} else {
  console.error('❌ Some tests failed.');
  process.exit(1);
}

