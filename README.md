# BigQuery Release Pulse 📢

BigQuery Release Pulse is a premium web dashboard built with Python Flask and plain vanilla HTML5, CSS3, and JavaScript. It aggregates, parses, and displays the Google Cloud BigQuery Release Notes, allowing you to filter updates by category, search keywords, and easily compose and share updates on X (Twitter).

---

## ✨ Features

- **Granular Updates Extraction**: Decomposes unified day-level XML entries into category-specific release items (Features, Announcements, Changes, Deprecations, Issues, Fixes).
- **Premium Glassmorphic Design**: Sleek dark and light themes using CSS HSL variables, blurry glowing accent overlays, and soft translucent backgrounds.
- **Dynamic Counters**: Responsive numerical animation counters tracking overall and category-specific update logs.
- **Interactive X (Twitter) Composer**: 
  - Preview card displaying the draft before posting.
  - Custom character counting logic recognizing URL shortener constraints (accounting for any link as exactly `23` characters).
  - SVG progress ring indicating remaining characters.
  - Interactive hashtags pool to quickly toggle terms on/off.
- **Robust Searching & Filtering**: Instantly search titles, types, and text bodies dynamically.

---

## 🛠️ Technology Stack

- **Backend**: Python 3.x, Flask
- **Frontend**: Plain HTML5, Vanilla CSS3 (custom layouts & animations), ES6+ JavaScript
- **API Parsing**: Built-in Python XML ElementTree & Regex modules (no heavy external scraper modules required)

---

## 📂 Project Structure

```text
├── templates/
│   └── index.html      # Main HTML interface structure
├── static/
│   ├── style.css       # Custom styles, transitions, variables, and overlays
│   └── script.js       # Client AJAX, filters, animations, and Twitter modal
├── app.py              # Flask server, Atom feed requester, and parse logic
├── requirements.txt    # Python library requirements
├── .gitignore          # Excluded folders (e.g. env, cache)
└── README.md           # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
Make sure you have Python 3 installed on your system.

### 1. Clone & Navigate
```bash
git clone https://github.com/DivineSapiens/antigravity-event-talks-app.git
cd bq-releases-notes
```

### 2. Setup Virtual Environment (Optional but recommended)
```bash
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Run the Server
```bash
python app.py
```
Open your browser and navigate to **[http://127.0.0.1:5000](http://127.0.0.1:5000)**.

---

## 🔒 License
This project is open-source and available under the MIT License.
