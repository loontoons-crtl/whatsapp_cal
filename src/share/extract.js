// Turn shared content of ANY kind (text, PDF, PNG/JPG) into plain text that the
// existing invite parser can read. Text → as-is. PDF → text layer. Image (and
// scanned/imageless PDF) → Claude vision transcription (needs ANTHROPIC_API_KEY).

const VISION_MODEL = process.env.VISION_MODEL || 'claude-opus-4-8';

async function pdfToText(buffer) {
  // Import the lib file directly — pdf-parse's index.js runs sample-file debug code on import.
  const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;
  const data = await pdfParse(buffer);
  return (data.text || '').trim();
}

async function imageToText(buffer, mediaType) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error('Reading image invites needs ANTHROPIC_API_KEY (Claude vision). Set it, or share text/PDF.');
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: buffer.toString('base64') } },
          { type: 'text', text: 'This is an event invitation. Transcribe ALL its text exactly as written, in the original language/script (English, Hindi, Hinglish, etc.). Include date, time, venue/address, host names. Output only the transcribed text — no commentary.' },
        ],
      }],
    }),
  });
  if (!res.ok) throw new Error(`Vision API error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return (data.content?.map((c) => c.text).filter(Boolean).join('\n') || '').trim();
}

/**
 * @param {{ text?: string, buffer?: Buffer, mimetype?: string, filename?: string }} input
 * @returns {Promise<{ text: string, kind: 'text'|'pdf'|'image' }>}
 */
export async function extractText({ text, buffer, mimetype = '', filename = '' } = {}) {
  if (text && text.trim()) return { text: text.trim(), kind: 'text' };
  if (!buffer || !buffer.length) throw new Error('No content provided.');

  const mt = (mimetype || '').toLowerCase();
  const name = (filename || '').toLowerCase();

  if (mt.includes('pdf') || name.endsWith('.pdf')) {
    const t = await pdfToText(buffer);
    if (t) return { text: t, kind: 'pdf' };
    // No text layer (scanned invite) → fall back to vision on the raw bytes won't
    // work for PDF; ask the user to share it as an image instead.
    throw new Error('This PDF has no readable text (looks scanned). Share it as a photo/screenshot instead.');
  }

  if (mt.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/.test(name)) {
    const media = mt.startsWith('image/') ? mt : 'image/png';
    const t = await imageToText(buffer, media);
    return { text: t, kind: 'image' };
  }

  // Anything else: best-effort treat as UTF-8 text.
  return { text: buffer.toString('utf8').trim(), kind: 'text' };
}
