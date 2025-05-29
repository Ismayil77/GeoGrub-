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

      layer.bindTooltip(feature.properties.name || 'Unknown Country', {
        permanent: true, // Always visible
        direction: 'center',
        className: 'country-label',
        interactive: false
    });
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
    
    // Find foods for this country
    const countryFoods = foodsData[countryName];
    
    if (!countryFoods || countryFoods.length === 0) {
        currentPopup = L.popup({ className: 'custom-popup' })
            .setLatLng(layer.getBounds().getCenter())
            .setContent(`<div class="food-popup"><p>No food data available for ${countryName}</p></div>`)
            .openOn(map);
        return;
    }
    
    // Create popup content
    let popupContent = `<div class="food-popup">`;
    
    // Show first food by default
    const food = countryFoods[0];
    
    popupContent += `
        <span class="close-popup">×</span>
        <h3>${food.name}</h3>
        ${food.image ? `<img src="images/${food.image}" alt="${food.name}">` : ''}
        ${food.description ? `<p>${food.description}</p>` : ''}
        <h4>Ingredients:</h4>
        <ul>${food.ingredients.map(ing => `<li>${ing}</li>`).join('')}</ul>
        <h4>Instructions:</h4>
        <ol>${food.instructions.map(step => `<li>${step}</li>`).join('')}</ol>
    `;
    
    popupContent += `</div>`;
    
    // Create and open popup at the clicked location
    currentPopup = L.popup({ className: 'custom-popup', maxWidth: 350 })
        .setLatLng(layer.getBounds().getCenter())
        .setContent(popupContent)
        .openOn(map);
    
    // Add close event
    document.querySelector('.close-popup').addEventListener('click', function() {
        map.closePopup(currentPopup);
    });
}

// Clean up tooltips when map is destroyed
map.on('unload', function() {
    document.querySelectorAll('.country-label').forEach(el => el.remove());
});
