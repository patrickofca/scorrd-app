import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Share,
  Platform,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Haptics from 'expo-haptics';

const C = {
  navy: '#1C2B3A',
  teal: '#0EA5A0',
  surface: '#FFFFFF',
  offWhite: '#F7F5F2',
  border: '#E2E8F0',
  textPrimary: '#1C2B3A',
  textSecondary: '#64748B',
};

interface Props {
  visible: boolean;
  url: string;
  onClose: () => void;
}

export default function QRModal({ visible, url, onClose }: Props) {
  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share(
        Platform.OS === 'ios'
          ? { url }
          : { message: url }
      );
    } catch {
      // user cancelled share sheet — no action needed
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>Capture Page QR</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.qrWrap}>
            <QRCode
              value={url}
              size={220}
              color={C.navy}
              backgroundColor={C.surface}
            />
          </View>

          <Text style={styles.urlText} numberOfLines={2}>{url}</Text>

          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Text style={styles.shareBtnText}>Share Link</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 24,
  },
  title: { fontSize: 16, fontWeight: '700', color: C.navy },
  closeBtn: { fontSize: 16, color: C.textSecondary },
  qrWrap: {
    padding: 16,
    backgroundColor: C.offWhite,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  urlText: {
    fontSize: 12,
    color: C.textSecondary,
    fontFamily: 'JetBrainsMono_400Regular',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  shareBtn: {
    backgroundColor: C.teal,
    borderRadius: 24,
    paddingVertical: 13,
    paddingHorizontal: 40,
    width: '100%',
    alignItems: 'center',
  },
  shareBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
