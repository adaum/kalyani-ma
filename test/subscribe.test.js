const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/subscribe');

const FAKE_KEY = 'test-brevo-key';
const savedEnv = {
  BREVO_API_KEY: process.env.BREVO_API_KEY,
  BREVO_LIST_ID: process.env.BREVO_LIST_ID,
};
let originalFetch;

function mockRes() {
  return {
    statusCode: 0,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function callSummary(call) {
  const url = new URL(call.url);
  return `${call.method} ${url.pathname}${url.search}`;
}

function installFetch(responder) {
  const calls = [];
  global.fetch = async (url, options = {}) => {
    const call = {
      url: String(url),
      method: options.method || 'GET',
      headers: options.headers,
      body: options.body === undefined ? undefined : JSON.parse(options.body),
    };
    calls.push(call);
    const result = responder(call) || {
      status: 599,
      json: { message: `Unmocked ${call.method} ${url}` },
    };
    return {
      ok: result.status >= 200 && result.status < 300,
      status: result.status,
      json: async () => result.json,
    };
  };
  return calls;
}

function contact(email, extra = {}) {
  return {
    email,
    id: 42,
    emailBlacklisted: false,
    listIds: [],
    attributes: {},
    ...extra,
  };
}

function nestedResult(email, { failure = false } = {}) {
  return {
    contacts: {
      success: failure ? [] : [email],
      failure: failure ? [email] : [],
    },
  };
}

beforeEach(() => {
  originalFetch = global.fetch;
  process.env.BREVO_API_KEY = FAKE_KEY;
  delete process.env.BREVO_LIST_ID;
});

afterEach(() => {
  global.fetch = originalFetch;
  if (savedEnv.BREVO_API_KEY === undefined) delete process.env.BREVO_API_KEY;
  else process.env.BREVO_API_KEY = savedEnv.BREVO_API_KEY;
  if (savedEnv.BREVO_LIST_ID === undefined) delete process.env.BREVO_LIST_ID;
  else process.env.BREVO_LIST_ID = savedEnv.BREVO_LIST_ID;
});

describe('POST /api/subscribe', () => {
  it('rejects non-POST requests without calling Brevo', async () => {
    const calls = installFetch(() => ({ status: 500, json: {} }));
    const res = mockRes();
    await handler({ method: 'GET', body: { EMAIL: 'a@b.com' } }, res);
    assert.equal(res.statusCode, 405);
    assert.deepEqual(res.body, { error: 'Method not allowed' });
    assert.equal(calls.length, 0);
  });

  it('rejects an invalid email without calling Brevo', async () => {
    const calls = installFetch(() => ({ status: 500, json: {} }));
    const res = mockRes();
    await handler({ method: 'POST', body: { EMAIL: 'not-an-email' } }, res);
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { error: 'Please enter a valid email address.' });
    assert.equal(calls.length, 0);
  });

  it('creates a brand-new contact once, with REF, and does not remove or re-add', async () => {
    const calls = installFetch((call) => {
      if (call.method === 'GET') return { status: 404, json: { code: 'document_not_found', message: 'Contact does not exist' } };
      if (call.method === 'POST' && call.url.endsWith('/contacts')) return { status: 201, json: { id: 7 } };
      return null;
    });

    const res = mockRes();
    await handler({
      method: 'POST',
      body: { FIRSTNAME: '  Ada ', EMAIL: '  Ada@Example.com  ', ref: '  44405 ' },
    }, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { ok: true });
    assert.deepEqual(calls.map(callSummary), [
      'GET /v3/contacts/Ada%40Example.com?identifierType=email_id',
      'POST /v3/contacts',
    ]);

    const create = calls[1];
    assert.equal(create.headers['api-key'], FAKE_KEY);
    assert.equal(create.headers.accept, 'application/json');
    assert.equal(create.headers['content-type'], 'application/json');
    assert.equal(create.url.includes(FAKE_KEY), false);
    assert.deepEqual(create.body, {
      email: 'Ada@Example.com',
      attributes: { FIRSTNAME: 'Ada', REF: '44405' },
      listIds: [5],
      updateEnabled: true,
      emailBlacklisted: false,
    });
  });

  it('omits REF when the form does not send one', async () => {
    const calls = installFetch((call) => {
      if (call.method === 'GET') return { status: 404, json: { message: 'Contact does not exist' } };
      return { status: 201, json: { id: 1 } };
    });
    const res = mockRes();
    await handler({ method: 'POST', body: { FIRSTNAME: 'Ada', EMAIL: 'ada@example.com' } }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(calls[1].body.attributes, { FIRSTNAME: 'Ada' });
  });

  it('uses BREVO_LIST_ID when it is set', async () => {
    process.env.BREVO_LIST_ID = '12';
    const calls = installFetch((call) => {
      if (call.method === 'GET') return { status: 404, json: { message: 'Contact does not exist' } };
      return { status: 201, json: { id: 1 } };
    });
    const res = mockRes();
    await handler({ method: 'POST', body: { EMAIL: 'ada@example.com', FIRSTNAME: 'Ada' } }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(calls[1].body.listIds, [12]);
  });

  it('forwards a Brevo error from creating a new contact', async () => {
    installFetch((call) => {
      if (call.method === 'GET') return { status: 404, json: { message: 'Contact does not exist' } };
      return { status: 400, json: { message: 'Invalid email address', code: 'invalid_parameter' } };
    });
    const res = mockRes();
    await handler({ method: 'POST', body: { EMAIL: 'ada@example.com', FIRSTNAME: 'Ada' } }, res);
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { error: 'Invalid email address' });
  });

  it('uses the fallback message when Brevo returns an error without one', async () => {
    installFetch(() => ({ status: 401, json: {} }));
    const res = mockRes();
    await handler({ method: 'POST', body: { EMAIL: 'ada@example.com' } }, res);
    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.body, { error: 'Could not subscribe at this time.' });
  });

  it('removes a contact already on the list, then adds them back once', async () => {
    const email = 'return@example.com';
    const calls = installFetch((call) => {
      if (call.method === 'GET') {
        return { status: 200, json: contact(email, { listIds: [5, 9], emailBlacklisted: false, attributes: { REF: 'old' } }) };
      }
      if (call.method === 'PUT') return { status: 204, json: {} };
      if (call.url.includes('/contacts/remove')) return { status: 201, json: nestedResult(email) };
      if (call.url.includes('/contacts/add')) return { status: 201, json: nestedResult(email) };
      return null;
    });

    const res = mockRes();
    await handler({
      method: 'POST',
      body: { FIRSTNAME: 'Rae', EMAIL: email, ref: '99' },
    }, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { ok: true });
    assert.deepEqual(calls.map(callSummary), [
      'GET /v3/contacts/return%40example.com?identifierType=email_id',
      'PUT /v3/contacts/return%40example.com?identifierType=email_id',
      'POST /v3/contacts/lists/5/contacts/remove',
      'POST /v3/contacts/lists/5/contacts/add',
    ]);

    assert.deepEqual(calls[1].body, {
      attributes: { FIRSTNAME: 'Rae', REF: '99' },
    });
    assert.equal(Object.hasOwn(calls[1].body, 'emailBlacklisted'), false);
    assert.equal(Object.hasOwn(calls[1].body, 'listIds'), false);
    assert.equal(Object.hasOwn(calls[1].body, 'unlinkListIds'), false);
    assert.deepEqual(calls[2].body, { emails: [email] });
    assert.equal(calls[2].body.all, undefined);
    assert.deepEqual(calls[3].body, { emails: [email] });
  });

  it('accepts the flat success/failure list response shape', async () => {
    const email = 'flat@example.com';
    installFetch((call) => {
      if (call.method === 'GET') return { status: 200, json: contact(email, { listIds: [5] }) };
      if (call.method === 'PUT') return { status: 204, json: {} };
      return {
        status: 201,
        json: { contacts: {}, success: [email.toUpperCase()], failure: [] },
      };
    });
    const res = mockRes();
    await handler({ method: 'POST', body: { EMAIL: email, FIRSTNAME: 'Fay' } }, res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.body, { ok: true });
  });

  it('re-subscribes a blocklisted contact who is still on the list before re-adding them', async () => {
    const email = 'unsub@example.com';
    const calls = installFetch((call) => {
      if (call.method === 'GET') {
        return { status: 200, json: contact(email, { listIds: ['5'], emailBlacklisted: true }) };
      }
      if (call.method === 'PUT') return { status: 204, json: {} };
      if (call.url.includes('/remove')) return { status: 201, json: nestedResult(email) };
      if (call.url.includes('/add')) return { status: 201, json: nestedResult(email) };
      return null;
    });

    const res = mockRes();
    await handler({ method: 'POST', body: { EMAIL: email, FIRSTNAME: 'Una', ref: '7' } }, res);

    assert.equal(res.statusCode, 200);
    assert.equal(calls[1].body.emailBlacklisted, false);
    assert.deepEqual(calls[1].body.attributes, { FIRSTNAME: 'Una', REF: '7' });
    assert.equal(calls.map(callSummary).indexOf('PUT /v3/contacts/unsub%40example.com?identifierType=email_id'), 1);
    assert.ok(calls.map(callSummary).indexOf('POST /v3/contacts/lists/5/contacts/remove') > 1);
    assert.ok(calls.map(callSummary).at(-1).includes('/contacts/add'));
  });

  it('re-subscribes a blocklisted contact who is no longer on the list, and adds them once', async () => {
    const email = 'gone@example.com';
    const calls = installFetch((call) => {
      if (call.method === 'GET') {
        return { status: 200, json: contact(email, { listIds: [9], emailBlacklisted: true }) };
      }
      if (call.method === 'PUT') return { status: 204, json: {} };
      if (call.url.includes('/add')) return { status: 201, json: nestedResult(email) };
      return null;
    });

    const res = mockRes();
    await handler({ method: 'POST', body: { EMAIL: email, FIRSTNAME: 'Gia' } }, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(calls.map(callSummary), [
      'GET /v3/contacts/gone%40example.com?identifierType=email_id',
      'PUT /v3/contacts/gone%40example.com?identifierType=email_id',
      'POST /v3/contacts/lists/5/contacts/add',
    ]);
    assert.equal(calls[1].body.emailBlacklisted, false);
    assert.deepEqual(calls[1].body.attributes, { FIRSTNAME: 'Gia' });
  });

  it('adds an existing contact who is not on the list, without removing them', async () => {
    const email = 'other@example.com';
    const calls = installFetch((call) => {
      if (call.method === 'GET') return { status: 200, json: contact(email, { listIds: [9] }) };
      if (call.method === 'PUT') return { status: 204, json: {} };
      if (call.url.includes('/add')) return { status: 201, json: nestedResult(email) };
      return null;
    });
    const res = mockRes();
    await handler({ method: 'POST', body: { EMAIL: email, FIRSTNAME: 'Otto', ref: '3' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(calls.some((call) => call.url.includes('/remove')), false);
    assert.deepEqual(calls[1].body.attributes, { FIRSTNAME: 'Otto', REF: '3' });
  });

  it('stops before the re-add when removal fails', async () => {
    const email = 'return@example.com';
    const calls = installFetch((call) => {
      if (call.method === 'GET') return { status: 200, json: contact(email, { listIds: [5] }) };
      if (call.method === 'PUT') return { status: 204, json: {} };
      if (call.url.includes('/remove')) return { status: 404, json: { message: 'List ID not found' } };
      return null;
    });
    const res = mockRes();
    await handler({ method: 'POST', body: { EMAIL: email, FIRSTNAME: 'Rae' } }, res);
    assert.equal(res.statusCode, 404);
    assert.deepEqual(res.body, { error: 'List ID not found' });
    assert.equal(calls.some((call) => call.url.includes('/add')), false);
  });

  it('does not re-add when Brevo reports the removal in the failure list', async () => {
    const email = 'return@example.com';
    const calls = installFetch((call) => {
      if (call.method === 'GET') return { status: 200, json: contact(email, { listIds: [5] }) };
      if (call.method === 'PUT') return { status: 204, json: {} };
      if (call.url.includes('/remove')) return { status: 201, json: nestedResult(email, { failure: true }) };
      return null;
    });
    const res = mockRes();
    await handler({ method: 'POST', body: { EMAIL: email, FIRSTNAME: 'Rae' } }, res);
    assert.equal(res.statusCode, 502);
    assert.deepEqual(res.body, { error: 'Could not subscribe at this time.' });
    assert.equal(calls.some((call) => call.url.includes('/add')), false);
  });

  it('reports a failed add instead of saying the signup worked', async () => {
    const email = 'return@example.com';
    installFetch((call) => {
      if (call.method === 'GET') return { status: 200, json: contact(email, { listIds: [5] }) };
      if (call.method === 'PUT') return { status: 204, json: {} };
      if (call.url.includes('/remove')) return { status: 201, json: nestedResult(email) };
      if (call.url.includes('/add')) return { status: 201, json: { contacts: { success: [], failure: [] } } };
      return null;
    });
    const res = mockRes();
    await handler({ method: 'POST', body: { EMAIL: email, FIRSTNAME: 'Rae' } }, res);
    assert.equal(res.statusCode, 502);
    assert.deepEqual(res.body, { error: 'Could not subscribe at this time.' });
  });

  it('forwards an attribute-update error and does not change list membership', async () => {
    const email = 'return@example.com';
    const calls = installFetch((call) => {
      if (call.method === 'GET') return { status: 200, json: contact(email, { listIds: [5] }) };
      if (call.method === 'PUT') return { status: 400, json: { message: 'Attribute not found' } };
      return null;
    });
    const res = mockRes();
    await handler({ method: 'POST', body: { EMAIL: email, FIRSTNAME: 'Rae', ref: '1' } }, res);
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { error: 'Attribute not found' });
    assert.equal(calls.some((call) => call.url.includes('/remove') || call.url.includes('/add')), false);
  });

  it('returns a server error when the email service cannot be reached', async () => {
    global.fetch = async () => {
      throw new Error('network down');
    };
    const res = mockRes();
    await handler({ method: 'POST', body: { EMAIL: 'ada@example.com', FIRSTNAME: 'Ada' } }, res);
    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { error: 'Server error connecting to email service.' });
  });

  it('does not log the request or the API key', async () => {
    const logs = [];
    const originals = ['log', 'info', 'warn', 'error', 'debug'].map((name) => [name, console[name]]);
    for (const [name] of originals) {
      console[name] = (...args) => logs.push(args);
    }
    try {
      installFetch((call) => {
        if (call.method === 'GET') return { status: 404, json: { message: 'Contact does not exist' } };
        return { status: 201, json: { id: 1 } };
      });
      const res = mockRes();
      await handler({ method: 'POST', body: { EMAIL: 'ada@example.com', FIRSTNAME: 'Ada' } }, res);
      assert.equal(res.statusCode, 200);
      assert.deepEqual(logs, []);
    } finally {
      for (const [name, fn] of originals) console[name] = fn;
    }
  });
});
