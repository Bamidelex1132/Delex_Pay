// ======= INITIAL SETUP =======
const token = localStorage.getItem("token");
const apiBase = "http://localhost:5000";


// ======= ON DOM LOAD =======
document.addEventListener("DOMContentLoaded", () => {
  const isVerified = localStorage.getItem("isVerified");

  if (isVerified !== "true") {
    window.location.href = "./verify.html";
    return;
  }

  loadDashboard();
  loadCoinPrices();
  loadTransactions();

  const profileUpdated = sessionStorage.getItem("profileUpdated");
  if (profileUpdated === "true") {
    showToast("Profile updated successfully!", "success");
    sessionStorage.removeItem("profileUpdated");
  }

  // Set user name from localStorage (fallback)
  const userFromStorage = JSON.parse(localStorage.getItem("user") || "{}");
  if (userFromStorage.firstName) {
    document.getElementById("firstName").textContent = userFromStorage.firstName;
  }
});


// ======= DASHBOARD =======
async function loadDashboard() {
  try {
    const res = await fetch("http://localhost:5000/api/user/dashboard", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to load dashboard");

    // ✅ Set user info
    document.getElementById("firstName").textContent = data.firstName || "User";
    document.getElementById('userBalance').textContent = `₦${(data.balance || 0.00).toLocaleString()}`;
    document.getElementById('frozenBalance').textContent = `₦${(data.frozenBalance || 0.00).toLocaleString()}`;
    document.getElementById("referral-Code").textContent = data.referralCode || "N/A";

    // ✅ Set profile image
    const profileImg = document.getElementById("profileImage");
    if (profileImg) {
      if (data.user?.profileImage) {
        profileImg.src = `${apiBase}/uploads/${data.user.profileImage}`;
      } else {
        profileImg.src = "./assets/images/logo.1.jpg"; 
      }
    }

  } catch (err) {
    console.error("Dashboard load error:", err.message);
    showToast("Failed to load dashboard.", "danger");
  }
}

async function loadCoinPrices() {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether&vs_currencies=usd,ngn"
    );
    const data = await res.json();

    document.getElementById("btcPriceUSD").textContent = `$${data.bitcoin.usd}`;
    document.getElementById("btcPriceNGN").textContent = `₦${data.bitcoin.ngn.toLocaleString()}`;

    document.getElementById("ethPriceUSD").textContent = `$${data.ethereum.usd}`;
    document.getElementById("ethPriceNGN").textContent = `₦${data.ethereum.ngn.toLocaleString()}`;

    document.getElementById("usdtPriceUSD").textContent = `$${data.tether.usd}`;
    document.getElementById("usdtPriceNGN").textContent = `₦${data.tether.ngn.toLocaleString()}`;
  } catch (err) {
    console.error("Failed to fetch coin prices:", err);
  }
}
setInterval(loadCoinPrices, 60000);

let currentPage = 1;
const rowsPerPage = 5;
let transactionsData = [];

