// vite-plugin-ai-recognition.ts
import type { Plugin } from 'vite';
import { loadEnv } from 'vite';
import { executeOpenAIVisionRecognition } from './src/services/aiRecognitionEngine';

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

            const apiKey = process.env.OPENAI_API_KEY || envConfig.OPENAI_API_KEY || '';
            const model = process.env.OPENAI_MODEL || envConfig.OPENAI_MODEL || 'gpt-4o-mini';

            if (!apiKey) {
              res.statusCode = 422;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  error: 'OPENAI_API_KEY is not configured in environment variables (.env / server environment).',
                  code: 'MISSING_API_KEY',
                  model,
                })
              );
              return;
            }

            const result = await executeOpenAIVisionRecognition(imageBase64, apiKey, model);

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true, model, result }));
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
