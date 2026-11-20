const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const auth = require('../api/partner-auth');

const PASSCODE = 'test-passcode';
const saved = process.env.PARTNER_PASSCODE;

function post(passcode) {
  return auth.POST(new Request('https://kalyanima.in/api/partner-auth', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ passcode }),
  }));
}

beforeEach(() => {
  process.env.PARTNER_PASSCODE = PASSCODE;
});

afterEach(() => {
  if (saved === undefined) delete process.env.PARTNER_PASSCODE;
  else process.env.PARTNER_PASSCODE = saved;
});

describe('POST /api/partner-auth', () => {
  it('returns 200 when the passcode matches', async () => {
    const response = await post(PASSCODE);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
  });

  it('returns 401 when the passcode does not match', async () => {
    const response = await post('wrong-passcode');
    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { ok: false, error: 'Incorrect partner passcode.' });
  });

  it('returns 401 when the body is not a passcode', async () => {
    const response = await auth.POST(new Request('https://kalyanima.in/api/partner-auth', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{',
    }));
    assert.equal(response.status, 401);
    assert.equal((await response.json()).ok, false);
  });

  it('returns 405 for other methods', async () => {
    const response = await auth.GET(new Request('https://kalyanima.in/api/partner-auth'));
    assert.equal(response.status, 405);
    assert.deepEqual(await response.json(), { ok: false, error: 'Method not allowed.' });
  });

  it('returns 500 when PARTNER_PASSCODE is unset', async () => {
    delete process.env.PARTNER_PASSCODE;
    const response = await post(PASSCODE);
    assert.equal(response.status, 500);
    const body = await response.json();
    assert.equal(body.ok, false);
    assert.equal(body.error.includes(PASSCODE), false);
  });
});

describe('partners page gate', () => {
  const html = fs.readFileSync(path.join(__dirname, '../partners.html'), 'utf8');

  it('hides the generator behind the overlay and does not embed a passcode', () => {
    assert.match(html, /id="partnerGateOverlay"/);
    assert.match(html, /id="protectedPortalContent"/);
    assert.match(html, /Keeper's Private Room — Partner Portal Access/);
    assert.match(html, /#0B140E/);
    assert.match(html, /#CBB279/);
    assert.match(html, />KM</);
    assert.match(html, /\/api\/partner-auth/);
    assert.match(html, /sessionStorage/);
    assert.match(html, /type="password"/);
    assert.doesNotMatch(html, /name="username"|id="username"|for="username"/);
    assert.doesNotMatch(html, /passcode\s*[:=]\s*['"][^'"]+['"]/);
    assert.equal(html.includes(PASSCODE), false);
  });

  it('does not let middleware block /api/partner-auth', () => {
    const middlewarePath = path.join(__dirname, '../middleware.js');
    if (!fs.existsSync(middlewarePath)) return;
    const middleware = fs.readFileSync(middlewarePath, 'utf8');
    assert.doesNotMatch(middleware, /\/api\/partner-auth/);
  });

  it('leaves the homepage footer trigger pointing at the partner page', () => {
    const home = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
    assert.match(home, /id="kmPortalTrigger"/);
    assert.match(home, /window\.location\.href = "\/partners\.html"/);
  });
});
