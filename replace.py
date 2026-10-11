import os
import re

directories = ['src', 'public']
files_to_check = ['index.html', 'metadata.json', 'package.json', 'capacitor.config.json']

replacements = [
    (r'AL MAYADIN BAZAAR', 'All MAYADIN FASHION'),
    (r'Al Mayadin Bazaar', 'All MAYADIN FASHION'),
    (r'al mayadin bazaar', 'All MAYADIN FASHION'),
    (r'AL MAYADIN BAZAR', 'All MAYADIN FASHION'),
    (r'Al Mayadin Bazar', 'All MAYADIN FASHION'),
    (r'al mayadin bazar', 'All MAYADIN FASHION'),
    (r'অল মায়াদিন বাজার', 'All MAYADIN FASHION'),
    (r'আল মায়াদিন বাজার', 'All MAYADIN FASHION'),
    (r'আল মায়াদিন', 'All MAYADIN FASHION'),
    (r'মায়াদিন বাজার', 'All MAYADIN FASHION'),
]

def process_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
            
        original_content = content
        for pattern, replacement in replacements:
            content = re.sub(pattern, replacement, content, flags=re.IGNORECASE)
            
        if content != original_content:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Updated: {filepath}")
    except Exception as e:
        print(f"Error processing {filepath}: {e}")

for root, dirs, files in os.walk('.'):
    if 'node_modules' in root or '.git' in root or 'dist' in root or 'android' in root or 'ios' in root:
        continue
    for file in files:
        if file.endswith(('.ts', '.tsx', '.html', '.json', '.js', '.jsx')):
            process_file(os.path.join(root, file))

print("Replacement complete.")
