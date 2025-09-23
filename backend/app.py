from flask import Flask, request, jsonify, send_from_directory
import requests
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder="../frontend", static_url_path="/")


YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "YOUR_API_KEY")
YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"



@app.route("/api/search")
def search_videos():
    query = request.args.get("q")
    if not query:
        return jsonify({"error": "Missing search query"}), 400

    # 1️⃣ Get video IDs from search endpoint
    search_url = "https://www.googleapis.com/youtube/v3/search"
    search_params = {
        "part": "snippet",
        "q": query,
        "type": "video",
        "maxResults": 5,
        "key": YOUTUBE_API_KEY
    }
    search_response = requests.get(search_url, params=search_params).json()
    video_ids = [item["id"]["videoId"] for item in search_response.get("items", [])]

    if not video_ids:
        return jsonify({"results": []})

    # 2️⃣ Get detailed info from videos endpoint
    videos_url = "https://www.googleapis.com/youtube/v3/videos"
    videos_params = {
        "part": "snippet,contentDetails,statistics",
        "id": ",".join(video_ids),
        "key": YOUTUBE_API_KEY
    }
    videos_response = requests.get(videos_url, params=videos_params).json()

    results = []
    for item in videos_response.get("items", []):
        snippet = item["snippet"]
        stats = item.get("statistics", {})
        content = item.get("contentDetails", {})

        results.append({
            "title": snippet.get("title"),
            "channel": snippet.get("channelTitle"),
            "views": stats.get("viewCount"),
            "published_at": snippet.get("publishedAt"),
            "duration": content.get("duration"),  # ISO 8601 format
            "videoId": item.get("id")
        })

    return jsonify({"results": results})


@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")

if __name__ == "__main__":
    app.run(debug=True)
