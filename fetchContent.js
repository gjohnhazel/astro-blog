import axios from 'axios';
import dotenv from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';
import { format, parseISO } from 'date-fns';

dotenv.config();

const githubBaseUrl = "https://api.github.com/repos/gjohnhazel/obsidian/contents/Blog/posts";
const token = process.env.GITHUB_TOKEN;

// Function to fetch the directory listing from GitHub
const fetchContentList = async () => {
    try {
        const response = await axios.get(githubBaseUrl, {
            headers: { 'Authorization': `token ${token}` }
        });
        return response.data;
    } catch (error) {
        console.error(`Error fetching content list:`, error);
        return [];
    }
};

// Function to transform markdown content by reformatting dates, removing the first H1,
// and wrapping frontmatter values in single quotes
const transformContent = (content) => {
    // Regex to find YAML frontmatter at the top of the markdown file
    const frontmatterRegex = /^(---\n[\s\S]+?\n---)/;
    let frontmatter = content.match(frontmatterRegex);

    if (frontmatter && frontmatter.length > 0) {
        // Process each line in the frontmatter
        frontmatter = frontmatter[0].split('\n').map(line => {
            return line.replace(/^(.*?):\s*(.*)$/, (match, key, value) => {
                // Rename 'date' key to 'pubDate'
                if (key === 'date') {
                    key = 'pubDate';
                }
                // Ensure all values are wrapped in double quotes and handle escaping
                if (!value.match(/^".*?"$/)) {
                    // Replace internal double quotes with escaped double quotes
                    value = `"${value.replace(/"/g, '\\"')}"`;
                }
                return `${key}: ${value}`;
            });
        }).join('\n');
    }

    // Replace the old frontmatter with the new transformed frontmatter
    content = content.replace(frontmatterRegex, frontmatter);

    // Remove the first H1 header
    content = content.replace(/^\s*#\s*(.*)\s*$/m, '');

    return content;
};



// Example usage in the saveContentToLocal function
const saveContentToLocal = async (content, filename) => {
    const filePath = path.join('src/content/blog', filename);
    const transformedContent = transformContent(content);
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
