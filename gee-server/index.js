// index.js
const express = require('express');
const cors = require('cors');
const ee = require('@google/earthengine');
const { GoogleAuth } = require('google-auth-library');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());

const KEY_PATH = path.join(__dirname, 'greenmap-tileserver-58f62e8e9b43.json');
const privateKey = JSON.parse(fs.readFileSync(KEY_PATH, 'utf8'));

async function initEE() {
  const auth = new GoogleAuth({
    credentials: privateKey,
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  });

  const client = await auth.getClient();
  const token = await client.getAccessToken();

  ee.data.authenticateViaPrivateKey(
    {
      client_email: privateKey.client_email,
      private_key: privateKey.private_key,
    },
    () => {
      ee.initialize(null, null, () => {
        console.log('✅ Earth Engine initialized');
      }, (err) => {
        console.error('❌ Initialization error:', err);
      });
    },
    (err) => {
      console.error('❌ Authentication error:', err);
    }
  );
}

initEE();

function getMapTileUrl(image, visParams, res) {
  const styled = image.visualize(visParams);
  styled.getMap((mapInfo) => {
    if (!mapInfo) {
      return res.status(500).json({ error: 'Map info not available' });
    }
    const url = `https://earthengine.googleapis.com/map/${mapInfo.mapid}/{z}/{x}/{y}?token=${mapInfo.token}`;
    res.json({ urlFormat: url });
  });
}

const wards = ee.FeatureCollection('projects/nice-etching-459905-u0/assets/kenya_wards')
  .filter(ee.Filter.eq('NAME_1', 'Nairobi'));

// NDVI route
app.get('/ndvi', (req, res) => {
  const s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(wards)
    .filterDate('2024-01-01', '2025-05-25')
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10));

  const ndvi = s2.median()
    .normalizedDifference(['B8', 'B4'])
    .rename('NDVI')
    .clip(wards);

  getMapTileUrl(ndvi, {
    min: 0,
    max: 0.8,
    palette: ['red', 'yellow', 'green']
  }, res);
});

// LST route
app.get('/lst', (req, res) => {
  const lst = ee.ImageCollection('MODIS/061/MOD11A1')
    .filterBounds(wards)
    .filterDate('2024-01-01', '2025-05-25')
    .select('LST_Day_1km')
    .mean()
    .multiply(0.02)
    .subtract(273.15)
    .rename('LST_C')
    .clip(wards);

  getMapTileUrl(lst, {
    min: 25,
    max: 45,
    palette: ['blue', 'yellow', 'red']
  }, res);
});

// NDVI > 0.3 Mask
app.get('/ndvi-mask', (req, res) => {
  const s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(wards)
    .filterDate('2024-01-01', '2025-05-25')
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10));

  const ndvi = s2.median()
    .normalizedDifference(['B8', 'B4'])
    .rename('NDVI')
    .clip(wards);

  const mask = ndvi.updateMask(ndvi.gt(0.3));

  getMapTileUrl(mask, {
    min: 0.3,
    max: 0.8,
    palette: ['yellow', 'green']
  }, res);
});

app.listen(PORT, () => {
  console.log(`🚀 GreenMap backend running on port ${PORT}`);
});
