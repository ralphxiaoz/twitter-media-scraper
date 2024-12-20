from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException
import requests
import os
import time
import zipfile

def download_x_images(username, output_folder='downloaded_images', max_scrolls=30):
    # Create output folder if it doesn't exist
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
    
    # Get the highest existing image number if any
    existing_images = [f for f in os.listdir(output_folder) if f.startswith(f"{username}_image_")]
    start_image_num = 0
    if existing_images:
        numbers = [int(f.split('_')[-1].split('.')[0]) for f in existing_images]
        start_image_num = max(numbers)
        print(f"Found existing images. Will continue from image #{start_image_num}")

    # Setup Chrome driver
    options = webdriver.ChromeOptions()
    options.add_argument('--start-maximized')
    options.add_argument('--disable-blink-features=AutomationControlled')
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option('useAutomationExtension', False)
    driver = webdriver.Chrome(options=options)
    
    try:
        # Login
        driver.get('https://twitter.com/login')
        time.sleep(5)
        
        username_or_email = input("Enter your X/Twitter username or email: ")
        password = input("Enter your X/Twitter password: ")
        
        try:
            username_field = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, 'input[autocomplete="username"]'))
            )
            username_field.send_keys(username_or_email)
            
            next_button = driver.find_element(By.XPATH, "//span[text()='Next']")
            next_button.click()
            time.sleep(3)
            
            password_field = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, 'input[name="password"]'))
            )
            password_field.send_keys(password)
            
            login_button = driver.find_element(By.XPATH, "//span[text()='Log in']")
            login_button.click()
            time.sleep(5)
            
        except Exception as e:
            print(f"Login failed: {str(e)}")
            driver.quit()
            return
        
        # Navigate to profile's media tab instead
        profile_url = f'https://twitter.com/{username}/media'
        print(f"Navigating to: {profile_url}")
        driver.get(profile_url)
        time.sleep(5)
        
        image_urls = set()
        processed_tweets = set()
        scroll_count = 0
        no_new_tweets_count = 0
        
        print("Starting to scan for images in media tab...")
        
        while scroll_count < max_scrolls and no_new_tweets_count < 3:
            # Find all image containers
            try:
                # Find all image links in the current view
                image_links = driver.find_elements(By.CSS_SELECTOR, 'a[href*="/photo/"]')
                print(f"\n=== Scroll {scroll_count + 1}: Found {len(image_links)} image links ===")
                
                for link in image_links:
                    try:
                        # Find the img element within the link structure
                        img_element = link.find_element(By.CSS_SELECTOR, 'img[src*="twimg.com"]')
                        img_url = img_element.get_attribute('src')
                        
                        if img_url and 'twimg.com' in img_url:
                            # Convert to highest quality version
                            base_url = img_url.split('?')[0]
                            high_quality_url = f"{base_url}?format=jpg&name=4096x4096"
                            
                            if high_quality_url not in image_urls:
                                image_urls.add(high_quality_url)
                                print(f"Found new image: {high_quality_url}")
                    
                    except Exception as e:
                        print(f"Error processing image link: {str(e)}")
                        continue
                
                # Scroll down more aggressively
                last_height = driver.execute_script("return document.body.scrollHeight")
                driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                time.sleep(2)
                
                # Scroll up slightly and back down to trigger lazy loading
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
        
        print(f"\nFinished scanning. Found {len(image_urls)} images.")
        
        # Download images
        print("\nDownloading images...")
        # Create a zip file for all images
        zip_filename = f"{username}_images.zip"
        with zipfile.ZipFile(os.path.join(output_folder, zip_filename), 'w') as zipf:
            for i, img_url in enumerate(image_urls, start=start_image_num + 1):
                try:
                    response = requests.get(img_url, stream=True)
                    if response.status_code == 200:
                        # Extract unique identifier and extension from URL
                        # Twitter image URLs look like: https://pbs.twimg.com/media/ABC123XYZ.jpg
                        img_id = img_url.split('/')[-1].split('?')[0]  # Get the filename without query params
                        
                        # Get the file extension from content-type header, fallback to .jpg
                        content_type = response.headers.get('content-type', '')
                        if 'image/jpeg' in content_type or 'image/jpg' in content_type:
                            extension = '.jpg'
                        elif 'image/png' in content_type:
                            extension = '.png'
                        elif 'image/gif' in content_type:
                            extension = '.gif'
                        elif 'image/webp' in content_type:
                            extension = '.webp'
                        else:
                            extension = '.jpg'  # default fallback
                            
                        # Remove any existing extension from img_id and add the correct one
                        img_id = os.path.splitext(img_id)[0]  # Remove any existing extension
                        filename = f"{username}_{img_id}{extension}"
                        filepath = os.path.join(output_folder, filename)
                        
                        # Save image to temporary file first
                        with open(filepath, 'wb') as f:
                            for chunk in response.iter_content(chunk_size=8192):
                                if chunk:
                                    f.write(chunk)
                        
                        # Add to zip file
                        zipf.write(filepath, filename)
                        
                        # Remove the temporary file
                        os.remove(filepath)
                        
                        print(f"Downloaded and added to zip: {filename}")
                        
                except Exception as e:
                    print(f"Error downloading {img_url}: {str(e)}")

        print(f"\nAll images have been downloaded and saved to {zip_filename}")
        
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        
    finally:
        driver.quit()

if __name__ == "__main__":
    target_username = input("Enter the X (Twitter) username to scrape (without @): ")
    max_scrolls = int(input("Enter maximum number of scrolls (recommended: 30): "))
    download_x_images(target_username, max_scrolls=max_scrolls)