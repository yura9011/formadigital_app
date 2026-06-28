import os
import json
import time
import threading
import csv
import io
from flask import Flask, request, jsonify, render_template, send_from_directory, Response
from flask_cors import CORS
from config import Config
from app.scraper import run_scraper
from core.scoring import score_all_leads
from core.campaign import get_campaign_manager
from legacy.instagram_enricher import enrich_instagram

app = Flask(__name__, template_folder="../templates", static_folder="../static")
CORS(app)

# Track active scraping tasks
active_tasks = []

# Initialize campaign manager
campaign_mgr = get_campaign_manager(run_scraper)

DATA_FILE = Config.DATA_FILE

def load_data():
    if not os.path.exists(DATA_FILE):
        return []
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return []

def save_data(new_items):
    current_data = load_data()
    existing_ids = {item.get('placeId') for item in current_data if item.get('placeId')}
    
    added_count = 0
    for item in new_items:
        if item.get('placeId') and item.get('placeId') not in existing_ids:
            item['_captured_at'] = time.time()
            current_data.append(item)
            existing_ids.add(item.get('placeId'))
            added_count += 1
            
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(current_data, f, ensure_ascii=False, indent=2)
        
    return added_count

@app.route('/')
def dashboard():
    return render_template('dashboard.html')

@app.route('/api/collect', methods=['POST'])
def collect_data():
    data = request.json
    if not isinstance(data, list):
        data = [data]
    
    count = save_data(data)
    print(f"📥 Received {len(data)} items. Saved {count} new.")
    return jsonify({"status": "success", "added": count})

@app.route('/api/data', methods=['GET'])
def get_data():
    data = load_data()
    return jsonify(data)

@app.route('/api/data/scored', methods=['GET'])
def get_scored_data():
    """Return leads sorted by opportunity score (highest first)."""
    data = load_data()
    scored_data = score_all_leads(data)
    return jsonify(scored_data)

@app.route('/api/search', methods=['POST'])
def trigger_search():
    query = request.json.get('query')
    headless = request.json.get('headless', True)
    near = request.json.get('near')
    radius_km = request.json.get('radius_km')
    
    if not query:
        return jsonify({"status": "error", "message": "No query provided"}), 400
    
    def scrape_job(q, h, n, r):
        try:
            active_tasks.append(q)
            run_scraper(q, headless=h, near=n, radius_km=r)
        finally:
            if q in active_tasks:
                active_tasks.remove(q)

    thread = threading.Thread(target=scrape_job, args=(query, headless, near, radius_km))
    thread.daemon = True
    thread.start()
    
    parts = [f"Scraping started for: {query}"]
    if near:
        parts.append(f"near {near}")
    if radius_km:
        parts.append(f"radius {radius_km}km")
    return jsonify({"status": "success", "message": " — ".join(parts)})

@app.route('/api/status', methods=['GET'])
def get_status():
    return jsonify({"active_tasks": active_tasks})

# === CAMPAIGN ENDPOINTS ===

@app.route('/api/campaign', methods=['POST'])
def start_campaign():
    """Start a batch campaign with multiple queries."""
    global campaign_mgr
    if campaign_mgr is None:
        campaign_mgr = get_campaign_manager(run_scraper)
    
    queries = request.json.get('queries', [])
    delay = request.json.get('delay_seconds', 30)
    
    if not queries:
        return jsonify({"status": "error", "message": "No queries provided"}), 400
    
    if campaign_mgr.is_running:
        return jsonify({"status": "error", "message": "Campaign already running"}), 409
    
    campaign_mgr.start(queries, delay)
    return jsonify({"status": "success", "message": f"Campaign started with {len(queries)} queries"})

@app.route('/api/campaign/status', methods=['GET'])
def get_campaign_status():
    """Get current campaign status."""
    global campaign_mgr
    if campaign_mgr is None:
        return jsonify({"is_running": False, "total": 0, "results": []})
    return jsonify(campaign_mgr.get_status())

