// Import the necessary functions from fetchContent.js
import { fetchMainNav, fetchOtherPages, fetchPosts } from '../src/functions/fetchContent.js';

// Function to test the fetch functions
async function testFetchFunctions() {
    console.log("Fetching Main Navigation:");
    const mainNav = await fetchMainNav();
    console.log(mainNav);

    console.log("Fetching Other Pages:");
    const otherPages = await fetchOtherPages();
    console.log(otherPages);

    console.log("Fetching Posts:");
    const posts = await fetchPosts();
    console.log(posts);
}

// Call the function to test fetching
testFetchFunctions();
