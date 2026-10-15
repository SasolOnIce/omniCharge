require('dotenv').config();

const crypto = require('node:crypto');
const cors = require('cors');
const express = require('express');

function createApp() {
  const app = express();
  const requests = new Map();
  const demoCards = [
    { id: 'card-1', label: 'Demo Card 1', balanceCents: 5000 },
    { id: 'card-2', label: 'Demo Card 2', balanceCents: 30000 },
    { id: 'card-3', label: 'Demo Card 3', balanceCents: 20000 },
  ];

  app.use(cors());
  app.use(express.json({ limit: '32kb' }));

  function getOpenRequest(id) {
    const paymentRequest = requests.get(id);
    if (!paymentRequest) return null;
    if (paymentRequest.status === 'pending' && paymentRequest.expiresAt <= Date.now()) {
      paymentRequest.status = 'expired';
    }
    return paymentRequest;
  }

  function getAllocation(amountCents) {
    let remainingCents = amountCents;
    const allocation = [];
    for (const card of demoCards) {
      if (remainingCents === 0) break;
      const amountFromCard = Math.min(card.balanceCents, remainingCents);
      if (amountFromCard > 0) {
        allocation.push({
          cardId: card.id,
          cardLabel: card.label,
          amountCents: amountFromCard,
          remainingBalanceCents: card.balanceCents - amountFromCard,
        });
        remainingCents -= amountFromCard;
      }
    }
    return { allocation, remainingCents };
  }

  app.get('/api/wallet/cards', (_req, res) => {
    res.json({
      simulated: true,
      cards: demoCards.map(({ id, label, balanceCents }) => ({ id, label, balanceCents })),
    });
  });

  app.post('/api/wallet/reset', (_req, res) => {
    demoCards[0].balanceCents = 5000;
    demoCards[1].balanceCents = 30000;
    demoCards[2].balanceCents = 20000;
    res.json({
      simulated: true,
      cards: demoCards.map(({ id, label, balanceCents }) => ({ id, label, balanceCents })),
    });
  });

  app.post('/api/pos/requests', (req, res) => {
    const { amountCents } = req.body ?? {};
    if (!Number.isSafeInteger(amountCents) || amountCents < 1 || amountCents > 100000000) {
      return res.status(400).json({ error: 'amountCents must be a positive integer no greater than R1,000,000' });
    }

    const id = crypto.randomUUID();
    const paymentRequest = {
      id,
      amountCents,
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000,
      allocation: null,
    };
    requests.set(id, paymentRequest);
    res.status(201).json({
      id,
      amountCents,
      status: paymentRequest.status,
      expiresAt: paymentRequest.expiresAt,
      qrPayload: `omnichargemobile://pay/${id}`,
    });
  });

  app.get('/api/pos/requests/:id', (req, res) => {
    const paymentRequest = getOpenRequest(req.params.id);
    if (!paymentRequest) return res.status(404).json({ error: 'Payment request not found' });
    res.json({
      id: paymentRequest.id,
      amountCents: paymentRequest.amountCents,
      status: paymentRequest.status,
      expiresAt: paymentRequest.expiresAt,
      allocation: paymentRequest.allocation,
    });
  });

  app.get('/api/wallet/requests/:id', (req, res) => {
    const paymentRequest = getOpenRequest(req.params.id);
    if (!paymentRequest) return res.status(404).json({ error: 'Payment request not found' });
    const { allocation, remainingCents } = getAllocation(paymentRequest.amountCents);
    res.json({
      id: paymentRequest.id,
      amountCents: paymentRequest.amountCents,
      status: paymentRequest.status,
      expiresAt: paymentRequest.expiresAt,
      canPay: paymentRequest.status === 'pending' && remainingCents === 0,
      remainingCents,
      allocation: paymentRequest.status === 'paid' ? paymentRequest.allocation : allocation,
    });
  });

  app.post('/api/wallet/requests/:id/pay', (req, res) => {
    const paymentRequest = getOpenRequest(req.params.id);
    if (!paymentRequest) return res.status(404).json({ error: 'Payment request not found' });
    if (paymentRequest.status === 'paid') {
      return res.json({ ...paymentRequest, simulated: true, idempotent: true });
    }
    if (paymentRequest.status !== 'pending') {
      return res.status(409).json({ error: `Payment request is ${paymentRequest.status}` });
    }

    const { allocation, remainingCents } = getAllocation(paymentRequest.amountCents);
    if (remainingCents > 0) {
      paymentRequest.status = 'declined';
      paymentRequest.remainingCents = remainingCents;
      return res.status(409).json({
        error: 'Insufficient simulated funds across the demo cards',
        remainingCents,
        status: 'declined',
      });
    }

    for (const item of allocation) {
      const card = demoCards.find(({ id }) => id === item.cardId);
      card.balanceCents = item.remainingBalanceCents;
    }
    paymentRequest.status = 'paid';
    paymentRequest.allocation = allocation;
    paymentRequest.paidAt = Date.now();

    res.json({ ...paymentRequest, simulated: true });
  });

  return app;
}

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  createApp().listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = { createApp };
