# -------------------------------------------------------------
# Import dependencies
# -------------------------------------------------------------
# Each 'import' line brings external or built-in functionality
# into this file, much like grabbing ingredients from the pantry. (pip install gets them from the store)
# - Flask: lightweight web framework for handling requests
# - requests: for making HTTP calls (like fetch or axios in JS)
# - os: built-in module to access environment variables and paths
# - dotenv: loads local .env file so secrets are available at runtime
# - isodate: parses ISO 8601 date/time formats (used by YouTube API)
# -------------------------------------------------------------

from flask import Flask, request, jsonify, send_from_directory
import requests
import os
from dotenv import load_dotenv
import isodate

# this calls my .env file, loading any environment variables found there ie. API keys
load_dotenv()

#loading the flask app
# -------------------------------------------------------------
#Hey Flask, I’m starting up a web app. The __name__ variable is where  this file lives,
# my frontend files are in the ../frontend folder, serve them as static files.
app = Flask(__name__, static_folder="../frontend", static_url_path="/")

#this is my YouTube API key from the .env file. you initialized it when you called load_dotenv(). 
# If you can't find it, use YOUR_API_KEY as a placeholder.
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "YOUR_API_KEY")

# these are the YouTube API endpoints we'll be using. any api call will go to these urls
YOUTUBE_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
YOUTUBE_VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"

# Here's a small dictionary to translate between how my javascript frontend names the different kinds of sorting,
# and how the YouTube API expects them to be named.
# So if the JS sends you “relevance” or “date” or “views”, you know how to tell YouTube what I mean.
ORDER_MAP = {
    "relevance": "relevance",
    "date": "date",
    "views": "viewCount"
}
# Now I’m defining a helper function that converts YouTube’s
# def = syntax for defining a function
# weird duration format (like "PT15M3S") into total seconds.
# This format is called ISO 8601 — YouTube sends durations this way.
def parse_iso_duration(iso_duration):
    """Convert ISO 8601 duration to total seconds."""
    try:
        return int(isodate.parse_duration(iso_duration).total_seconds())
    except Exception:
        return 0


