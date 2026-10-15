# omniCharge prototype

This repository contains an Android-first customer wallet, a separate POS
simulator, and a shared backend. The current end-to-end QR payment flow uses
simulated balances only; it does not connect to banks or process card payments.

See the app-specific setup guides:

- [Customer Wallet](./omniChargeMobile/README.md)
- [POS Simulator](./omniChargePOS/README.md)

Run the backend tests from `backend` with `npm test`.