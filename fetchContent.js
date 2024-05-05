import axios from 'axios';
import dotenv from 'dotenv';
import { promises as fs } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { format, parseISO } from 'date-fns';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const githubBaseUrlImages = "https://api.github.com/repos/gjohnhazel/obsidian/contents/Blog/images";
const githubBaseUrlPosts = "https://api.github.com/repos/gjohnhazel/obsidian/contents/Blog/posts";
const token = process.env.GITHUB_TOKEN;
const publicDir = resolve(__dirname, 'public');  // Path to the public directory for images

// Function to fetch the directory listing from GitHub
const fetchContentList = async () => {
    try {
        const response = await axios.get(githubBaseUrlPosts, {
            headers: { 'Authorization': `token ${token}` }
        });
        return response.data;
    } catch (error) {
        console.error(`Error fetching content list:`, error);
        return [];
    }
};

// Function to fetch and save an image
const fetchAndSaveImage = async (imageName) => {
    imageName = imageName.replace(/^"|"$/g, '');  // Remove quotes that may be included in the imageName.
    const imageUrl = `https://raw.githubusercontent.com/gjohnhazel/obsidian/main/Blog/images/${encodeURIComponent(imageName)}`;


    try {
        const response = await axios.get(imageUrl, {
            headers: { 'Authorization': `token ${token}` },
            responseType: 'arraybuffer'  // Ensure the response is treated as binary data
        });
        const targetPath = join(publicDir, imageName);
        await fs.writeFile(targetPath, response.data);  // Write the binary data directly to disk
        console.log(`Image saved to ${targetPath}`);
        return targetPath.replace(__dirname, '');
    } catch (error) {
        console.error(`Error fetching or saving image ${imageName}:`, error);
        return '';
    }
};


// Adjust transformContent to ensure correct filename extraction and usage
const transformContent = async (content) => {
    const frontmatterRegex = /^(---\n[\s\S]+?\n---)/;
    let frontmatterSection = content.match(frontmatterRegex)[0];
    let frontmatterLines = frontmatterSection.split('\n');

    frontmatterLines = frontmatterLines.map(line => {
        return line.replace(/^(.*?):\s*"?(.*?)"?$/, (match, key, value) => {
            if (key.trim() === 'date') {
                value = format(parseISO(value.trim()), 'MMM dd yyyy'); // Reformat the date
                key = 'pubDate'; // Rename key
            }
            return `${key}: "${value}"`; // Ensure all values are correctly quoted
        });
    });

    frontmatterSection = frontmatterLines.join('\n');

    // Handle image replacement
    const imageRegex = /^image:\s*"?(.*?)"?$/m;
    const imageMatch = frontmatterSection.match(imageRegex);
    if (imageMatch) {
        const imagePath = await fetchAndSaveImage(imageMatch[1].trim());
        frontmatterSection = frontmatterSection.replace(imageRegex, `heroImage: "${imagePath}"`);
    }

    // Replace old frontmatter in the content
    content = content.replace(frontmatterRegex, frontmatterSection);

    // Other transformations
    content = content.replace(/!\[\[(.*?)\]\]/g, '');
    content = content.replace(/^\s*#\s*(.*)\s*$/m, '');

    return content;
};



// Function to save content to the local file system
const saveContentToLocal = async (content, filename) => {
    const filePath = join('src/content/blog', filename);
    const transformedContent = await transformContent(content);
    await fs.writeFile(filePath, transformedContent);
};

// Function to fetch and save blog posts
const updateLocalBlogPosts = async () => {
    const posts = await fetchContentList();
    for (const post of posts) {
        if (post.type === 'file') {
            try {
                const fileResponse = await axios.get(post.download_url, {
                    headers: { 'Authorization': `token ${token}` }
                });
                await saveContentToLocal(fileResponse.data, post.name);
            } catch (error) {
                console.error(`Error fetching or saving file ${post.name}:`, error);
            }
        }
    }
};

updateLocalBlogPosts();