# Okay, this is where I define one of my API endpoints. Think of an "endpoint" like a phone number
# when a user calls that phone number (e.g. by clicking a button), we direct them to here.
# the closest thing I can compare that to in frontend JS is an event listener that waits for a user action.
# an endpoint is just a URL path your backend listens for
@app.route("/api/search")
def search_videos():
    # if you look at the JS, you'll see that there's a part of the code that makes a request to /api/search
    # with some query parameters (like q, maxResults, sort, pageToken).
    # Here, I'm grabbing those parameters from the request and declaring them as variables.
    
    # q is what the user typed into the search box
    query = request.args.get("q")
    if not query:
        return jsonify({"error": "Missing search query"}), 400

    # maxResults is how many results to return (default to 12 if not provided) - the js frontend sets this to 12
    max_results = int(request.args.get("maxResults", 12))
    
    # sort is how to sort the results. The JS app doesn't yet let the user dictate different sortings, but I've included it for future use.
    # order then translates that using that helper dictionary I defined earlier. again, the js frontend sets this to "relevance"
    sort_key = request.args.get("sort", "relevance")
    order = ORDER_MAP.get(sort_key, "relevance")
    
    # pageToken is for pagination. in this version, the js frontend doesn't use it yet, but it's here for future use.
    page_token = request.args.get("pageToken", None)

    # this kind of puts this all together - I'm preparing the parameters for the YouTube search API call.
    search_params = {
        "part": "snippet",
        "q": query,
        "type": "video",
        "maxResults": max_results,
        "order": order,
        "key": YOUTUBE_API_KEY
    }

    # this is here for show. We don't actually use pageToken in the current frontend, but if we did, this is how we'd add it to the params.
    if page_token:
        search_params["pageToken"] = page_token

    #its time to make api calls to youtube's search and videos endpoints. there's two api calls here. one to search for videos, and another to get details about those videos.
    # i've included sample responses from both api calls in the backend/sample_responses folder for reference.

    # now im making the actual API call to Youtube's search endpoint. 
    # so the user calls my python app's search endpoint, and then my app calls Youtube's search endpoint.
    # I'm wrapping this in a try-except block to catch any network errors or API issues. It's like a try catch in JS.
    try:
        # we use the requests library we imported earlier to make the GET request
        # these methods come from the requests library. we didn't create them ourselves.
        # search_response triggers the actual network call to Youtube and holds the response
        search_response = requests.get(YOUTUBE_SEARCH_URL, params=search_params, timeout=10)

        # if the response has an error status code, raise_for_status will throw an exception
        search_response.raise_for_status()

        # this line grabs the JSON data from the response and puts it into a variable called search_data
        search_data = search_response.json()

    # if there's any network error or the API returns an error status, we catch it here
    # and return a JSON error message with a 502 Bad Gateway status code
    # a 502 status code indicates that our server (the Flask app) got an invalid response from an upstream server (YouTube API)
    except requests.exceptions.RequestException as e:
        return jsonify({"error": f"Network or API error: {str(e)}"}), 502

    # if the YouTube API returned an error in its JSON response, handle that too
    # this is different from a network error - it's when the API call succeeds but YouTube says something's wrong
    if "error" in search_data:
        return jsonify({"error": search_data["error"]}), 502

    # if all is well, we proceed to process the search results
    # we extract the list of video items and the nextPageToken for pagination. Again, the js frontend doesn't use pagination yet, but it's here for future use.
    items = search_data.get("items", [])
    next_page_token = search_data.get("nextPageToken")

    #this line extracts the video IDs from the search results
    # it's a very pythonic way of doing what in JS would be a combination of .map and .filter
    # essentially the json has a bunch of stuff in it. we only want the video IDs from the "id" field of each item
    # so we loop through each item, check if "videoId" exists in the "id" field, and if so, we grab it
    # and the result is an array of video IDs
    video_ids = [item["id"]["videoId"] for item in items if "videoId" in item.get("id", {})]

    # now that we have the video IDs, we make another API call to get more details about each video
    # the first API call only gives us the list of video ids. this one gets us the titles, view counts, durations, etc.
    results = []
    if video_ids:
        videos_params = {
            "part": "snippet,contentDetails,statistics",
            "id": ",".join(video_ids),
            "key": YOUTUBE_API_KEY
        }

        # this syntax is similar to the previous try-except block for error handling
        try:
            videos_response = requests.get(YOUTUBE_VIDEOS_URL, params=videos_params, timeout=10)
            videos_response.raise_for_status()
            videos_data = videos_response.json()
        except requests.exceptions.RequestException as e:
            return jsonify({"error": f"Network or API error: {str(e)}"}), 502

        # here we start processing the detailed video data we got back
        for item in videos_data.get("items", []):
            snippet = item.get("snippet", {})
            stats = item.get("statistics", {})
            content = item.get("contentDetails", {})

            # we load the results array with the info we want to send back to the frontend
            results.append({
                "videoId": item.get("id"),
                "title": snippet.get("title"),
                "channel": snippet.get("channelTitle"),
                "views": int(stats.get("viewCount", 0)),
                "published_at": snippet.get("publishedAt"),
                "duration": content.get("duration"),
                "thumbnail": snippet.get("thumbnails", {}).get("medium", {}).get("url")
            })

    # this is like a console log for debugging. instead of the console tab, it prints to the terminal where the Flask app is running.
    print(f"✅ Query: {query}, Results: {len(results)}, Next token: {next_page_token}")

    # finally, we return the results as a JSON response to the frontend
    return jsonify({
        "results": results,
        "nextPageToken": next_page_token
    })


# this is the route (phone number) that is called as soon as the user visits the web app in their browser
# it serves the index.html file from the frontend static folder.
# in other words, when the user goes to the root url, the python finds the index file and serves it up
@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")

if __name__ == "__main__":
    app.run(debug=True)
