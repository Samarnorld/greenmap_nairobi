// firebase.js

const firebaseConfig = {
  apiKey: "AIzaSyCMLft42d3eSj2RMAiqP9D0Q7ng9VFJBSQ",
  authDomain: "greenmap-2.firebaseapp.com",
  projectId: "greenmap-2",
  storageBucket: "greenmap-2.appspot.com",
  messagingSenderId: "1058885185947",
  appId: "1:1058885185947:web:dc3fe6079510b8ac09313e"
};

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

    // Disable button & show spinner
    submitBtn.disabled = true;
    if (spinner) spinner.classList.remove("hidden");

    // Get field values
    const reportType = document.getElementById("reportType")?.value;
    const severity = form.querySelector('input[name="severity"]:checked')?.value || "Unknown";
    const description = document.getElementById("description")?.value.trim() || "";
    const location = document.getElementById("location-input")?.value.trim() || "";
    const lat = document.getElementById("latitude")?.value || "";
    const lng = document.getElementById("longitude")?.value || "";
    const email = document.getElementById("email")?.value.trim() || "";
    const phone = document.getElementById("phone")?.value.trim() || "";
    const contactConsent = form.querySelector('input[name="contactConsent"]:checked')?.value || "no";

    const imageFile = form.querySelectorAll('input[type="file"]')[0]?.files[0] || null;

    let imageUrl = "";

    try {
      // Upload image if any
      if (imageFile) {
        const imgRef = storage.ref().child(`reports/${Date.now()}_${imageFile.name}`);
        const snapshot = await imgRef.put(imageFile);
        imageUrl = await snapshot.ref.getDownloadURL();
      }

      // Create report object
      const report = {
        reportType,
        severity,
        description,
        location,
        latitude: lat,
        longitude: lng,
        imageUrl,
        email,
        phone,
        contactConsent,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      };

      await db.collection("reports").add(report);

      form.reset();
      document.getElementById("contact-info").classList.add("hidden");

      showStatus("✅ Report submitted successfully!");
    } catch (error) {
      console.error("Error submitting report:", error);
      showStatus("❌ Failed to submit report. Please try again.", true);
    } finally {
      submitBtn.disabled = false;
      if (spinner) spinner.classList.add("hidden");
    }
  });
});

// Make available globally
window.db = db;
window.storage = storage;
