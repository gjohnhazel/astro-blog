// src/functions/fetchContent.js
import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const githubBaseUrl = "https://api.github.com/repos/gjohnhazel/obsidian/contents/Blog";
const token = process.env.GITHUB_TOKEN;  // Use the token from .env

const fetchContent = async (path) => {
    try {
        const response = await axios.get(`${githubBaseUrl}/${path}`, {
            headers: { 'Authorization': `token ${token}` }
        });
        return response.data;
    } catch (error) {
        console.error(`Error fetching ${path}:`, error);
        return [];
    }
};

export const fetchMainNav = () => fetchContent('pages/main-nav');
export const fetchOtherPages = () => fetchContent('pages/other');
export const fetchPosts = () => fetchContent('posts');
