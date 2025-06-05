// Initialize the map with a neutral background
const map = L.map('map', {
    center: [20, 0],
    zoom: 2,
    worldCopyJump: true,
    minZoom: 2,
    maxZoom: 8,
    zoomControl: false
});

// Add a simple neutral background (optional)
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png', {
    attribution: ''
}).addTo(map);

let countriesGeoJson;
let foodsData = {};
let currentPopup = null;
let flagColorsData = {};
// Load both data files
Promise.all([
    fetch('countries.geojson').then(r => r.json()),
    fetch('foods.json').then(r => r.json())
])
.then(([geoData, foodData]) => {
    countriesGeoJson = geoData;
    foodsData = foodData;
    renderCountries();
})
.catch(error => console.error('Error loading data:', error));
fetch('flag-colors.json')
  .then(response => response.json())
  .then(data => {
    flagColorsData = data;
  });
function renderCountries() {
    // Style for countries
    const countryStyle = {
        fillColor: '#f8c291',
        weight: 1,
        opacity: 1,
        color: '#fff',
        fillOpacity: 0.7,
        dashArray: '0'
    };

    // Highlight style when hovered
    const highlightStyle = {
        fillColor: '#e55039',
        weight: 2,
        color: '#fff',
        fillOpacity: 0.8,
        dashArray: '0'
    };

    // Add countries to map with precise borders
    const countriesLayer = L.geoJSON(countriesGeoJson, {
        style: countryStyle,
        onEachFeature: onEachCountryFeature
    }).addTo(map);

    // Fit map to show all countries
    map.fitBounds(countriesLayer.getBounds());

    function onEachCountryFeature(feature, layer) {
        // Store country name in layer for reference
        layer.feature = feature;
  layer.bindTooltip(feature.properties.name, {
        permanent: false,  // Only show on hover
        direction: 'auto', // Automatic placement
        className: 'country-tooltip' // Optional CSS class
    });

        // Mouseover events
        layer.on({
            mouseover: function(e) {
        const countryName = feature.properties.name;
      const flagData = flagColorsData[countryName];

      if (flagData) {
        // Apply multi-color flag pattern
        createFlagPattern(this, flagData.colors, flagData.percentages);
      } else {
        // Fallback: Single color
        this.setStyle({
          fillColor: '#e55039',
          weight: 2,
          color: '#fff',
          fillOpacity: 0.8
        });
      }
               // this.setStyle(highlightStyle);
                this.bringToFront();
                this.openTooltip(); 
            },
            mouseout: function(e) {
                countriesLayer.resetStyle(this);
                 if (this._flagPattern) {
        this._flagPattern.remove();
      }
                 this.closeTooltip()
            },
            click: function(e) {
                showCountryFoods(feature.properties.name, layer);
            }
        });
    }
}
function createFlagPattern(layer, colors, percentages) {
  if (!L.pattern) {
    console.error("Leaflet.pattern not available. Using fallback color.");
    layer.setStyle({ fillColor: colors[0] }); // Fallback to first color
    return;
  }

  // Clear previous pattern
  if (layer._flagPattern) {
    layer._flagPattern.remove();
  }

  // Create stripes
  const patterns = colors.map((color, i) => {
    return L.pattern.stripes({
      color: color,
      weight: percentages[i],
      spaceWeight: 0,
      angle: 0 // Horizontal stripes
    });
  });

  // Apply to layer
  layer._flagPattern = L.pattern(patterns);
  layer.setStyle({
    fillPattern: layer._flagPattern
  });
}
function showCountryFoods(countryName, layer) {
    if (currentPopup) map.closePopup(currentPopup);
    
    const countryFoods = foodsData[countryName];
    if (!countryFoods || countryFoods.length === 0) {
        currentPopup = L.popup()
            .setLatLng(layer.getBounds().getCenter())
            .setContent(`<div class="food-popup"><p>No food data for ${countryName}</p></div>`)
            .openOn(map);
        return;
    }

    // Create popup structure
    const popupContent = `
    <div class="food-popup">
        <h2>${countryName} (${countryFoods.length} foods)</h2>
        
        <div class="food-search">
            <input type="text" placeholder="Search foods..." class="search-input">
            <div class="results-count">Showing ${countryFoods.length} items</div>
        </div>
        
        <div class="food-list-container">
            <div class="food-list"></div>
            <div class="pagination">
                <button class="prev-btn" disabled>◀</button>
                <span class="page-info">Page 1 of ${Math.ceil(countryFoods.length/2)}</span>
                <button class="next-btn">▶</button>
            </div>
        </div>
    </div>`;

    currentPopup = L.popup({ className: 'custom-popup', maxWidth: 450, maxHeight: 500 })
        .setLatLng(layer.getBounds().getCenter())
        .setContent(popupContent)
        .openOn(map);

    // DOM elements
    const foodList = document.querySelector('.food-list');
    const searchInput = document.querySelector('.search-input');
    const resultsCount = document.querySelector('.results-count');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');
    const pageInfo = document.querySelector('.page-info');

    // State
    let currentPage = 1;
    const itemsPerPage = 2;
    let filteredFoods = [...countryFoods];

    // Render functions
    function renderFoods() {
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const paginatedItems = filteredFoods.slice(start, end);

        foodList.innerHTML = paginatedItems.map(food => `
            <div class="food-item">
                <div class="food-header">
                    <h3>${food.name}</h3>
                    <button class="toggle-btn">+</button>
                </div>
                <div class="food-details">
                    ${food.image ? `<img loading="lazy" data-src="images/${food.image}" alt="${food.name}" class="food-image">` : ''}
                    ${food.description ? `<p class="description">${food.description}</p>` : ''}
                    <div class="ingredients">
                        <h4>Ingredients:</h4>
                        <ul>${food.ingredients.map(i => `<li>${i}</li>`).join('')}</ul>
                    </div>
                    <div class="instructions">
                        <h4>Instructions:</h4>
                        <ol>${food.instructions.map(s => `<li>${s}</li>`).join('')}</ol>
                    </div>
                </div>
            </div>
        `).join('');

        // Lazy load images
        document.querySelectorAll('.food-image').forEach(img => {
            if (img.dataset.src) {
                img.src = img.dataset.src;
            }
        });

        // Update pagination
        const totalPages = Math.ceil(filteredFoods.length / itemsPerPage);
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    }

    // Event handlers
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        filteredFoods = countryFoods.filter(food => 
            food.name.toLowerCase().includes(term) ||
            (food.description && food.description.toLowerCase().includes(term))
        );
        currentPage = 1;
        renderFoods();
        resultsCount.textContent = `Showing ${filteredFoods.length} of ${countryFoods.length} items`;
    });

    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderFoods();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentPage * itemsPerPage < filteredFoods.length) {
            currentPage++;
            renderFoods();
        }
    });

    // Delegate toggle events
    foodList.addEventListener('click', (e) => {
        if (e.target.classList.contains('toggle-btn')) {
            const item = e.target.closest('.food-item');
            const details = item.querySelector('.food-details');
            const isOpen = details.style.display === 'block';
            
            details.style.display = isOpen ? 'none' : 'block';
            e.target.textContent = isOpen ? '+' : '-';
        }
    });

    // Initial render
    renderFoods();
}
