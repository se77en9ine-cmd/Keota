// IndexedDB Persistent Offline Media Storage for 39POS Customer Display
import { useState, useEffect } from 'react';

const DB_NAME = '39pos_offline_media_db';
const STORE_NAME = 'media_files';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface OfflineMediaRecord {
  id: string;
  name: string;
  type: 'IMAGE' | 'VIDEO';
  mimeType: string;
  size: number;
  blob: Blob;
  thumbnail?: string;
  createdAt: number;
}

const activeObjectUrls: Map<string, string> = new Map();

/**
 * Extract a high quality thumbnail poster data URL from a video file/blob
 */
export function extractVideoThumbnail(videoBlob: Blob): Promise<string> {
  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      const url = URL.createObjectURL(videoBlob);
      video.src = url;
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';

      const cleanup = () => {
        URL.revokeObjectURL(url);
      };

      video.onloadeddata = () => {
        video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          const width = Math.min(video.videoWidth || 640, 640);
          const height = Math.min(video.videoHeight || 360, 360);
          canvas.width = width > 0 ? width : 640;
          canvas.height = height > 0 ? height : 360;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            cleanup();
            resolve(dataUrl);
            return;
          }
        } catch {
          // Ignore
        }
        cleanup();
        resolve('');
      };

      video.onerror = () => {
        cleanup();
        resolve('');
      };

      // Fallback timeout after 3s
      setTimeout(() => {
        cleanup();
        resolve('');
      }, 3000);
    } catch {
      resolve('');
    }
  });
}

/**
 * Extract a thumbnail data URL from an image file/blob
 */
export function extractImageThumbnail(imageBlob: Blob): Promise<string> {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      const url = URL.createObjectURL(imageBlob);
      img.src = url;

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 400;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            URL.revokeObjectURL(url);
            resolve(dataUrl);
            return;
          }
        } catch {
          // Ignore
        }
        URL.revokeObjectURL(url);
        resolve('');
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve('');
      };
    } catch {
      resolve('');
    }
  });
}

/**
 * Save an offline File or Blob into IndexedDB
 */
export async function saveOfflineMedia(
  id: string,
  file: File | Blob,
  type: 'IMAGE' | 'VIDEO',
  thumbnail?: string
): Promise<string> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const record: OfflineMediaRecord = {
      id,
      name: file instanceof File ? file.name : `offline_${id}`,
      type,
      mimeType: file.type || (type === 'VIDEO' ? 'video/mp4' : 'image/jpeg'),
      size: file.size,
      blob: file,
      thumbnail,
      createdAt: Date.now(),
    };

    const req = store.put(record);

    req.onsuccess = () => {
      // Create local object URL for instant offline playback
      if (activeObjectUrls.has(id)) {
        URL.revokeObjectURL(activeObjectUrls.get(id)!);
      }
      const objectUrl = URL.createObjectURL(file);
      activeObjectUrls.set(id, objectUrl);
      resolve(objectUrl);
    };

    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieve an offline media Blob and return a fresh playable Object URL
 */
export async function getOfflineMediaUrl(id: string): Promise<string | null> {
  if (activeObjectUrls.has(id)) {
    return activeObjectUrls.get(id)!;
  }

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);

      req.onsuccess = () => {
        const record = req.result as OfflineMediaRecord | undefined;
        if (record && record.blob) {
          const url = URL.createObjectURL(record.blob);
          activeObjectUrls.set(id, url);
          resolve(url);
        } else {
          resolve(null);
        }
      };

      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/**
 * Delete an offline media record from IndexedDB
 */
export async function deleteOfflineMedia(id: string): Promise<boolean> {
  try {
    if (activeObjectUrls.has(id)) {
      URL.revokeObjectURL(activeObjectUrls.get(id)!);
      activeObjectUrls.delete(id);
    }
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return false;
  }
}

/**
 * React Hook that automatically resolves and keeps active all offline media URLs across page refreshes
 */
export function useOfflineMediaMap(ads: Array<{ id: string; isOfflineFile?: boolean; offlineFileId?: string }>) {
  const [mediaMap, setMediaMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let isMounted = true;
    const resolveAll = async () => {
      const resolved: Record<string, string> = {};
      for (const ad of ads) {
        if (ad.isOfflineFile && ad.offlineFileId) {
          const url = await getOfflineMediaUrl(ad.offlineFileId);
          if (url && isMounted) {
            resolved[ad.id] = url;
          }
        }
      }
      if (isMounted) {
        setMediaMap(resolved);
      }
    };
    resolveAll();
    return () => {
      isMounted = false;
    };
  }, [ads]);

  return mediaMap;
}
