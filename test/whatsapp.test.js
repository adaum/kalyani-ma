const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('node:events');
const handler = require('../api/whatsapp');

const { extractRef, buildReply } = handler;

const TOKEN = 'test-whatsapp-token';
const PHONE_NUMBER_ID = '109876543210';
const VERIFY_TOKEN = 'verify-token';
const APP_SECRET = 'test-app-secret';
const GRAPH_URL = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;

const savedEnv = {
  WHATSAPP_TOKEN: process.env.WHATSAPP_TOKEN,
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID,
  WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN,
  WHATSAPP_APP_SECRET: process.env.WHATSAPP_APP_SECRET,
};
let originalFetch;

function replyFor(ref) {
  return `Namaste! 🌿 Here is your Household Botanical Blueprint: https://kalyanima.in/api/blueprint?ref=${ref}\nWith love, Kalyani`;
}

function mockRes() {
  return {
    statusCode: 0,
    body: undefined,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, value) {
      this.headers[String(name).toLowerCase()] = value;
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function installFetch(responder) {
  const calls = [];
  global.fetch = async (url, options = {}) => {
    const call = {
      url: String(url),
      method: options.method || 'GET',
      headers: options.headers || {},
      body: options.body === undefined ? undefined : JSON.parse(options.body),
    };
    calls.push(call);
    const result = (responder && responder(call)) || { status: 200, json: { messages: [{ id: 'wamid.OUT' }] } };
    const json = result.json === undefined ? {} : result.json;
    return {
      ok: result.status >= 200 && result.status < 300,
      status: result.status,
      json: async () => json,
      text: async () => (typeof result.text === 'string' ? result.text : JSON.stringify(json)),
    };
  };
  return calls;
}

function sign(raw, secret) {
  return `sha256=${crypto.createHmac('sha256', secret).update(Buffer.from(raw)).digest('hex')}`;
}

function textMessage(body, id = 'wamid.TEXT') {
  return {
    object: 'whatsapp_business_account',
    entry: [{
      changes: [{
        field: 'messages',
        value: {
          messaging_product: 'whatsapp',
          metadata: { phone_number_id: PHONE_NUMBER_ID },
          messages: [{
            from: '15551234567',
            id,
            timestamp: '1710000000',
            type: 'text',
            text: { body },
          }],
        },
      }],
    }],
  };
}

function postReq(payload, headers) {
  return {
    method: 'POST',
    rawBody: JSON.stringify(payload),
    headers: headers || {},
  };
}

beforeEach(() => {
  originalFetch = global.fetch;
  process.env.WHATSAPP_TOKEN = TOKEN;
  process.env.WHATSAPP_PHONE_NUMBER_ID = PHONE_NUMBER_ID;
  process.env.WHATSAPP_VERIFY_TOKEN = VERIFY_TOKEN;
  delete process.env.WHATSAPP_APP_SECRET;
  handler.resetSeen();
});

afterEach(() => {
  global.fetch = originalFetch;
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe('extractRef and buildReply', () => {
  it('reads (Ref: 99999)', () => {
    assert.equal(extractRef('Send Blueprint (Ref: 99999)'), '99999');
    assert.equal(buildReply('99999'), replyFor('99999'));
  });

  it('accepts a tight and a spaced ref label', () => {
    assert.equal(extractRef('(ref:99999)'), '99999');
    assert.equal(extractRef('( Ref : 99999 )'), '99999');
    assert.equal(extractRef('(REF: ab-12_X)'), 'ab-12_X');
  });

  it('falls back to 44405 when the message has no ref', () => {
    assert.equal(extractRef('Hi Kalyani! Please send me the Household Botanical Blueprint.'), '44405');
    assert.equal(extractRef(''), '44405');
    assert.equal(extractRef(null), '44405');
    assert.equal(buildReply(extractRef('no ref here')), replyFor('44405'));
  });

  it('sanitizes the ref the same way the blueprint route does, and caps the length', () => {
    assert.equal(extractRef('(Ref: 99.05)'), '9905');
    assert.equal(extractRef(`(Ref: ${'a'.repeat(40)})`), 'a'.repeat(32));
    assert.equal(buildReply('99999&phone=1'), replyFor('99999phone1'));
    assert.equal(buildReply('../etc'), replyFor('etc'));
    assert.equal(buildReply(''), replyFor('44405'));
  });
});

describe('GET /api/whatsapp', () => {
  it('returns the challenge as text/plain when the verify token matches', async () => {
    const calls = installFetch();
    const res = mockRes();
    await handler({
      method: 'GET',
      query: {
        'hub.mode': 'subscribe',
        'hub.verify_token': VERIFY_TOKEN,
        'hub.challenge': '1234567890',
      },
    }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body, '1234567890');
    assert.match(res.headers['content-type'], /^text\/plain/);
    assert.equal(calls.length, 0);
  });

  it('returns 403 when the verify token is wrong', async () => {
    const calls = installFetch();
    const res = mockRes();
    await handler({
      method: 'GET',
      query: {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong-token',
        'hub.challenge': '1234567890',
      },
    }, res);
    assert.equal(res.statusCode, 403);
    assert.equal(res.body, 'Forbidden');
    assert.equal(calls.length, 0);
  });

  it('returns 403 when the mode is not subscribe', async () => {
    const res = mockRes();
    await handler({
      method: 'GET',
      query: {
        'hub.mode': 'unsubscribe',
        'hub.verify_token': VERIFY_TOKEN,
        'hub.challenge': '1234567890',
      },
    }, res);
    assert.equal(res.statusCode, 403);
  });

  it('reads a nested hub query and the raw callback URL', async () => {
    const nested = mockRes();
    await handler({
      method: 'GET',
      query: { hub: { mode: 'subscribe', verify_token: VERIFY_TOKEN, challenge: 'nested-ok' } },
    }, nested);
    assert.equal(nested.statusCode, 200);
    assert.equal(nested.body, 'nested-ok');

    const fromUrl = mockRes();
    await handler({
      method: 'GET',
      url: `/api/whatsapp?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=from-url`,
    }, fromUrl);
    assert.equal(fromUrl.statusCode, 200);
    assert.equal(fromUrl.body, 'from-url');
  });
});

describe('POST /api/whatsapp', () => {
  it('replies to a text message through the Graph API', async () => {
    const calls = installFetch();
    const res = mockRes();
    await handler(postReq(textMessage('Send Blueprint (Ref: 99999)')), res);

    assert.equal(res.statusCode, 200);
    assert.equal(calls.length, 1);
    const call = calls[0];
    assert.equal(call.method, 'POST');
    assert.equal(call.url, GRAPH_URL);
    assert.equal(call.url.includes(TOKEN), false);
    assert.equal(call.headers.Authorization, `Bearer ${TOKEN}`);
    assert.equal(call.headers['Content-Type'], 'application/json');
    assert.deepEqual(call.body, {
      messaging_product: 'whatsapp',
      to: '15551234567',
      type: 'text',
      text: {
        body: replyFor('99999'),
        preview_url: true,
      },
    });
  });

  it('uses 44405 when the text has no ref', async () => {
    const calls = installFetch();
    const res = mockRes();
    await handler(postReq(textMessage('Hi Kalyani! Please send me the Household Botanical Blueprint.', 'wamid.NOREF')), res);
    assert.equal(res.statusCode, 200);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].body.text.body, replyFor('44405'));
  });

  it('sends nothing for a statuses-only event', async () => {
    const calls = installFetch();
    const res = mockRes();
    await handler(postReq({
      object: 'whatsapp_business_account',
      entry: [{
        changes: [{
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            statuses: [{ id: 'wamid.STATUS', status: 'delivered', recipient_id: '15551234567' }],
          },
        }],
      }],
    }), res);
    assert.equal(res.statusCode, 200);
    assert.equal(calls.length, 0);
  });

  it('replies to button and interactive text, and ignores other non-text messages', async () => {
    const calls = installFetch();
    const res = mockRes();
    await handler(postReq({
      entry: [{
        changes: [{
          value: {
            messages: [
              { from: '15550000001', id: 'wamid.IMG', type: 'image', image: { id: 'media' } },
              { from: '15550000002', id: 'wamid.BTN', type: 'button', button: { text: 'Send Blueprint (Ref: 88888)', payload: 'ignored' } },
              {
                from: '15550000003',
                id: 'wamid.LIST',
                type: 'interactive',
                interactive: { type: 'button_reply', button_reply: { id: 'blueprint', title: 'Send Blueprint (Ref: 77777)' } },
              },
            ],
          },
        }],
      }],
    }), res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(calls.map((call) => call.body.to), ['15550000002', '15550000003']);
    assert.equal(calls[0].body.text.body, replyFor('88888'));
    assert.equal(calls[1].body.text.body, replyFor('77777'));
  });

  it('rejects a bad signature with 401 when the app secret is set', async () => {
    process.env.WHATSAPP_APP_SECRET = APP_SECRET;
    const calls = installFetch();
    const res = mockRes();
    const payload = textMessage('Send Blueprint (Ref: 99999)', 'wamid.BADSIG');
    await handler(postReq(payload, { 'X-Hub-Signature-256': `sha256=${'ab'.repeat(32)}` }), res);
    assert.equal(res.statusCode, 401);
    assert.equal(res.body, 'Invalid signature');
    assert.equal(calls.length, 0);
  });

  it('accepts a streamed body when the signature matches', async () => {
    process.env.WHATSAPP_APP_SECRET = APP_SECRET;
    const calls = installFetch();
    const raw = JSON.stringify(textMessage('Send Blueprint (Ref: 99999)', 'wamid.SIGNED'));
    const req = new EventEmitter();
    req.method = 'POST';
    req.headers = { 'X-Hub-Signature-256': sign(raw, APP_SECRET) };
    process.nextTick(() => {
      req.emit('data', Buffer.from(raw));
      req.emit('end');
    });

    const res = mockRes();
    await handler(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, GRAPH_URL);
    assert.equal(calls[0].body.text.body, replyFor('99999'));
  });

  it('returns 200 when the Graph send fails, and does not log the token', async () => {
    const logs = [];
    const originals = ['log', 'info', 'warn', 'error', 'debug'].map((name) => [name, console[name]]);
    for (const [name] of originals) console[name] = (...args) => logs.push(args.join(' '));
    installFetch(() => ({ status: 401, text: `rejected ${TOKEN}` }));
    try {
      const res = mockRes();
      await handler(postReq(textMessage('Send Blueprint (Ref: 99999)', 'wamid.FAIL')), res);
      assert.equal(res.statusCode, 200);
      const logged = logs.join('\n');
      assert.match(logged, /WhatsApp reply failed/);
      assert.equal(logged.includes(TOKEN), false);
      assert.match(logged, /\[redacted\]/);
    } finally {
      for (const [name, fn] of originals) console[name] = fn;
    }
  });

  it('does not send a second reply for a message id it has already seen', async () => {
    const calls = installFetch();
    const payload = textMessage('Send Blueprint (Ref: 99999)', 'wamid.SAME');
    const first = mockRes();
    const second = mockRes();
    await handler(postReq(payload), first);
    await handler(postReq(payload), second);
    assert.equal(first.statusCode, 200);
    assert.equal(second.statusCode, 200);
    assert.equal(calls.length, 1);
  });

  it('disables the Vercel body parser so the signature covers the raw body', () => {
    assert.deepEqual(handler.config, { api: { bodyParser: false } });
  });
});

describe('preview WhatsApp link and middleware', () => {
  it('builds wa.me with the recipient number from one constant', () => {
    const html = fs.readFileSync(path.join(__dirname, '../preview-k92x/index.html'), 'utf8');
    assert.match(html, /const WHATSAPP_NUMBER = "14303404160"/);
    assert.match(html, /a\.href = `https:\/\/wa\.me\/\$\{WHATSAPP_NUMBER\}\?text=\$\{msg\}`/);
    assert.match(html, /id="blueprintWaBtn" href="https:\/\/wa\.me\/14303404160\?/);
    assert.doesNotMatch(html, /a\.href = `https:\/\/wa\.me\/\?text=/);
  });

  it('does not put the staging gate in front of /api/whatsapp', () => {
    const middleware = fs.readFileSync(path.join(__dirname, '../middleware.js'), 'utf8');
    assert.match(middleware, /matcher:\s*'\/preview-k92x\/:path\*'/);
    assert.doesNotMatch(middleware, /\/api\/whatsapp/);
  });
});
