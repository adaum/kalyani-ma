const BREVO_API = 'https://api.brevo.com/v3';
const SUBSCRIBE_ERROR = 'Could not subscribe at this time.';

function brevoHeaders() {
  return {
    accept: 'application/json',
    'content-type': 'application/json',
    'api-key': process.env.BREVO_API_KEY,
  };
}

async function brevoFetch(path, { method = 'GET', body } = {}) {
  const init = { method, headers: brevoHeaders() };
  if (body !== undefined) init.body = JSON.stringify(body);
  return fetch(`${BREVO_API}${path}`, init);
}

async function readJson(res) {
  return res.json().catch(() => ({}));
}

function contactPath(email) {
  return `/contacts/${encodeURIComponent(email)}?identifierType=email_id`;
}

function attributesFrom(body) {
  const { FIRSTNAME, ref } = body || {};
  return {
    FIRSTNAME: (FIRSTNAME || '').trim(),
    ...(ref ? { REF: String(ref).trim() } : {}),
  };
}

function onList(contact, listId) {
  const ids = Array.isArray(contact && contact.listIds) ? contact.listIds : [];
  return ids.map(Number).includes(Number(listId));
}

function sameEmail(left, right) {
  return String(left).trim().toLowerCase() === String(right).trim().toLowerCase();
}

// Brevo's documented body nests these under `contacts`, but some examples
// place `success` / `failure` at the top level. Accept either shape.
function listedEmails(data, key) {
  const groups = [];
  if (data && Array.isArray(data[key])) groups.push(data[key]);
  if (data && data.contacts && Array.isArray(data.contacts[key])) groups.push(data.contacts[key]);
  return groups.flat().filter((item) => typeof item === 'string');
}

function membershipConfirmed(data, email) {
  const succeeded = listedEmails(data, 'success').some((item) => sameEmail(item, email));
  const failed = listedEmails(data, 'failure').some((item) => sameEmail(item, email));
  return succeeded && !failed;
}

async function sendBrevoError(res, brevoRes) {
  const errData = await readJson(brevoRes);
  return res.status(brevoRes.status).json({
    error: errData.message || SUBSCRIBE_ERROR,
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body || {};
    const { EMAIL } = body;
    if (!EMAIL || !EMAIL.includes('@')) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const email = EMAIL.trim();
    const listId = Number(process.env.BREVO_LIST_ID || 5);
    const attributes = attributesFrom(body);

    const existingRes = await brevoFetch(contactPath(email));
    if (existingRes.status === 404) {
      await readJson(existingRes);
      // Brand-new address: one create that adds them to the list a single time.
      const created = await brevoFetch('/contacts', {
        method: 'POST',
        body: {
          email,
          attributes,
          listIds: [listId],
          updateEnabled: true,
          emailBlacklisted: false,
        },
      });
      if (!created.ok) return sendBrevoError(res, created);
      await readJson(created);
      return res.status(200).json({ ok: true });
    }

    if (!existingRes.ok) return sendBrevoError(res, existingRes);

    const existing = await readJson(existingRes);
    const alreadyOnList = onList(existing, listId);

    // Clear a blocklist before the list-add event. The form submit is an
    // explicit re-opt-in; contacts who are already subscribed only get
    // their attributes refreshed.
    const update = { attributes };
    if (existing.emailBlacklisted === true) update.emailBlacklisted = false;

    const updated = await brevoFetch(contactPath(email), { method: 'PUT', body: update });
    if (!updated.ok) return sendBrevoError(res, updated);
    await readJson(updated);

    // "Contact added to list" does not fire for someone already on the list.
    // Removing specific emails is synchronous (201 plus a success entry).
    // The async processId response is only for {"all": true}, which we never send.
    // Add them back only after that removal is confirmed — no fixed delay.
    if (alreadyOnList) {
      const removed = await brevoFetch(`/contacts/lists/${listId}/contacts/remove`, {
        method: 'POST',
        body: { emails: [email] },
      });
      if (!removed.ok) return sendBrevoError(res, removed);
      const removedData = await readJson(removed);
      if (!membershipConfirmed(removedData, email)) {
        return res.status(502).json({ error: SUBSCRIBE_ERROR });
      }
    }

    const added = await brevoFetch(`/contacts/lists/${listId}/contacts/add`, {
      method: 'POST',
      body: { emails: [email] },
    });
    if (!added.ok) return sendBrevoError(res, added);
    const addedData = await readJson(added);
    if (!membershipConfirmed(addedData, email)) {
      return res.status(502).json({ error: SUBSCRIBE_ERROR });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Server error connecting to email service.' });
  }
};
