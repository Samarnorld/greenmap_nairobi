const map = L.map('map').setView([-1.286389, 36.817223], 11);

// Base layers
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors',
  maxZoom: 19
}).addTo(map);

const satellite = L.tileLayer(
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '© Esri, NASA, NGA, USGS',
    maxZoom: 19
  }
);

// Dynamic layers
let ndviLayer = null;
let lstLayer = null;
let ndviMaskLayer = null;

// Fetch and show NDVI layer
fetch('http://localhost:3000/ndvi')
  .then(res => res.json())
  .then(data => {
    ndviLayer = L.tileLayer(data.urlFormat, { opacity: 0.7 });
    ndviLayer.addTo(map);
    control.addOverlay(ndviLayer, "🌿 NDVI");
  }).catch(err => console.error("NDVI error:", err));

// Fetch and show LST layer
fetch('http://localhost:3000/lst')
  .then(res => res.json())
  .then(data => {
    lstLayer = L.tileLayer(data.urlFormat, { opacity: 0.6 });
    lstLayer.addTo(map);
    control.addOverlay(lstLayer, "🔥 LST");
  }).catch(err => console.error("LST error:", err));

// Fetch and show NDVI Mask > 0.3
fetch('http://localhost:3000/ndvi-mask')
  .then(res => res.json())
  .then(data => {
    ndviMaskLayer = L.tileLayer(data.urlFormat, { opacity: 0.75 });
    control.addOverlay(ndviMaskLayer, "✅ NDVI > 0.3");
  }).catch(err => console.error("NDVI Mask error:", err));

// Layer control
const baseMaps = {
  "🗺️ OpenStreetMap": osm,
  "🛰️ Satellite": satellite
};
const overlayMaps = {};
const control = L.control.layers(baseMaps, overlayMaps, { collapsed: false }).addTo(map);

// Add Nairobi wards
fetch('../data/wards.geojson')
  .then(res => res.json())
  .then(data => {
    console.log("Loaded GeoJSON properties:", data.features[0].properties); // DEBUG: see property names
    L.geoJSON(data, {
      style: {
        color: 'gray',
        weight: 1,
        fillOpacity: 0
      },
      onEachFeature: (feature, layer) => {
        const props = feature.properties;
        const name = props.WARD || props.ward || props.NAME_3 || props.name || "Unnamed";
        const ndvi = props.mean_NDVI?.toFixed(2) || "N/A";
        const lst = props.mean_LST?.toFixed(1) || "N/A";
        layer.bindPopup(`<strong>${name}</strong><br>🌿 NDVI: ${ndvi}<br>🔥 LST: ${lst}°C`);
      }
    }).addTo(map);
  })
  .catch(err => {
    console.error("Failed to load wards.geojson:", err);
  });
