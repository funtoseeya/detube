from flask import Flask, request, jsonify, send_from_directory
import requests
import os
from dotenv import load_dotenv
import isodate

load_dotenv()

app = Flask(__name__, static_folder="../frontend", static_url_path="/")

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "YOUR_API_KEY")
YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
YOUTUBE_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"

# Map frontend sort values to YouTube API 'order' values
ORDER_MAP = {
    "relevance": "relevance",
    "date": "date",
    "views": "viewCount"
}

def parse_iso_duration(iso_duration):
    """Convert ISO 8601 duration to total seconds."""
    try:
        return int(isodate.parse_duration(iso_duration).total_seconds())
    except Exception:
        return 0

@app.route("/api/search")
def search_videos():
    query = request.args.get("q")
    if not query:
        return jsonify({"error": "Missing search query"}), 400

    max_results = int(request.args.get("maxResults", 12))
    sort_key = request.args.get("sort", "relevance")
    order = ORDER_MAP.get(sort_key, "relevance")
    page_token = request.args.get("pageToken", None)

    search_params = {
        "part": "snippet",
        "q": query,
        "type": "video",
        "maxResults": max_results,
        "order": order,
        "key": YOUTUBE_API_KEY
    }

    if page_token:
        search_params["pageToken"] = page_token

    try:
        search_response = requests.get(YOUTUBE_SEARCH_URL, params=search_params, timeout=10)
        search_response.raise_for_status()
        search_data = search_response.json()
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Network or API error: {str(e)}"}), 502

    if "error" in search_data:
        return jsonify({"error": search_data["error"]}), 502

    items = search_data.get("items", [])
    next_page_token = search_data.get("nextPageToken")

    video_ids = [item["id"]["videoId"] for item in items if "videoId" in item.get("id", {})]

    results = []
    if video_ids:
        videos_params = {
            "part": "snippet,contentDetails,statistics",
            "id": ",".join(video_ids),
            "key": YOUTUBE_API_KEY
        }

        try:
            videos_response = requests.get(YOUTUBE_VIDEOS_URL, params=videos_params, timeout=10)
            videos_response.raise_for_status()
            videos_data = videos_response.json()
        except requests.exceptions.RequestException as e:
            return jsonify({"error": f"Network or API error: {str(e)}"}), 502

        for item in videos_data.get("items", []):
            snippet = item.get("snippet", {})
            stats = item.get("statistics", {})
            content = item.get("contentDetails", {})

            results.append({
                "videoId": item.get("id"),
                "title": snippet.get("title"),
                "channel": snippet.get("channelTitle"),
                "views": int(stats.get("viewCount", 0)),
                "published_at": snippet.get("publishedAt"),
                "duration": content.get("duration"),
                "thumbnail": snippet.get("thumbnails", {}).get("medium", {}).get("url")
            })

    print(f"✅ Query: {query}, Results: {len(results)}, Next token: {next_page_token}")

    return jsonify({
        "results": results,
        "nextPageToken": next_page_token
    })

@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")

if __name__ == "__main__":
    app.run(debug=True)
