// vite-plugin-ai-recognition.ts
import type { Plugin } from 'vite';
import { loadEnv } from 'vite';
import {
  executeOpenAIVisionRecognition,
  executeGeminiVisionRecognition,
  AIRecognitionError,
} from './src/services/aiRecognitionEngine.ts';

export function aiRecognitionPlugin(): Plugin {
  let envConfig: Record<string, string> = {};

  return {
    name: 'vite-plugin-ai-recognition',
    configResolved(config) {
      envConfig = loadEnv(config.mode, process.cwd(), '');
    },
    configureServer(server) {
      server.middlewares.use('/api/recognize', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Method Not Allowed', code: 'METHOD_NOT_ALLOWED', retryable: false }));
          return;
        }

        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });

        req.on('end', async () => {
          try {
            const parsed = JSON.parse(body || '{}');
            const { imageBase64 } = parsed;

            if (!imageBase64 || typeof imageBase64 !== 'string' || !imageBase64.trim()) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing required imageBase64 in request body.', code: 'INVALID_INPUT', retryable: false }));
              return;
            }

            if (imageBase64.length > 14 * 1024 * 1024) {
              res.statusCode = 413;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Image payload exceeds 10MB limit.', code: 'PAYLOAD_TOO_LARGE', retryable: false }));
              return;
            }

            const dynamicEnv = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), '');
            const geminiKey = process.env.GEMINI_API_KEY || dynamicEnv.GEMINI_API_KEY || envConfig.GEMINI_API_KEY || '';
            const geminiModel = process.env.GEMINI_MODEL || dynamicEnv.GEMINI_MODEL || envConfig.GEMINI_MODEL || 'gemini-3.5-flash';

            const openaiKey = process.env.OPENAI_API_KEY || dynamicEnv.OPENAI_API_KEY || envConfig.OPENAI_API_KEY || '';
            const openaiModel = process.env.OPENAI_MODEL || dynamicEnv.OPENAI_MODEL || envConfig.OPENAI_MODEL || 'gpt-4o-mini';

            let result;
            let usedModel;

            if (geminiKey && geminiKey.trim()) {
              usedModel = geminiModel;
              result = await executeGeminiVisionRecognition(imageBase64, geminiKey, geminiModel);
            } else if (openaiKey && openaiKey.trim()) {
              usedModel = openaiModel;
              result = await executeOpenAIVisionRecognition(imageBase64, openaiKey, openaiModel);
            } else {
              res.statusCode = 422;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  error: 'Neither GEMINI_API_KEY nor OPENAI_API_KEY is configured in your .env file.',
                  code: 'MISSING_API_KEY',
                  retryable: false,
                })
              );
              return;
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, model: usedModel, result }));
          } catch (err: any) {
            const statusCode = err instanceof AIRecognitionError ? err.statusCode : (err.statusCode || 500);
            const errorCode = err instanceof AIRecognitionError ? err.code : 'AI_RECOGNITION_FAILED';
            const isRetryable = err instanceof AIRecognitionError ? err.retryable : (statusCode === 429 || statusCode >= 502);

            let safeMessage = err.message || 'Recognition processing failed';
            safeMessage = safeMessage.replace(/(?:key=|Bearer\s+)[A-Za-z0-9._-]+/gi, '[REDACTED]');

            console.error('[AI Vision Endpoint Error]:', safeMessage);
            res.statusCode = statusCode;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: safeMessage, code: errorCode, retryable: isRetryable, retryAfter: err.retryAfter, status: statusCode }));
          }
        });
      });
    },
  };
}
