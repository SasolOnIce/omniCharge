import React, { useEffect, useState } from 'react';
import QRCode from 'react-native-qrcode-svg';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

type Allocation = {
  cardId: string;
  cardLabel: string;
  amountCents: number;
};

type PosRequest = {
  id: string;
  amountCents: number;
  status: 'pending' | 'paid' | 'declined' | 'expired';
  expiresAt: number;
  allocation: Allocation[] | null;
  qrPayload?: string;
};

function getApiBaseUrl() {
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configuredUrl) return configuredUrl.replace(/\/+$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const codespaceHost = window.location.hostname.match(/^(.*)-\d+\.app\.github\.dev$/);
    if (codespaceHost) return `${window.location.protocol}//${codespaceHost[1]}-3000.app.github.dev`;
    return `${window.location.protocol}//${window.location.hostname}:3000`;
  }
  return null;
}

function formatRand(cents: number) {
  return `R${(cents / 100).toFixed(2)}`;
}

export default function App() {
  const [amount, setAmount] = useState('');
  const [paymentRequest, setPaymentRequest] = useState<PosRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!paymentRequest || paymentRequest.status !== 'pending') return;
    const apiBaseUrl = getApiBaseUrl();
    if (!apiBaseUrl) return;

    let active = true;
    const pollStatus = async () => {
      try {
        const response = await fetch(
          `${apiBaseUrl}/api/pos/requests/${encodeURIComponent(paymentRequest.id)}`,
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? 'Could not refresh payment status.');
        if (active) setPaymentRequest(data);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Could not refresh payment status.');
      }
    };

    const timer = setInterval(pollStatus, 1500);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [paymentRequest?.id, paymentRequest?.status]);

  const createPaymentRequest = async () => {
    setError('');
    const cleanAmount = amount.trim();
    if (!/^\d+(\.\d{1,2})?$/.test(cleanAmount) || Number(cleanAmount) <= 0) {
      setError('Enter a valid sale amount with up to two decimal places.');
      return;
    }

    const apiBaseUrl = getApiBaseUrl();
    if (!apiBaseUrl) {
      setError('Set EXPO_PUBLIC_API_URL to the shared backend URL, then restart Expo.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/pos/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountCents: Math.round(Number(cleanAmount) * 100) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not create the payment request.');
      setPaymentRequest(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect to the payment server.');
    } finally {
      setLoading(false);
    }
  };

  const newSale = () => {
    setPaymentRequest(null);
    setAmount('');
    setError('');
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <StatusBar style="light" />
      <Text style={styles.title}>omniCharge POS</Text>
      <Text style={styles.notice}>
        SPEEDPOINT SIMULATOR · The customer app scans the QR and approves a simulated split. No real payment is
        taken.
      </Text>

      {!paymentRequest ? (
        <View style={styles.panel}>
          <Text style={styles.label}>QR payment</Text>
          <Text style={styles.label}>Sale amount (ZAR)</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="e.g. 60.00"
            placeholderTextColor="#94a3b8"
          />
          <TouchableOpacity style={styles.button} onPress={createPaymentRequest} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.buttonText}>Request customer payment</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.panel}>
          <Text style={styles.amount}>{formatRand(paymentRequest.amountCents)}</Text>
          <Text style={styles.status}>
            {paymentRequest.status === 'paid'
              ? 'PAYMENT APPROVED'
              : paymentRequest.status === 'declined'
                ? 'PAYMENT DECLINED'
              : paymentRequest.status === 'expired'
                ? 'REQUEST EXPIRED'
                : 'WAITING FOR CUSTOMER'}
          </Text>
          {paymentRequest.status === 'pending' && paymentRequest.qrPayload ? (
            <>
              <View style={styles.qr}>
                <QRCode value={paymentRequest.qrPayload} size={220} />
              </View>
              <Text style={styles.instructions}>Ask the customer to scan this QR code in omniCharge Wallet.</Text>
              <Text style={styles.expiry}>
                Expires at {new Date(paymentRequest.expiresAt).toLocaleTimeString()}
              </Text>
              <ActivityIndicator style={styles.spinner} color="#38bdf8" />
            </>
          ) : null}
          {paymentRequest.allocation?.map((item) => (
            <Text key={item.cardId} style={styles.allocation}>
              {item.cardLabel}: {formatRand(item.amountCents)}
            </Text>
          ))}
          {paymentRequest.status !== 'pending' ? (
            <TouchableOpacity style={styles.button} onPress={newSale}>
              <Text style={styles.buttonText}>Start next sale</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#0f172a', padding: 24, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#f8fafc', marginBottom: 12, textAlign: 'center' },
  notice: { color: '#fbbf24', fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: 24 },
  panel: { backgroundColor: '#1e293b', padding: 20, borderRadius: 12, alignItems: 'stretch' },
  label: { color: '#94a3b8', fontSize: 16, marginBottom: 10 },
  input: { backgroundColor: '#0f172a', color: '#fff', padding: 14, borderRadius: 8, fontSize: 20 },
  button: { backgroundColor: '#38bdf8', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  amount: { fontSize: 36, fontWeight: 'bold', color: '#f8fafc', textAlign: 'center' },
  status: { color: '#38bdf8', fontSize: 15, fontWeight: 'bold', textAlign: 'center', marginTop: 12 },
  qr: { backgroundColor: '#fff', padding: 14, alignSelf: 'center', marginTop: 24, borderRadius: 8 },
  instructions: { color: '#f8fafc', fontSize: 15, textAlign: 'center', marginTop: 20, lineHeight: 22 },
  expiry: { color: '#94a3b8', fontSize: 12, textAlign: 'center', marginTop: 12 },
  spinner: { marginTop: 20 },
  allocation: { color: '#f8fafc', fontSize: 15, marginTop: 10, textAlign: 'center' },
  error: { color: '#f87171', marginTop: 16, textAlign: 'center' },
});
