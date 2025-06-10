// 1. Initialize the map
const map = L.map('map').setView([-1.2921, 36.8219], 11);

// 2. Base Layers
const normal = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const esriHybrid = L.layerGroup([
  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '© Esri & contributors'
  }),
  L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}')
]);

// 3. NDVI & LST Overlays with Nairobi Extent
const ndviBounds = [
  [-1.4421585799999550, 36.6634750360001931],
  [-1.1579102279999349, 37.1037025450001465]
];
const lstBounds = ndviBounds;

const staticNdvi = L.imageOverlay('../assets/ndvi.png', ndviBounds, {
  opacity: 0.7
});
const staticLst = L.imageOverlay('../assets/lst.png', lstBounds, {
  opacity: 0.7
});
staticNdvi.addTo(map);
staticLst.addTo(map);

// 4. Ward Fill Styling
function getNdviColor(val) {
  return val >= 0.6 ? '#1a9850' :
         val >= 0.4 ? '#66bd63' :
         val >= 0.2 ? '#a6d96a' :
         val >= 0.1 ? '#d9ef8b' :
         val >  0.0 ? '#fee08b' :
         val >= -1.0 ? '#f46d43' :
                      '#d73027';
}

// 5. Ward GeoJSON Load
let wardLayer;
fetch('../data/wards.geojson')
  .then(res => res.json())
  .then(data => {
    wardLayer = L.geoJSON(data, {
      style: feature => ({
        color: '#444',
        weight: 1,
        fillOpacity: 0.4,
        fillColor: getNdviColor(feature.properties.ndvi)
      }),
      onEachFeature: (feature, layer) => {
        const p = feature.properties;
        const name = p.ward || "Unnamed";
        const ndvi = p.ndvi !== undefined ? parseFloat(p.ndvi).toFixed(2) : "N/A";
        const lst = p.lst !== undefined ? parseFloat(p.lst).toFixed(1) : "N/A";

        layer.bindPopup(`
          <strong>${name}</strong><br/>
          NDVI: <span style="color:green">${ndvi}</span><br/>
          LST: <span style="color:orange">${lst}°C</span>
        `);

        layer.on({
          mouseover: e => e.target.setStyle({ weight: 3, color: "#000", fillOpacity: 0.6 }),
          mouseout: e => wardLayer.resetStyle(e.target),
          click: e => map.fitBounds(e.target.getBounds())
        });
      }
    }).addTo(map);

    map.fitBounds(wardLayer.getBounds());
  })
  .catch(err => console.error("Failed to load wards.geojson:", err));

// 6. Firebase Report Markers
let allMarkers = [];
const reportLayer = L.layerGroup().addTo(map);

db.collection("reports").onSnapshot(snapshot => {
  allMarkers.forEach(m => reportLayer.removeLayer(m));
  allMarkers = [];

  snapshot.forEach(doc => {
    const r = doc.data();
    const { lat, lng, title, description, location, imageUrl, type } = r;
    if (!lat || !lng) return;

    const icon = L.icon({
      iconUrl: getIconUrl(type),
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });

    const marker = L.marker([lat, lng], { icon });
    marker.bindPopup(`
      <div style="max-width:200px">
        <strong>${title}</strong><br/>
        ${description}<br/>
        <em>${location}</em><br/>
        ${imageUrl ? `<img src="${imageUrl}" style="margin-top:5px; width:100%; border-radius:4px;" />` : ""}
      </div>
    `);

    marker.type = type;
    marker.addTo(reportLayer);
    allMarkers.push(marker);
  });
});

function getIconUrl(type) {
  switch (type) {
    case "Tree Cutting": return '../assets/tree.png';
    case "Waste Dumping": return '../assets/dump.png';
    case "Fire Incident": return '../assets/fire.png';
    case "Blocked Drainage": return '../assets/drain.png';
    default: return '../assets/report.png';
  }
}

// 7. Floating Toggle Buttons
const toggleControl = L.control({ position: 'topright' });
toggleControl.onAdd = () => {
  const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
  div.innerHTML = `
    <button id="toggle-satellite" title="Satellite">🛰</button>
    <button id="toggle-ndvi" title="NDVI">🌿</button>
    <button id="toggle-lst" title="LST">🔥</button>
    <button id="toggle-reports" title="Reports">📍</button>
  `;
  return div;
};
toggleControl.addTo(map);

// 8. Toggle Logic
let satelliteVisible = false;
let ndviVisible = true;
let lstVisible = true;
let reportsVisible = true;

document.getElementById("toggle-satellite").addEventListener("click", () => {
  if (satelliteVisible) {
    map.removeLayer(esriHybrid);
    map.addLayer(normal);
  } else {
    map.removeLayer(normal);
    map.addLayer(esriHybrid);
  }
  satelliteVisible = !satelliteVisible;
});

document.getElementById("toggle-ndvi").addEventListener("click", () => {
  ndviVisible ? map.removeLayer(staticNdvi) : map.addLayer(staticNdvi);
  ndviVisible = !ndviVisible;
});

document.getElementById("toggle-lst").addEventListener("click", () => {
  lstVisible ? map.removeLayer(staticLst) : map.addLayer(staticLst);
  lstVisible = !lstVisible;
});

document.getElementById("toggle-reports").addEventListener("click", () => {
  reportsVisible ? map.removeLayer(reportLayer) : map.addLayer(reportLayer);
  reportsVisible = !reportsVisible;
});

// 9. Reset Map View (if button present)
document.getElementById("reset-map")?.addEventListener("click", () => {
  map.setView([-1.2921, 36.8219], 11);
});
