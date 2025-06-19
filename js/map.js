// js/map.js

// 🌍 Initialize Leaflet map
const map = L.map('map').setView([-1.286389, 36.817223], 11);

// 🗺️ Base Layers
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const satellite = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '© Esri, NASA, NGA, USGS'
  }
);

// 🔄 Layer containers
let ndviLayer, lstLayer, ndviMaskLayer;
const reportsLayer = L.layerGroup().addTo(map);

// 🧭 Layer control
const baseMaps = {
  "🗺️ OpenStreetMap": osm,
  "🛰️ Satellite": satellite
};

const overlayMaps = {
  "📢 Community Reports": reportsLayer
};

const control = L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(map);

// 📍 Add Wards
fetch('../data/wards.geojson')
  .then(res => res.json())
  .then(data => {
    L.geoJSON(data, {
      style: {
        color: 'gray',
        weight: 1,
        fillOpacity: 0
      },
      onEachFeature: (feature, layer) => {
        const name = feature.properties.ward || feature.properties.NAME_3 || "Unnamed";
        const ndvi = feature.properties.ndvi?.toFixed(2) || "N/A";
        const lst = feature.properties.lst?.toFixed(1) || "N/A";
        layer.bindPopup(`<strong>${name}</strong><br>🌿 NDVI: ${ndvi}<br>🔥 LST: ${lst} °C`);
      }
    }).addTo(map);
  });

// 🔥 Firebase Community Reports
firebase.firestore().collection("reports").get().then(snapshot => {
  snapshot.forEach(doc => {
    const data = doc.data();
    if (data.location?.lat && data.location?.lng) {
      const marker = L.marker([data.location.lat, data.location.lng]).bindPopup(`
        <strong>${data.title}</strong><br>
        <em>${data.type}</em><br>
        ${data.description}<br>
        ${data.imageUrl ? `<img src="${data.imageUrl}" class="w-full mt-1" />` : ''}
      `);
      reportsLayer.addLayer(marker);
    }
  });
});

// 🌐 Backend Server
const BACKEND_URL = 'https://greenmap-backend.onrender.com';

// 📦 Helper to load tile layers
function loadTileLayer(endpoint, label, opacity) {
  fetch(`${BACKEND_URL}/${endpoint}`)
    .then(res => res.json())
    .then(data => {
      const layer = L.tileLayer(data.urlFormat, { opacity });
      overlayMaps[label] = layer;
      control.addOverlay(layer, label);
      layer.addTo(map);
      addOpacitySlider(layer, label);
    })
    .catch(err => {
      console.error(`${label} error:`, err);
    });
}

// 📡 Load Tile Layers
loadTileLayer('ndvi', '🌿 NDVI', 0.7);
loadTileLayer('lst', '🔥 LST', 0.6);
loadTileLayer('ndvi-mask', '✅ NDVI > 0.3', 0.75);

// 🧭 Add Legend
const legend = L.control({ position: 'bottomright' });
legend.onAdd = function () {
  const div = L.DomUtil.create('div', 'bg-white dark:bg-gray-900 text-sm p-3 rounded shadow space-y-2');
  div.innerHTML = `
    <h4 class="font-bold">🗺️ Legend</h4>
    <div><strong>🌿 NDVI</strong><br><span style="color:red">Red</span> → <span style="color:green">Green</span></div>
    <div><strong>🔥 LST (°C)</strong><br><span style="color:blue">Blue</span> → <span style="color:red">Red</span></div>
    <div><strong>✅ NDVI > 0.3</strong><br><span style="color:yellow">Yellow</span> → <span style="color:green">Green</span></div>
  `;
  return div;
};
legend.addTo(map);

// 🔗 Share Button
L.easyButton('fa-share-alt', () => {
  const center = map.getCenter();
  const zoom = map.getZoom();
  const url = `${location.origin}${location.pathname}?lat=${center.lat.toFixed(5)}&lng=${center.lng.toFixed(5)}&zoom=${zoom}`;
  navigator.clipboard.writeText(url);
  alert("🔗 Map view copied:\n" + url);
}).addTo(map);

// 🧭 Restore URL state
const params = new URLSearchParams(window.location.search);
if (params.has('lat') && params.has('lng') && params.has('zoom')) {
  map.setView([+params.get('lat'), +params.get('lng')], +params.get('zoom'));
}

// 🌡️ Add opacity sliders
function addOpacitySlider(layer, label) {
  const container = document.createElement("div");
  container.className = "opacity-slider";
  container.innerHTML = `
    <label class="block text-xs text-gray-700 dark:text-gray-300 font-medium mb-1">${label} Opacity</label>
    <input type="range" min="0" max="1" step="0.05" value="${layer.options.opacity}"
           class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700" />
  `;
  const input = container.querySelector("input");
  input.oninput = () => layer.setOpacity(parseFloat(input.value));
  document.getElementById("sliders").appendChild(container);
}
