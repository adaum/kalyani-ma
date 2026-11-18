const crypto = require('crypto');

// WhatsApp Business Cloud API webhook.
//
// GET verifies the Meta callback. POST replies to inbound text, button, and
// interactive messages (button_reply / list_reply) with the Household
// Botanical Blueprint link. Status callbacks and other non-text messages
// (image, audio, video, sticker, location, and so on) are ignored.
//
// Vercel must not parse the body: the signature is an HMAC of the raw bytes.

const GRAPH_VERSION = 'v21.0';
const DEFAULT_REF = '44405';
const MAX_REF_LENGTH = 32;
const SEEN_LIMIT = 1000;

// Message ids Meta retries against this warm instance. A retry must not
// send a second Blueprint link.
const seenMessageIds = new Set();

function sanitizeRef(value) {
  const clean = String(value == null ? '' : value)
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, MAX_REF_LENGTH);
  return clean || DEFAULT_REF;
}

// Preview pages write "Send Blueprint (Ref: 99999)". Spacing and case vary.
function extractRef(text) {
  const match = String(text == null ? '' : text).match(/\(\s*ref\s*:\s*([^)]*)\)/i);
  if (!match) return DEFAULT_REF;
  return sanitizeRef(match[1]);
}

function buildReply(ref) {
  const id = sanitizeRef(ref);
  const url = `https://kalyanima.in/api/blueprint?ref=${encodeURIComponent(id)}`;
  return `Namaste! 🌿 Here is your Household Botanical Blueprint: ${url}\nWith love, Kalyani`;
}

function remember(id) {
  seenMessageIds.add(id);
  if (seenMessageIds.size <= SEEN_LIMIT) return;
  const oldest = seenMessageIds.values().next().value;
  seenMessageIds.delete(oldest);
}

function resetSeen() {
  seenMessageIds.clear();
}

function headerValue(req, name) {
  const headers = (req && req.headers) || {};
  if (typeof headers.get === 'function') {
    const fromGetter = headers.get(name);
    if (fromGetter) return String(fromGetter);
  }
  const wanted = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() !== wanted || headers[key] == null) continue;
    const value = headers[key];
    return Array.isArray(value) ? String(value[0] ?? '') : String(value);
  }
  return '';
}

function queryValue(req, key) {
  const query = (req && req.query) || {};
  if (Object.prototype.hasOwnProperty.call(query, key) && query[key] != null && typeof query[key] !== 'object') {
    return String(query[key]);
  }
  if (Object.prototype.hasOwnProperty.call(query, key) && Array.isArray(query[key])) {
    return query[key][0] == null ? '' : String(query[key][0]);
  }

  // Some parsers nest hub.mode as query.hub.mode.
  let nested = query;
  for (const part of key.split('.')) {
    if (!nested || typeof nested !== 'object' || Array.isArray(nested)) {
      nested = undefined;
      break;
    }
    nested = nested[part];
  }
  if (typeof nested === 'string' || typeof nested === 'number') return String(nested);

  if (req && req.url) {
    try {
      const value = new URL(req.url, 'https://kalyanima.in').searchParams.get(key);
      if (value != null) return value;
    } catch (_) {
      return '';
    }
  }
  return '';
}

function signatureIsValid(rawBody, signatureHeader, secret) {
  const headerText = String(signatureHeader || '').trim();
  const prefix = 'sha256=';
  if (!headerText.toLowerCase().startsWith(prefix)) return false;
  const providedHex = headerText.slice(prefix.length).toLowerCase();
  const expectedHex = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const provided = Buffer.from(providedHex);
  const expected = Buffer.from(expectedHex);
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(provided, expected);
}

function readStream(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let settled = false;
    req.on('data', (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on('end', () => {
      if (settled) return;
      settled = true;
      resolve(Buffer.concat(chunks));
    });
    req.on('error', (err) => {
      if (settled) return;
      settled = true;
      reject(err);
    });
  });
}

async function readRawBody(req) {
  if (req && req.rawBody != null) {
    return Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from(String(req.rawBody));
  }
  if (req && Buffer.isBuffer(req.body)) return req.body;
  if (req && typeof req.body === 'string') return Buffer.from(req.body);
  const parsedObject = req && req.body && typeof req.body === 'object';
  if (!parsedObject && req && typeof req.on === 'function') return readStream(req);
  return null;
}

