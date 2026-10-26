// api/recognize.ts
// Vercel Serverless Function for secure server-side OpenAI Vision processing

import { executeOpenAIVisionRecognition, executeGeminiVisionRecognition } from '../src/services/aiRecognitionEngine';

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

    const geminiKey = process.env.GEMINI_API_KEY || '';
    const geminiModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash';

    const openaiKey = process.env.OPENAI_API_KEY || '';
    const openaiModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    let result;
    let usedModel;

    if (geminiKey && geminiKey.trim()) {
      usedModel = geminiModel;
      result = await executeGeminiVisionRecognition(imageBase64, geminiKey, geminiModel);
    } else if (openaiKey && openaiKey.trim()) {
      usedModel = openaiModel;
      result = await executeOpenAIVisionRecognition(imageBase64, openaiKey, openaiModel);
    } else {
      return res.status(422).json({
        error: 'Neither GEMINI_API_KEY nor OPENAI_API_KEY is configured.',
        code: 'MISSING_API_KEY',
      });
    }

    return res.status(200).json({
      success: true,
      model: usedModel,
      result,
    });
  } catch (err: any) {
    console.error('[Vercel AI Vision Error]:', err.message);
    return res.status(500).json({ error: err.message || 'Vision recognition processing failed.' });
  }
}
