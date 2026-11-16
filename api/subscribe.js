export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { FIRSTNAME, EMAIL, ref } = req.body || {};
  if (!EMAIL || !EMAIL.includes('@')) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const apiKey = process.env.BREVO_API_KEY;
  const listId = parseInt(process.env.BREVO_LIST_ID || '', 10);

  if (!apiKey || Number.isNaN(listId)) {
    return res.status(500).json({ error: 'Server email configuration missing.' });
  }

  const attributes = {};
  if (FIRSTNAME && FIRSTNAME.trim()) attributes.FIRSTNAME = FIRSTNAME.trim();
  if (ref && ref.trim()) attributes.REF = ref.trim();

  try {
    const response = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        email: EMAIL.trim().toLowerCase(),
        attributes,
        listIds: [listId],
        updateEnabled: true,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('Brevo API error:', errData);
      return res.status(400).json({ error: errData.message || 'Could not subscribe email.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Subscribe handler error:', err);
    return res.status(500).json({ error: 'Network error connecting to email service.' });
  }
}
