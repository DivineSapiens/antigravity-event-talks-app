import os
import re
import html
import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def clean_html_to_text(html_content):
    """
    Strips HTML tags and unescapes entities to create a clean text summary.
    """
    # Replace list items with bullet points or spacing to make them readable
    text = re.sub(r'<li>', '• ', html_content)
    text = re.sub(r'</li>', '\n', text)
    text = re.sub(r'</p>', '\n\n', text)
    text = re.sub(r'<br\s*/?>', '\n', text)
    
    # Strip all remaining HTML tags
    text = re.sub(r'<[^>]+>', '', text)
    
    # Unescape HTML entities (e.g., &amp; -> &)
    text = html.unescape(text)
    
    # Normalize spacing
    lines = [line.strip() for line in text.split('\n')]
    # Remove empty lines, keep spacing clean
    cleaned_lines = []
    for line in lines:
        if line:
            cleaned_lines.append(line)
    
    # Join with spaces or newlines
    return "\n".join(cleaned_lines)

def parse_release_notes():
    try:
        # Fetch the feed
        req = urllib.request.Request(
            FEED_URL, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            xml_data = response.read()
        
        # Parse XML
        root = ET.fromstring(xml_data)
        ns = {'atom': 'http://www.w3.org/2005/Atom'}
        entries = root.findall('atom:entry', ns)
        
        parsed_items = []
        
        for entry in entries:
            entry_title = entry.find('atom:title', ns).text  # E.g. "June 22, 2026"
            entry_updated = entry.find('atom:updated', ns).text  # E.g. "2026-06-22T00:00:00-07:00"
            
            # Find alternate link
            entry_link = ""
            for link_elem in entry.findall('atom:link', ns):
                if link_elem.attrib.get('rel') == 'alternate':
                    entry_link = link_elem.attrib.get('href', '')
                    break
            if not entry_link:
                # Fallback to the first link or empty
                link_elem = entry.find('atom:link', ns)
                if link_elem is not None:
                    entry_link = link_elem.attrib.get('href', '')
            
            entry_id = entry.find('atom:id', ns).text
            content_elem = entry.find('atom:content', ns)
            
            if content_elem is None or not content_elem.text:
                continue
                
            content_html = content_elem.text
            
            # Split the HTML content by <h3> headers
            # E.g. <h3>Feature</h3><p>...</p><h3>Change</h3><p>...</p>
            parts = re.split(r'<h3>(.*?)</h3>', content_html)
            
            # If no <h3> headers found, re.split returns a single item [content_html]
            if len(parts) == 1:
                # No headers, treat the entire content as "Update"
                html_body = content_html.strip()
                text_body = clean_html_to_text(html_body)
                parsed_items.append({
                    "id": f"{entry_id}_0",
                    "date": entry_title,
                    "updated": entry_updated,
                    "link": entry_link,
                    "type": "Update",
                    "html_content": html_body,
                    "text_content": text_body
                })
            else:
                # Text before the first <h3>
                prefix = parts[0].strip()
                if prefix:
                    # If there's substantial text before any heading
                    # Check if it has readable content (not just whitespace/newlines)
                    clean_prefix = clean_html_to_text(prefix)
                    if clean_prefix:
                        parsed_items.append({
                            "id": f"{entry_id}_prefix",
                            "date": entry_title,
                            "updated": entry_updated,
                            "link": entry_link,
                            "type": "Overview",
                            "html_content": prefix,
                            "text_content": clean_prefix
                        })
                
                # Pairwise header and body
                item_idx = 0
                for idx in range(1, len(parts), 2):
                    header = parts[idx].strip()
                    body = parts[idx+1].strip() if idx+1 < len(parts) else ""
                    
                    if not body:
                        continue
                        
                    text_body = clean_html_to_text(body)
                    
                    parsed_items.append({
                        "id": f"{entry_id}_{header.lower()}_{item_idx}",
                        "date": entry_title,
                        "updated": entry_updated,
                        "link": entry_link,
                        "type": header,
                        "html_content": body,
                        "text_content": text_body
                    })
                    item_idx += 1
                    
        return parsed_items, None
    except Exception as e:
        import traceback
        error_msg = traceback.format_exc()
        return [], str(e)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/release-notes')
def get_release_notes():
    notes, error = parse_release_notes()
    if error:
        return jsonify({"success": False, "error": error}), 500
    return jsonify({"success": True, "notes": notes})

if __name__ == '__main__':
    app.run(debug=True, port=5000)
