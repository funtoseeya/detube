/* ------------------ DOM ELEMENTS ------------------ */
const searchInput = document.getElementById('searchQuery');
const searchBtn = document.getElementById('searchBtn');
const resultsDiv = document.getElementById('results');
const sortSelect = document.getElementById('sortSelect');
const shortsButton = document.querySelector('.filter-btn[data-filter="short"]');

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
        col.className = 'col-md-4';
        col.id = `video-${video.videoId}`;

        const videoId = video.videoId;
        const title = video.title;
        const channel = video.channel;
        const thumbnail = video.thumbnail || `https://i.ytimg.com/vi/${video.videoId}/mqdefault.jpg`;
        const views = video.views;
        const publishedAt = video.published_at;
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
    });
}



/* ------------------ SEARCH TRIGGERS ------------------ */
searchInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') {
        currentQuery = searchInput.value.trim();
        performSearch(true);
    }
});
searchBtn.addEventListener('click', () => {
    currentQuery = searchInput.value.trim();
    performSearch(true);
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
