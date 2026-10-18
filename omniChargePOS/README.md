# omniCharge POS Simulator

This separate Android prototype simulates a merchant Speedpoint/POS. It creates
a short-lived sale request on the shared backend, displays a QR code containing
an opaque omniCharge Wallet request ID, and polls until the customer approves,
declines, or the request expires.

This is not a real terminal and does not collect card data or move money.
The QR request is currently POS-initiated; QR-based peer-to-peer requests are
not implemented yet.

## Run

1. From the repository root, start the shared backend:

   ```bash
   cd backend
   cp .env.example .env
   npm install
   npm start
   ```

   Make forwarded backend port 3000 accessible to both phones.
2. In a second terminal from the repository root, configure and start the POS app:

   ```bash
   cd omniChargePOS
   cp .env.example .env.local
   ```

   Set `EXPO_PUBLIC_API_URL` in `.env.local` to the backend's reachable HTTPS URL,
   then install and start:

   ```bash
   npm install
   npx expo start --go --tunnel --port 8082
   ```

3. Install Expo Go on both phones and scan each app's Metro QR code. Keep both
   Expo servers and the backend running. Create a sale in POS, then scan its
   payment QR in Wallet to review and approve the simulated split.

The demo starts with balances of R50, R300, and R200. For a R60 request, the
wallet previews a R50 allocation from Demo Card 1 and R10 from Demo Card 2. The
backend only changes balances after the customer explicitly approves.

Payment requests are delivered through QR codes only.

## Optional standalone Android APK

From this directory, run:

```bash
npx eas-cli build --platform android --profile development
```

Use the `preview` profile for a standalone APK. The QR-only demo can also be
tested in Expo Go without a custom native development build.

For local native builds, run `npx expo prebuild --platform android` and
`npx expo run:android` from this directory with Android Studio/SDK installed.

Configure real account/balance and payment integrations only after confirming
that a provider supports the required multi-card authorization and coordinated
capture/reversal flow. A standard single-card checkout is not a substitute.
