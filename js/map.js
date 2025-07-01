// js/map.js
const map = L.map('map', {
  zoomControl: true
}).setView([-1.286389, 36.817223], 11);
if (window.innerWidth <= 768) {
  const mapContainer = document.getElementById('map');
  let isInteractive = false;
 
  const hint = document.createElement('div');
  hint.id = 'map-touch-toggle';
  hint.textContent = '👆 Tap to interact with map';
  hint.style.cssText = `
    position: absolute;
    top: 0.75rem;
    left: 50%;
    transform: translateX(-50%);
    background-color: rgba(15, 23, 42, 0.85);
    color: white;
    font-weight: 600;
    font-size: 13px;
    padding: 6px 12px;
    border-radius: 6px;
    z-index: 9999;
    cursor: pointer;
    user-select: none;
  `;
  mapContainer.style.position = 'relative';
  mapContainer.appendChild(hint);

  function disableMapTouch() {
    map.dragging.disable();
    map.touchZoom.disable();
    map.doubleClickZoom.disable();
    map.scrollWheelZoom.disable();
    map.boxZoom.disable();
    map.keyboard.disable();
    if (map.tap) map.tap.disable();
    isInteractive = false;
    hint.textContent = 'Tap to interact with map';
  }

  function enableMapTouch() {
    map.dragging.enable();
    map.touchZoom.enable();
    map.doubleClickZoom.enable();
    map.scrollWheelZoom.enable();
    map.boxZoom.enable();
    map.keyboard.enable();
    if (map.tap) map.tap.enable();
    isInteractive = true;
    hint.textContent = 'Tap to stop map interaction';
  }

  disableMapTouch();

  hint.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isInteractive) {
      disableMapTouch();
    } else {
      enableMapTouch();
    }
  });

  map.on('click', () => {
    if (!isInteractive) enableMapTouch();
  });
}

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

const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const satellite = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '© Esri, NASA, NGA, USGS'
  }
);


let ndviLayer, lstLayer, ndviMaskLayer;
const reportsLayer = L.layerGroup().addTo(map);


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
  🌳 NDVI: ${ndviNow?.toFixed(2) || "N/A"} (${ndviChange})<br>
  🔥 LST: ${props.lst?.toFixed(1) || "N/A"} °C<br>
  🌧️ Rainfall: ${rainNow?.toFixed(1) || "N/A"} mm (${rainChange})<br>
  📉 Anomaly: ${props.anomaly_mm?.toFixed(1) || "N/A"} mm
`);
layer.on('click', () => {
  const event = new CustomEvent("ward:selected", { detail: { name } });
  window.dispatchEvent(event);
});

      } else {
        layer.bindPopup(`<strong>${name}</strong><br>No data available.`);
      }
    }
  }).addTo(map);
})
.catch(err => console.error('Failed to load wards or stats:', err));

const BACKEND_URL = 'https://greenmap-backend.onrender.com';
function getTooltip(label) {
  if (label.includes("NDVI Anomaly")) return "Shows areas with vegetation change vs. last year";
  if (label.includes("NDVI")) return "Normalized Difference Vegetation Index (greenness)";
  if (label.includes("LST")) return "Land Surface Temperature – heat zones";
  if (label.includes("Rainfall Anomaly")) return "Rain deviation vs. average";
  if (label.includes("Rainfall")) return "Recent rainfall total (mm)";
  if (label.includes("Healthy Zones")) return "Areas with NDVI above 0.3 (healthy)";
  if (label.includes("Field Reports")) return "Crowdsourced user reports from the field";
  return "Satellite-based environmental layer";
}

function loadTileLayer(endpoint, label, opacity, visible = true, range = null) {

  fetch(`${BACKEND_URL}/${endpoint}`)
    .then(res => res.json())
   .then(data => {
  if (!data.urlFormat) return console.error(`${label} layer failed: No tile URL received`, data);
  const layer = L.tileLayer(data.urlFormat, {
  opacity,
  zIndex: 200
});
const normalizedLabel = label.trim().toLowerCase();
if (normalizedLabel === '🌳ndvi') ndviLayer = layer;
if (normalizedLabel === 'lst heatmap🔥') lstLayer = layer;
if (normalizedLabel === 'healthy zones') ndviMaskLayer = layer;
if (normalizedLabel === 'ndvi anomaly🧭') ndviAnomalyLayer = layer;

console.log("✅ Loaded layer:", label, "→", data.urlFormat);


 
if (label.includes('Rainfall (mm)') && typeof range !== 'undefined') {
  const legendLine = document.querySelector('.legend-rainfall-range');
  if (legendLine) legendLine.textContent = `Total ${range}-day rainfall`;
}

if (visible) map.addLayer(layer);

      const wrapper = document.createElement('div');
      wrapper.className = "space-y-1 text-[13px]";

wrapper.innerHTML = `
  <div class="flex items-center justify-between gap-2">
    <label
      class="flex items-center gap-2 font-semibold text-[13px] text-gray-800 dark:text-gray-200 tracking-tight"
      title="${label} layer – click to toggle visibility">
      <input type="checkbox" ${visible ? 'checked' : ''} class="form-checkbox toggle-layer" data-label="${label}" />
      <span>${label}</span>
    </label>
  </div>
  <input type="range" min="0" max="1" step="0.05" value="${opacity}" data-label="${label}"
    class="w-24 h-[3px] bg-gray-200 rounded appearance-none cursor-pointer dark:bg-gray-700" />
