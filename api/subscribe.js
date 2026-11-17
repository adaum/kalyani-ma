module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { FIRSTNAME, EMAIL, ref } = req.body || {};
    if (!EMAIL || !EMAIL.includes('@')) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const listId = Number(process.env.BREVO_LIST_ID || 5);
    const payload = {
      email: EMAIL.trim(),
      attributes: {
        FIRSTNAME: (FIRSTNAME || '').trim(),
        ...(ref ? { REF: String(ref).trim() } : {}),
      },
      listIds: [listId],
      updateEnabled: true,
    };

    const brevoRes = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
      },
      body: JSON.stringify(payload),
    });

    if (!brevoRes.ok) {
      const errData = await brevoRes.json().catch(() => ({}));
      return res.status(brevoRes.status).json({
        error: errData.message || 'Could not subscribe at this time.',
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Server error connecting to email service.' });
  }
};
