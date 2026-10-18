import { CameraView, useCameraPermissions } from 'expo-camera';
import React, { useCallback, useEffect, useState } from 'react';
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

type Card = {
  id: string;
  label: string;
  balanceCents: number;
};

type Allocation = {
  cardId: string;
  cardLabel: string;
  amountCents: number;
  remainingBalanceCents: number;
};

type PaymentRequest = {
  id: string;
  amountCents: number;
  status: 'pending' | 'paid' | 'declined' | 'expired';
  expiresAt: number;
  canPay: boolean;
  remainingCents: number;
  allocation: Allocation[] | null;
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

function getRequestIdFromQr(data: string) {
  try {
    const url = new URL(data);
    if (url.protocol !== 'omnichargemobile:' || url.hostname !== 'pay') return null;
    const id = url.pathname.slice(1);
    return /^[\da-f-]{36}$/i.test(id) ? id : null;
  } catch {
    return null;
  }
}

export default function Home() {
  const [permission, requestPermission] = useCameraPermissions();
  const [cards, setCards] = useState<Card[]>([]);
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadCards = useCallback(async () => {
    const apiBaseUrl = getApiBaseUrl();
    if (!apiBaseUrl) throw new Error('Set EXPO_PUBLIC_API_URL to your backend URL, then restart Expo.');
    const response = await fetch(`${apiBaseUrl}/api/wallet/cards`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? 'Could not load simulated card balances.');
    setCards(data.cards);
  }, []);

  const resetDemoBalances = async () => {
    const apiBaseUrl = getApiBaseUrl();
    if (!apiBaseUrl) {
      setError('Set EXPO_PUBLIC_API_URL to your backend URL, then restart Expo.');
      return;
    }
    setError('');
    try {
      const response = await fetch(`${apiBaseUrl}/api/wallet/reset`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not reset demo balances.');
      setCards(data.cards);
      setNotice('Demo balances reset.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset demo balances.');
    }
  };

  useEffect(() => {
    loadCards().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Could not connect to the payment server.');
    });
  }, [loadCards]);

  const loadPaymentRequest = async (id: string) => {
    const apiBaseUrl = getApiBaseUrl();
    if (!apiBaseUrl) throw new Error('Set EXPO_PUBLIC_API_URL to your backend URL, then restart Expo.');
    const response = await fetch(`${apiBaseUrl}/api/wallet/requests/${encodeURIComponent(id)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? 'Could not load the POS payment request.');
    setPaymentRequest(data);
    setScanning(false);
    setNotice('');
  };

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (!scanning) return;
    setScanning(false);
    const requestId = getRequestIdFromQr(data);
    if (!requestId) {
      setError('That QR code is not a valid omniCharge payment request.');
      return;
    }

    setLoading(true);
    setError('');
    loadPaymentRequest(requestId)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Could not load the payment request.');
      })
      .finally(() => setLoading(false));
  };

  const handlePay = async () => {
    if (!paymentRequest) return;
    const apiBaseUrl = getApiBaseUrl();
    if (!apiBaseUrl) {
      setError('Set EXPO_PUBLIC_API_URL to your backend URL, then restart Expo.');
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/wallet/requests/${encodeURIComponent(paymentRequest.id)}/pay`,
        { method: 'POST' },
      );
      const data = await response.json();
      if (!response.ok) {
        if (data.status === 'declined') {
          setPaymentRequest((current) =>
            current ? { ...current, status: 'declined', canPay: false } : current,
          );
        }
        throw new Error(data.error ?? 'Could not settle the simulated payment.');
      }
      setPaymentRequest((current) => (current ? { ...current, ...data, canPay: false } : current));
      setNotice('Simulated payment approved. No real cards or money were used.');
      await loadCards();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not settle the simulated payment.');
    } finally {
      setLoading(false);
    }
  };

  const startScan = async () => {
    setError('');
    setNotice('');
    setPaymentRequest(null);
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        setError('Camera permission is needed to scan the POS payment QR code.');
        return;
      }
    }
    setScanning(true);
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>omniCharge Wallet</Text>
      <Text style={styles.notice}>
        SIMULATION ONLY · Balances and split payments are demo data. No bank or card transactions occur.
      </Text>

      <Text style={styles.sectionTitle}>Available demo balances</Text>
      {cards.map((card) => (
        <View key={card.id} style={styles.card}>
          <Text style={styles.cardLabel}>{card.label}</Text>
          <Text style={styles.cardBalance}>{formatRand(card.balanceCents)}</Text>
        </View>
      ))}
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() =>
          loadCards().catch((err: unknown) =>
            setError(err instanceof Error ? err.message : 'Could not refresh balances.'),
          )
        }>
        <Text style={styles.secondaryButtonText}>Refresh balances</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={resetDemoBalances}>
        <Text style={styles.secondaryButtonText}>Reset demo balances</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={startScan} disabled={loading}>
        <Text style={styles.buttonText}>Scan POS payment QR</Text>
      </TouchableOpacity>

      {scanning ? (
        <View style={styles.scanner}>
          {permission?.granted ? (
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={handleBarcodeScanned}
            />
          ) : (
            <Text style={styles.cardLabel}>Allow camera access to scan the QR code.</Text>
          )}
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setScanning(false)}>
            <Text style={styles.secondaryButtonText}>Cancel scan</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {loading ? <ActivityIndicator style={styles.spinner} color="#38bdf8" /> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {notice ? <Text style={styles.success}>{notice}</Text> : null}

      {paymentRequest ? (
        <View style={styles.receipt}>
          <Text style={styles.sectionTitle}>POS payment request</Text>
          <Text style={styles.receiptText}>Amount: {formatRand(paymentRequest.amountCents)}</Text>
          <Text style={styles.receiptText}>Status: {paymentRequest.status}</Text>
          {paymentRequest.status !== 'paid' && paymentRequest.allocation ? (
            <>
              <Text style={styles.splitTitle}>Proposed split across demo cards</Text>
              {paymentRequest.allocation.map((item) => (
                <Text key={item.cardId} style={styles.receiptText}>
                  {item.cardLabel}: {formatRand(item.amountCents)} (remaining{' '}
                  {formatRand(item.remainingBalanceCents)})
                </Text>
              ))}
              {!paymentRequest.canPay ? (
                <Text style={styles.error}>
                  Not enough simulated funds. {formatRand(paymentRequest.remainingCents)} remains unpaid.
                </Text>
              ) : null}
              {paymentRequest.status === 'pending' ? (
                <TouchableOpacity
                  style={[styles.button, styles.payButton]}
                  onPress={handlePay}
                  disabled={!paymentRequest.canPay || loading}>
                  <Text style={styles.buttonText}>Approve simulated split</Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : null}
          {paymentRequest.status === 'paid' && paymentRequest.allocation
            ? paymentRequest.allocation.map((item) => (
                <Text key={item.cardId} style={styles.receiptText}>
                  {item.cardLabel} paid {formatRand(item.amountCents)}
                </Text>
              ))
            : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#0f172a', padding: 24, justifyContent: 'center' },
  title: { fontSize: 27, fontWeight: 'bold', color: '#f8fafc', marginBottom: 12, textAlign: 'center' },
  notice: { color: '#fbbf24', fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: 22 },
  sectionTitle: { color: '#f8fafc', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  card: { backgroundColor: '#1e293b', padding: 16, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  cardLabel: { color: '#94a3b8', fontSize: 16 },
  cardBalance: { color: '#f8fafc', fontWeight: 'bold', fontSize: 16 },
  secondaryButton: { backgroundColor: '#334155', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  secondaryButtonText: { color: '#f8fafc', fontWeight: '600' },
  button: { backgroundColor: '#38bdf8', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  scanner: { height: 300, marginTop: 20, overflow: 'hidden', borderRadius: 8 },
  camera: { flex: 1 },
  spinner: { marginTop: 16 },
  error: { color: '#f87171', marginTop: 12, textAlign: 'center' },
  success: { color: '#4ade80', marginTop: 12, textAlign: 'center' },
  receipt: { marginTop: 24, padding: 16, backgroundColor: '#1e293b', borderRadius: 8 },
  receiptText: { color: '#f8fafc', fontSize: 14, marginBottom: 8 },
  splitTitle: { color: '#38bdf8', fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  payButton: { marginTop: 16 },
});
