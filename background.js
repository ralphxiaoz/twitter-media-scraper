// Import JSZip directly in the service worker
importScripts('lib/jszip.min.js');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'zipImages') {
    // Create a new ZIP file
    const zip = new JSZip();
    
    // Add all images and log to zip
    Promise.all(request.images.map(async ({ url, filename }) => {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        zip.file(filename, blob);
        return { filename, success: true, size: blob.size };
      } catch (error) {
        console.error(`Error downloading ${filename}:`, error);
        return { filename, success: false, error: error.message };
      }
    }))
    .then(async (results) => {
      // Create log file
      const logEntries = [];
      const timestamp = new Date().toISOString();
      logEntries.push(`Download started at: ${timestamp}`);
      logEntries.push(`Username: ${request.username}`);
      logEntries.push('');
      logEntries.push('Downloaded Images:');
      logEntries.push('----------------');

      let successCount = 0;
      let failureCount = 0;

      results.forEach(result => {
        if (result.success) {
          logEntries.push(`✓ ${result.filename}`);
          logEntries.push(`  Size: ${(result.size / 1024).toFixed(2)} KB`);
          logEntries.push('');
          successCount++;
        } else {
          logEntries.push(`✗ ${result.filename}`);
          logEntries.push(`  Error: ${result.error}`);
          logEntries.push('');
          failureCount++;
        }
      });

      // Add summary to log
      logEntries.push('');
      logEntries.push('Download Summary:');
      logEntries.push('----------------');
      logEntries.push(`Total images found: ${results.length}`);
      logEntries.push(`Successfully downloaded: ${successCount}`);
      logEntries.push(`Failed downloads: ${failureCount}`);
      logEntries.push(`Completion time: ${new Date().toISOString()}`);

      // Add log to zip
      zip.file('download_log.txt', logEntries.join('\n'));

      // Generate zip as base64
      const base64 = await zip.generateAsync({
        type: "base64",
        compression: "DEFLATE",
        compressionOptions: { level: 9 }
      });

      // Create data URL
      const dataUrl = 'data:application/zip;base64,' + base64;
      
      // Download using data URL
      chrome.downloads.download({
        url: dataUrl,
        filename: `${request.username}_images.zip`,
        saveAs: true
      }, (downloadId) => {
        sendResponse({ status: 'success', downloadId });
      });
    })
    .catch(error => {
      console.error('Error processing images:', error);
      sendResponse({ status: 'error', message: error.message });
    });

    return true; // Will respond asynchronously
  }
}); 