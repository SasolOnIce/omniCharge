import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';

export default function Home() {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [balances, setBalances] = useState({
    primary: 'R 100.00',
    savings: 'R 200.00',
    backup: 'R 300.00',
  });
  const [receipt, setReceipt] = useState<any>(null);

  const handleCharge = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    setLoading(true);

    try {
      // Connects to your forwarded backend service on port 3000
      const response = await fetch('https://silver-meme-pjg5rxrvgxvxhr77-3000.app.github.dev/partition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalAmount: parseFloat(amount) }),
      });

      const data = await response.json();
      setReceipt(data);

      if (response.ok && data.breakdown) {
        data.breakdown.forEach((item: any) => {
          if (item.card === 'Primary Card') setBalances((b) => ({ ...b, primary: item.remainingBalance }));
          if (item.card === 'Savings Card') setBalances((b) => ({ ...b, savings: item.remainingBalance }));
          if (item.card === 'Backup Card') setBalances((b) => ({ ...b, backup: item.remainingBalance }));
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>omniCharge</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Primary Card</Text>
        <Text style={styles.cardBalance}>{balances.primary}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Savings Card</Text>
        <Text style={styles.cardBalance}>{balances.savings}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Backup Card</Text>
        <Text style={styles.cardBalance}>{balances.backup}</Text>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Enter amount (R)"
        placeholderTextColor="#94a3b8"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />

      <TouchableOpacity style={styles.button} onPress={handleCharge} disabled={loading}>
        {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>Tap to Charge</Text>}
      </TouchableOpacity>

      {receipt && (
        <View style={styles.receipt}>
          <Text style={styles.receiptStatus}>Status: {receipt.status}</Text>
          {receipt.breakdown?.map((item: any, i: number) => (
            <Text key={i} style={styles.receiptText}>
              {item.card}: -{item.amountDrawn}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 24, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#f8fafc', marginBottom: 24, textAlign: 'center' },
  card: { backgroundColor: '#1e293b', padding: 16, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  cardLabel: { color: '#94a3b8', fontSize: 16 },
  cardBalance: { color: '#f8fafc', fontWeight: 'bold', fontSize: 16 },
  input: { backgroundColor: '#1e293b', color: '#fff', padding: 14, borderRadius: 8, marginVertical: 16, fontSize: 18 },
  button: { backgroundColor: '#38bdf8', padding: 16, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  receipt: { marginTop: 24, padding: 16, backgroundColor: '#1e293b', borderRadius: 8 },
  receiptStatus: { color: '#22c55e', fontWeight: 'bold', fontSize: 18, marginBottom: 8 },
  receiptText: { color: '#f8fafc', fontSize: 14 },
});