function parsePayload(rawBody, req) {
  if (rawBody) {
    const text = rawBody.toString('utf8').trim();
    if (!text) return {};
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed;
  }
  if (req && req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return req.body;
  return {};
}

// null means "do not reply". A string (including empty) is replyable text.
function inboundText(message) {
  if (!message || typeof message !== 'object') return null;
  if (message.type === 'text') {
    const body = message.text && message.text.body;
    return typeof body === 'string' ? body : '';
  }
  if (message.type === 'button') {
    const button = message.button || {};
    if (typeof button.text === 'string' && button.text) return button.text;
    if (typeof button.payload === 'string') return button.payload;
    return '';
  }
  if (message.type === 'interactive') {
    const interactive = message.interactive || {};
    const reply = interactive.button_reply || interactive.list_reply;
    if (!reply || typeof reply !== 'object') return null;
    if (typeof reply.title === 'string' && reply.title) return reply.title;
    if (typeof reply.id === 'string') return reply.id;
    return '';
  }
  return null;
}

function listMessages(payload) {
  const found = [];
  const entries = payload && Array.isArray(payload.entry) ? payload.entry : [];
  for (const entry of entries) {
    const changes = entry && Array.isArray(entry.changes) ? entry.changes : [];
    for (const change of changes) {
      const value = change && change.value;
      const messages = value && Array.isArray(value.messages) ? value.messages : [];
      for (const message of messages) found.push(message);
    }
  }
  return found;
}

async function readResponseText(response) {
  try {
    if (response && typeof response.text === 'function') return await response.text();
    if (response && typeof response.json === 'function') {
      const data = await response.json();
      return typeof data === 'string' ? data : JSON.stringify(data ?? {});
    }
  } catch (_) {
    return '';
  }
  return '';
}

async function sendWhatsAppText(to, body) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token = process.env.WHATSAPP_TOKEN;
  if (!phoneNumberId || !token) {
    throw new Error('WhatsApp reply skipped: phone number id or token is not configured');
  }

  const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: {
        body,
        preview_url: true,
      },
    }),
  });

  if (!response.ok) {
    const detail = await readResponseText(response);
    throw new Error(`WhatsApp send failed (${response.status}): ${String(detail).slice(0, 500)}`);
  }
  await readResponseText(response);
}

function logSendError(err) {
  const secrets = [process.env.WHATSAPP_TOKEN, process.env.WHATSAPP_APP_SECRET].filter(Boolean);
  let text = err && err.message ? String(err.message) : 'send failed';
  for (const secret of secrets) text = text.split(secret).join('[redacted]');
  console.error('WhatsApp reply failed:', text);
}

async function replyToInbound(payload) {
  for (const message of listMessages(payload)) {
    const text = inboundText(message);
    if (text == null) continue;
    const to = message.from == null ? '' : String(message.from);
    if (!to) continue;
    const id = message.id == null ? '' : String(message.id);
    if (id && seenMessageIds.has(id)) continue;
    if (id) remember(id);
    try {
      await sendWhatsAppText(to, buildReply(extractRef(text)));
    } catch (err) {
      logSendError(err);
    }
  }
}

function sendPlain(res, statusCode, text) {
  if (typeof res.setHeader === 'function') {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  }
  if (typeof res.status === 'function') res.status(statusCode);
  else res.statusCode = statusCode;
  if (typeof res.send === 'function') return res.send(text);
  res.body = text;
  if (typeof res.end === 'function') return res.end(text);
  return res;
}

async function handler(req, res) {
  if (req.method === 'GET') {
    const mode = queryValue(req, 'hub.mode');
    const token = queryValue(req, 'hub.verify_token');
    const challenge = queryValue(req, 'hub.challenge');
    const expected = process.env.WHATSAPP_VERIFY_TOKEN;
    if (mode === 'subscribe' && expected && token === expected) {
      return sendPlain(res, 200, challenge);
    }
    return sendPlain(res, 403, 'Forbidden');
  }

  if (req.method !== 'POST') return sendPlain(res, 405, 'Method not allowed');

  let rawBody;
  try {
    rawBody = await readRawBody(req);
  } catch (_) {
    console.error('WhatsApp webhook could not read the body');
    return sendPlain(res, 400, 'Bad request');
  }

  const secret = process.env.WHATSAPP_APP_SECRET;
  if (secret) {
    const signature = headerValue(req, 'x-hub-signature-256');
    if (!rawBody || !signatureIsValid(rawBody, signature, secret)) {
      return sendPlain(res, 401, 'Invalid signature');
    }
  }

  let payload;
  try {
    payload = parsePayload(rawBody, req);
  } catch (_) {
    console.error('WhatsApp webhook received invalid JSON');
    return sendPlain(res, 400, 'Bad request');
  }

  // Await the send, but always acknowledge a valid payload. Returning an
  // error makes Meta retry, and the runtime would drop work we did not await.
  try {
    await replyToInbound(payload);
  } catch (err) {
    logSendError(err);
  }

  return sendPlain(res, 200, 'EVENT_RECEIVED');
}

const config = {
  api: {
    bodyParser: false,
  },
};

module.exports = handler;
module.exports.extractRef = extractRef;
module.exports.buildReply = buildReply;
module.exports.resetSeen = resetSeen;
module.exports.config = config;
