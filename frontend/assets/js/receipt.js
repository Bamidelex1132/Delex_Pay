document.addEventListener("DOMContentLoaded", async () => {
  const token = localStorage.getItem("token");
  const receiptDiv = document.getElementById("receiptCard");

  const urlParams = new URLSearchParams(window.location.search);
  const transactionId = urlParams.get("id");

  if (!transactionId) {
    receiptDiv.innerHTML = "<p>Transaction ID is missing.</p>";
    return;
  }

  try {
    const response = await fetch(`http://localhost:5000/api/transactions/${transactionId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      receiptDiv.innerHTML = "<p>Failed to load transaction.</p>";
      return;
    }

    const data = await response.json();
    const tx = data.transaction;

    // Render receipt details dynamically
    receiptDiv.innerHTML = `
      <h2>Transaction Receipt</h2>
      <div class="receipt-row">
        <span class="label">Transaction ID:</span>
        <span class="value">${tx._id}</span>
      </div>
      <div class="receipt-row">
        <span class="label">Type:</span>
        <span class="value">${tx.type}</span>
      </div>
      <div class="receipt-row">
        <span class="label">Amount:</span>
        <span class="value">₦${parseFloat(tx.amount).toFixed(2)}</span>
      </div>
      <div class="receipt-row">
        <span class="label">Status:</span>
        <span class="value">${tx.status}</span>
      </div>
      <div class="receipt-row">
        <span class="label">Date:</span>
        <span class="value">${new Date(tx.createdAt).toLocaleString()}</span>
      </div>
      ${tx.proofUrl ? `
        <div class="receipt-row">
          <span class="label">Payment Proof:</span>
          <span class="value"><img src="${tx.proofUrl}" alt="Payment Proof" style="max-width: 200px;"/></span>
        </div>` : ''}
    `;

    // Add PDF download button listener AFTER receipt is rendered
    document.getElementById('downloadBtn').addEventListener('click', () => {
      try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        let y = 20;
        doc.setFontSize(18);
        doc.setTextColor("#3b82f6");
        doc.text("Transaction Receipt", 105, y, { align: "center" });

        y += 15;
        doc.setFontSize(12);
        doc.setTextColor("#000000");

        const receiptDiv = document.getElementById('receiptCard'); 

        const rows = receiptDiv.querySelectorAll('.receipt-row');
        rows.forEach(row => {
          const label = row.querySelector('.label')?.innerText || "";
          const value = row.querySelector('.value')?.innerText || "";

          // Skip image value (proofUrl) since jsPDF text() cannot handle images here
          if (value.includes('<img')) return;

          doc.text(label, 20, y);
          doc.text(value, 120, y);
          y += 10;
        });

        doc.save("receipt.pdf");
      } catch (err) {
        console.error("Error generating PDF:", err);
        const receiptDiv = document.getElementById('receiptCard');
        if(receiptDiv) receiptDiv.innerHTML = "<p>Error loading receipt.</p>";
      }
    });

  } catch (error) {
    receiptDiv.innerHTML = "<p>Error loading receipt.</p>";
    console.error(error);
  }
});
