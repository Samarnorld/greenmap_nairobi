function animateCount(id, value, suffix = "", duration = 1000) {
  const el = document.getElementById(id);
  let start = 0;
  const startTime = performance.now();

  function update(timestamp) {
    const elapsed = timestamp - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const current = (value * progress).toFixed(1);
    el.textContent = `${current}${suffix}`;
    if (progress < 1) requestAnimationFrame(update);
  }

  requestAnimationFrame(update);
}

// Show shimmer placeholders initially
["green-coverage", "heat-zones", "veg-anomaly", "veg-trend", "rain-deficit"].forEach((id) => {
  document.getElementById(id).innerHTML =
    `<div class="w-16 h-6 rounded-md bg-gray-300 dark:bg-gray-700 animate-pulse mx-auto"></div>`;
});

fetch("https://greenmap-backend.onrender.com/wards")
  .then((res) => res.json())
  .then((data) => {
    const wards = data.features;

    let ndviSum = 0, ndviCount = 0, heatAlertCount = 0;
    let anomalySum = 0, anomalyCount = 0;
    let trendSum = 0, trendCount = 0;
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
      if (!isNaN(lst) && lst > 30) heatAlertCount++;
      if (!isNaN(anomaly)) {
        anomalySum += anomaly;
        anomalyCount++;
      }
      if (!isNaN(ndvi) && !isNaN(ndviPast) && ndviPast !== 0) {
        trendSum += ((ndvi - ndviPast) / ndviPast) * 100;
        trendCount++;
      }
      if (!isNaN(rain) && !isNaN(rainPast) && rain < rainPast) rainfallDeficitCount++;
    });

    if (ndviCount)
      animateCount("green-coverage", (ndviSum / ndviCount) * 100, "%");

    animateCount("heat-zones", heatAlertCount, "");

    if (anomalyCount)
      animateCount("veg-anomaly", anomalySum / anomalyCount, " mm");

    if (trendCount)
      animateCount("veg-trend", trendSum / trendCount, "%");

    animateCount("rain-deficit", rainfallDeficitCount);
  })
  .catch((err) => {
    console.error("Failed to load live stats:", err);
    ["green-coverage", "heat-zones", "veg-anomaly", "veg-trend", "rain-deficit"].forEach((id) => {
      document.getElementById(id).innerHTML = `<span class="text-red-500">Error</span>`;
    });
  });
