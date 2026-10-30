// api/health.ts
// Vercel Serverless Function health check endpoint

export default function handler(req: any, res: any) {
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim());

  const data = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    aiProviders: {
      gemini: { configured: geminiConfigured, model: process.env.GEMINI_MODEL || 'gemini-3.5-flash' },
      openai: { configured: openaiConfigured, model: process.env.OPENAI_MODEL || 'gpt-4o-mini' },
    },
  };

  if (res && typeof res.status === 'function') {
    return res.status(200).json(data);
  }
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

