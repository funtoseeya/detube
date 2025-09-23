from flask import Flask, request, jsonify, send_from_directory
import requests
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder="../frontend", static_url_path="/")


YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "YOUR_API_KEY")
YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"

print("API Key loaded:", YOUTUBE_API_KEY)


@app.route("/api/search")
def search():
    query = request.args.get("q")
    if not query:
        return jsonify({"error": "Missing search query"}), 400

    params = {
        "part": "snippet",
        "q": query,
        "key": YOUTUBE_API_KEY,
        "type": "video",
        "maxResults": 10
    }

    r = requests.get(YOUTUBE_SEARCH_URL, params=params)
    return jsonify(r.json())

@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")

if __name__ == "__main__":
    app.run(debug=True)
