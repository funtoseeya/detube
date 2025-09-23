/* ------------------ DOM ELEMENTS ------------------ */
const searchInput = document.getElementById('searchQuery');
const searchBtn = document.getElementById('searchBtn');
const resultsDiv = document.getElementById('results');
const sortSelect = document.getElementById('sortSelect');
const filterButtons = document.querySelectorAll('.filter-btn');
const shortsButton = document.querySelector('.filter-btn[data-filter="short"]');

/* ------------------ STATE ------------------ */
let currentQuery = '';
let currentSort = 'relevance';
let currentPage = 1;
const pageSize = 9; // videos per page for infinite scroll
let allResults = [];
let loading = false;
let endOfResults = false;
let showOnlyShorts = false; // false by default, show all videos

/* ------------------ SEARCH ------------------ */
async function performSearch(reset = true) {
    if (!currentQuery) currentQuery = searchInput.value.trim();
    if (!currentQuery) return;

    if (reset) {
        currentPage = 1;
        allResults = [];
        endOfResults = false;
        resultsDiv.innerHTML = '<p>Loading...</p>';
    }

    if (loading || endOfResults) return;
    loading = true;

    try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(currentQuery)}&sort=${currentSort}&maxResults=50`);
        const data = await res.json();

        const newResults = data.results || data.items || [];
        if (newResults.length === 0) {
            endOfResults = true;
            if (reset) resultsDiv.innerHTML = '<p>No results found.</p>';
            return;
        }

        allResults = newResults;
        applySort();
        renderResults(false);
    } catch (err) {
        if (reset) resultsDiv.innerHTML = `<p class="text-danger">Error: ${err}</p>`;
    } finally {
        loading = false;
    }
}

/* ------------------ SORTING ------------------ */
function applySort() {
    switch (currentSort) {
        case 'views':
            allResults.sort((a, b) => (b.views || 0) - (a.views || 0));
            break;
        case 'date':
            allResults.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
            break;
        case 'title':
            allResults.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
            break;
        case 'relevance':
        default:
            break;
    }
}

/* ------------------ RENDERING ------------------ */
function renderResults(reset = false) {
    if (reset) resultsDiv.innerHTML = '';

    const startIdx = (currentPage - 1) * pageSize;

    const filteredResults = allResults.filter(video => {
    const durationSec = parseISODuration(video.duration);
    if (showOnlyShorts) {
        return durationSec < 60; // only include videos < 60s
    }
    return true; // show everything if not filtering by shorts
});

    const pageResults = filteredResults.slice(startIdx, startIdx + pageSize);

    if (pageResults.length === 0) {
        endOfResults = true;
        if (currentPage === 1) resultsDiv.innerHTML = '<p>No results found.</p>';
        return;
    }

    pageResults.forEach(video => {
        if (document.getElementById(`video-${video.videoId}`)) return;

        const col = document.createElement('div');
        col.className = 'col-md-4';
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
    });

    currentPage++;
}

/* ------------------ INFINITE SCROLL ------------------ */
window.addEventListener('scroll', () => {
    if ((window.innerHeight + window.scrollY) >= (document.body.offsetHeight - 500)) {
        renderResults();
    }
});

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

/* ------------------ SHORTS FILTER ------------------ */
shortsButton.addEventListener('click', () => {
    showOnlyShorts = !showOnlyShorts; // toggle state

    // toggle visual style
    if (showOnlyShorts) {
        shortsButton.classList.add('active');
        shortsButton.classList.remove('btn-outline-secondary');
        shortsButton.classList.add('btn-secondary');
    } else {
        shortsButton.classList.remove('active');
        shortsButton.classList.remove('btn-secondary');
        shortsButton.classList.add('btn-outline-secondary');
    }

    currentPage = 1;
    resultsDiv.innerHTML = '';
    renderResults(); // rerender filtered results
});


/* ------------------ SORT SELECT ------------------ */
sortSelect.addEventListener('change', () => {
    currentSort = sortSelect.value;
    applySort();
    currentPage = 1;
    renderResults(true);
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

function parseISODuration(iso) {
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);
    return hours * 3600 + minutes * 60 + seconds;
}
