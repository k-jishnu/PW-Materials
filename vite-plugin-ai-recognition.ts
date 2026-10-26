// vite-plugin-ai-recognition.ts
import type { Plugin } from 'vite';
import { loadEnv } from 'vite';
import { executeOpenAIVisionRecognition, executeGeminiVisionRecognition } from './src/services/aiRecognitionEngine';

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
          res.end(JSON.stringify({ error: 'Method Not Allowed' }));
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

            if (!imageBase64 || typeof imageBase64 !== 'string') {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing required imageBase64 in request body.' }));
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
                })
              );
              return;
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, model: usedModel, result }));
          } catch (err: any) {
            console.error('[AI Vision Endpoint Error]:', err.message);
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Recognition processing failed' }));
          }
        });
      });
    },
  };
}
