/* ------------------ DOM ELEMENTS ------------------ */
const searchInput = document.getElementById('searchQuery');
const searchBtn = document.getElementById('searchBtn');
const resultsDiv = document.getElementById('results');
const sortSelect = document.getElementById('sortSelect');
const shortsButton = document.querySelector('.filter-btn[data-filter="short"]');
let currentVideos = []; // array of current search results
let currentIndex = 0;   // currently displayed video


/* ------------------ STATE ------------------ */
let currentQuery = '';
let currentSort = 'relevance';
const pageSize = 12;
let loading = false;

/* ------------------ SEARCH ------------------ */
window.addEventListener('DOMContentLoaded', () => {
    searchInput.focus();
});

function resetSearch() {
    resultsDiv.style.transition = 'opacity 0.3s';
    resultsDiv.style.opacity = '0';

    setTimeout(() => {
        resultsDiv.innerHTML = '';
        resultsDiv.style.opacity = '1';
        searchInput.value = '';
    }, 300);
}

async function performSearch(reset = true) {
    if (!currentQuery) currentQuery = searchInput.value.trim();
    if (!currentQuery) return;

    if (reset) {
        resultsDiv.innerHTML = '<p>Loading...</p>';
    }
    if (loading) return;

    loading = true;

    try {
        const res = await fetch(
            `/api/search?q=${encodeURIComponent(currentQuery)}&maxResults=${pageSize}`
        );
        const data = await res.json();
        const newResults = data.results || [];

        if (newResults.length === 0) {
            if (reset) resultsDiv.innerHTML = '<p>No results found.</p>';
            return;
        }


        renderResults(newResults, reset);
        currentVideos = newResults;  // store current results
        currentIndex = 0;            // reset to first video

    } catch (err) {
resultsDiv.innerHTML = `<p class="text-danger">Error: ${err.message || err}</p>`;
    } finally {
        loading = false;
    }
}

/* ------------------ RENDERING ------------------ */
function renderResults(videos, reset = false) {
    if (reset) resultsDiv.innerHTML = '';

    videos.forEach(video => {
        if (document.getElementById(`video-${video.videoId}`)) return;

        const col = document.createElement('div');
        col.className = 'col-12 col-md-4 mb-3'; // responsive grid
        col.id = `video-${video.videoId}`;

        const title = video.title;
        const channel = video.channel;
        const thumbnail = video.thumbnail || `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`;
        const views = video.views;
        const publishedAt = video.published_at;
        const duration = video.duration || 'PT0M0S';
col.innerHTML = `
    <div class="card h-100 shadow-sm clickable">
        <img src="${thumbnail}" class="card-img-top" alt="${title}">
        <div class="card-body">
            <h5 class="card-title mb-1">${title}</h5>
            <p class="metadata mb-1">Channel: ${channel}</p>
            <p class="metadata mb-1">Views: ${Number(views).toLocaleString()} | Published: ${publishedAt ? new Date(publishedAt).toLocaleDateString(undefined, {year:'numeric', month:'short', day:'numeric'}) : 'N/A'}</p>
            <p class="metadata mb-2">Duration: ${duration || 'PT0M0S'}</p>
        </div>
    </div>
`;

resultsDiv.appendChild(col);

// Make the whole card clickable
const cardEl = col.querySelector('.card.clickable');
if (cardEl) {
    cardEl.addEventListener('click', () => showVideoPlayer(video));
}


    });
}

function showVideoPlayer(video) {
    // Clear the current results
    resultsDiv.innerHTML = '';

    // Create container for the video player and metadata
    const playerContainer = document.createElement('div');
    playerContainer.className = 'video-player-container';

    const title = video.title;
    const channel = video.channel;
    const views = video.views;
    const publishedAt = video.published_at;
    const videoId = video.videoId;

    playerContainer.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-2 video-controls">
    <!-- Back button -->
    <button id="backBtn" class="btn btn-secondary btn-sm">
        &#8592; Back
    </button>

    <!-- Previous / Next buttons -->
    <div>
        <button id="prevBtn" class="btn btn-secondary btn-sm">&#10094;</button>
        <button id="nextBtn" class="btn btn-secondary btn-sm">&#10095;</button>
    </div>
</div>

    <div class="mb-2">
        <h5>${title}</h5>
        <p class="metadata mb-1">Channel: ${channel}</p>
        <p class="metadata mb-1">Views: ${Number(views).toLocaleString()} | Published: ${new Date(publishedAt).toLocaleDateString(undefined, {year:'numeric', month:'short', day:'numeric'})}</p>
    </div>

    <div class="ratio ratio-16x9">
        <iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen></iframe>
    </div>
`;

    // ✅ Append to DOM first
    resultsDiv.appendChild(playerContainer);

    // ✅ Then attach event listeners
    document.getElementById('backBtn').addEventListener('click', () => {
        renderResults(currentVideos, true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    document.getElementById('prevBtn').addEventListener('click', () => {
        if (currentIndex > 0) {
            currentIndex--;
            showVideoPlayer(currentVideos[currentIndex]);
        }
    });

    document.getElementById('nextBtn').addEventListener('click', () => {
        if (currentIndex < currentVideos.length - 1) {
            currentIndex++;
            showVideoPlayer(currentVideos[currentIndex]);
        }
    });

    // Scroll to top (useful on mobile)
    window.scrollTo({ top: 0, behavior: 'smooth' });
}



/* ------------------ SEARCH TRIGGERS ------------------ */
searchInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
        currentQuery = searchInput.value.trim();
        performSearch(true);
        searchInput.blur(); // this closes the mobile keyboard

    }
});
searchBtn.addEventListener('click', () => {
    currentQuery = searchInput.value.trim();
    performSearch(true);
    searchInput.blur(); // this closes the mobile keyboard

});

/* ------------------ HELPERS ------------------ */
function formatDuration(iso) {
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '0m 0s';

    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);

    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
}
