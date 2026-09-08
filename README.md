# omniCharge

An automated payment routing engine that dynamically partitions Point of Sale (POS) transaction charges across multiple linked payment cards based on available real-time balances.

---

## Overview

omniCharge addresses transaction declines caused by insufficient single-card balances. By operating as a smart middleware layer between a payment gateway and a digital wallet, omniCharge sequentially splits a single transaction across pre-selected payment instruments until the total charge is completely satisfied.

---

## Technical Features

* **Dynamic Balance Partitioning:** Automatically calculates and executes precise sequential deductions across active wallet cards.
* **POS Simulation Frontend:** Provides a web interface for initiating transactions, triggering API calls, and rendering live card updates.
* **Edge Case & Failure Handling:** Rejects transactions with descriptive error messaging when aggregate wallet funds fall below the requested total.
* **Decoupled API Architecture:** Built with clean JSON endpoints to allow integration into existing payment terminal workflows.

---

## System Architecture

[ Frontend POS Interface ]
│
▼ (HTTP POST /partition)
┌─────────────────────────────────┐
│     Express Middleware Engine   │
├─────────────────────────────────┤
│ 1. Receives total charge       │
│ 2. Queries card ledger           │
│ 3. Deducts available balances    │
│ 4. Computes balance dynamic     │
└─────────────────────────────────┘
│
▼ (JSON Response)
[ Updated Card Ledger & Receipt ]


---

## Tech Stack

* **Backend:** Node.js, Express.js
* **Frontend:** JavaScript (ES6+ Fetch API), HTML5, CSS3
* **Protocol:** RESTful JSON HTTP APIs

---

## API Documentation

### `POST /partition`

Processes a transaction by partitioning the requested amount across available cards in order of priority.

#### Request Header
`Content-Type: application/json`

#### Request Body
```json
{
  "totalAmount": 125.50
}
Response: Approved (200 OK)
JSON
{
  "status": "APPROVED",
  "totalCharged": "R125.50",
  "breakdown": [
    {
      "card": "Primary Card",
      "amountDrawn": "R50.00",
      "remainingBalance": "R0.00"
    },
    {
      "card": "Savings Card",
      "amountDrawn": "R75.50",
      "remainingBalance": "R24.50"
    }
  ]
}
Response: Declined (400 Bad Request)
JSON
{
  "status": "DECLINED",
  "reason": "Insufficient total funds across all cards",
  "amountUnpaid": "R50.00"
}
Getting Started
Prerequisites
Node.js (v16.0.0 or higher)

npm (v8.0.0 or higher)

Local Environment Setup
Clone the repository:

Bash
git clone [https://github.com/SasolOnIce/omniCharge.git](https://github.com/SasolOnIce/omniCharge.git)
cd omniCharge
Start the backend server:

Bash
cd backend
npm install
node server.js
The backend service will initialize on http://localhost:3000.

Start the frontend application:
In a separate terminal window:

Bash
cd frontend
npx serve . -l 8080
Navigate to http://localhost:8080 to access the POS terminal simulator interface.
