fetch("data/wards.geojson")
  .then((response) => response.json())
  .then((data) => {
    const wards = data.features;

    let ndviValues = [];
    let heatAlertCount = 0;
    const LST_THRESHOLD = 30; // You can lower this to 30 if needed

    wards.forEach((ward) => {
      const ndviRaw = ward.properties.ndvi;
      const lstRaw = ward.properties.lst;

      const ndvi = parseFloat(ndviRaw);
      const lst = parseFloat(lstRaw);

      // Debugging log
      console.log(`Ward: ${ward.properties.name || "Unnamed"} | NDVI: ${ndviRaw}, LST: ${lstRaw}`);

      if (!isNaN(ndvi)) ndviValues.push(ndvi);

      if (!isNaN(lst) && lst > LST_THRESHOLD) {
        heatAlertCount++;
      }
    });

    const avgNdvi = ndviValues.length
      ? ndviValues.reduce((sum, val) => sum + val, 0) / ndviValues.length
      : 0;

    document.getElementById("green-coverage").innerText = `${(avgNdvi * 100).toFixed(1)}%`;
    document.getElementById("heat-zones").innerText = heatAlertCount;
    document.getElementById("veg-trend").innerText = "N/A";
    document.getElementById("engagement-rate").innerText = "0.0%";
  })
  .catch((error) => {
    console.error("Failed to load wards.geojson:", error);
    document.getElementById("green-coverage").innerText = "Error";
    document.getElementById("heat-zones").innerText = "Error";
    document.getElementById("veg-trend").innerText = "Error";
    document.getElementById("engagement-rate").innerText = "Error";
  });
