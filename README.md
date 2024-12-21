# X Image Downloader Chrome Extension

## Overview
The X Image Downloader is a Chrome extension designed to scrape images from X (formerly Twitter) profiles and allow users to download them as a ZIP file. The extension provides a user-friendly popup interface for scraping and downloading images.

## File Descriptions

### 1. `manifest.json`
The manifest file that defines the extension's metadata, permissions, and settings.

- **Permissions**: 
  - `activeTab`: Allows the extension to interact with the currently active tab.
  - `scripting`: Enables the use of the scripting API to execute scripts in the context of web pages.
  - `storage`: Allows the extension to use the Chrome storage API.
  - `downloads`: Enables the extension to download files.

- **Content Scripts**: 
  - Injects `content.js` into pages matching `https://twitter.com/*` and `https://x.com/*`.

### 2. `background.js`
The background script that handles the main logic for scraping images and managing messages between the popup and content scripts.

- **Functions**:
  - `scrapeImages(maxScrolls)`: Scrapes images from the active tab, returning a map of image URLs and their corresponding filenames.
  - `getAccountName(tabId)`: Extracts the account name from the active tab's page.
  - `scrapeImagesFromPage(maxScrolls)`: Injected into the page to perform the actual scraping of images.

### 3. `popup.html`
The HTML file that defines the user interface for the extension's popup.

- **Elements**:
  - Input field for the maximum number of scrolls.
  - Button to initiate the scraping process.
  - Button to download all scraped images.
  - A grid to display the scraped image thumbnails.

### 4. `popup.js`
The JavaScript file that handles user interactions in the popup.

- **Functions**:
  - Event listener for the "Scrape Images" button: Sends a message to the background script to start scraping.
  - Event listener for the "Download All" button: Fetches all images, creates a ZIP file using JSZip, and triggers the download.
  - Listens for messages from the background script to update the image grid with scraped images.

### 5. `content.js`
The content script that interacts with the web page to scrape images.

- **Functions**:
  - `downloadImages(username, maxScrolls)`: Initiates the download process for images, including creating a ZIP file.

### 6. `lib/jszip.min.js`
A library used to create ZIP files in the browser. This library is included in the popup to facilitate the downloading of multiple images as a single ZIP file.

### 7. `app/scraper.py`
A Python script that uses Selenium to scrape images from X (Twitter) profiles. It serves the scraped images in a local HTML preview page.

- **Functions**:
  - `serve_html(html_content, port=8000)`: Serves the provided HTML content on a local server.
  - `create_preview_page(image_urls, username)`: Generates HTML content with thumbnails for the scraped images.
  - `scrape_x_images(username, max_scrolls=30)`: Scrapes images from the specified user's media tab and returns the URLs.
  - `download_selected_images(urls, username, output_folder='downloaded_images')`: Downloads selected images and creates a ZIP file.

## Usage Instructions

1. **Install the Extension**: Load the extension in Chrome by navigating to `chrome://extensions/`, enabling "Developer mode," and selecting "Load unpacked."
2. **Scrape Images**: Open a Twitter profile and click the extension icon. Enter the username and click "Scrape Images" to collect images.
3. **Download Images**: After scraping, click "Download All" to download all images as a ZIP file.

## Notes
- Ensure that the extension has the necessary permissions to access the active tab and scrape images.
- The scraping logic may need to be updated if the structure of the X.com page changes.