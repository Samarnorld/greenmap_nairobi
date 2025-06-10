// js/firebase.js
// This the firebase configuration and my keys
const firebaseConfig = {
  apiKey: "AIzaSyCJLQxOTyG_rFXz9hdDkrAjGgzFbKr6nFM",
  authDomain: "greenmap-9da10.firebaseapp.com",
  projectId: "greenmap-9da10",
  storageBucket: "greenmap-9da10.appspot.com",
  messagingSenderId: "623355404185",
  appId: "1:623355404185:web:6d157e920a12fe38ecfd08"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("report-form");
  if (!form) return; 
  const submitBtn = form.querySelector('button[type="submit"]');
  const spinner = document.getElementById("spinner");
  const status = document.getElementById("form-status");
  function showStatus(message, isError = false) {
    status.textContent = message;
    status.classList.remove("hidden", "text-green-700", "text-red-600");
    status.classList.add(isError ? "text-red-600" : "text-green-700");
  }
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = form.querySelector('input[placeholder*="Tree Cutting"]').value.trim();
    const description = form.querySelector("textarea").value.trim();
    const locationStr = form.querySelector('input[placeholder*="Ward"]').value.trim();
    const type = form.querySelector("#reportType")?.value || "Other";
    const file = form.querySelector('input[type="file"]').files[0];
    const timestamp = firebase.firestore.Timestamp.fromDate(new Date());
    if (!title || !description || !locationStr) {
      showStatus("⚠️ Please fill out all required fields.", true);
      return;
    }
    submitBtn.disabled = true;
    if (spinner) spinner.classList.remove("hidden");
    let imageUrl = "";
    try {
      if (file) {
        const storageRef = storage.ref(`reports/${Date.now()}_${file.name}`);
        const snapshot = await storageRef.put(file);
        imageUrl = await snapshot.ref.getDownloadURL();
      }
      const location = {
        lat: -1.286389,
        lng: 36.817223
      };
      await db.collection("reports").add({
        title,
        description,
        location,
        type,
        imageUrl,
        timestamp
      });
      showStatus("Report submitted successfully!");
      form.reset();
    } catch (error) {
      console.error("Error submitting report:", error);
      showStatus("Failed to submit report. Please try again.", true);
    } finally {
      submitBtn.disabled = false;
      if (spinner) spinner.classList.add("hidden");
    }
  });
});
window.db = db;
window.storage = storage;
