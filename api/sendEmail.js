import fetch from 'node-fetch';

export default async function (req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed, please use POST' });
  }

  const { email, subject, content } = req.body;

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email }] }],
      from: { email: 'john@blog.johnhazel.com' }, // This email should be verified with SendGrid
      subject: subject,
      content: [{ type: 'text/plain', value: content }]
    })
  });

  if (response.ok) {
    res.status(200).send('Email sent successfully');
  } else {
    const errorData = await response.text();  // Changed to text to debug non-JSON responses
    res.status(response.status).send(`Failed to send email: ${errorData}`);
  }
}