`;

 const groupKey = label.includes("NDVI") || label.includes("Healthy")
  ? "Vegetation Layers"
  : label.includes("LST")
  ? "Temperature Layers"
  : label.includes("Rainfall")
  ? "Rainfall Layers"
  : "Other";

document.querySelectorAll('#layer-controls .mb-4').forEach(section => {
  if (section.querySelector('button')?.textContent.includes(groupKey)) {
    section.querySelector('div.space-y-1')?.appendChild(wrapper);
  }
});
setTimeout(() => {
  if (visible) {
    const checkbox = wrapper.querySelector(".toggle-layer");
    if (checkbox && !checkbox.checked) {
      checkbox.checked = true;
    }
  }
}, 50);

      wrapper.querySelector(".toggle-layer").addEventListener('change', e => {
        if (e.target.checked) map.addLayer(layer);
        else map.removeLayer(layer);
      });

      wrapper.querySelector("input[type=range]").addEventListener('input', e => {
        layer.setOpacity(parseFloat(e.target.value));
      });
    })
    .catch(err => console.error(`${label} error:`, err));
}

function loadAllLayers(date = null, range = null) {
  const layerControls = document.getElementById('layer-controls');
layerControls.innerHTML = '';

const groups = {
  "Vegetation Layers": document.createElement('div'),
  "Temperature Layers": document.createElement('div'),
  "Rainfall Layers": document.createElement('div'),
  "Other": document.createElement('div')
};

for (const [title, container] of Object.entries(groups)) {
  container.className = "space-y-1";

  const wrapper = document.createElement('div');
  wrapper.className = "mb-4";

  const toggleBtn = document.createElement('button');
  toggleBtn.className = "w-full text-left font-bold text-sm text-gray-700 dark:text-gray-200 mb-1";
  toggleBtn.textContent = `▶ ${title}`;
  toggleBtn.dataset.collapsed = "false";

  toggleBtn.addEventListener('click', () => {
    const collapsed = toggleBtn.dataset.collapsed === "true";
    toggleBtn.dataset.collapsed = String(!collapsed);
    toggleBtn.textContent = `${collapsed ? "▼" : "▶"} ${title}`;
    container.style.display = collapsed ? "block" : "none";
  });

  wrapper.appendChild(toggleBtn);
  wrapper.appendChild(container);
  layerControls.appendChild(wrapper);
}

 const params = new URLSearchParams();
if (date) params.append('date', date);
if (range) params.append('range', range);
const query = params.toString() ? `?${params.toString()}` : '';
  loadTileLayer(`ndvi${query}`, '🌳NDVI', 0.7, true);
loadTileLayer(`lst${query}`, 'LST Heatmap🔥', 0.6, true);
loadTileLayer(`ndvi-mask${query}`, 'Healthy Zones', 0.75, false);
loadTileLayer(`ndvi-anomaly${query}`, 'NDVI Anomaly🧭', 0.75, false);
loadTileLayer(`rainfall${query}`, '🌧️ Rainfall (mm)', 0.6, !!range, range);

loadTileLayer(`rainfall-anomaly${query}`, '📉 Rainfall Anomaly', 0.6, false);

}

const loadingMsg = document.createElement('div');
loadingMsg.id = 'loading-map-msg';
loadingMsg.textContent = '🌿 Loading GreenMap Layers...';
loadingMsg.style.cssText = `
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.75);
  color: white;
  font-weight: bold;
  padding: 6px 12px;
  border-radius: 5px;
  z-index: 9999;
  font-size: 14px;
