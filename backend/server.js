const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Mock cards with initial balances in ZAR (Rands)
let mockCards = [
  { id: 1, name: 'Primary Card', balance: 50.00 },
  { id: 2, name: 'Savings Card', balance: 100.00 },
  { id: 3, name: 'Backup Card', balance: 200.00 }
];

app.post('/partition', (req, res) => {
  const { totalAmount } = req.body;
  let remainingCharge = totalAmount;
  const breakdown = [];

  for (let card of mockCards) {
    if (remainingCharge <= 0) break;
    if (card.balance > 0) {
      const deduction = Math.min(card.balance, remainingCharge);
      card.balance -= deduction;
      remainingCharge -= deduction;
      breakdown.push({
        card: card.name,
        amountDrawn: `R${deduction.toFixed(2)}`,
        remainingBalance: `R${card.balance.toFixed(2)}`
      });
    }
  }

  if (remainingCharge > 0) {
    return res.status(400).json({
      status: 'DECLINED',
      reason: 'Insufficient total funds across all cards',
      amountUnpaid: `R${remainingCharge.toFixed(2)}`
    });
  }

  res.json({
    status: 'APPROVED',
    totalCharged: `R${totalAmount.toFixed(2)}`,
    breakdown
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});