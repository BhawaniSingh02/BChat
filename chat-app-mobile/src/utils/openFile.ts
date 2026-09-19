import { File, Paths } from 'expo-file-system';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import * as MediaLibrary from 'expo-media-library';
import * as SecureStore from 'expo-secure-store';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

const MIME_TYPES: Record<string, string> = {
  pdf: 'application/pdf',
  txt: 'text/plain',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
};

// FLAG_GRANT_READ_URI_PERMISSION — required so the receiving app (e.g. a PDF viewer)
// can read our FileProvider content:// URI without itself holding storage permissions.
const FLAG_GRANT_READ_URI_PERMISSION = 1;

const SAF_DIR_KEY = 'saf_downloads_dir_uri';

export function mimeTypeFromUrl(url: string): string {
  const ext = url.split('.').pop()?.split('?')[0]?.toLowerCase();
  return (ext && MIME_TYPES[ext]) || '*/*';
}

/** Downloads the remote file to cache and opens it in the device's native viewer (Android) or share sheet (iOS/fallback). */
export async function openRemoteFile(url: string, filename: string): Promise<void> {
  const destination = new File(Paths.cache, filename);
  const file = await File.downloadFileAsync(url, destination, { idempotent: true });

  if (Platform.OS === 'android') {
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: file.contentUri,
      flags: FLAG_GRANT_READ_URI_PERMISSION,
      type: mimeTypeFromUrl(url),
    });
    return;
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri);
  }
}

/** Saves a remote image to the device's photo gallery. Returns true on success, false if permission was denied. */
export async function saveImageToDevice(url: string): Promise<boolean> {
  const permission = await MediaLibrary.requestPermissionsAsync(true);
  if (!permission.granted) return false;
  const destination = new File(Paths.cache, `baaat-${Date.now()}.jpg`);
  const file = await File.downloadFileAsync(url, destination, { idempotent: true });
  await MediaLibrary.saveToLibraryAsync(file.uri);
  return true;
}

/**
 * Saves a remote non-image file (PDF, doc, etc.) to a user-chosen folder on Android via the
 * Storage Access Framework, or to Files/Drive via the share sheet on iOS. The granted SAF
 * folder is cached so repeat saves don't re-prompt every time.
 */
export async function saveFileToDevice(url: string, filename: string): Promise<boolean> {
  const destination = new File(Paths.cache, filename);
  const file = await File.downloadFileAsync(url, destination, { idempotent: true });
  const mimeType = mimeTypeFromUrl(url);

  if (Platform.OS !== 'android') {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(file.uri);
      return true;
    }
    return false;
  }

  const base64 = await FileSystemLegacy.readAsStringAsync(file.uri, {
    encoding: FileSystemLegacy.EncodingType.Base64,
  });

  const cachedDirUri = await SecureStore.getItemAsync(SAF_DIR_KEY);
  if (cachedDirUri) {
    try {
      const destUri = await FileSystemLegacy.StorageAccessFramework.createFileAsync(cachedDirUri, filename, mimeType);
      await FileSystemLegacy.writeAsStringAsync(destUri, base64, { encoding: FileSystemLegacy.EncodingType.Base64 });
      return true;
    } catch {
      await SecureStore.deleteItemAsync(SAF_DIR_KEY);
    }
  }

  const permission = await FileSystemLegacy.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permission.granted) return false;
  await SecureStore.setItemAsync(SAF_DIR_KEY, permission.directoryUri);
  const destUri = await FileSystemLegacy.StorageAccessFramework.createFileAsync(permission.directoryUri, filename, mimeType);
  await FileSystemLegacy.writeAsStringAsync(destUri, base64, { encoding: FileSystemLegacy.EncodingType.Base64 });
  return true;
}
