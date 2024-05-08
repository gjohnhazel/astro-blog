import fetch from 'node-fetch';

async function sendEmailToSubscribers(postTitle, postUrl) {
  // Get subscribers from Teable
  const subscribersResponse = await fetch('https://app.teable.io/api/table/tblQrs7kiJsqHui8JbC/record', {
    headers: {
      'Authorization': `Bearer ${process.env.TEABLE_API_KEY}`
    }
  });
  const subscribers = await subscribersResponse.json();

  // Send email to each subscriber
  subscribers.records.forEach(subscriber => {
    const email = subscriber.fields['Email Address'];
    const name = subscriber.fields['Name'];
    
    // Construct the email message
    const message = `
      Hi ${name},
      A new blog post titled "${postTitle}" has been published. Check it out here: ${postUrl}
    `;

    // Use your email service's API to send the email
    fetch('https://api.emailservice.com/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.EMAIL_SERVICE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: email,
        subject: `New Blog Post: ${postTitle}`,
        text: message
      })
    });
  });
}

export default async function (req, res) {
  if (req.method === 'POST') {
    const { postTitle, postUrl } = req.body;
    await sendEmailToSubscribers(postTitle, postUrl);
    res.status(200).send('Emails sent successfully');
  } else {
    res.status(405).send('Method not allowed');
  }
}
