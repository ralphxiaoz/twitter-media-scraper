document.getElementById('downloadButton').addEventListener('click', async () => {
  const button = document.getElementById('downloadButton');
  const status = document.getElementById('status');
  const maxScrolls = parseInt(document.getElementById('maxScrolls').value);

  button.disabled = true;
  status.textContent = 'Starting download...';

  try {
    // Get the current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Verify we're on a Twitter/X profile page or media tab
    if (!tab.url.match(/https?:\/\/(twitter|x)\.com\/[^\/]+(\/?$|\/media\/?$)/)) {
      throw new Error('Please navigate to a Twitter/X profile page or media tab');
    }

    // Extract username from URL
    const username = tab.url.split('/')[3];

    // If we're not on the media tab, redirect there first
    if (!tab.url.endsWith('/media')) {
      status.textContent = 'Redirecting to media tab...';
      const domain = tab.url.includes('x.com') ? 'x.com' : 'twitter.com';
      await chrome.tabs.update(tab.id, { url: `https://${domain}/${username}/media` });
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Inject the combined script
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content-with-jszip.js']
    });

    // Start the download process
    await chrome.tabs.sendMessage(tab.id, {
      action: 'downloadImages',
      username: username,
      maxScrolls: maxScrolls
    });

    status.textContent = 'Download started! Please keep the tab open.';
  } catch (error) {
    status.textContent = `Error: ${error.message}`;
    button.disabled = false;
  }
}); 