document.addEventListener('DOMContentLoaded', () => {
    const button = document.getElementById('scrapeButton');
    const downloadAllButton = document.getElementById('downloadAllButton');
    const imageGrid = document.getElementById('imageGrid');
    const status = document.getElementById('status');

    button.addEventListener('click', () => {
        const maxScrolls = parseInt(document.getElementById('maxScrolls').value) || 20;
        
        // Get the username from the active tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            const urlParts = tab.url.split('/'); // Split the URL by '/'
            const username = urlParts[urlParts.length - 2]; // Extract the username from the second last part of the URL
            status.textContent = `Scraping images for ${username}...`;
            imageGrid.innerHTML = ''; // Clear previous images

            chrome.runtime.sendMessage({
                action: 'scrapeImages',
                maxScrolls: maxScrolls,
                username: username // Send username to background script
            }, (response) => {
                if (response.status === 'completed') {
                    status.textContent = 'Scraping completed! Images are displayed below.';
                    downloadAllButton.style.display = 'block'; // Show the download button
                } else {
                    status.textContent = 'Error during scraping: ' + response.message; // Show error in status
                }
                // Clear the status message after a delay (optional)
                setTimeout(() => {
                    status.textContent = ''; // Clear the status message after a few seconds
                }, 5000); // Clear after 5 seconds
            });
        });
    });

    // Listen for messages from the background script to update the image grid
    chrome.runtime.onMessage.addListener((request) => {
        if (request.action === 'updateImages') {
            request.imageUrls.forEach(url => {
                const container = document.createElement('div');
                container.className = 'image-container';
                container.innerHTML = `<img src="${url}" alt="Image">`;
                imageGrid.appendChild(container);
            });
        }
    });

    // Handle the "Download All" button click
    downloadAllButton.addEventListener('click', () => {
        const images = Array.from(imageGrid.querySelectorAll('img')).map(img => img.src);
        if (images.length === 0) {
            alert('No images to download.');
            return;
        }

        const zip = new JSZip();
        const promises = images.map((url, index) => {
            return fetch(url)
                .then(response => response.blob())
                .then(blob => {
                    zip.file(`image_${index + 1}.jpg`, blob);
                });
        });

        Promise.all(promises).then(() => {
            zip.generateAsync({ type: 'blob' }).then(content => {
                const url = URL.createObjectURL(content);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'images.zip';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            });
        });
    });
}); 