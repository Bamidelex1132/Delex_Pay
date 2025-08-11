document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registerForm");
  const loader = document.getElementById("loader");
  const errorDiv = document.getElementById("registerError");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Get values
    const firstName = document.getElementById("firstName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();
    const thirdName = document.getElementById("thirdName").value.trim();
    const countryCode = document.getElementById("countryCode").value;
    const phone = document.getElementById("phone").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const refferedBy = document.getElementById("refferedBy").value.trim();
    const terms = document.getElementById("terms").checked;

    // Clear previous error
    errorDiv.textContent = "";

    // ✅ Check terms agreement
    if (!terms) {
      alert("You must agree to the terms and conditions.");
      return;
    }

    // ✅ Show loader
    loader.style.display = "block";

    try {
      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          thirdName,
          countryCode,
          phone,
          email,
          password,
          confirmPassword,
          refferedBy,
        }),
      });

      const data = await response.json();

      // ✅ Always hide loader
      loader.style.display = "none";

      if (!response.ok) {
        alert(data.message || "Registration failed.");
        return;
      }

      // ✅ Save email to localStorage to use in verify-code.html
      localStorage.setItem("pendingEmail", email);
      localStorage.setItem("isVerified", "false");

      alert("🎉 Registration successful! Please verify your email.");
      window.location.href = "/frontend/verify-code.html";

    } catch (err) {
      loader.style.display = "none";
      console.error("Error:", err);
      alert("❌ Server error. Please try again later.");
    }
  });
});
