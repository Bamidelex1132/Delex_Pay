document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const loader = document.getElementById("loader");
  loader.style.display = "block";
  document.body.classList.add("loading");

  try {
    const res = await fetch("https://delex-pay.onrender.com/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    console.log("LOGIN RESPONSE:", data);

    if (!res.ok) {
      document.getElementById("loginError").textContent = data.message || "Login failed.";
      return;
    }

    localStorage.setItem("token", data.token);

    const user = data.user;

    // ✅ Set verification status
    localStorage.setItem("isVerified", user.isVerified ? "true" : "false");
    localStorage.setItem("pendingEmail", user.email); // Save for verify-code page

    // ✅ Redirect unverified users
    if (!user.isVerified) {
      return window.location.href = "verify-code.html";
    }

    // ✅ Redirect verified users based on role
    if (user.role === "admin") {
      window.location.href = "admin-dashboard.html";
    } else {
      window.location.href = "user-dashboard.html";
    }

  } catch (err) {
    console.error("Login error:", err);
    document.getElementById("loginError").textContent = "An error occurred. Please try again.";
  } finally {
    loader.style.display = "none";
    document.body.classList.remove("loading");
  }
});
