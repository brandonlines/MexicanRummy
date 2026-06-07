// ===== src/js/native/haptics.js =====
// Safe wrapper around @capacitor/haptics (^8 — matches @capacitor/core 8.3.4).
// No-ops on web / when the plugin or platform is unavailable, honors
// prefers-reduced-motion, and never throws into UI handlers.

import { Capacitor } from '@capacitor/core';

let _plugin = null, _loaded = false;

async function plugin() {
  if (_loaded) return _plugin;
  _loaded = true;
  try {
    if (Capacitor?.isNativePlatform?.()) {
      _plugin = await import('@capacitor/haptics');
    }
  } catch (e) { _plugin = null; }   // web/dev or plugin missing -> silent no-op
  return _plugin;
}

const reduce = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

async function impact(style) {
  if (reduce()) return;
  const p = await plugin();
  try { await p?.Haptics?.impact?.({ style: p.ImpactStyle[style] }); } catch (e) {}
}
async function notify(type) {
  if (reduce()) return;
  const p = await plugin();
  try { await p?.Haptics?.notification?.({ type: p.NotificationType[type] }); } catch (e) {}
}
async function selectionTick() {
  if (reduce()) return;
  const p = await plugin();
  try {
    await p?.Haptics?.selectionStart?.();
    await p?.Haptics?.selectionChanged?.();
    await p?.Haptics?.selectionEnd?.();
  } catch (e) {}
}

export const haptics = {
  light:   () => impact('Light'),
  medium:  () => impact('Medium'),
  heavy:   () => impact('Heavy'),
  success: () => notify('Success'),
  warning: () => notify('Warning'),
  error:   () => notify('Error'),
  select:  () => selectionTick(),
};
export default haptics;
