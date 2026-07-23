// =============================================================================
// api/chat.js — backend for the "Talk it through" widget on Devon's
// action-plan page. The browser calls this endpoint at /api/chat, and this
// file is the only place the actual Anthropic API key ever appears.
//
// SETUP NEEDED: add an environment variable in this Vercel project called
// ANTHROPIC_API_KEY with the real key as the value (same key already in use
// for Alpine's project).
// =============================================================================

const SYSTEM_PROMPT = `You are a warm, curious assistant helping Devon at Root to Rise think out loud about what's happening in her business. Your job is to draw out concrete, specific details — client moments, podcast ideas, things she's noticed about midlife transitions, anything that could become newsletter content, a social post, or podcast material later.

Keep your responses short (2-4 sentences). Ask one light follow-up question at a time to pull out more specific, colorful detail (names, moments, a phrase she used) rather than general summaries. Don't be formal or corporate — be genuinely curious, like a friend who wants to hear the good stuff. Never make up facts about Devon or Root to Rise; only work with what she tells you.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'No messages provided' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY. Add it in Vercel → Settings → Environment Variables.' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: messages
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message || 'Claude API error' });
    }

    const text = (data.content || [])
      .map((block) => (block.type === 'text' ? block.text : ''))
      .filter(Boolean)
      .join('\n');

    return res.status(200).json({ reply: text });
  } catch (err) {
    return res.status(500).json({ error: 'Could not reach Claude. Please try again.' });
  }
}
