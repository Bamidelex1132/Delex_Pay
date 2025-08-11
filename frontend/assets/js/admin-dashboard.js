document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "/login.html";
    return;
  }

  const adminNameEl = document.getElementById("adminName");
  const profilePic = document.getElementById("adminProfilePic");

  // Fetch admin data
  fetch("http://localhost:5000/api/admin/data", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  })
    .then(res => {
      if (!res.ok) throw new Error("Unauthorized or server error");
      return res.json();
    })
    .then(data => {
      const { admin } = data;

      // Welcome message
      adminNameEl.textContent = `Welcome, ${admin.firstName}`;

      // Profile image
      if (admin.profileImage) {
        profilePic.src = `http://localhost:5000/uploads/${admin.profileImage}`;
      } else {
        profilePic.src = "/assets/img/default-profile.png";
      }

    })
    .catch(err => {
      console.error(err);
      alert("Session expired. Please log in again.");
      localStorage.removeItem("token");
      window.location.href = "/login.html";
    });

  // Redirect on profile picture click
  profilePic.addEventListener("click", () => {
    window.location.href = "/dashboard/admin/profile.html";
  });
});
