import fetch from 'node-fetch';

const TEABLE_API_KEY = process.env.TEABLE_API_KEY;
const TABLE_ID = 'tblQrs7kiJsqHui8JbC'; // Replace with your actual table ID from Teable

export default async function (req, res) {
  if (req.method === 'POST') {
    const { name, email } = req.body;

    const postData = {
      "fieldKeyType": "name",
      "typecast": true,
      "records": [
        {
          "fields": {
            "Name": name,
            "Email Address": email  // Ensure this matches exactly how it's named in your Teable table
          }
        }
      ]
    };

    const response = await fetch(`https://app.teable.io/api/table/${TABLE_ID}/record`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${TEABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(postData)
    });

    if (response.ok) {
      return res.status(200).json({ message: 'Subscription successful' });
    } else {
      const errorData = await response.json();
      return res.status(500).json({ message: 'Failed to subscribe', details: errorData });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}