`;
document.getElementById('map').appendChild(loadingMsg);
setTimeout(() => {
  loadAllLayers();
}, 800);
document.getElementById('loading-map-msg')?.remove();

window.addEventListener('map:loadDate', (e) => {
  const selectedDate = e.detail.date;
  if (selectedDate) {
    loadAllLayers(selectedDate);
  }
});

function loadCommunityReports() {
  const layer = reportsLayer;

  const wrapper = document.createElement('div');
  wrapper.className = "space-y-1";

 wrapper.innerHTML = `
  <label class="flex items-center gap-2 font-semibold text-[13px] text-gray-800 dark:text-gray-200 tracking-tight">
    <input type="checkbox" checked class="form-checkbox toggle-layer" data-label="Field Reports🗣️" />
    <span>Field Reports🗣️</span>
  </label>
`;

  document.getElementById('layer-controls').appendChild(wrapper);

  wrapper.querySelector(".toggle-layer").addEventListener('change', e => {
    if (e.target.checked) map.addLayer(layer);
    else map.removeLayer(layer);
  });
}

const legend = L.control({ position: 'bottomright' });
legend.onAdd = function () {
  const wrapper = L.DomUtil.create('div', 'relative');
  wrapper.id = 'legend-wrapper';

  const div = document.createElement('div');
  div.className = 'bg-white/90 dark:bg-gray-800/90 text-xs p-2 rounded shadow border border-gray-200 dark:border-gray-700';
  div.id = 'legend-box';

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
    <div class="mb-1">
      <div class="flex items-center gap-2">
        <div class="w-3 h-3 rounded-full bg-gradient-to-r from-[#d7191c] via-[#ffffbf] to-[#1a9641]"></div>
        <span class="font-medium">NDVI Anomaly</span>
      </div>
      <div class="text-[0.65rem] text-gray-600 dark:text-gray-300 ml-5">Change in vegetation vs past year</div>
    </div>
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
  `;

  const toggleBtn = document.createElement('button');
  toggleBtn.textContent = 'Legend';
 toggleBtn.className =
  'absolute -top-2 -right-2 z-[1000] px-2 py-[2px] text-[10px] font-bold text-black bg-lime-300 rounded-md shadow border border-lime-500';


  toggleBtn.addEventListener('click', () => {
    div.classList.toggle('hidden');
  });

  wrapper.appendChild(div);
  wrapper.appendChild(toggleBtn);

  return wrapper;
};

legend.addTo(map);
L.easyButton('fa-share-alt', () => {
  const center = map.getCenter();
  const zoom = map.getZoom();
  const url = `${location.origin}${location.pathname}?lat=${center.lat.toFixed(5)}&lng=${center.lng.toFixed(5)}&zoom=${zoom}`;
  navigator.clipboard.writeText(url);
  alert("🔗 Map view copied:\n" + url);
}).addTo(map);
L.easyButton({
  states: [{
    stateName: 'reset-view',
    onClick: function(btn, map) {
      map.setView([-1.286389, 36.817223], 11);
    },
    title: 'Reset Map View',
    icon: `<span style="
      background-color: #bbf7d0;
      color: black;
      font-size: 9px;
      font-weight: bold;
      font-family: sans-serif;
      padding: 1px 4px;
      border-radius: 3px;
      display: inline-block;
    ">Reset</span>`
  }]
}).addTo(map);

const params = new URLSearchParams(window.location.search);
if (params.has('lat') && params.has('lng') && params.has('zoom')) {
  map.setView([+params.get('lat'), +params.get('lng')], +params.get('zoom'));
}

loadCommunityReports();

document.getElementById('close-layer-panel')?.addEventListener('click', () => {
  document.getElementById('custom-layer-panel')?.classList.add('hidden');
});

window.addEventListener("resize", () => {
  map.invalidateSize();
});

