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

    function onEachCountryFeature(feature, layer) {
        // Store country name in layer for reference
        layer.feature = feature;

        // Mouseover events
        layer.on({
            mouseover: function(e) {
                this.setStyle(highlightStyle);
                this.bringToFront();
            },
            mouseout: function(e) {
                countriesLayer.resetStyle(this);
            },
            click: function(e) {
                showCountryFoods(feature.properties.name, layer);
            }
        });
    }
}

function showCountryFoods(countryName, layer) {
    // Close any existing popup
    if (currentPopup) {
        map.closePopup(currentPopup);
    }
    
    // Find foods for this country
    const countryFoods = foodsData[countryName];
    
    if (!countryFoods || countryFoods.length === 0) {
        currentPopup = L.popup({ className: 'custom-popup' })
            .setLatLng(layer.getBounds().getCenter())
            .setContent(`<div class="food-popup"><p>No food data available for ${countryName}</p></div>`)
            .openOn(map);
        return;
    }
    
    // Create popup content with tabs
    let popupContent = `<div class="food-popup">`;
    popupContent += `<span class="close-popup">×</span>`;
    popupContent += `<h2>${countryName}</h2>`;
    
    // Create tabs
    popupContent += `<div class="food-tabs">`;
    countryFoods.forEach((food, index) => {
        const activeClass = index === 0 ? ' active' : '';
        popupContent += `<button class="food-tab${activeClass}" data-index="${index}">${food.name}</button>`;
    });
    popupContent += `</div>`;
    
    // Create tab content
    popupContent += `<div class="food-tab-content">`;
    countryFoods.forEach((food, index) => {
        const activeClass = index === 0 ? ' active' : '';
        popupContent += `
            <div class="food-content${activeClass}" data-index="${index}">
                ${food.image ? `<img src="images/${food.image}" alt="${food.name}">` : ''}
                ${food.description ? `<p class="food-description">${food.description}</p>` : ''}
                <div class="food-details">
                    <div class="ingredients">
                        <h4>Ingredients:</h4>
                        <ul>${food.ingredients.map(ing => `<li>${ing}</li>`).join('')}</ul>
                    </div>
                    <div class="instructions">
                        <h4>Instructions:</h4>
                        <ol>${food.instructions.map(step => `<li>${step}</li>`).join('')}</ol>
                    </div>
                </div>
            </div>
        `;
    });
    popupContent += `</div></div>`;
    
    // Create and open popup at the clicked location
    currentPopup = L.popup({ className: 'custom-popup', maxWidth: 400 })
        .setLatLng(layer.getBounds().getCenter())
        .setContent(popupContent)
        .openOn(map);
    
    // Add close event
    document.querySelector('.close-popup').addEventListener('click', function() {
        map.closePopup(currentPopup);
    });
    
    // Add tab switching functionality
    const tabs = document.querySelectorAll('.food-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // Update active content
            const index = this.getAttribute('data-index');
            const contents = document.querySelectorAll('.food-content');
            contents.forEach(c => c.classList.remove('active'));
            contents[index].classList.add('active');
        });
    });
}
