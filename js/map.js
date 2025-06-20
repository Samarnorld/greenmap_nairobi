// js/map.js

// 🌍 Initialize Leaflet map
const map = L.map('map', {
  zoomControl: true
}).setView([-1.286389, 36.817223], 11);

// 🗺️ Switch base layers
document.querySelectorAll('input[name="basemap"]').forEach(radio => {
  radio.addEventListener('change', () => {
    if (radio.value === 'osm') {
      map.removeLayer(satellite);
      map.addLayer(osm);
    } else {
      map.removeLayer(osm);
      map.addLayer(satellite);
    }
  });
});
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

function loadTileLayer(endpoint, label, opacity, visible = true) {
  fetch(`${BACKEND_URL}/${endpoint}`)
    .then(res => res.json())
    .then(data => {
      const layer = L.tileLayer(data.urlFormat, { opacity });
if (visible) map.addLayer(layer); // only add if visible = true

      // Create UI control
      const wrapper = document.createElement('div');
      wrapper.className = "space-y-1 text-[13px]";

wrapper.innerHTML = `
  <div class="flex items-center justify-between gap-2">
    <label class="flex items-center gap-2 font-semibold text-[13px] text-gray-800 dark:text-gray-200 tracking-tight">
<input type="checkbox" ${visible ? 'checked' : ''} class="form-checkbox toggle-layer" data-label="${label}" />

      <span>${label}</span>
    </label>
  </div>
 <input type="range" min="0" max="1" step="0.05" value="${opacity}" data-label="${label}"
  class="w-24 h-[3px] bg-gray-200 rounded appearance-none cursor-pointer dark:bg-gray-700" />
`;

      document.getElementById('layer-controls').appendChild(wrapper);

      // Toggle visibility
      wrapper.querySelector(".toggle-layer").addEventListener('change', e => {
        if (e.target.checked) map.addLayer(layer);
        else map.removeLayer(layer);
      });

      // Opacity change
      wrapper.querySelector("input[type=range]").addEventListener('input', e => {
        layer.setOpacity(parseFloat(e.target.value));
      });
    })
    .catch(err => console.error(`${label} error:`, err));
}

// Function to load layers with optional date
function loadAllLayers(date = null) {
  document.getElementById('layer-controls').innerHTML = ''; // clear old controls

  const query = date ? `?date=${date}` : '';
  loadTileLayer(`ndvi${query}`, 'NDVI ', 0.7);
  loadTileLayer(`lst${query}`, 'LST Heatmap🔥', 0.6);
  loadTileLayer(`ndvi-mask${query}`, 'Healthy Zones🌱', 0.75);
 loadTileLayer(`ndvi-anomaly${query}`, 'NDVI Anomaly🧭', 0.75, false); // pass `false` to prevent auto-load

}

// Load current date layers initially
loadAllLayers();

// 🔁 Listen for user-selected date
window.addEventListener('map:loadDate', (e) => {
  const selectedDate = e.detail.date;
  if (selectedDate) {
    loadAllLayers(selectedDate);
  }
});

function loadCommunityReports() {
  const layer = reportsLayer;

  // Add to sidebar
  const wrapper = document.createElement('div');
  wrapper.className = "space-y-1";

 wrapper.innerHTML = `
  <label class="flex items-center gap-2 font-semibold text-[13px] text-gray-800 dark:text-gray-200 tracking-tight">
    <input type="checkbox" checked class="form-checkbox toggle-layer" data-label="Field Reports🗣️" />
    <span>Field Reports🗣️</span>
  </label>
`;

  document.getElementById('layer-controls').appendChild(wrapper);

  // Toggle visibility
  wrapper.querySelector(".toggle-layer").addEventListener('change', e => {
    if (e.target.checked) map.addLayer(layer);
    else map.removeLayer(layer);
  });
}
// 🧭 Add Compact Legend
const legend = L.control({ position: 'bottomright' });
legend.onAdd = function () {
  const div = L.DomUtil.create('div', 'bg-white/90 dark:bg-gray-800/90 text-xs p-2 rounded shadow border border-gray-200 dark:border-gray-700');
  div.innerHTML = `
  <div class="mb-1">
    <div class="flex items-center gap-2">
      <div class="w-3 h-3 rounded-full bg-gradient-to-r from-red-500 to-green-500"></div>
      <span class="font-medium">NDVI</span>
    </div>
    <div class="text-[0.65rem] text-gray-600 dark:text-gray-300 ml-5">Plant health (low to high)</div>
  </div>
  <div class="mb-1">
    <div class="flex items-center gap-2">
      <div class="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-red-500"></div>
      <span class="font-medium">LST</span>
    </div>
    <div class="text-[0.65rem] text-gray-600 dark:text-gray-300 ml-5">Surface temperature (cool to hot)</div>
  </div>
  <div class="mb-1">
    <div class="flex items-center gap-2">
      <div class="w-3 h-3 rounded-full bg-gradient-to-r from-yellow-400 to-green-500"></div>
      <span class="font-medium">NDVI > 0.3</span>
    </div>
    <div class="text-[0.65rem] text-gray-600 dark:text-gray-300 ml-5">Healthy vegetation areas</div>
  </div>
  <div>
    <div class="flex items-center gap-2">
      <div class="w-3 h-3 rounded-full bg-gradient-to-r from-[#d7191c] via-[#ffffbf] to-[#1a9641]"></div>
      <span class="font-medium">NDVI Anomaly</span>
    </div>
    <div class="text-[0.65rem] text-gray-600 dark:text-gray-300 ml-5">Change in vegetation vs past year</div>
  </div>
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
// Load community reports into control panel
loadCommunityReports();
// 🔒 Close layer panel on ❌ button click
document.getElementById('close-layer-panel')?.addEventListener('click', () => {
  document.getElementById('custom-layer-panel')?.classList.add('hidden');
});
