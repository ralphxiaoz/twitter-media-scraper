from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
import requests
import os
import time
import zipfile
import json
import webbrowser
import http.server
import socketserver
import threading

def serve_html(html_content, port=8000):
    """Serve the HTML content on a local server."""
    class Handler(http.server.SimpleHTTPRequestHandler):
        def do_GET(self):
            self.send_response(200)
            self.send_header("Content-type", "text/html")
            self.end_headers()
            self.wfile.write(html_content.encode('utf-8'))

    with socketserver.TCPServer(("", port), Handler) as httpd:
        print(f"Serving at port {port}")
        httpd.serve_forever()

def create_preview_page(image_urls, username):
    # Create HTML content with thumbnails
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Image Preview - {username}</title>
        <style>
            body {{ font-family: Arial, sans-serif; padding: 20px; }}
            .container {{ max-width: 1200px; margin: 0 auto; }}
            .grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; }}
            .image-container {{ position: relative; }}
            .image-checkbox {{ position: absolute; top: 10px; left: 10px; transform: scale(1.5); }}
            img {{ width: 100%; height: 200px; object-fit: cover; border-radius: 8px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Select Images to Download - {username}</h1>
            <div class="grid">
    """
    
    # Add image thumbnails
    for i, img_url in enumerate(image_urls):
        html_content += f"""
                <div class="image-container">
                    <input type="checkbox" class="image-checkbox" data-url="{img_url}" id="img_{i}">
                    <img src="{img_url}" alt="Preview {i+1}">
                </div>
        """

    html_content += """
            </div>
        </div>
    </body>
    </html>
    """

    return html_content

def scrape_x_images(username, max_scrolls=30):
    """Scrape images and return the URLs without downloading"""
    options = webdriver.ChromeOptions()
    options.add_argument('--start-maximized')
    options.add_argument('--disable-blink-features=AutomationControlled')
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option('useAutomationExtension', False)
    driver = webdriver.Chrome(options=options)
    
    image_urls = set()
    
    try:
        # Navigate to profile's media tab
        profile_url = f'https://twitter.com/{username}/media'
        print(f"Navigating to: {profile_url}")
        driver.get(profile_url)
        time.sleep(5)
        
        scroll_count = 0
        no_new_tweets_count = 0
        
        print("Starting to scan for images in media tab...")
        
        while scroll_count < max_scrolls and no_new_tweets_count < 3:
            try:
                # Find all image links in the current view
                image_links = driver.find_elements(By.CSS_SELECTOR, 'a[href*="/photo/"]')
                print(f"\n=== Scroll {scroll_count + 1}: Found {len(image_links)} image links ===")
                
                for link in image_links:
                    try:
                        img_element = link.find_element(By.CSS_SELECTOR, 'img[src*="twimg.com"]')
                        img_url = img_element.get_attribute('src')
                        
                        if img_url and 'twimg.com' in img_url:
                            base_url = img_url.split('?')[0]
                            high_quality_url = f"{base_url}?format=jpg&name=4096x4096"
                            
                            if high_quality_url not in image_urls:
                                image_urls.add(high_quality_url)
                                print(f"Found new image: {high_quality_url}")
                    except Exception as e:
                        print(f"Error processing image link: {str(e)}")
                        continue
                
                # Scroll logic
                last_height = driver.execute_script("return document.body.scrollHeight")
                driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                time.sleep(2)
                
                driver.execute_script("window.scrollTo(0, document.body.scrollHeight - 1000);")
                time.sleep(1)
                driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                time.sleep(2)
                
                new_height = driver.execute_script("return document.body.scrollHeight")
                
                if new_height == last_height:
                    no_new_tweets_count += 1
                    print("No new content loaded")
                else:
                    no_new_tweets_count = 0
                    scroll_count += 1
                    print(f"Scrolled to new content. Found {len(image_urls)} images so far...")
                    
            except Exception as se:
                print(f"Scroll error: {str(se)}")
                continue
                
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        
    finally:
        driver.quit()
        
    return image_urls

def download_selected_images(urls, username, output_folder='downloaded_images'):
    """Download selected images and create a ZIP file"""
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
        
    zip_filename = f"{username}_selected_images.zip"
    with zipfile.ZipFile(os.path.join(output_folder, zip_filename), 'w') as zipf:
        for i, img_url in enumerate(urls):
            try:
                response = requests.get(img_url, stream=True)
                if response.status_code == 200:
                    img_id = img_url.split('/')[-1].split('?')[0]
                    extension = '.jpg'  # Default to jpg
                    filename = f"{username}_{img_id}{extension}"
                    filepath = os.path.join(output_folder, filename)
                    
                    with open(filepath, 'wb') as f:
                        for chunk in response.iter_content(chunk_size=8192):
                            if chunk:
                                f.write(chunk)
                    
                    zipf.write(filepath, filename)
                    os.remove(filepath)
                    print(f"Downloaded and added to zip: {filename}")
                    
            except Exception as e:
                print(f"Error downloading {img_url}: {str(e)}")
                continue

    return zip_filename

if __name__ == "__main__":
    target_username = input("Enter the X (Twitter) username to scrape (without @): ")
    max_scrolls = int(input("Enter maximum number of scrolls (recommended: 30): "))
    
    # First, scrape the images
    print("Scraping images...")
    image_urls = scrape_x_images(target_username, max_scrolls)
    print(f"\nFinished scanning. Found {len(image_urls)} images.")
    
    # Create the preview page content
    html_content = create_preview_page(image_urls, target_username)
    
    # Check if the HTML content was generated successfully
    if html_content:
        print("Starting the server...")
        threading.Thread(target=serve_html, args=(html_content,)).start()
        
        # Wait for a moment to ensure the server is running
        time.sleep(1)  # Wait for 1 second before opening the browser
        
        print("Opening the preview page in the browser...")
        webbrowser.open('http://localhost:8000')
    else:
        print("Failed to generate the preview page. The download function will not be called.")