import { Alert, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useStore } from '../store';

export const NATIVE_DRIVER = Platform.OS !== 'web';

type Kind = 'light' | 'medium' | 'success' | 'warning' | 'select';

/** Haptic feedback that respects the user's setting and is silent on web. */
export function haptic(kind: Kind = 'light') {
  if (Platform.OS === 'web' || !useStore.getState().profile.haptics) return;
  try {
    if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else if (kind === 'warning') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    else if (kind === 'select') Haptics.selectionAsync();
    else Haptics.impactAsync(kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Haptics unavailable on this device; ignore.
  }
}

/** Cross-platform confirm dialog (Alert buttons don't work on web). */
export function confirmAction(title: string, message: string, confirmLabel: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    // eslint-disable-next-line no-alert
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}
