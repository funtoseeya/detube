document.getElementById('searchBtn').addEventListener('click', async () => {
    const query = document.getElementById('searchQuery').value.trim();
    if (!query) return;

    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '<p>Loading...</p>';

    try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();

        resultsDiv.innerHTML = '';

        if (!data.results || data.results.length === 0) {
            resultsDiv.innerHTML = '<p>No results found.</p>';
            return;
        }

        data.results.forEach(video => {
            const col = document.createElement('div');
            col.className = 'col-md-4';

            col.innerHTML = `
                <div class="card h-100 shadow-sm">
                    <iframe class="card-img-top" src="https://www.youtube.com/embed/${video.videoId}" frameborder="0" allowfullscreen style="height:200px;"></iframe>
                    <div class="card-body">
                        <h5 class="card-title">${video.title}</h5>
                        <p class="metadata mb-1">Channel: ${video.channel}</p>
                        <p class="metadata mb-1">Views: ${Number(video.views).toLocaleString()} | Published: ${new Date(video.published_at).toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'})}</p>
                        <p class="metadata mb-2">Duration: ${formatDuration(video.duration)}</p>
                        <a href="https://www.youtube.com/watch?v=${video.videoId}" target="_blank" class="btn btn-sm btn-primary">Watch</a>
                    </div>
                </div>
            `;

            resultsDiv.appendChild(col);
        });
    } catch (err) {
        resultsDiv.innerHTML = `<p class="text-danger">Error: ${err}</p>`;
    }
});

// Helper function to format ISO 8601 duration to MM:SS or H:M:S
function formatDuration(iso) {
    const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);
    if(hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    return `${minutes}m ${seconds}s`;
}

