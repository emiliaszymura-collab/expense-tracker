// Server-side Anthropic client. The API key lives ONLY in process.env.ANTHROPIC_API_KEY
// and never leaves the backend.
const axios = require('axios');

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-4-6';

function configured() {
  return !!process.env.ANTHROPIC_API_KEY;
}

// messages: Anthropic messages array. system: optional system prompt string.
async function createMessage({ system, messages, model, max_tokens } = {}) {
  if (!configured()) throw new Error('ANTHROPIC_API_KEY nie ustawiony na serwerze');
  const body = {
    model: model || DEFAULT_MODEL,
    max_tokens: max_tokens || 1024,
    messages,
  };
  if (system) body.system = system;

  const res = await axios.post(ANTHROPIC_URL, body, {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    timeout: 60000,
  });
  return {
    text: res.data?.content?.[0]?.text || '',
    content: res.data?.content || [],
    usage: res.data?.usage || null,
  };
}

module.exports = { configured, createMessage, DEFAULT_MODEL };
