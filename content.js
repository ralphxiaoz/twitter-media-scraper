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
            // Extract the unique ID from the URL
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

    // Check if we found new images
    if (imageUrls.size === previousCount) {
      noNewTweetsCount++;
    } else {
      noNewTweetsCount = 0;
    }

    // Scroll down
    const lastHeight = document.body.scrollHeight;
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Scroll up slightly and back down to trigger lazy loading
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

  // Create a new ZIP file
  const zip = new JSZip();
  let downloadCount = 0;

  // Download and zip images
  for (const [imgUrl, filename] of imageDetails) {
    try {
      console.log(`Downloading ${downloadCount + 1}/${imageDetails.size}:`, filename);
      
      // Fetch the image
      const response = await fetch(imgUrl);
      const blob = await response.blob();
      
      // Add to zip
      zip.file(filename, blob);
      
      downloadCount++;
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`Error downloading ${filename}:`, error);
    }
  }

  console.log('Generating zip file...');
  
  try {
    // Generate zip file
    const zipBlob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: {
        level: 9
      }
    });

    // Create object URL for the zip
    const zipUrl = URL.createObjectURL(zipBlob);

    // Send message to background script to download zip
    chrome.runtime.sendMessage({
      action: 'downloadZip',
      url: zipUrl,
      filename: `${username}_images.zip`
    });

    console.log('Zip file ready for download');
  } catch (error) {
    console.error('Error creating zip:', error);
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'downloadImages') {
    downloadImages(request.username, request.maxScrolls);
    sendResponse({ status: 'started' });
  }
}); 