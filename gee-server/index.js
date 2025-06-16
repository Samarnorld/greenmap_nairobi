// gee-server/index.js
const express = require('express');
const ee = require('@google/earthengine');
const fs = require('fs');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3000;

// Load service account key
const privateKey = require('./greenmap-backend-baf77194d59c.json');

// Enable CORS
app.use(cors());

// Initialize Earth Engine
ee.data.authenticateViaPrivateKey(privateKey, () => {
  ee.initialize(null, null, () => {
    console.log("✅ Earth Engine client initialized.");
  }, (err) => {
    console.error("Earth Engine init error:", err);
  });
}, (err) => {
  console.error("Authentication error:", err);
});

// Load Nairobi wards asset
const wards = ee.FeatureCollection("projects/greenmap-backend/assets/nairobi_wards_filtered");

// NDVI endpoint
app.get('/ndvi', async (req, res) => {
  try {
    const s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
      .filterBounds(wards)
      .filterDate('2024-01-01', '2025-05-25')
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10));

    const ndvi = s2.median()
      .normalizedDifference(['B8', 'B4'])
      .rename('NDVI')
      .clip(wards);

    const vis = { min: 0, max: 0.8, palette: ['red', 'yellow', 'green'] };
    const ndviStyled = ndvi.visualize(vis);

    const mapId = await ndviStyled.getMap();
    res.json({ urlFormat: mapId.urlFormat });
  } catch (error) {
    console.error("NDVI error:", error.message);
    res.status(500).send("Error generating NDVI layer.");
  }
});

// LST endpoint
app.get('/lst', async (req, res) => {
  try {
    const lst = ee.ImageCollection('MODIS/061/MOD11A1')
      .filterBounds(wards)
      .filterDate('2024-01-01', '2025-05-25')
      .select('LST_Day_1km')
      .mean()
      .multiply(0.02)
      .subtract(273.15)
      .rename('LST_C')
      .clip(wards);

    const vis = { min: 25, max: 45, palette: ['blue', 'yellow', 'red'] };
    const lstStyled = lst.visualize(vis);

    const mapId = await lstStyled.getMap();
    res.json({ urlFormat: mapId.urlFormat });
  } catch (error) {
    console.error("LST error:", error.message);
    res.status(500).send("Error generating LST layer.");
  }
});

// NDVI mask endpoint (NDVI > 0.3)
app.get('/ndvi-mask', async (req, res) => {
  try {
    const s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
      .filterBounds(wards)
      .filterDate('2024-01-01', '2025-05-25')
      .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10));

    const ndvi = s2.median()
      .normalizedDifference(['B8', 'B4'])
      .rename('NDVI')
      .clip(wards);

    const ndviMask = ndvi.updateMask(ndvi.gt(0.3));
    const vis = { min: 0.3, max: 0.8, palette: ['yellow', 'green'] };
    const ndviStyled = ndviMask.visualize(vis);

    const mapId = await ndviStyled.getMap();
    res.json({ urlFormat: mapId.urlFormat });
  } catch (error) {
    console.error("NDVI mask error:", error.message);
    res.status(500).send("Error generating NDVI mask layer.");
  }
});

// Start server
app.listen(port, () => {
  console.log(`🌍 Server running on http://localhost:${port}`);
});
