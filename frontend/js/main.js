document.getElementById('searchBtn').addEventListener('click', async () => {
    const query = document.getElementById('searchQuery').value.trim();
    if (!query) return;
  
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '<p>Loading...</p>';
  
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
  
      resultsDiv.innerHTML = '';
  
      if (!data.items) {
        resultsDiv.innerHTML = '<p>No results found.</p>';
        return;
      }
  
      data.items.forEach(item => {
        const videoId = item.id.videoId;
        const title = item.snippet.title;
        const thumbnail = item.snippet.thumbnails.medium.url;
  
        const col = document.createElement('div');
        col.className = 'col-md-4';
  
        col.innerHTML = `
          <div class="card h-100">
            <img src="${thumbnail}" class="card-img-top" alt="${title}">
            <div class="card-body">
              <h5 class="card-title">${title}</h5>
              <a href="https://www.youtube.com/watch?v=${videoId}" target="_blank" class="btn btn-sm btn-primary">Watch</a>
            </div>
          </div>
        `;
  
        resultsDiv.appendChild(col);
      });
    } catch (err) {
      resultsDiv.innerHTML = `<p class="text-danger">Error: ${err}</p>`;
    }
  });
  