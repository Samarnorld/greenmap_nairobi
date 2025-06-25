// ✅ Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCMLft42d3eSj2RMAiqP9D0Q7ng9VFJBSQ",
  authDomain: "greenmap-2.firebaseapp.com",
  projectId: "greenmap-2",
  storageBucket: "greenmap-2.appspot.com",
  messagingSenderId: "1058885185947",
  appId: "1:1058885185947:web:dc3fe6079510b8ac09313e"
};

// ✅ Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = firebase.storage();

window.db = db;
window.storage = storage;

// ✅ Form logic runs only when the report form exists
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("report-form");
  if (!form) return; // 🛑 Exit if form doesn't exist

  const submitBtn = form.querySelector('button[type="submit"]');
  const spinner = document.getElementById("spinner");
  const status = document.getElementById("form-status");

  const showStatus = (message, isError = false) => {
    status.textContent = message;
    status.classList.remove("hidden", "text-green-700", "text-red-600");
    status.classList.add(isError ? "text-red-600" : "text-green-700");
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Collect fields
    const type = form.querySelector("#reportType")?.value || "Other";
    const description = form.querySelector("#description")?.value.trim() || "";
    const severity = form.querySelector('input[name="severity"]:checked')?.value || "";
    const location = form.querySelector("#location-input")?.value.trim() || "";
    const lat = form.querySelector("#latitude")?.value || null;
    const lng = form.querySelector("#longitude")?.value || null;
    const imageFile = form.querySelector('input[type="file"]:not([accept])')?.files[0] || null;
    const videoFile = form.querySelector('input[type="file"][accept*="video"]')?.files[0] || null;
    const videoLink = form.querySelector('input[type="url"]')?.value.trim();

    const timestamp = firebase.firestore.Timestamp.fromDate(new Date());

    if (!type || !location) {
      showStatus("⚠️ Please fill in required fields.", true);
      return;
    }

    submitBtn.disabled = true;
    spinner?.classList.remove("hidden");

    try {
      let imageUrl = "";
      let videoUrl = "";

      // ✅ Upload image if provided
      if (imageFile) {
        const imgRef = storage.ref(`reports/images/${Date.now()}_${imageFile.name}`);
        const imgSnap = await imgRef.put(imageFile);
        imageUrl = await imgSnap.ref.getDownloadURL();
      }

      // ✅ Upload video file if provided
      if (videoFile) {
        const vidRef = storage.ref(`reports/videos/${Date.now()}_${videoFile.name}`);
        const vidSnap = await vidRef.put(videoFile);
        videoUrl = await vidSnap.ref.getDownloadURL();
      } else if (videoLink) {
        videoUrl = videoLink;
      }

      const reportData = {
        type,
        description,
        severity,
        location,
        locationCoords: lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null,
        imageUrl,
        videoUrl,
        timestamp
      };

      await db.collection("reports").add(reportData);

      showStatus("✅ Report submitted successfully!");
      form.reset();
    } catch (err) {
      console.error("Submit error:", err);
      showStatus("❌ Failed to submit report. Please try again.", true);
    } finally {
      submitBtn.disabled = false;
      spinner?.classList.add("hidden");
    }
  });
});
