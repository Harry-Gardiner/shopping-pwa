const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const SYSTEM_PROMPT =
  'You are a specialized backend utility for a smart kitchen shopping list app. ' +
  'Your sole job is to take raw speech transcripts and convert them into structured JSON. ' +
  'Output ONLY valid JSON in exactly this format: {"ingredients":[{"name":"string","quantity":number|null,"unit":"string"|null}]}. ' +
  'No markdown wrappers. ' +
  'Standardize names, split compound items like "garlic and onions", and extract quantities/units. ' +
  'Correct phonetic typos (e.g. "worst extra sauce" -> "Worcestershire sauce"). ' +
  'If no unit or quantity is specified, use null.';

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    try {
      const formData = await request.formData();
      const audio = formData.get('audio');

      if (!audio) {
        return json({ error: 'No audio provided' }, 400);
      }

      const transcript = await transcribe(audio, env.OPENAI_API_KEY);
      const ingredients = await parseIngredients(transcript, env.OPENAI_API_KEY);

      return json({ transcript, ingredients });
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  },
};

async function transcribe(audio, apiKey) {
  const form = new FormData();
  form.append('file', audio, 'audio.webm');
  form.append('model', 'whisper-1');
  form.append(
    'prompt',
    'A messy kitchen voice note listing ingredients, grocery items, and baking goods.'
  );

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) throw new Error(`Whisper error ${res.status}: ${await res.text()}`);

  const { text } = await res.json();
  return text;
}

async function parseIngredients(transcript, apiKey) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Convert this transcript: "${transcript}"` },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1000,
    }),
  });

  if (!res.ok) throw new Error(`GPT-4o error ${res.status}: ${await res.text()}`);

  const data = await res.json();
  const raw = data.choices[0].message.content;

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`GPT-4o returned invalid JSON: ${raw}`);
  }

  if (Array.isArray(parsed.ingredients)) return parsed.ingredients;
  // fallbacks for unexpected shapes
  if (Array.isArray(parsed)) return parsed;
  const key = Object.keys(parsed).find((k) => Array.isArray(parsed[k]));
  if (key) return parsed[key];
  if (parsed.name !== undefined) return [parsed];
  throw new Error(`Unexpected GPT-4o response shape: ${raw}`);
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
