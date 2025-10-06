/* ------------------ DOM ELEMENTS ------------------ */
// Grab elements from the page so we can interact with them
const searchInput = document.getElementById('searchQuery'); // input field for search
const searchBtn = document.getElementById('searchBtn'); // button to trigger search
const resultsDiv = document.getElementById('results'); // div to hold search results
const sortSelect = document.getElementById('sortSelect'); // dropdown to select sort method
const shortsButton = document.querySelector('.filter-btn[data-filter="short"]'); 
// selects first element with class 'filter-btn' and attribute data-filter="short"

/* ------------------ STATE ------------------ */
// Store current status of search/results
let currentQuery = '';        // current search text
let currentSort = 'relevance'; // sorting method (relevance, date, etc.)
let currentPage = 1;          // which page of results we're on
const pageSize = 9;           // how many videos to show per "page" for infinite scroll
let allResults = [];          // stores all results fetched from API
let loading = false;          // true when fetching data to prevent duplicate calls
let endOfResults = false;     // true if API returned no more results

/* ------------------ SEARCH ------------------ */
window.addEventListener('DOMContentLoaded', () => { 
    searchInput.focus(); 
    // focus automatically puts cursor in the search box when page loads
});

  function resetSearch() { 
//we run this when the user hits the title. it should clear the search bar and results div
    const resultsDiv = document.getElementById('results');
    const searchInput = document.getElementById('searchQuery');

    // Fade out effect
    resultsDiv.style.transition = 'opacity 0.3s';
    resultsDiv.style.opacity = '0';

    setTimeout(() => {
      resultsDiv.innerHTML = '';
      resultsDiv.style.opacity = '1'; // reset opacity
      searchInput.value = '';
    }, 300);
  }


async function performSearch(reset = true) { 
    //what is reset=true? ive never seen that syntax before.
    // ANSWER: This sets a default parameter. If you don’t pass anything when calling the function, reset will be true. 
    // Example: performSearch() → reset is true, performSearch(false) → reset is false

    if (!currentQuery) currentQuery = searchInput.value.trim(); 
    // trim() removes spaces at the start and end of the string

    if (!currentQuery) return; 
    // refresh my memory on this return syntax too
    // ANSWER: return stops the function immediately. Nothing below it runs if the query is empty

    if (reset) {
        currentPage = 1; // start from first page if doing a new search
        allResults = [];  // clear previous results
        endOfResults = false; // reset the "no more results" flag
        resultsDiv.innerHTML = '<p>Loading...</p>'; // show temporary loading message
    }

    if (loading || endOfResults) return; 
    // what does the return mean? also, is this saying if loading is true or endOfResults is true, return? or is it as long as they exist?
    // ANSWER: return exits function. Yes, it stops if either loading OR endOfResults is true

    loading = true; // mark that fetch has started

    try { 
        // Send API request
        const res = await fetch(
            `/api/search?q=${encodeURIComponent(currentQuery)}&sort=${currentSort}&maxResults=50&includeShorts=${shortsButton.classList.contains('active')}` 
        // explain to me the classlist.contains part. does it return true of the classlist contains active? does that api call really work that way in that you can filter out shorts that way? I thought it would be based on vid duration, not a tag. this feels better
        // ANSWER: classList.contains('active') returns true if the button has class "active", false otherwise.
        // The server receives true/false to filter shorts. Whether this actually filters by duration or a tag is determined by your server logic — the frontend just sends the boolean.

        );
        const data = await res.json(); // parse JSON response

        const newResults = data.results || data.items || []; 
        // get the results array, fallback to empty array if undefined

        if (newResults.length === 0) {
            endOfResults = true; // mark that there are no more results
            if (reset) resultsDiv.innerHTML = '<p>No results found.</p>'; // show message if first page
            return; // stop function
        }

        allResults = newResults; // save results to state
        renderResults(true); // display results
    } catch (err) {
        if (reset) resultsDiv.innerHTML = `<p class="text-danger">Error: ${err}</p>`;
    } finally { 
        // what does finally do? is it like regardless of what happens, do this at the end?
        // ANSWER: yes! finally runs whether the try succeeded or caught an error. Good for cleanup, like resetting loading
        loading = false; 
    }
}

