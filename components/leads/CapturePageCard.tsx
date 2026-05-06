import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import QRModal from './QRModal';

const C = {
  teal: '#0EA5A0',
  tealDark: '#0D7A76',
  navy: '#1C2B3A',
};

interface Props {
  url: string;
}

export default function CapturePageCard({ url }: Props) {
  const [copied, setCopied] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(url);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.label}>Your capture page</Text>
        <Text style={styles.url} numberOfLines={1}>{url}</Text>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, copied && styles.btnCopied]}
            onPress={handleCopy}
            activeOpacity={0.8}
          >
            <Text style={[styles.btnText, copied && styles.btnTextCopied]}>
            {copied ? 'Copied!' : 'Copy link'}
          </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.btnOutline}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setQrVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.btnOutlineText}>QR Code</Text>
          </TouchableOpacity>
        </View>
      </View>

      <QRModal visible={qrVisible} url={url} onClose={() => setQrVisible(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.teal,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 14,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  url: {
    fontSize: 13,
    fontFamily: 'JetBrainsMono_400Regular',
    color: '#FFF',
    marginBottom: 14,
    letterSpacing: 0.2,
  },
  actions: { flexDirection: 'row', gap: 10 },
  btn: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  btnCopied: { backgroundColor: C.tealDark },
  btnText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.teal,
  },
  btnTextCopied: { color: '#FFF' },
  btnOutline: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  btnOutlineText: { fontSize: 13, fontWeight: '600', color: '#FFF' },
});
