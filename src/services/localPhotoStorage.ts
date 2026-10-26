// src/services/localPhotoStorage.ts
//
// ============================================================
// LOCAL PHOTO & DOCUMENT STORAGE (IndexedDB)
// ============================================================
// Preserves full-resolution photos and PDF invoice documents in
// browser IndexedDB without exhausting the 5MB localStorage limit.
// Only lightweight references (e.g. "idb://photos/photo_123")
// are kept inside the PurchaseRecord and Material records.
// ============================================================

export interface StoredPhotoRecord {
  id: string;
  data: string; // Full data URL (data:image/... or data:application/pdf;base64,...)
  mimeType: string;
  fileName?: string;
  sizeBytes?: number;
  createdAt: string;
}

const DB_NAME = 'pw_materials_photos_db';
const DB_VERSION = 1;
const STORE_NAME = 'photos';

// In-memory fallback for non-browser / Node environments / tests
const memoryFallback = new Map<string, StoredPhotoRecord>();

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isBrowser()) {
      return reject(new Error('IndexedDB is only available in browser environments'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function extractMimeType(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;]+);base64,/);
  if (match && match[1]) {
    return match[1].toLowerCase();
  }
  return 'image/jpeg';
}

export function isPdfDocument(dataOrMime?: string | null): boolean {
  if (!dataOrMime) return false;
  return (
    dataOrMime.includes('application/pdf') ||
    dataOrMime.startsWith('data:application/pdf') ||
    dataOrMime.toLowerCase().endsWith('.pdf')
  );
}

/**
 * Convert a base64 data URL to a binary Blob for optimal rendering and download.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Save an uploaded photo or PDF to IndexedDB.
 * Returns a lightweight storage reference URI: "idb://photos/<id>"
 */
export async function savePhoto(
  id: string,
  dataUrl: string,
  fileName?: string
): Promise<string> {
  if (!dataUrl) return '';

  // If already an idb:// reference, don't re-save
  if (dataUrl.startsWith('idb://photos/')) {
    return dataUrl;
  }

  const mimeType = extractMimeType(dataUrl);
  const record: StoredPhotoRecord = {
    id,
    data: dataUrl,
    mimeType,
    fileName: fileName || (isPdfDocument(mimeType) ? 'invoice.pdf' : 'material.jpg'),
    sizeBytes: Math.round((dataUrl.length * 3) / 4),
    createdAt: new Date().toISOString(),
  };

  if (!isBrowser()) {
    memoryFallback.set(id, record);
    return `idb://photos/${id}`;
  }

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);

      req.onsuccess = () => resolve(`idb://photos/${id}`);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to save photo to IndexedDB, falling back to memory store:', err);
    memoryFallback.set(id, record);
    return `idb://photos/${id}`;
  }
}

/**
 * Retrieve a photo by its ID, reference URI ("idb://photos/..."), or raw data URL.
 */
export async function getPhoto(
  photoRefOrDataUrl?: string | null
): Promise<StoredPhotoRecord | null> {
  if (!photoRefOrDataUrl || !photoRefOrDataUrl.trim()) return null;

  // Direct data URL support (legacy or in-memory)
  if (photoRefOrDataUrl.startsWith('data:')) {
    return {
      id: 'inline',
      data: photoRefOrDataUrl,
      mimeType: extractMimeType(photoRefOrDataUrl),
      createdAt: new Date().toISOString(),
    };
  }

  // Extract key from idb://photos/<id>
  const id = photoRefOrDataUrl.startsWith('idb://photos/')
    ? photoRefOrDataUrl.replace('idb://photos/', '')
    : photoRefOrDataUrl;

  // Check in-memory fallback first
  if (memoryFallback.has(id)) {
    return memoryFallback.get(id) || null;
  }

  if (!isBrowser()) return null;

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => resolve((req.result as StoredPhotoRecord) || null);
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Failed to read photo from IndexedDB:', err);
    return null;
  }
}

/**
 * Delete a photo from IndexedDB.
 */
export async function deletePhoto(photoRefOrDataUrl?: string | null): Promise<boolean> {
  if (!photoRefOrDataUrl) return false;

  const id = photoRefOrDataUrl.startsWith('idb://photos/')
    ? photoRefOrDataUrl.replace('idb://photos/', '')
    : photoRefOrDataUrl;

  memoryFallback.delete(id);

  if (!isBrowser()) return true;

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);

      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('Failed to delete photo from IndexedDB:', err);
    return false;
  }
}

/**
 * Clear all photos from storage (used in tests or resets).
 */
export async function clearAllPhotos(): Promise<void> {
  memoryFallback.clear();
  if (!isBrowser()) return;

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {
    // Ignore error
  }
}