async function loadTransactions() {
  try {
    const res = await fetch("http://localhost:5000/api/user/dashboard", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to load transactions");

    transactionsData = data.transactions;
    currentPage = 1;
    renderTablePage();
    updatePaginationButtons();
    attachRowClickEvents();
  } catch (error) {
    console.error("Error loading transactions:", error);
    alert("Error loading transactions");
  }
}

function renderTablePage() {
  const tbody = document.getElementById("transactionTableBody");
  tbody.innerHTML = "";

  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const pageTransactions = transactionsData.slice(start, end);

  pageTransactions.forEach((tx) => {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${new Date(tx.createdAt).toLocaleString()}</td>
    <td>${tx.type.charAt(0).toUpperCase() + tx.type.slice(1)}</td>
    <td>${tx.currency} ${tx.amount.toFixed(2)}</td>
    <td>${tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}</td>
    <td>
      <a href="./receipt.html?id=${tx._id}" class="btn btn-primary btn-sm" target="_blank">View Receipt</a>
    </td>
  `;
  tbody.appendChild(tr);

});
  document.getElementById("pageInfo").textContent = `Page ${currentPage} of ${Math.ceil(
    transactionsData.length / rowsPerPage
  )}`;
}

function updatePaginationButtons() {
  const totalPages = Math.ceil(transactionsData.length / rowsPerPage);
  document.getElementById("prevPageBtn").disabled = currentPage <= 1;
  document.getElementById("nextPageBtn").disabled = currentPage >= totalPages;
}

document.getElementById("prevPageBtn").addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    renderTablePage();
    updatePaginationButtons();
    attachRowClickEvents();
  }
});

document.getElementById("nextPageBtn").addEventListener("click", () => {
  const totalPages = Math.ceil(transactionsData.length / rowsPerPage);
  if (currentPage < totalPages) {
    currentPage++;
    renderTablePage();
    updatePaginationButtons();
    attachRowClickEvents();
  }
});

// ======= ROW CLICK TO OPEN RECEIPT MODAL =======
const receiptModal = document.getElementById("receiptModal");
const receiptBody = document.getElementById("receiptBody");
const closeReceiptBtn = document.getElementById("closeReceiptBtn");

function attachRowClickEvents() {
  document.querySelectorAll("#transactionTableBody tr").forEach((row, index) => {
    row.addEventListener("click", () => {
      const tx = transactionsData[(currentPage - 1) * rowsPerPage + index];
      openTransactionModal(tx);
    });
  });
}

function openTransactionModal(tx) {
  const modal = document.getElementById("transactionModal");
  const modalBody = document.getElementById("modalBody");

  modalBody.innerHTML = `
    <p><strong>Date:</strong> ${new Date(tx.createdAt).toLocaleString()}</p>
    <p><strong>Reference:</strong> ${tx.reference || "N/A"}</p>
    <p><strong>Type:</strong> ${tx.type}</p>
    <p><strong>Amount:</strong> ${tx.currency} ${tx.amount.toFixed(2)}</p>
    <p><strong>Payment Method:</strong> ${tx.paymentMethod || "N/A"}</p>
    <p><strong>Status:</strong> ${tx.status}</p>
    <p><strong>Description:</strong> ${tx.description || "No description"}</p>
    ${tx.receiptUrl ? `<p><a href="${tx.receiptUrl}" target="_blank" class="btn">Download Receipt</a></p>` : ""}
  `;

  modal.style.display = "flex";
}

closeReceiptBtn.addEventListener("click", () => {
  receiptModal.style.display = "none";
});

window.addEventListener("click", (e) => {
  if (e.target === receiptModal || e.target.id === "transactionModal") {
    receiptModal.style.display = "none";
    document.getElementById("transactionModal").style.display = "none";
  }
});

// ======= CHARTS =======
const drawChart = (canvasId, data, color) => {
  new Chart(document.getElementById(canvasId), {
    type: "line",
    data: {
      labels: Array(data.length).fill(""),
      datasets: [
        {
          data: data,
          borderColor: color,
          backgroundColor: "transparent",
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { display: false },
        y: { display: false },
      },
      interaction: {
        intersect: false,
        mode: "index",
      },
    },
  });
};

drawChart("btcChart", [42000, 42500, 43000, 42800, 43500, 43000], "#f7931a");
drawChart("ethChart", [3100, 3200, 3150, 3250, 3300, 3200], "#3b82f6");
drawChart("usdtChart", [1.0, 1.01, 0.99, 1.0, 1.0, 1.0], "#22c55e");

// ======= TOAST HELPER =======
function showToast(message, type = "info") {
  const toastContainer = document.getElementById("toastContainer");
  if (!toastContainer) return;

  const toast = document.createElement("div");
  toast.className = `toast align-items-center text-white bg-${type} border-0 fade show`;
  toast.setAttribute("role", "alert");
  toast.setAttribute("aria-live", "assertive");
  toast.setAttribute("aria-atomic", "true");

  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;

  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove("show");
    toast.classList.add("hide");
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}

// ======= LOGOUT =======
document.getElementById("logoutBtn").addEventListener("click", async () => {
  if (!token) return (window.location.href = "/login.html");

  try {
    const res = await fetch("http://localhost:5000/api/auth/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "login.html";
    } else {
      const data = await res.json();
      alert("Logout failed: " + data.message);
    }
  } catch (err) {
    console.error(err);
    alert("Something went wrong during logout.");
  }
});