const tutorialSteps = [
  {
    title: "Welcome to GreenMap 🌍",
    content: `
      <p>This guide will help you explore Nairobi’s environment using layers for vegetation (NDVI), land temperature (LST), rainfall, and real-time community field reports.</p>
      <p class="text-xs mt-1 text-gray-500">Tap <strong>Next →</strong> to begin your map tour.</p>
    `
  },
  {
    title: "🗺️ Zoom & Reset Controls",
    content: `
      <p>Use the <strong>+ and -</strong> buttons on the top left to zoom in/out. Below them, the <strong>Reset</strong> button recenters the map to Nairobi.</p>
      <div class="text-xs mt-1 text-gray-500">💡 Tip: Double-tap the map to zoom quickly on mobile.</div>
    `
  },
 {
  title: "📅 Date & Rainfall Range Pickers",
  content: `
    <p class="text-sm">Use the top-left sidebar to explore satellite data over time:</p>
    <ul class="list-disc list-inside text-sm mt-2 space-y-1">
      <li><span class="font-semibold">Date Picker:</span> Select a specific date to load NDVI, LST, and rainfall layers for that day.</li>
      <li><span class="font-semibold">Rainfall Range:</span> Choose the number of recent days of rainfall to visualize.</li>
    </ul>
    <div class="mt-2 text-sm">
      <span class="font-semibold">Options:</span> <code>30</code>, <code>60</code>, or <code>90</code> days
    </div>
    <p class="text-xs mt-2 text-gray-500">💡 Useful for comparing wet vs. dry seasons and spotting recent storms or droughts.</p>
  `
},

  {
    title: "Layers Panel – What’s That?",
    content: `
      <p>Click the <strong>Layers</strong> button on the map to open the full environmental controls sidebar.</p>
      <p>Each group (Vegetation, Temperature, Rainfall, Field Reports) contains checkboxes to toggle map layers and sliders to adjust their opacity.</p>
    `
  },
 {
  title: "🌳 NDVI Layer – Greenness",
  content: `
    <div class="flex items-center gap-2 mb-2">
      <div class="w-3 h-3 rounded-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-500"></div>
      <span class="text-sm">NDVI = Plant Health</span>
    </div>
    <p class="text-sm leading-relaxed">
      <span class="text-green-600 font-semibold">Green</span>: healthy vegetation<br>
      <span class="text-yellow-500 font-semibold">Yellow</span>: low vegetation<br>
      <span class="text-red-500 font-semibold">Red</span>: bare/dry/damaged land
    </p>
    <p class="text-xs mt-2 text-gray-500">
      💡 <b>Action:</b> Track urban green zones, protect green cover & identify dry areas to restore.
    </p>
  `
},
{
  title: "🧭 NDVI Anomaly Layer",
  content: `
    <div class="flex items-center gap-2 mb-2">
      <div class="w-3 h-3 rounded-full bg-gradient-to-r from-[#d7191c] via-[#ffffbf] to-[#1a9641]"></div>
      <span class="text-sm">NDVI Change vs. Last Year</span>
    </div>
    <p class="text-sm leading-relaxed">
      <span class="text-red-600 font-semibold">Red</span>: vegetation loss<br>
      <span class="text-green-600 font-semibold">Green</span>: vegetation gain/recovery
    </p>
    <p class="text-xs mt-2 text-gray-500">
      💡 <b>Action:</b> Monitor deforestation or regreening efforts and track land degradation.
    </p>
  `
},

{
  title: "🔥 LST Heatmap – Surface Temperature",
  content: `
    <div class="flex items-center gap-2 mb-2">
      <div class="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 via-yellow-400 to-red-600"></div>
      <span class="text-sm">LST = Land Surface Temperature</span>
    </div>
    <p class="text-sm leading-relaxed">
      <span class="text-blue-600 font-semibold">Blue</span>: Cool zones (trees, grass, shaded)<br>
      <span class="text-yellow-500 font-semibold">Yellow</span>: Moderate warmth<br>
      <span class="text-red-600 font-semibold">Red</span>: Hot zones (bare land, concrete, roads)
    </p>
    <p class="text-xs mt-2 text-gray-500">
      💡 <b>Action Tip:</b> Add tree cover, reduce paved surfaces, and cool down hotspots.
    </p>
  `
},

  {
  title: "✅ Healthy Zones",
  content: `
    <div class="flex items-center gap-2 mb-2">
      <div class="w-3 h-3 rounded-full bg-green-500"></div>
      <span class="text-sm">NDVI > 0.3 = Healthy</span>
    </div>
    <p class="text-sm leading-relaxed">
      These zones have <span class="text-green-600 font-semibold">NDVI above 0.3</span> – good for crops, urban green spaces, and tree health.
    </p>
  `
},
  {
  title: "🌧️ Rainfall (mm)",
  content: `
    <div class="flex items-center gap-2 mb-2">
      <div class="w-3 h-3 rounded-full bg-gradient-to-r from-[#e0f3f8] via-[#74add1] to-[#313695]"></div>
      <span class="text-sm">Recent Rainfall (mm)</span>
    </div>
    <p class="text-sm leading-relaxed">
      <span class="text-blue-400 font-semibold">Light blue</span>: little rain<br>
      <span class="text-blue-900 font-semibold">Dark</span>: more rain<br>
      Uses selected range (e.g., 30, 60, 90 days).
    </p>
    <p class="text-xs mt-2 text-gray-500">
      💡 <b>Tip:</b> Great for analyzing drought or wet seasons.
    </p>
  `
},
{
  title: "📉 Rainfall Anomaly",
  content: `
    <div class="flex items-center gap-2 mb-2">
      <div class="w-3 h-3 rounded-full bg-gradient-to-r from-[#d73027] via-[#fee08b] to-[#1a9850]"></div>
      <span class="text-sm">Deviation from Average</span>
    </div>
    <p class="text-sm leading-relaxed">
      <span class="text-red-600 font-semibold">Red</span>: drier than usual<br>
      <span class="text-green-600 font-semibold">Green</span>: wetter than usual
    </p>
    <p class="text-xs mt-2 text-gray-500">
      💡 <b>Use:</b> Detect flood risks or monitor drought-prone zones.
    </p>
  `
},
  {
    title: "✅ You're Ready!",
    content: `
      <p>Toggle layers, zoom in, click anywhere on the map to explore live ward data like:</p>
      <ul class="list-disc list-inside text-sm mt-2">
        <li>🌳 NDVI (Greenness)</li>
        <li>🔥 Temperature</li>
        <li>🌧️ Rainfall</li>
        <li>📉 Environmental Anomalies</li>
      </ul>
      <p class="mt-3 text-green-700 font-semibold">Let’s build a greener, cooler Nairobi together!</p>
    `
  }
];

