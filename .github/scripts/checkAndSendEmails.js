import 'dotenv/config';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import process from 'process';

const TEABLE_API_KEY = process.env.TEABLE_API_KEY;
const TABLE_ID = 'tbluPHQDU9BKNd9VDAR'; // Replace with your actual table ID from Teable

async function sendEmail(postTitle, subject, content) {
  const email = 'john@johnhazel.com'; // Set the recipient email address
  const apiEndpoint = 'http://localhost:3000/api/sendEmail'; // URL where your sendEmail function is accessible

  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: email, // the recipient's email address
      subject: subject, // subject of the email
      content: content // body of the email
    })
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Failed to send email: ${errorData}`);
  }

  console.log('Email sent successfully to:', email);
}

async function checkAndSendEmails() {
  const postsDirectory = path.join(process.cwd(), 'src/content/blog');
  const files = fs.readdirSync(postsDirectory);

  for (const file of files) {
    const postContent = fs.readFileSync(path.join(postsDirectory, file), 'utf-8');
    const postTitle = extractTitle(postContent); // You need to define how to extract the title

    // Check if post exists in Teable and if email was sent
    const exists = await checkPostInTeable(postTitle);
    if (!exists) {
      // Assuming you have a function to send emails
      sendEmail(postTitle, 'New post published on John Hazel\'s Blog', postContent);
      // Add post to Teable or mark it as emailed
      addToTeable(postTitle);
    }
  }
}

function extractTitle(postContent) {
  // Match the frontmatter block
  const frontMatterMatch = postContent.match(/---\s*?\n([\s\S]*?)\n---/);
  if (!frontMatterMatch) {
    console.error("No frontmatter found.");
    return ''; // Handle appropriately if no frontmatter is found
  }

  const frontMatterContent = frontMatterMatch[1];
  // Extract title from the frontmatter content
  const titleMatch = frontMatterContent.match(/^title:\s*"([^"]+)"/m);
  if (!titleMatch) {
    console.error("Title not found in frontmatter.");
    return ''; // Handle appropriately if no title is found
  }

  return titleMatch[1];
}


async function checkPostInTeable(postTitle) {
  const response = await fetch(`https://app.teable.io/api/table/${TABLE_ID}/record?query=${encodeURIComponent(postTitle)}`, {
    headers: {
      'Authorization': `Bearer ${TEABLE_API_KEY}`
    }
  });
  const data = await response.json();
  return data.records && data.records.some(record => record.fields['Post Title'] === postTitle && record.fields['Email Sent']);
}

async function fetchMostRecentRecord() {
  const apiUrl = `https://app.teable.io/api/table/${TABLE_ID}/record?sort=-created_at`;
  const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
          'Authorization': `Bearer ${TEABLE_API_KEY}`,
          'Content-Type': 'application/json'
      }
  });

  if (!response.ok) {
      const errorData = await response.text();
      console.error("Failed to fetch records:", errorData);
      return null;  // Handle error appropriately
  }

  const data = await response.json();
  if (data.records && data.records.length > 0) {
      const mostRecentRecord = data.records[0];
      console.log("Most recent record ID:", mostRecentRecord.id);
      return mostRecentRecord.id;
  } else {
      console.log("No records found.");
      return null;
  }
}

async function addToTeable(postTitle) {
  const anchorId = await fetchMostRecentRecord(); 

  if (!anchorId) {
    console.error("Failed to retrieve anchor ID. Cannot add record.");
    return false;
  }

  const response = await fetch(`https://app.teable.io/api/table/${TABLE_ID}/record`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${TEABLE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      fieldKeyType: "name",
      typecast: true,
      order: {
        viewId: "viwGHT2fXNdOXQmtkNv",
        anchorId: anchorId,
        position: "after"
      },
      records: [
        {
          fields: {
            "Post Title": postTitle,
            "Email Sent": true
          }
        }
      ]
    })
  });
  
  if (!response.ok) {
    const errorResponse = await response.json();
    console.error("Error adding to Teable:", errorResponse);
    return false;
  }

  console.log("Record added to Teable successfully.");
  return true;
}


export default checkAndSendEmails;


function isMainModule() {
  const currentFile = fileURLToPath(import.meta.url);
  const mainModule = process.argv[1];

  return currentFile === path.resolve(mainModule);
}

if (isMainModule()) {
  checkAndSendEmails()
      .then(() => console.log('Emails checked and sent successfully.'))
      .catch(err => console.error('Failed to check and send emails:', err));
}