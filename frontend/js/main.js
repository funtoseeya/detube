const searchInput = document.getElementById('searchQuery');
const searchBtn = document.getElementById('searchBtn');
const resultsDiv = document.getElementById('results');

// Main search function
async function performSearch() {
    const query = searchInput.value.trim();
    if (!query) return;

    resultsDiv.innerHTML = '<p>Loading...</p>';

    try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();

        resultsDiv.innerHTML = '';

        // Support both old and new API structures
        const videos = data.results || data.items;
        if (!videos || videos.length === 0) {
            resultsDiv.innerHTML = '<p>No results found.</p>';
            return;
        }

        videos.forEach(video => {
            // Check if new structure or old
            const videoId = video.videoId || (video.id && video.id.videoId);
            const title = video.title || (video.snippet && video.snippet.title);
            const channel = video.channel || (video.snippet && video.snippet.channelTitle);
            const thumbnail = video.thumbnail || (video.snippet && video.snippet.thumbnails.medium.url);
            const views = video.views || 0;
            const publishedAt = video.published_at || (video.snippet && video.snippet.publishedAt);
            const duration = video.duration || 'PT0M0S';

            const col = document.createElement('div');
            col.className = 'col-md-4';

            col.innerHTML = `
                <div class="card h-100 shadow-sm">
                    ${videoId ? `<iframe class="card-img-top" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allowfullscreen style="height:200px;"></iframe>` :
                    `<img src="${thumbnail}" class="card-img-top" alt="${title}">`}
                    <div class="card-body">
                        <h5 class="card-title">${title}</h5>
                        ${channel ? `<p class="metadata mb-1">Channel: ${channel}</p>` : ''}
                        ${views ? `<p class="metadata mb-1">Views: ${Number(views).toLocaleString()} | Published: ${publishedAt ? new Date(publishedAt).toLocaleDateString(undefined, {year:'numeric', month:'short', day:'numeric'}) : 'N/A'}</p>` : ''}
                        <p class="metadata mb-2">Duration: ${formatDuration(duration)}</p>
                        ${videoId ? `<a href="https://www.youtube.com/watch?v=${videoId}" target="_blank" class="btn btn-sm btn-primary">Watch</a>` : ''}
                    </div>
                </div>
            `;

            resultsDiv.appendChild(col);
        });
    } catch (err) {
        resultsDiv.innerHTML = `<p class="text-danger">Error: ${err}</p>`;
    }
}

// Enter key triggers search
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
});

// Button click triggers search
searchBtn.addEventListener('click', performSearch);

// Helper function to format ISO 8601 duration
function formatDuration(iso) {
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return '0m 0s';
    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);
    if(hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
}