let currentStep = 0;

function showTutorialStep() {
  const step = tutorialSteps[currentStep];
  const content = document.getElementById('tutorial-step-content');
  const overlay = document.getElementById('map-tutorial-overlay');
  const prevBtn = document.getElementById('prev-step');
  const nextBtn = document.getElementById('next-step');

  content.innerHTML = `
    <h2 class="text-lg sm:text-xl font-semibold text-green-800 dark:text-green-300">${step.title}</h2>
    <p class="text-gray-800 dark:text-gray-200 leading-relaxed">${step.content}</p>
  `;

  overlay.classList.remove('hidden');
  prevBtn.disabled = currentStep === 0;
  nextBtn.textContent = currentStep === tutorialSteps.length - 1 ? "Close" : "Next →";
}

document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('map-tutorial-overlay');

    document.getElementById('open-tutorial')?.addEventListener('click', () => {
    currentStep = 0;
    showTutorialStep();
  });


  document.getElementById('prev-step')?.addEventListener('click', () => {
    if (currentStep > 0) {
      currentStep--;
      showTutorialStep();
    }
  });

  document.getElementById('next-step')?.addEventListener('click', () => {
    if (currentStep < tutorialSteps.length - 1) {
      currentStep++;
      showTutorialStep();
    } else {
      if (document.getElementById('dont-show-again')?.checked) {
        localStorage.setItem('greenmap_tutorial_seen', 'true');
      }
      overlay.classList.add('hidden');
    }
  });

  document.getElementById('close-tutorial')?.addEventListener('click', () => {
    if (document.getElementById('dont-show-again')?.checked) {
      localStorage.setItem('greenmap_tutorial_seen', 'true');
    }
    overlay.classList.add('hidden');
  });

  const seenTutorial = localStorage.getItem('greenmap_tutorial_seen');
  if (!seenTutorial) {
    setTimeout(() => {
      currentStep = 0;
      showTutorialStep();
    }, 1200); 
  }
});
