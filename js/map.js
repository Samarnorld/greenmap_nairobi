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

// 📍 Add Wards with Live Stats from Backend
Promise.all([
  fetch('../data/wards.geojson').then(res => res.json()),
  fetch('https://greenmap-backend.onrender.com/wards').then(res => res.json())
])
.then(([geojsonData, statsData]) => {
  const statsByWard = {};
  statsData.features.forEach(f => {
    const name = f.properties.NAME_3 || f.properties.ward;
    statsByWard[name] = f.properties;
  });

  L.geoJSON(geojsonData, {
    style: {
      color: 'gray',
      weight: 1,
      fillOpacity: 0
    },
    onEachFeature: (feature, layer) => {
      const name = feature.properties.NAME_3 || feature.properties.ward;
      const props = statsByWard[name];

      if (props) {
       const ndviNow = props.ndvi ?? null;
const ndviPast = props.ndvi_past ?? null;
const rainNow = props.rain_mm ?? null;
const rainPast = props.rain_past ?? null;

let ndviChange = 'N/A';
if (ndviNow && ndviPast) {
  const change = ((ndviNow - ndviPast) / ndviPast) * 100;
  ndviChange = `${change.toFixed(1)}%`;
}

let rainChange = 'N/A';
if (rainNow && rainPast) {
  const change = ((rainNow - rainPast) / rainPast) * 100;
  rainChange = `${change.toFixed(1)}%`;
}

layer.bindPopup(`
  <strong>🗺️ ${name}</strong><br>
  🌿 NDVI: ${ndviNow?.toFixed(2) || "N/A"} (${ndviChange})<br>
  🔥 LST: ${props.lst?.toFixed(1) || "N/A"} °C<br>
  🌧️ Rainfall: ${rainNow?.toFixed(1) || "N/A"} mm (${rainChange})<br>
  📉 Anomaly: ${props.anomaly_mm?.toFixed(1) || "N/A"} mm
`);

      } else {
        layer.bindPopup(`<strong>${name}</strong><br>No data available.`);
      }
    }
  }).addTo(map);
})
.catch(err => console.error('Failed to load wards or stats:', err));

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

function loadTileLayer(endpoint, label, opacity, visible = true, range = null) {

  fetch(`${BACKEND_URL}/${endpoint}`)
    .then(res => res.json())
    .then(data => {
      const layer = L.tileLayer(data.urlFormat, { opacity });
      // 🔁 Update rainfall legend if it's the Rainfall layer
if (label.includes('Rainfall (mm)') && typeof range !== 'undefined') {
  const legendLine = document.querySelector('.legend-rainfall-range');
  if (legendLine) legendLine.textContent = `Total ${range}-day rainfall`;
}

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
function loadAllLayers(date = null, range = null) {
  document.getElementById('layer-controls').innerHTML = ''; // clear old controls

 const params = new URLSearchParams();
if (date) params.append('date', date);
if (range) params.append('range', range);
const query = params.toString() ? `?${params.toString()}` : '';
  loadTileLayer(`ndvi${query}`, 'NDVI ', 0.7);
  loadTileLayer(`lst${query}`, 'LST Heatmap🔥', 0.6);
  loadTileLayer(`ndvi-mask${query}`, 'Healthy Zones🌱', 0.75);
 loadTileLayer(`ndvi-anomaly${query}`, 'NDVI Anomaly🧭', 0.75, false); // pass `false` to prevent auto-load
  loadTileLayer(`rainfall${query}`, '🌧️ Rainfall (mm)', 0.6, true, range);

loadTileLayer(`rainfall-anomaly${query}`, '📉 Rainfall Anomaly', 0.6);

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
      <div class="mb-1">
    <div class="flex items-center gap-2">
      <div class="w-3 h-3 rounded-full bg-gradient-to-r from-[#e0f3f8] via-[#74add1] to-[#313695]"></div>
      <span class="font-medium">Rainfall (mm)</span>
    </div>
   <div class="text-[0.65rem] text-gray-600 dark:text-gray-300 ml-5 legend-rainfall-range">Total 30-day rainfall</div>

  </div>
  <div class="mb-1">
    <div class="flex items-center gap-2">
      <div class="w-3 h-3 rounded-full bg-gradient-to-r from-[#d73027] via-[#fee08b] to-[#1a9850]"></div>
      <span class="font-medium">Rainfall Anomaly</span>
    </div>
    <div class="text-[0.65rem] text-gray-600 dark:text-gray-300 ml-5">Deviation from normal (mm)</div>
  </div>

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
