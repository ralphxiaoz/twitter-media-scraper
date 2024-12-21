// Import JSZip directly in the service worker
importScripts('lib/jszip.min.js');

console.log('Background script loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message received in background:', request);
    
    if (request.action === 'scrapeImages') {
        console.log('Starting scrape process');
        const { maxScrolls } = request;
        
        scrapeImages(maxScrolls)
            .then(imageDetails => {
                console.log('Scraping completed, found image details:', imageDetails);
                // Send the scraped image details to the popup
                chrome.runtime.sendMessage({
                    action: 'updateImages',
                    imageUrls: Array.from(imageDetails.keys())
                });
                sendResponse({ status: 'completed' });
            })
            .catch((error) => {
                console.error('Error during scraping:', error);
                sendResponse({ status: 'error', message: error.message });
            });
        return true; // Will respond asynchronously
    }
});

async function scrapeImages(maxScrolls) {
    console.log('Inside scrapeImages function, maxScrolls:', maxScrolls);
    const imageDetails = new Map(); // To store image URLs and their corresponding filenames

    try {
        // Get the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
            throw new Error('No active tab found. Please open a tab and try again.');
        }
        console.log('Active tab:', tab);

        // Execute content script to scrape images
        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: scrapeImagesFromPage,
            args: [maxScrolls]
        });

        console.log('Scraping result:', result);
        const scrapedImageUrls = result[0].result || [];

        // Extract account name from the page or URL
        const accountName = await getAccountName(tab.id);

        // Generate filenames based on account name and unique ID
        scrapedImageUrls.forEach(url => {
            const matches = url.match(/media\/([^?]+)/);
            if (matches && matches[1]) {
                const uniqueId = matches[1];
                const filename = `${accountName}_${uniqueId}.jpg`; // Format: accountName_uniqueID.jpg
                imageDetails.set(url, filename); // Store the URL and its corresponding filename
            }
        });

        return imageDetails; // Return the map of image URLs and filenames
    } catch (error) {
        console.error('Error in scrapeImages:', error);
        throw error; // Rethrow the error to be caught in the listener
    }
}

// Function to extract account name
async function getAccountName(tabId) {
    const [result] = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        function: () => {
            // Logic to extract account name from the page
            const accountElement = document.querySelector('meta[property="og:title"]');
            return accountElement ? accountElement.content : 'unknown_account';
        }
    });
    return result.result;
}

// This function will be injected into the page
async function scrapeImagesFromPage(maxScrolls) {
    console.log('Scraping images from page, maxScrolls:', maxScrolls);
    const imageUrls = new Set();
    let scrollCount = 0;
    let noNewTweetsCount = 0;

    while (scrollCount < maxScrolls && noNewTweetsCount < 3) {
        const imageLinks = document.querySelectorAll('a[href*="/photo/"]');
        console.log(`Found ${imageLinks.length} image links on current scroll`);

        const previousCount = imageUrls.size;

        for (const link of imageLinks) {
            try {
                const imgElement = link.querySelector('img[src*="twimg.com"]');
                if (imgElement) {
                    const imgUrl = imgElement.src;
                    console.log('Found image URL:', imgUrl); // Log the found image URL
                    if (imgUrl && imgUrl.includes('twimg.com')) {
                        const matches = imgUrl.match(/media\/([^?]+)/);
                        if (matches && matches[1]) {
                            const uniqueId = matches[1];
                            const highQualityUrl = `https://pbs.twimg.com/media/${uniqueId}?format=jpg&name=4096x4096`;

                            if (!imageUrls.has(highQualityUrl)) {
                                imageUrls.add(highQualityUrl);
                                console.log('Added image URL:', highQualityUrl); // Log added image URL
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Error processing image:', error);
            }
        }

        if (imageUrls.size === previousCount) {
            noNewTweetsCount++;
        } else {
            noNewTweetsCount = 0;
        }

        const lastHeight = document.body.scrollHeight;
        window.scrollTo(0, document.body.scrollHeight);
        await new Promise(resolve => setTimeout(resolve, 2000));

        window.scrollTo(0, document.body.scrollHeight - 1000);
        await new Promise(resolve => setTimeout(resolve, 1000));
        window.scrollTo(0, document.body.scrollHeight);
        await new Promise(resolve => setTimeout(resolve, 2000));

        const newHeight = document.body.scrollHeight;
        if (newHeight === lastHeight) {
            noNewTweetsCount++;
        } else {
            scrollCount++;
        }
    }

    console.log(`Scraping completed. Found ${imageUrls.size} unique images.`);
    return Array.from(imageUrls);
}