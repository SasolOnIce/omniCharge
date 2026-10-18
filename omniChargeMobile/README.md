# omniCharge Wallet

The customer-side Android prototype receives a payment request from the
separately installed omniCharge POS Simulator app by scanning its QR code. It
previews how one amount would be allocated across simulated card balances; when
approved, the backend settles the simulated split atomically.

**Simulation only:** these are shared in-memory demo balances. The apps do not
connect to banks, read actual card balances, or initiate real card payments.
The QR flow is currently initiated by the POS app; peer-to-peer payment
requests are a future feature, not part of this prototype.

## Run with the POS Simulator

1. In a terminal from the repository root, start the shared backend:

   ```bash
   cd backend
   cp .env.example .env
   npm install
   npm start
   ```

   For testing from phones, forward backend port 3000 and make it accessible
   to both phones.
2. In a second terminal from the repository root, configure and start the wallet:

   ```bash
   cd omniChargeMobile
   cp .env.example .env.local
   ```

   Set `EXPO_PUBLIC_API_URL` in `.env.local` to the reachable HTTPS URL for the
   backend, then run:

   ```bash
   npm install
   npx expo start --go --tunnel --port 8081
   ```

3. In a third terminal from the repository root, configure and start the POS app:

   ```bash
   cd omniChargePOS
   cp .env.example .env.local
   ```

   Set the same `EXPO_PUBLIC_API_URL` in `.env.local`, then run:

   ```bash
   npm install
   npx expo start --go --tunnel --port 8082
   ```

4. Install Expo Go on both phones and scan each app's Metro QR code. Keep both
   Expo servers and the backend running. Create a sale in POS, then scan the
   payment QR in Wallet and approve the simulated split.

The current demo uses QR codes for app loading and payment requests.

For reference, the wallet configuration contains
`EXPO_PUBLIC_API_URL=https://YOUR-CODESPACE-NAME-3000.app.github.dev`. Use a
URL that the phones can reach; `localhost` on a phone refers to that phone,
not the development computer. Keep local `.env` files private and never place
provider secrets in `EXPO_PUBLIC_` variables.

The backend demo account starts with R50, R300, and R200. For a R60 sale, the
wallet previews R50 from Demo Card 1 and R10 from Demo Card 2. Use **Reset demo
balances** in the wallet to start the example over.

## Optional standalone Android APK

Create a standalone Android APK from this directory:

```bash
npx eas-cli build --platform android --profile development
```

Use the `preview` profile for a standalone APK. The QR-only demo can also be
tested in Expo Go without a custom native development build.

For local native builds, run `npx expo prebuild --platform android` and
`npx expo run:android` from each app directory with Android Studio/SDK installed.

## Future integrations

The current API preview is a simulator, not an actual bank balance check.
Balance access and card payment authorization are separate capabilities. No
publicly documented South African sandbox with bank-issued test accounts and
available-balance data has been confirmed for this prototype. Even where
balance information is available, it can be stale and does not guarantee that a
later card authorization will succeed.

The demo performs an all-or-nothing in-memory balance update to illustrate the
desired UX. A real multi-card payment requires a payment provider/acquirer that
supports separate authorizations for each allocation and a coordinated
authorize-then-capture or reversal flow. Card charges are not inherently
atomic, and balance checks alone cannot guarantee against partial real charges.

- [Standard Bank API Developer Portal](https://developer.standardbank.co.za/)
- [Absa Access Developer Portal](https://developer.absa.africa/)
- [Stitch Pay By Bank](https://docs.stitch.money/payment-products/payins/paybybank/introduction)
- [Yoco Checkout API testing](https://yoco.docs.buildwithfern.com/docs/checkout-api/testing)

Stitch Pay By Bank documents payment initiation, not balance lookup. Yoco
Checkout API creates a single hosted checkout and is not used as a multi-card
split-payment provider in this prototype.
