// Proof photos: pick from camera or library, upload to private cloud storage, show later.
// expo-image-picker is a native package, so it is loaded lazily: without it (or on a build made
// before it was added) the app still runs and simply hides the photo buttons.
import type * as ImagePickerModule from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useStore } from './store';
import { Entry } from './lib/types';

const BUCKET = 'proofs';
const MAX_BYTES = 5 * 1024 * 1024;

let picker: typeof ImagePickerModule | null | undefined;
function getPicker(): typeof ImagePickerModule | null {
  if (picker !== undefined) return picker;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    picker = require('expo-image-picker') as typeof ImagePickerModule;
  } catch {
    picker = null;
  }
  return picker;
}

export const photosAvailable = (): boolean => getPicker() !== null;

export type PickResult = { uri: string } | { cancelled: true } | { error: string };

export async function pickPhoto(source: 'camera' | 'library'): Promise<PickResult> {
  const ImagePicker = getPicker();
  if (!ImagePicker) return { error: 'Photos need the newest app build. Update the app to use them.' };
  try {
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return { error: "Camera access is off for Lifepath. Turn it on in your phone's Settings." };
    }
    const options = { mediaTypes: ['images'] as ['images'], quality: 0.5, allowsEditing: false, exif: false };
    const res =
      source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (res.canceled || !res.assets?.[0]?.uri) return { cancelled: true };
    return { uri: res.assets[0].uri };
  } catch (e: any) {
    return { error: String(e?.message ?? e) };
  }
}

/** Uploads every proof photo that has not reached the cloud yet. Best effort; failures retry on the next sync. */
export async function uploadPendingPhotos(userId: string): Promise<void> {
  const pending = useStore.getState().entries.filter((e) => e.evidence?.photoUri && !e.evidence.photoPath);
  for (const entry of pending) {
    try {
      const res = await fetch(entry.evidence!.photoUri!);
      const body = await res.arrayBuffer();
      if (body.byteLength > MAX_BYTES) continue; // too large for the 5 MB limit; keep it on this device only
      const path = `${userId}/${entry.id}.jpg`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, body, { contentType: 'image/jpeg', upsert: true });
      if (error) throw error;
      useStore.getState().setPhotoPath(entry.id, path);
    } catch {
      // offline, or the file is gone: try again later
    }
  }
}

/** Removes a log's uploaded photo (called when the log is deleted). */
export async function removeProofPhoto(entry: Entry): Promise<void> {
  const path = entry.evidence?.photoPath;
  if (!path) return;
  await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
}

/** A temporary link to a stored photo, for devices that do not have the file locally. */
export function useCloudPhotoUrl(path: string | undefined, enabled: boolean): string | undefined {
  const [url, setUrl] = useState<string | undefined>();
  useEffect(() => {
    if (!path || !enabled) return;
    let alive = true;
    supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 3600)
      .then(({ data }) => alive && setUrl(data?.signedUrl))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [path, enabled]);
  return url;
}
