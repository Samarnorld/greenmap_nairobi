const express = require('express');
const cors = require('cors');
const ee = require('@google/earthengine');
const { GoogleAuth } = require('google-auth-library');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());

// Load service account key
const PRIVATE_KEY_PATH = path.join(__dirname, 'gee-service-account.json');

async function initializeEE() {
  const auth = new GoogleAuth({
    keyFile: PRIVATE_KEY_PATH,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });

  const client = await auth.getClient();
  const credentials = await auth.getCredentials();

  ee.data.authenticateViaPrivateKey({
    client_email: credentials.client_email,
    private_key: credentials.private_key,
  }, () => {
    ee.initialize(null, null, () => {
      console.log('✅ Earth Engine initialized');
    }, err => {
      console.error('❌ EE init failed:', err);
    });
  }, err => {
    console.error('❌ Auth failed:', err);
  });
}

initializeEE();

// Helper: Generate map ID and token
function getTileUrl(eeImage, visParams, res) {
  eeImage.visualize(visParams).getMap({}, (map, err) => {
    if (err) {
      console.error("❌ Tile error:", err);
      return res.status(500).json({ error: "Tile generation failed" });
    }

    // FIXED: Correctly build the tile URL
    const tileUrl = `https://earthengine.googleapis.com/v1alpha/projects/earthengine-legacy/maps/${map.mapid}/tiles/{z}/{x}/{y}`;
    res.json({ urlFormat: tileUrl });
  });
}


// NDVI
app.get('/ndvi', (req, res) => {
  const wards = ee.FeatureCollection('projects/nice-etching-459905-u0/assets/kenya_wards')
    .filter(ee.Filter.eq('NAME_1', 'Nairobi'));

  const s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(wards)
    .filterDate('2024-01-01', '2025-05-25')
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10));

  const ndvi = s2.median()
    .normalizedDifference(['B8', 'B4'])
    .rename('NDVI')
    .clip(wards);

  getTileUrl(ndvi, {
    min: 0,
    max: 0.8,
    palette: ['red', 'yellow', 'green']
  }, res);
});

// NDVI > 0.3 mask
app.get('/ndvi-mask', (req, res) => {
  const wards = ee.FeatureCollection('projects/nice-etching-459905-u0/assets/kenya_wards')
    .filter(ee.Filter.eq('NAME_1', 'Nairobi'));

  const s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(wards)
    .filterDate('2024-01-01', '2025-05-25')
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10));

  const ndvi = s2.median()
    .normalizedDifference(['B8', 'B4'])
    .rename('NDVI')
    .clip(wards);

  const mask = ndvi.updateMask(ndvi.gt(0.3));

  getTileUrl(mask, {
    min: 0.3,
    max: 0.8,
    palette: ['yellow', 'green']
  }, res);
});

// LST
app.get('/lst', (req, res) => {
  const wards = ee.FeatureCollection('projects/nice-etching-459905-u0/assets/kenya_wards')
    .filter(ee.Filter.eq('NAME_1', 'Nairobi'));

  const lst = ee.ImageCollection('MODIS/061/MOD11A1')
    .filterBounds(wards)
    .filterDate('2024-01-01', '2025-05-25')
    .select('LST_Day_1km')
    .mean()
    .multiply(0.02)
    .subtract(273.15)
    .rename('LST_C')
    .clip(wards);

  getTileUrl(lst, {
    min: 25,
    max: 45,
    palette: ['blue', 'yellow', 'red']
  }, res);
});

app.listen(PORT, () => {
  console.log(`🚀 GreenMap backend running on http://localhost:${PORT}`);
});
