// api/recognize.ts
// Vercel Serverless Function for secure server-side OpenAI Vision processing

import { executeOpenAIVisionRecognition } from '../src/services/aiRecognitionEngine';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { imageBase64 } = req.body || {};

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return res.status(400).json({ error: 'Missing required imageBase64 in request body.' });
    }

    const apiKey = process.env.OPENAI_API_KEY || '';
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    if (!apiKey) {
      return res.status(422).json({
        error: 'OPENAI_API_KEY is not configured in Vercel environment variables.',
        code: 'MISSING_API_KEY',
        model,
      });
    }

    const result = await executeOpenAIVisionRecognition(imageBase64, apiKey, model);

    return res.status(200).json({
      success: true,
      model,
      result,
    });
  } catch (err: any) {
    console.error('[Vercel AI Vision Error]:', err.message);
    return res.status(500).json({ error: err.message || 'Vision recognition processing failed.' });
  }
}
