fetch("https://greenmap-backend.onrender.com/wards")
  .then((res) => res.json())
  .then((data) => {
    const wards = data.features;

    let ndviSum = 0;
    let ndviCount = 0;
    let heatAlertCount = 0;
    let anomalySum = 0;
    let anomalyCount = 0;
    let trendSum = 0;
    let trendCount = 0;
    let rainfallDeficitCount = 0;

    wards.forEach((ward) => {
      const props = ward.properties;

      const ndvi = parseFloat(props.ndvi);
      const ndviPast = parseFloat(props.ndvi_past);
      const lst = parseFloat(props.lst);
      const anomaly = parseFloat(props.anomaly_mm);
      const rain = parseFloat(props.rain_mm);
      const rainPast = parseFloat(props.rain_past);

      if (!isNaN(ndvi)) {
        ndviSum += ndvi;
        ndviCount++;
      }

      if (!isNaN(lst) && lst > 30) {
        heatAlertCount++;
      }

      if (!isNaN(anomaly)) {
        anomalySum += anomaly;
        anomalyCount++;
      }

      if (!isNaN(ndvi) && !isNaN(ndviPast) && ndviPast !== 0) {
        trendSum += ((ndvi - ndviPast) / ndviPast) * 100;
        trendCount++;
      }

      if (!isNaN(rain) && !isNaN(rainPast) && rain < rainPast) {
        rainfallDeficitCount++;
      }
    });

    // ✅ Display the new live stats
    document.getElementById("green-coverage").innerText =
      ndviCount ? `${((ndviSum / ndviCount) * 100).toFixed(1)}%` : "N/A";

    document.getElementById("heat-zones").innerText = heatAlertCount;

    document.getElementById("veg-anomaly").innerText =
      anomalyCount ? `${(anomalySum / anomalyCount).toFixed(1)} mm` : "N/A";

    document.getElementById("veg-trend").innerText =
      trendCount ? `${(trendSum / trendCount).toFixed(1)}%` : "N/A";

    document.getElementById("rain-deficit").innerText = rainfallDeficitCount;
  })
  .catch((err) => {
    console.error("Failed to load live stats:", err);
    document.getElementById("green-coverage").innerText = "Error";
    document.getElementById("heat-zones").innerText = "Error";
    document.getElementById("veg-anomaly").innerText = "Error";
    document.getElementById("veg-trend").innerText = "Error";
    document.getElementById("rain-deficit").innerText = "Error";
  });
