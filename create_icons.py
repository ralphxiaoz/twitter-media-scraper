from PIL import Image, ImageDraw

def create_icon(size):
    # Create a new image with a blue background
    img = Image.new('RGB', (size, size), '#1DA1F2')
    draw = ImageDraw.Draw(img)
    
    # Calculate sizes
    padding = size // 4
    line_width = max(size // 16, 1)
    
    # Draw X using lines instead of font
    # First line of X
    draw.line([(padding, padding), (size-padding, size-padding)], 
             fill='white', 
             width=line_width)
    # Second line of X
    draw.line([(padding, size-padding), (size-padding, padding)], 
             fill='white', 
             width=line_width)
    
    # Draw download arrow
    arrow_start = size * 0.6
    arrow_end = size - padding
    # Vertical line
    draw.line([(size//2, arrow_start), (size//2, arrow_end)], 
             fill='white', 
             width=line_width)
    # Arrow head
    draw.line([(size//2-padding//2, arrow_end-padding//2),
               (size//2, arrow_end),
               (size//2+padding//2, arrow_end-padding//2)],
             fill='white',
             width=line_width)
    
    return img

# Create icons directory if it doesn't exist
import os
if not os.path.exists('icons'):
    os.makedirs('icons')

# Create and save both sizes
create_icon(48).save('icons/icon48.png')
create_icon(128).save('icons/icon128.png')

print("Icons created successfully in the icons directory!") 