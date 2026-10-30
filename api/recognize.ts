// api/recognize.ts
// Vercel Serverless Function for secure server-side AI Vision processing (Gemini & OpenAI)

import {
  executeOpenAIVisionRecognition,
  executeGeminiVisionRecognition,
  AIRecognitionError,
} from '../src/services/aiRecognitionEngine.ts';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
  maxDuration: 60,
};

async function getRequestBody(req: any): Promise<any> {
  if (!req) return {};
  if (typeof req.json === 'function' && !req.body) {
    try {
      return await req.json();
    } catch {
      return {};
    }
  }
  if (req.body) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch {
        return {};
      }
    }
    if (Buffer.isBuffer(req.body)) {
      try {
        return JSON.parse(req.body.toString('utf-8'));
      } catch {
        return {};
      }
    }
    if (typeof req.body === 'object') {
      return req.body;
    }
  }
  // If req is a Node stream
  if (typeof req.on === 'function') {
    return new Promise((resolve) => {
      let raw = '';
      req.on('data', (chunk: any) => {
        raw += chunk;
      });
      req.on('end', () => {
        try {
          resolve(JSON.parse(raw || '{}'));
        } catch {
          resolve({});
        }
      });
      req.on('error', () => resolve({}));
    });
  }
  return {};
}

function sendResponse(res: any, statusCode: number, data: any) {
  if (res && typeof res.status === 'function') {
    if (typeof res.setHeader === 'function') {
      res.setHeader('Content-Type', 'application/json');
    }
    return res.status(statusCode).json(data);
  }
  return new Response(JSON.stringify(data), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default async function handler(req: any, res?: any) {
  const reqId = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const startTime = Date.now();

  const method = req?.method || (req instanceof Request ? req.method : 'POST');
  if (method !== 'POST') {
    return sendResponse(res, 405, {
      error: 'Method Not Allowed. Use POST.',
      code: 'METHOD_NOT_ALLOWED',
      retryable: false,
    });
  }

  try {
    const body = await getRequestBody(req);
    const { imageBase64 } = body || {};

    if (!imageBase64 || typeof imageBase64 !== 'string' || !imageBase64.trim()) {
      return sendResponse(res, 400, {
        error: 'Missing or empty imageBase64 payload in request body.',
        code: 'INVALID_INPUT',
        retryable: false,
      });
    }

    // 1. Check payload size (10MB limit; base64 encodes 3 bytes per 4 chars)
    if (imageBase64.length > 14 * 1024 * 1024) {
      console.warn(`[AI Vision] [${reqId}] Image payload exceeds size limit: ${imageBase64.length} chars`);
      return sendResponse(res, 413, {
        error: 'Image payload exceeds the 10MB limit. Please upload a smaller or compressed photograph.',
        code: 'PAYLOAD_TOO_LARGE',
        retryable: false,
      });
    }

    // 2. Validate MIME type
    let mimeType = 'image/jpeg';
    if (imageBase64.startsWith('data:')) {
      const match = imageBase64.match(/^data:([^;]+);base64,/);
      if (match) {
        mimeType = match[1].toLowerCase().trim();
      }
    }
    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (!supportedTypes.includes(mimeType)) {
      console.warn(`[AI Vision] [${reqId}] Unsupported format: ${mimeType}`);
      return sendResponse(res, 400, {
        error: `Unsupported document format "${mimeType}". Please upload a JPEG, PNG, WebP, GIF, or PDF document.`,
        code: 'UNSUPPORTED_MEDIA_TYPE',
        retryable: false,
      });
    }

    const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
    const geminiModel = (process.env.GEMINI_MODEL || 'gemini-3.5-flash').trim();

    const openaiKey = (process.env.OPENAI_API_KEY || '').trim();
    const openaiModel = (process.env.OPENAI_MODEL || 'gpt-4o-mini').trim();

    if (!geminiKey && !openaiKey) {
      console.error(`[AI Vision] [${reqId}] Missing API keys (GEMINI_API_KEY / OPENAI_API_KEY) in environment.`);
      return sendResponse(res, 422, {
        error: 'Neither GEMINI_API_KEY nor OPENAI_API_KEY is configured on the server.',
        code: 'MISSING_API_KEY',
        retryable: false,
      });
    }

    console.log(`[AI Vision] [${reqId}] Processing request. Mime: ${mimeType}, Size: ${(imageBase64.length / 1024).toFixed(1)} KB`);

    let result;
    let usedModel = '';

    if (geminiKey) {
      usedModel = geminiModel;
      console.log(`[AI Vision] [${reqId}] Connecting to Gemini provider (${usedModel})...`);
      result = await executeGeminiVisionRecognition(imageBase64, geminiKey, geminiModel);
    } else {
      usedModel = openaiModel;
      console.log(`[AI Vision] [${reqId}] Connecting to OpenAI provider (${usedModel})...`);
      result = await executeOpenAIVisionRecognition(imageBase64, openaiKey, openaiModel);
    }

    const duration = Date.now() - startTime;
    console.log(`[AI Vision] [${reqId}] Successfully recognized material in ${duration}ms using ${usedModel}`);

    return sendResponse(res, 200, {
      success: true,
      reqId,
      model: usedModel,
      durationMs: duration,
      result,
    });
  } catch (err: any) {
    const duration = Date.now() - startTime;
    const statusCode = err instanceof AIRecognitionError ? err.statusCode : (err.statusCode || 500);
    const errorCode = err instanceof AIRecognitionError ? err.code : (err.code || 'AI_RECOGNITION_FAILED');
    const isRetryable = err instanceof AIRecognitionError ? err.retryable : (statusCode === 429 || statusCode === 502 || statusCode === 503 || statusCode === 504);

    // Sanitize error message to prevent leaking any secrets, endpoints, or internal stack traces
    let safeMessage = err.message || 'Vision recognition processing failed.';
    // Remove any API keys or Authorization headers from message if inadvertently included
    safeMessage = safeMessage.replace(/(?:key=|Bearer\s+)[A-Za-z0-9._-]+/gi, '[REDACTED]');

    console.error(`[AI Vision] [${reqId}] Error after ${duration}ms (HTTP ${statusCode} / ${errorCode}): ${safeMessage}`);

    return sendResponse(res, statusCode, {
      error: safeMessage,
      code: errorCode,
      retryable: isRetryable,
      retryAfter: err.retryAfter,
      reqId,
      status: statusCode,
    });
  }
}
