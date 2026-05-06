import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { Colors } from '../constants/colors';
import { FontFamily, FontSize } from '../constants/typography';

interface Props {
  uri?: string | null;
  initials?: string;
  size?: number;
  shape?: 'circle' | 'square';
  onChange: (uri: string, base64: string) => void;
  onRemove?: () => void;
}

export default function ImageUpload({
  uri,
  initials,
  size = 72,
  shape = 'square',
  onChange,
  onRemove,
}: Props) {
  const radius = shape === 'circle' ? size / 2 : 12;

  const pick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.75,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const asset = result.assets[0];
      onChange(asset.uri, asset.base64 ?? '');
    }
  };

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={[styles.container, { width: size, height: size, borderRadius: radius }]}
        onPress={pick}
        activeOpacity={0.75}
      >
        {uri ? (
          <Image source={{ uri }} style={[styles.image, { borderRadius: radius }]} />
        ) : (
          <View style={[styles.placeholder, { borderRadius: radius }]}>
            <Text style={styles.initials}>{initials ?? '+'}</Text>
          </View>
        )}
        <View style={[styles.editBadge, { borderRadius: radius }]}>
          <Text style={styles.editIcon}>✎</Text>
        </View>
      </TouchableOpacity>

      {uri && onRemove ? (
        <TouchableOpacity onPress={onRemove} style={styles.removeBtn}>
          <Text style={styles.removeTxt}>Remove photo</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: 8 },
  container: { overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  placeholder: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.teal + '18',
    borderWidth: 1.5,
    borderColor: Colors.teal + '40',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.sansSemibold,
    color: Colors.teal,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.navy,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editIcon: { fontSize: 11, color: '#FFF' },
  removeBtn: { paddingVertical: 2 },
  removeTxt: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.sans,
    color: Colors.error,
  },
});
