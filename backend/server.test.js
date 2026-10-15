const assert = require('node:assert/strict');
const { once } = require('node:events');
const { after, before, test } = require('node:test');
const { createApp } = require('./server');

let server;
let baseUrl;

before(async () => {
  server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.close();
  await once(server, 'close');
});

async function createRequest(amountCents) {
  const response = await fetch(`${baseUrl}/api/pos/requests`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amountCents }),
  });
  return { response, body: await response.json() };
}

test('creates an expiring POS request with an opaque QR payload', async () => {
  const { response, body } = await createRequest(6000);

  assert.equal(response.status, 201);
  assert.match(body.qrPayload, /^omnichargemobile:\/\/pay\/[a-f0-9-]{36}$/);
  assert.equal(body.status, 'pending');
  assert.ok(body.expiresAt > Date.now());
});

test('previews a 50/10 split and settles it once across the demo cards', async () => {
  const { body: request } = await createRequest(6000);
  const previewResponse = await fetch(`${baseUrl}/api/wallet/requests/${request.id}`);
  const preview = await previewResponse.json();

  assert.equal(preview.canPay, true);
  assert.deepEqual(
    preview.allocation.map(({ cardId, amountCents }) => ({ cardId, amountCents })),
    [
      { cardId: 'card-1', amountCents: 5000 },
      { cardId: 'card-2', amountCents: 1000 },
    ],
  );

  const payResponse = await fetch(`${baseUrl}/api/wallet/requests/${request.id}/pay`, { method: 'POST' });
  const payment = await payResponse.json();
  assert.equal(payment.status, 'paid');
  assert.equal(payment.simulated, true);

  const repeatedPayResponse = await fetch(`${baseUrl}/api/wallet/requests/${request.id}/pay`, {
    method: 'POST',
  });
  const repeatedPayment = await repeatedPayResponse.json();
  assert.equal(repeatedPayment.idempotent, true);

  const cardsResponse = await fetch(`${baseUrl}/api/wallet/cards`);
  const cards = await cardsResponse.json();
  assert.deepEqual(
    cards.cards.map(({ balanceCents }) => balanceCents),
    [0, 29000, 20000],
  );
});

test('declines insufficient funds without changing any card balance', async () => {
  const { body: request } = await createRequest(6000000);
  const beforeResponse = await fetch(`${baseUrl}/api/wallet/cards`);
  const before = await beforeResponse.json();

  const payResponse = await fetch(`${baseUrl}/api/wallet/requests/${request.id}/pay`, {
    method: 'POST',
  });
  assert.equal(payResponse.status, 409);
  assert.equal((await payResponse.json()).status, 'declined');

  const afterResponse = await fetch(`${baseUrl}/api/wallet/cards`);
  const after = await afterResponse.json();
  assert.deepEqual(after.cards, before.cards);

  const posResponse = await fetch(`${baseUrl}/api/pos/requests/${request.id}`);
  assert.equal((await posResponse.json()).status, 'declined');
});

test('rejects malformed payment requests', async () => {
  for (const amountCents of [0, -1, 100.5, '6000', 100000001]) {
    const response = await fetch(`${baseUrl}/api/pos/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountCents }),
    });
    assert.equal(response.status, 400);
  }
});
