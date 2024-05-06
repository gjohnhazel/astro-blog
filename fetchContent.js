import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs/promises';  // Use fs from 'fs/promises' to ensure promise-based operations
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { format, parseISO } from 'date-fns';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const token = process.env.GITHUB_TOKEN;
const publicDir = resolve(__dirname, 'public');  // Path to the public directory for images
const graphqlEndpoint = 'https://api.github.com/graphql';

// Define ensureDirectoryExistence
const ensureDirectoryExistence = async (filePath) => {
    const dir = dirname(filePath);
    try {
        await fs.access(dir);
    } catch (error) {
        if (error.code === 'ENOENT') {
            await fs.mkdir(dir, { recursive: true });
        } else {
            throw error;
        }
    }
};

// Function to fetch the directory listing from GitHub using GraphQL API
const fetchContentList = async () => {
    const query = `
    {
        repository(owner: "gjohnhazel", name: "obsidian") {
            object(expression: "main:Blog/posts") {
                ... on Tree {
                    entries {
                        name
                        object {
                            ... on Blob {
                                oid
                                text
                            }
                        }
                    }
                }
            }
        }
    }`;

    try {
        const response = await axios.post(graphqlEndpoint, { query }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        console.log("GraphQL Response:", JSON.stringify(response.data, null, 2));
        return response.data.data.repository.object.entries;
    } catch (error) {
        console.error(`Error fetching content list:`, error);
        return [];
    }
};

const transformContent = async (content) => {
    const frontmatterRegex = /^(---\n[\s\S]+?\n---)/;
    let frontmatterSection = content.match(frontmatterRegex)[0];

    let heroImagePath = '';  // To store the path of the hero image

    // Transforming the frontmatter block
    let transformedFrontmatter = frontmatterSection
        .split('\n')
        .map(async line => {  // Use async inside map to handle async operations
            if (line.startsWith('date:')) {
                const date = line.split('date: ')[1].trim();
                const formattedDate = format(parseISO(date), 'MMM dd yyyy');
                return `pubDate: "${formattedDate}"`;
            }
            if (line.startsWith('image:')) {
                const imageName = line.split('image: ')[1].trim();
                heroImagePath = await fetchAndSaveImage(imageName);  // Fetch and save the image
                return `heroImage: "${heroImagePath}"`;  // Use the saved image path
            }
            return line.replace(/^(.*?): (.*)$/, (match, key, value) => `${key}: "${value.replace(/"/g, '\\"')}"`);
        });

    // Await all promises from map (since map is not awaited, we use Promise.all to resolve all promises)
    transformedFrontmatter = await Promise.all(transformedFrontmatter);
    transformedFrontmatter = transformedFrontmatter.join('\n');

    // Replace the original frontmatter with the transformed one
    content = content.replace(frontmatterRegex, transformedFrontmatter);

    // Removing Obsidian image links
    content = content.replace(/!\[\[(.*?)\]\]/g, '');

    // Regex to remove the first Markdown header immediately following the frontmatter
    content = content.replace(/(\n---\n)\s*#\s*.+\n/, '$1');

    return content;
};




// Function to fetch and save an image, ensuring it saves to the public directory
const fetchAndSaveImage = async (imageName) => {
    imageName = imageName.replace(/^"|"$/g, '');  // Clean up imageName
    const imageUrl = `https://raw.githubusercontent.com/gjohnhazel/obsidian/main/Blog/images/${encodeURIComponent(imageName)}`;

    try {
        const response = await axios.get(imageUrl, {
            headers: { 'Authorization': `Bearer ${token}` },
            responseType: 'arraybuffer'
        });
        const targetPath = join(publicDir, imageName);
        await fs.writeFile(targetPath, response.data);
        console.log(`Image saved to ${targetPath}`);
        return `/${imageName}`;  // Update to use relative path suitable for web access
    } catch (error) {
        console.error(`Error fetching or saving image ${imageName}:`, error);
        return '';
    }
};


const updateLocalBlogPosts = async () => {
    const posts = await fetchContentList();
    for (const post of posts) {
        try {
            const content = await transformContent(post.object.text);
            const filePath = join('src/content/blog', post.name);
            await ensureDirectoryExistence(filePath);
            await fs.writeFile(filePath, content);
        } catch (error) {
            console.error(`Error processing file ${post.name}:`, error);
        }
    }
};

updateLocalBlogPosts();
