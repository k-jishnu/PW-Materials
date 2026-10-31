import fs from 'fs';

const env = fs.readFileSync('.env', 'utf-8');
const key = env.match(/GEMINI_API_KEY=(.+)/)[1].trim();

const models = [
  'gemini-flash-latest',
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
];

async function bench(model) {
  const start = Date.now();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Return {"status": "ok"}' }] }],
        generationConfig: { response_mime_type: 'application/json' },
      }),
      signal: AbortSignal.timeout(10000),
    });
    console.log(model, 'status:', res.status, 'duration:', Date.now() - start, 'ms');
  } catch (e) {
    console.log(model, 'error:', e.message, 'duration:', Date.now() - start, 'ms');
  }
}

async function run() {
  for (const m of models) {
    await bench(m);
  }
}
run();
