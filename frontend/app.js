document.getElementById('tap-btn').addEventListener('click', async () => {
  const amountInput = document.getElementById('amount');
  const totalAmount = parseFloat(amountInput.value);

  if (!totalAmount || totalAmount <= 0) {
    alert('Please enter a valid charge amount.');
    return;
  }

  try {
    const response = await fetch('http://localhost:3000/partition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ totalAmount })
    });

    const data = await response.json();
    displayReceipt(data);

    // If approved, update live UI balances from the API response
    if (response.ok && data.breakdown) {
      data.breakdown.forEach(item => {
        if (item.card === 'Primary Card') {
          document.getElementById('balance-1').textContent = item.remainingBalance;
        } else if (item.card === 'Savings Card') {
          document.getElementById('balance-2').textContent = item.remainingBalance;
        } else if (item.card === 'Backup Card') {
          document.getElementById('balance-3').textContent = item.remainingBalance;
        }
      });
    }
  } catch (err) {
    console.error('API Error:', err);
    alert('Failed to connect to the backend server. Ensure node server.js is running.');
  }
});

function displayReceipt(data) {
  const receiptEl = document.getElementById('receipt');
  const statusTag = document.getElementById('status-tag');
  const totalText = document.getElementById('total-text');
  const breakdownList = document.getElementById('breakdown-list');

  receiptEl.classList.remove('hidden');
  statusTag.textContent = data.status;
  statusTag.style.color = data.status === 'APPROVED' ? '#3fb950' : '#f85149';
  totalText.textContent = `Total Charge: ${data.totalCharged || 'R0.00'}`;

  breakdownList.innerHTML = '';
  if (data.breakdown) {
    data.breakdown.forEach(item => {
      const div = document.createElement('div');
      div.className = 'receipt-item';
      div.innerHTML = `<span>${item.card}</span><span>-${item.amountDrawn}</span>`;
      breakdownList.appendChild(div);
    });
  }
}