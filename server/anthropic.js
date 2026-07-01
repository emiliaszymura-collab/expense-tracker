// Server-side Anthropic client. The API key lives ONLY in process.env.ANTHROPIC_API_KEY
// and never leaves the backend.
const axios = require('axios');

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-4-6';

// Preferred name is ANTHROPIC_API_KEY; fall back to a legacy `API` variable
// (only if it looks like an Anthropic key) so existing setups keep working.
function apiKey() {
  const k = process.env.ANTHROPIC_API_KEY;
  if (k) return k;
  const legacy = process.env.API;
  if (legacy && legacy.startsWith('sk-ant-')) return legacy;
  return null;
}

function configured() {
  return !!apiKey();
}

// messages: Anthropic messages array. system: optional system prompt string.
async function createMessage({ system, messages, model, max_tokens } = {}) {
  const key = apiKey();
  if (!key) throw new Error('ANTHROPIC_API_KEY nie ustawiony na serwerze');
  const body = {
    model: model || DEFAULT_MODEL,
    max_tokens: max_tokens || 1024,
    messages,
  };
  if (system) body.system = system;

  const res = await axios.post(ANTHROPIC_URL, body, {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
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