@app.route('/api/campaign/stop', methods=['POST'])
def stop_campaign():
    """Stop the current campaign."""
    global campaign_mgr
    if campaign_mgr:
        campaign_mgr.stop()
    return jsonify({"status": "success", "message": "Campaign stopped"})

# === EXPORT ENDPOINTS ===

@app.route('/api/export/csv', methods=['GET'])
def export_csv():
    """Export all leads as downloadable CSV."""
    data = load_data()
    
    if not data:
        return Response("No data to export", status=404)
    
    # Prepare CSV
    output = io.StringIO()
    
    # Define columns (excluding complex nested fields)
    columns = ['name', 'averageRating', 'reviewCount', 'phones', 'website', 
               'fullAddress', 'categories', 'photoCount', 'isOpenNow', 'placeId']
    
    writer = csv.DictWriter(output, fieldnames=columns, extrasaction='ignore')
    writer.writeheader()
    
    for item in data:
        # Flatten if needed
        row = {k: item.get(k, '') for k in columns}
        writer.writerow(row)
    
    output.seek(0)
    
    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': 'attachment; filename=leads_export.csv'}
    )

# === FILTER ENDPOINT ===

@app.route('/api/data/filter', methods=['GET'])
def filter_data():
    """
    Filter leads by various criteria.
    Query params: minRating, maxRating, hasWebsite, category, search
    """
    data = load_data()
    
    # Get filter params
    min_rating = request.args.get('minRating', type=float)
    max_rating = request.args.get('maxRating', type=float)
    has_website = request.args.get('hasWebsite')
    category = request.args.get('category', '').lower()
    search = request.args.get('search', '').lower()
    
    filtered = data
    
    # Apply filters
    if min_rating is not None:
        filtered = [d for d in filtered if (d.get('averageRating') or 0) >= min_rating]
    
    if max_rating is not None:
        filtered = [d for d in filtered if (d.get('averageRating') or 5) <= max_rating]
    
    if has_website == 'true':
        filtered = [d for d in filtered if d.get('website') and 'search.google.com' not in d.get('website', '')]
    elif has_website == 'false':
        filtered = [d for d in filtered if not d.get('website') or 'search.google.com' in d.get('website', '')]
    
    if category:
        filtered = [d for d in filtered if category in (d.get('categories') or '').lower()]
    
    if search:
        filtered = [d for d in filtered if search in (d.get('name') or '').lower() or search in (d.get('fullAddress') or '').lower()]
    
    return jsonify(filtered)

# === CLEAR DATA ENDPOINT ===

@app.route('/api/data/clear', methods=['DELETE'])
def clear_data():
    """Clear all stored leads data."""
    try:
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'w', encoding='utf-8') as f:
                json.dump([], f)
        print("🗑️ All data cleared")
        return jsonify({"status": "success", "message": "All data cleared"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# === INSTAGRAM ENRICHMENT ENDPOINT ===

@app.route('/api/instagram/enrich', methods=['POST'])
def instagram_enrich():
    """
    Enrich Instagram profile data for a given handle.
    Rate limited to 10 requests per minute.
    
    Request body: { "handle": "username" }
    Response: { "success": true, "data": {...} } or { "success": false, "error": "...", "error_code": "..." }
    """
    data = request.json
    handle = data.get('handle') if data else None
    
    if not handle:
        return jsonify({
            "success": False,
            "error": "No handle provided",
            "error_code": "MISSING_HANDLE"
        }), 400
    
    result = enrich_instagram(handle)
    
    if result.get('success'):
        return jsonify(result)
    else:
        # Return 200 even for "not found" - it's not a server error
        return jsonify(result)

def start_server():
    print(f"🌍 Starting Server on {Config.API_URL}")
    app.run(host=Config.SERVER_HOST, port=Config.SERVER_PORT, debug=False, use_reloader=False)

if __name__ == '__main__':
    start_server()
