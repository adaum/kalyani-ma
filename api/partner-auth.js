const crypto = require('crypto');

// Light partner gate. The page still ships the generator HTML; this only
// checks the passcode before the browser reveals it. The passcode lives in
// PARTNER_PASSCODE and is never returned to the client.

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function passcodeMatches(provided, expected) {
  const a = crypto.createHash('sha256').update(String(provided), 'utf8').digest();
  const b = crypto.createHash('sha256').update(String(expected), 'utf8').digest();
  return crypto.timingSafeEqual(a, b);
}

async function readPasscode(request) {
  try {
    const data = await request.json();
    if (data && typeof data.passcode === 'string') return data.passcode;
  } catch (_) {
    return '';
  }
  return '';
}

async function POST(request) {
  const expected = process.env.PARTNER_PASSCODE;
  if (!expected) {
    return json(500, { ok: false, error: 'Partner passcode is not configured.' });
  }
  const provided = await readPasscode(request);
  if (!passcodeMatches(provided, expected)) {
    return json(401, { ok: false, error: 'Incorrect partner passcode.' });
  }
  return json(200, { ok: true });
}

function methodNotAllowed() {
  return json(405, { ok: false, error: 'Method not allowed.' });
}

async function GET() {
  return methodNotAllowed();
}

module.exports = {
  GET,
  POST,
  PUT: methodNotAllowed,
  PATCH: methodNotAllowed,
  DELETE: methodNotAllowed,
  OPTIONS: methodNotAllowed,
  HEAD: methodNotAllowed,
};
