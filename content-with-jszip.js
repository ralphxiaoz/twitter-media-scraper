async function downloadImages(username, maxScrolls) {
  console.log('Starting download process for user:', username);
  const imageUrls = new Set();
  const imageDetails = new Map();
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
          if (imgUrl && imgUrl.includes('twimg.com')) {
            const matches = imgUrl.match(/media\/([^?]+)/);
            if (matches && matches[1]) {
              const uniqueId = matches[1];
              const highQualityUrl = `https://pbs.twimg.com/media/${uniqueId}?format=jpg&name=4096x4096`;
              
              console.log('Original URL:', imgUrl);
              console.log('High Quality URL:', highQualityUrl);
              console.log('Unique ID:', uniqueId);
              
              const filename = `${username}-${uniqueId}.jpg`;
              console.log('Generated filename:', filename);
              
              if (!imageUrls.has(highQualityUrl)) {
                imageUrls.add(highQualityUrl);
                imageDetails.set(highQualityUrl, filename);
                console.log('Added new image to download queue:', filename);
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

  console.log(`Found total of ${imageUrls.size} unique images`);
  console.log('Starting downloads...');

  // Prepare image data for background script
  const images = Array.from(imageDetails.entries()).map(([url, filename]) => ({
    url,
    filename
  }));

  // Send to background script for processing and wait for response
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      action: 'zipImages',
      images,
      username
    }, (response) => {
      console.log('Download process completed:', response);
      resolve(response);
    });
  });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'downloadImages') {
    downloadImages(request.username, request.maxScrolls)
      .then(() => {
        sendResponse({ status: 'completed' });
      })
      .catch((error) => {
        console.error('Error:', error);
        sendResponse({ status: 'error', message: error.message });
      });
    return true; // Will respond asynchronously
  }
});