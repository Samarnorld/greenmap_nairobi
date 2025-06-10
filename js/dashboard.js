// dashboard.js
let chart;
let wardStats = [];
async function loadWardStats() {
  try {
    const res = await fetch("../data/ward_stats.csv");
    const text = await res.text();
    const rows = text.trim().split("\n").slice(1); // skip header

    wardStats = rows.map(row => {
      const [ward, ndvi, lst] = row.split(",");
      return {
        name: ward.trim(),
        ndvi: parseFloat(ndvi),
        lst: parseFloat(lst)
      };
    });
    const avgNDVI = (wardStats.reduce((sum, w) => sum + w.ndvi, 0) / wardStats.length).toFixed(2);
    const hottest = wardStats.reduce((a, b) => a.lst > b.lst ? a : b);
    document.getElementById("avg-ndvi").textContent = avgNDVI;
    document.getElementById("hottest-ward").textContent = `${hottest.name} (${hottest.lst.toFixed(1)}°C)`;
    renderWardChart("ndvi"); // draw chart after loading
  } catch (err) {
    console.error("Failed to load ward_stats.csv:", err);
  }
}
async function loadReportsFromFirebase() {
  const reportTable = document.getElementById("report-table-body");
  reportTable.innerHTML = "";
  const typeFilter = document.getElementById("filter-type").value;
  const startDate = document.getElementById("filter-start").value;
  const endDate = document.getElementById("filter-end").value;
  try {
    let query = db.collection("reports").orderBy("timestamp", "desc");
    const snapshot = await query.get();
    let filteredDocs = [];
    snapshot.forEach(doc => {
      const r = doc.data();
      const date = r.timestamp ? new Date(r.timestamp.seconds * 1000) : null;
      const matchesType = (typeFilter === "All" || r.type === typeFilter);
      const matchesStart = (!startDate || (date && date >= new Date(startDate)));
      const matchesEnd = (!endDate || (date && date <= new Date(endDate + "T23:59")));
      if (matchesType && matchesStart && matchesEnd) {
        filteredDocs.push(doc);
      }
    });
    document.getElementById("report-count").textContent = filteredDocs.length;
    if (filteredDocs.length === 0) {
      reportTable.innerHTML = `<tr><td colspan="5" class="p-2 text-center text-red-600">No matching reports found.</td></tr>`;
      return;
    }
    filteredDocs.forEach(doc => {
      const r = doc.data();
      const row = document.createElement("tr");
      row.innerHTML = `
  <td class="p-2">${r.title || "Untitled"}</td>
  <td class="p-2">${r.type || "Unknown"}</td>
  <td class="p-2">${r.location || "—"}</td>
  <td class="p-2">${r.timestamp ? new Date(r.timestamp.seconds * 1000).toLocaleString() : "N/A"}</td>
  <td class="p-2">${r.imageUrl ? `<img src="${r.imageUrl}" class="h-12 rounded shadow" />` : "—"}</td>
  <td class="p-2">
    <button class="text-red-600 hover:underline text-sm" onclick="deleteReport('${doc.id}')">Delete</button>
  </td>
`;
      reportTable.appendChild(row);
    });
  } catch (err) {
    console.error("Error loading reports:", err);
    reportTable.innerHTML = `<tr><td colspan="5" class="p-2 text-red-600">Failed to load reports.</td></tr>`;
  }
}
function renderWardChart(type = "ndvi") {
  if (!wardStats.length) return;
  const ctx = document.getElementById("wardChart").getContext("2d");
  const labels = wardStats.map(w => w.name);
  const values = wardStats.map(w => type === "ndvi" ? w.ndvi : w.lst);
  if (chart) chart.destroy();
  chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: type === "ndvi" ? "NDVI" : "LST (°C)",
        data: values,
        backgroundColor: type === "ndvi" ? "#22c55e" : "#f87171"
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: true }
      },
      scales: {
        x: {
          ticks: { maxRotation: 90, minRotation: 45 }
        },
        y: {
          beginAtZero: true,
          title: {
           display: true,
          text: type === "ndvi" ? "NDVI" : "Land Surface Temp (°C)"
        }
        }
      }
    }
  });
}
function highlightPriorityZones() {
  const container = document.getElementById("priority-zones");
  container.innerHTML = "";
  const sorted = [...wardStats].sort((a, b) => {
  const aScore = a.ndvi - a.lst;
  const bScore = b.ndvi - b.lst;
   return aScore - bScore; 
  });
  const topWards = sorted.slice(0, 5); 
  topWards.forEach((ward, index) => {
    const item = document.createElement("li");
    item.className = "bg-red-100 dark:bg-red-800 text-red-900 dark:text-white p-3 rounded shadow";
    item.innerHTML = `
      <strong>#${index + 1} ${ward.name}</strong><br />
      NDVI: ${ward.ndvi.toFixed(2)}, LST: ${ward.lst.toFixed(1)}°C
    `;
    container.appendChild(item);
  });
}
document.addEventListener("DOMContentLoaded", async () => {
  document.getElementById("btn-ndvi").addEventListener("click", () => {
    renderWardChart("ndvi");
    setActive("btn-ndvi", "btn-lst");
  });
  document.getElementById("btn-lst").addEventListener("click", () => {
    renderWardChart("lst");
    setActive("btn-lst", "btn-ndvi");
  });
  await loadWardStats();               
  await loadReportsFromFirebase();
  highlightPriorityZones();  
await generateReportCharts();  // Phase 8: show analytics
  renderWardChart("ndvi");
});
function setActive(onId, offId) {
  document.getElementById(onId).classList.add("bg-green-600", "text-white");
  document.getElementById(offId).classList.remove("bg-green-600", "text-white");
}
// Report analysis
async function generateReportCharts() {
  try {
    const snapshot = await db.collection("reports").get();
    const typeCounts = {};
    const monthCounts = {};
    snapshot.forEach(doc => {
      const r = doc.data();
      const type = r.type || "Unknown";
      typeCounts[type] = (typeCounts[type] || 0) + 1;
      const ts = r.timestamp?.seconds ? new Date(r.timestamp.seconds * 1000) : null;
      if (ts) {
        const monthKey = ts.toLocaleString("default", { month: "short", year: "numeric" });
        monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
      }
    });
    const typeCtx = document.getElementById("report-type-chart").getContext("2d");
    new Chart(typeCtx, {
      type: "pie",
      data: {
        labels: Object.keys(typeCounts),
        datasets: [{
          label: "Report Types",
          data: Object.values(typeCounts),
          backgroundColor: ["#22c55e", "#facc15", "#ef4444", "#3b82f6", "#a855f7", "#94a3b8"]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { position: "bottom" }
        }
      }
    });
    const sortedMonths = Object.keys(monthCounts).sort((a, b) => new Date(a) - new Date(b));
    const monthCtx = document.getElementById("reports-month-chart").getContext("2d");
    new Chart(monthCtx, {
      type: "bar",
      data: {
        labels: sortedMonths,
        datasets: [{
          label: "Reports",
          data: sortedMonths.map(m => monthCounts[m]),
          backgroundColor: "#3b82f6"
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: "Report Count" }
          }
        }
      }
    });

  } catch (err) {
    console.error("Error generating report charts:", err);
  }
}
// deleting report
async function deleteReport(docId) {
  if (confirm("Are you sure you want to delete this report?")) {
    try {
      await db.collection("reports").doc(docId).delete();
      loadReportsFromFirebase(); // reload updated list
    } catch (err) {
      alert("Failed to delete report.");
      console.error("Delete error:", err);
    }
  }
}
// Download chart 
document.getElementById("download-chart").addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = "ward_chart.png";
  link.href = document.getElementById("wardChart").toDataURL("image/png");
  link.click();
});
// Export reports 
document.getElementById("export-reports").addEventListener("click", async () => {
  try {
    const snapshot = await db.collection("reports").orderBy("timestamp", "desc").limit(100).get();
    let csv = "Title,Type,Location,Date,ImageURL\n";
    snapshot.forEach(doc => {
      const r = doc.data();
      const date = r.timestamp ? new Date(r.timestamp.seconds * 1000).toISOString() : "";
      const line = `"${r.title || ""}","${r.type || ""}","${r.location || ""}","${date}","${r.imageUrl || ""}"\n`;
      csv += line;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "recent_reports.csv";
    link.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error("Failed to export reports:", err);
    alert("Could not export reports. Try again.");
  }
});
document.getElementById("filter-type").addEventListener("change", loadReportsFromFirebase);
document.getElementById("filter-start").addEventListener("change", loadReportsFromFirebase);
document.getElementById("filter-end").addEventListener("change", loadReportsFromFirebase);
document.getElementById("reset-filters").addEventListener("click", () => {
  document.getElementById("filter-type").value = "All";
  document.getElementById("filter-start").value = "";
  document.getElementById("filter-end").value = "";
  loadReportsFromFirebase();
});
