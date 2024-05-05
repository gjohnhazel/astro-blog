import axios from 'axios';
import dotenv from 'dotenv';
import { promises as fs } from 'fs';
import path from 'path';

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

// Function to save content to the local file system
const saveContentToLocal = async (content, filename) => {
    const filePath = path.join('src/content/blog', filename);
    await fs.writeFile(filePath, content);
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
