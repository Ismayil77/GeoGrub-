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
let countryTooltip;

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
}

function onEachCountryFeature(feature, layer) {
    // Create a tooltip element
    
    const tooltip = document.createElement('div');
    tooltip.className = 'country-label';
    tooltip.textContent = feature.properties.name || 'Unknown Country';
    document.body.appendChild(tooltip);
    tooltip.style.display = 'none';
    // Store country name in layer for reference
    layer.feature = feature;

    // Mouseover events
    layer.on({
        mouseover: function(e) {
            this.setStyle({
                fillColor: '#e55039',
                weight: 2,
                color: '#fff',
                fillOpacity: 0.8,
                dashArray: '0'
            });
            this.bringToFront();
            
            // Show tooltip
            if (feature.properties.name) {
                tooltip.style.display = 'block';
                countryTooltip = tooltip;
            }
        },
        mouseout: function(e) {
            this.setStyle({
                fillColor: '#f8c291',
                weight: 1,
                opacity: 1,
                color: '#fff',
                fillOpacity: 0.7,
                dashArray: '0'
            });
            
            // Hide tooltip
            if (countryTooltip) {
                countryTooltip.style.display = 'none';
            }
        },
        mousemove: function(e) {
            // Update tooltip position
            if (countryTooltip) {
                const point = map.latLngToContainerPoint(e.latlng);
                countryTooltip.style.left = `${point.x}px`;
                countryTooltip.style.top = `${point.y}px`;
            }
        },
        click: function(e) {
            // Hide tooltip on click
            if (countryTooltip) {
                countryTooltip.style.display = 'none';
            }
            showCountryFoods(feature.properties.name, layer);
        }
    });
}

function showCountryFoods(countryName, layer) {
    // Close any existing popup
    if (currentPopup) {
        map.closePopup(currentPopup);
    }
    
    const countryFoods = foodsData[countryName];
    
    if (!countryFoods || countryFoods.length === 0) {
        currentPopup = L.popup({ className: 'custom-popup', maxWidth: 300 })
            .setLatLng(layer.getBounds().getCenter())
            .setContent(`<div class="food-popup"><p>No food data available for ${countryName}</p></div>`)
            .openOn(map);
        return;
    }
    
    // Create popup with pagination
    let currentPage = 0;
    const foodsPerPage = 3;
    const totalPages = Math.ceil(countryFoods.length / foodsPerPage);
    
    function updatePopupContent() {
        let popupContent = `<div class="food-popup">`;
        popupContent += `<h2>${countryName} Cuisine</h2>`;
        popupContent += `<div class="food-count">Showing ${currentPage * foodsPerPage + 1}-${Math.min((currentPage + 1) * foodsPerPage, countryFoods.length)} of ${countryFoods.length} foods</div>`;
        
        // Add current page's foods
        const startIdx = currentPage * foodsPerPage;
        const endIdx = startIdx + foodsPerPage;
        countryFoods.slice(startIdx, endIdx).forEach(food => {
            popupContent += `
                <div class="food-item">
                    <h3>${food.name}</h3>
                    ${food.image ? `<img src="images/${food.image}" alt="${food.name}" loading="lazy">` : ''}
                    ${food.description ? `<p class="food-desc">${food.description}</p>` : ''}
                    <button class="show-recipe" data-food='${JSON.stringify(food).replace(/'/g, "\\'")}'>
                        View Recipe
                    </button>
                </div>
            `;
        });
        
        // Add pagination controls
        popupContent += `<div class="pagination">`;
        if (currentPage > 0) {
            popupContent += `<button class="page-btn prev-btn">Previous</button>`;
        }
        popupContent += `<span class="page-info">Page ${currentPage + 1}/${totalPages}</span>`;
        if (currentPage < totalPages - 1) {
            popupContent += `<button class="page-btn next-btn">Next</button>`;
        }
        popupContent += `</div>`;
        
        popupContent += `</div>`;
        
        currentPopup.setContent(popupContent);
        
        // Add event listeners
        document.querySelectorAll('.show-recipe').forEach(btn => {
            btn.addEventListener('click', function() {
                showFullRecipe(JSON.parse(this.dataset.food));
            });
        });
        
        document.querySelector('.prev-btn')?.addEventListener('click', () => {
            currentPage--;
            updatePopupContent();
        });
        
        document.querySelector('.next-btn')?.addEventListener('click', () => {
            currentPage++;
            updatePopupContent();
        });
    }
    
    // Create initial popup
    currentPopup = L.popup({ className: 'custom-popup', maxWidth: 400, maxHeight: 600 })
        .setLatLng(layer.getBounds().getCenter())
        .setContent('<div class="food-popup">Loading...</div>')
        .openOn(map);
    
    updatePopupContent();
}

function showFullRecipe(food) {
    const recipePopup = L.popup({ className: 'recipe-popup', maxWidth: 500 })
        .setLatLng(map.getCenter())
        .setContent(`
            <div class="recipe-details">
                <span class="close-popup">×</span>
                <h2>${food.name}</h2>
                ${food.image ? `<img src="images/${food.image}" alt="${food.name}" loading="lazy">` : ''}
                ${food.description ? `<p class="food-desc">${food.description}</p>` : ''}
                <div class="recipe-columns">
                    <div class="ingredients">
                        <h3>Ingredients</h3>
                        <ul>${food.ingredients.map(ing => `<li>${ing}</li>`).join('')}</ul>
                    </div>
                    <div class="instructions">
                        <h3>Instructions</h3>
                        <ol>${food.instructions.map(step => `<li>${step}</li>`).join('')}</ol>
                    </div>
                </div>
                <button class="back-to-list">Back to List</button>
            </div>
        `)
        .openOn(map);
    
    document.querySelector('.close-popup').addEventListener('click', () => {
        map.closePopup(recipePopup);
    });
    
    document.querySelector('.back-to-list')?.addEventListener('click', () => {
        map.closePopup(recipePopup);
    });
}

function showFullRecipe(food) {
    const recipePopup = L.popup({ className: 'recipe-popup', maxWidth: 500 })
        .setLatLng(map.getCenter())
        .setContent(`
            <div class="recipe-details">
                <span class="close-popup">×</span>
                <h2>${food.name}</h2>
                ${food.image ? `<img src="images/${food.image}" alt="${food.name}" loading="lazy">` : ''}
                ${food.description ? `<p class="food-desc">${food.description}</p>` : ''}
                <div class="recipe-columns">
                    <div class="ingredients">
                        <h3>Ingredients</h3>
                        <ul>${food.ingredients.map(ing => `<li>${ing}</li>`).join('')}</ul>
                    </div>
                    <div class="instructions">
                        <h3>Instructions</h3>
                        <ol>${food.instructions.map(step => `<li>${step}</li>`).join('')}</ol>
                    </div>
                </div>
                <button class="back-to-list">Back to List</button>
            </div>
        `)
        .openOn(map);
    
    document.querySelector('.close-popup').addEventListener('click', () => {
        map.closePopup(recipePopup);
    });
    
    document.querySelector('.back-to-list')?.addEventListener('click', () => {
        map.closePopup(recipePopup);
    });


}

// Clean up tooltips when map is destroyed
map.on('unload', function() {
    document.querySelectorAll('.country-label').forEach(el => el.remove());
});
