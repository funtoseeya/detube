from flask import Flask, request, jsonify, send_from_directory
import requests
import os
from dotenv import load_dotenv
import isodate  # to parse ISO 8601 durations


load_dotenv()

# Serve frontend folder
app = Flask(__name__, static_folder="../frontend", static_url_path="/")

YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "YOUR_API_KEY")
YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"

def parse_iso_duration(iso_duration): #explain this function in detail, incl. syntax
    """Convert ISO 8601 duration to seconds."""
    try:
        return int(isodate.parse_duration(iso_duration).total_seconds())
    except:
        return 0


@app.route("/api/search") #what is @app.route
def search_videos():
    query = request.args.get("q")
    if not query:
        return jsonify({"error": "Missing search query"}), 400

    max_results = min(int(request.args.get("maxResults", 50)), 50)
    order = request.args.get("sort", "relevance")
    include_shorts = request.args.get("includeShorts", "false").lower() == "true"

    results = []
    next_page_token = None

    while len(results) < max_results:
        # Get video IDs from search endpoint
        search_params = {
            "part": "snippet",
            "q": query,
            "type": "video",
            "maxResults": min(50, max_results - len(results)),  # API limit
            "order": order,
            "key": YOUTUBE_API_KEY
        }
        if next_page_token:
            search_params["pageToken"] = next_page_token

        search_response = requests.get(YOUTUBE_SEARCH_URL, params=search_params).json()
        items = search_response.get("items", [])
        video_ids = [item["id"]["videoId"] for item in items if "videoId" in item["id"]]

        if not video_ids:
            break

        # Get detailed info from videos endpoint
        videos_url = "https://www.googleapis.com/youtube/v3/videos"
        videos_params = {
            "part": "snippet,contentDetails,statistics",
            "id": ",".join(video_ids),
            "key": YOUTUBE_API_KEY
        }
        videos_response = requests.get(videos_url, params=videos_params).json()

        for item in videos_response.get("items", []):
            snippet = item["snippet"]
            stats = item.get("statistics", {})
            content = item.get("contentDetails", {})

            duration_sec = parse_iso_duration(content.get("duration", "PT0S"))
            # Skip shorts if include_shorts is False
            if not include_shorts and duration_sec < 60:
                continue

            results.append({
                "title": snippet.get("title"),
                "channel": snippet.get("channelTitle"),
                "views": int(stats.get("viewCount", 0)),
                "published_at": snippet.get("publishedAt"),
                "duration": content.get("duration"),
                "videoId": item.get("id")
            })

        next_page_token = search_response.get("nextPageToken")
        if not next_page_token:
            break

    return jsonify({"results": results})


@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


if __name__ == "__main__":
    app.run(debug=True)