/* ------------------ RENDERING ------------------ */
function renderResults(reset = false) { 
    //again with the reset=true syntax...need insights
    // ANSWER: default parameter. If you don’t provide reset when calling, it defaults to false

    if (reset) resultsDiv.innerHTML = ''; // clear previous results if starting fresh

    const startIdx = (currentPage - 1) * pageSize; 
    // calculate starting index for current page
    const pageResults = allResults.slice(startIdx, startIdx + pageSize); 
    // slice returns only the items for this page

    if (pageResults.length === 0) {
        endOfResults = true; 
        if (currentPage === 1) resultsDiv.innerHTML = '<p>No results found.</p>';
        return;
    }

    pageResults.forEach(video => {
        if (document.getElementById(`video-${video.videoId}`)) return; 
        // skip video if already rendered

        const col = document.createElement('div'); 
        col.className = 'col-md-4'; // bootstrap column
        col.id = `video-${video.videoId}`;

        const videoId = video.videoId || (video.id && video.id.videoId);
        const title = video.title || (video.snippet && video.snippet.title);
        const channel = video.channel || (video.snippet && video.snippet.channelTitle);
        const thumbnail = video.thumbnail || (video.snippet && video.snippet.thumbnails.medium.url);
        const views = video.views || 0;
        const publishedAt = video.published_at || (video.snippet && video.snippet.publishedAt);
        const duration = video.duration || 'PT0M0S';

        col.innerHTML = `
            <div class="card h-100 shadow-sm">
                ${videoId ? `<iframe class="card-img-top" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen style="height:200px;"></iframe>` :
                `<img src="${thumbnail}" class="card-img-top" alt="${title}">`}
                <div class="card-body">
                    <h5 class="card-title">${title}</h5>
                    ${channel ? `<p class="metadata mb-1">Channel: ${channel}</p>` : ''}
                    ${views ? `<p class="metadata mb-1">Views: ${Number(views).toLocaleString()} | Published: ${publishedAt ? new Date(publishedAt).toLocaleDateString(undefined, {year:'numeric', month:'short', day:'numeric'}) : 'N/A'}</p>` : ''}
                    <p class="metadata mb-2">Duration: ${formatDuration(duration)}</p>
                </div>
            </div>
        `;

        resultsDiv.appendChild(col); 
        // add video card to results
    });

    currentPage++; 
    // increment page so next time we load new batch
}

/* ------------------ INFINITE SCROLL ------------------ */
window.addEventListener('scroll', () => {
    if ((window.innerHeight + window.scrollY) >= (document.body.offsetHeight - 500)) {
        renderResults(); 
        // explain how it knows what to load next
        // ANSWER: renderResults calculates start index using currentPage. Since currentPage increments each time, the next slice picks the next batch.
    }
});

/* ------------------ SEARCH TRIGGERS ------------------ */
searchInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
        currentQuery = searchInput.value.trim();
        performSearch(true); // do a fresh search
    }
});
searchBtn.addEventListener('click', () => {
    currentQuery = searchInput.value.trim();
    performSearch(true); 
    // same as Enter key, triggers new search
});
//i feel like the sorting change should also be under search triggers. it should perform a brand new search to the api so that i can sort using the db, not the X items i got initially by the first api call that was sorted by relevance. i think the shorts filter should also be here for the same reason  
// ANSWER: yes, you handled that in their own event listeners below, which is correct. Each change triggers a new fetch.

/* ------------------ SHORTS FILTER ------------------ */
shortsButton.addEventListener('click', () => {
    const isActive = shortsButton.classList.toggle('active'); 
    // what does toggle do? i assume it adds active if it isnt there and removes it if it is. is this like classname.add and .remove?
    // ANSWER: yes, toggle flips the class on/off. If class exists → remove, else → add

    if (isActive) {
        shortsButton.classList.remove('btn-outline-secondary');
        shortsButton.classList.add('btn-secondary');
    } else {
        shortsButton.classList.remove('btn-secondary');
        shortsButton.classList.add('btn-outline-secondary');
    }

    currentPage = 1;
    resultsDiv.innerHTML = '';
    performSearch(true); // fetch filtered results from server
});

/* ------------------ SORT SELECT ------------------ */
sortSelect.addEventListener('change', () => {
    currentSort = sortSelect.value;
    currentPage = 1;
    performSearch(true); 
    // does it use the same query as before? I guess it does because currentQuery is never changed unless you type a new one in the search bar
    // ANSWER: yes! currentQuery stays the same. This re-fetches the same search but with a new sort order
});

/* ------------------ HELPERS ------------------ */
function formatDuration(iso) {
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '0m 0s'; // fallback

    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);

    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`; 
    return `${minutes}m ${seconds}s`; // show hh:mm:ss if hours=0
}
