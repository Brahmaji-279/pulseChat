import { FullClientIdentityKeys, toBase64, fromBase64 } from './key-generation.js';

const DB_NAME = 'pulsechat_secure_keystore_v1';
const STORE_NAME = 'identity_keys';
const DB_VERSION = 1;

function openKeyDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'userId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveIdentityKeys(
  userId: string,
  keys: FullClientIdentityKeys
): Promise<void> {
  const db = await openKeyDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // Serialize Uint8Arrays to Base64 strings for storage
    const record = {
      userId,
      createdAt: keys.createdAt,
      kemBindingSignature: keys.kemBindingSignature,
      kemKey: {
        keyId: keys.kemKey.keyId,
        version: keys.kemKey.version,
        fingerprint: keys.kemKey.fingerprint,
        publicKey: toBase64(keys.kemKey.publicKey),
        secretKey: toBase64(keys.kemKey.secretKey),
      },
      dsaKey: {
        keyId: keys.dsaKey.keyId,
        version: keys.dsaKey.version,
        fingerprint: keys.dsaKey.fingerprint,
        publicKey: toBase64(keys.dsaKey.publicKey),
        secretKey: toBase64(keys.dsaKey.secretKey),
      },
    };

    const existingRequest = store.get(userId);
    existingRequest.onsuccess = () => {
      const existing = existingRequest.result;
      const previousKemKeys = [...(existing?.previousKemKeys || [])];
      if (existing?.kemKey && existing.kemKey.keyId !== keys.kemKey.keyId) {
        previousKemKeys.unshift(existing.kemKey);
      }

      store.put({ ...record, previousKemKeys });
    };
    existingRequest.onerror = () => reject(existingRequest.error);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function loadIdentityKeys(
  userId: string
): Promise<FullClientIdentityKeys | null> {
  const db = await openKeyDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(userId);

    req.onsuccess = () => {
      const record = req.result;
      if (!record) {
        resolve(null);
        return;
      }

      try {
        const fullKeys: FullClientIdentityKeys = {
          createdAt: record.createdAt,
          kemBindingSignature: record.kemBindingSignature,
          kemKey: {
            keyId: record.kemKey.keyId,
            version: record.kemKey.version,
            fingerprint: record.kemKey.fingerprint,
            publicKey: fromBase64(record.kemKey.publicKey),
            secretKey: fromBase64(record.kemKey.secretKey),
          },
          dsaKey: {
            keyId: record.dsaKey.keyId,
            version: record.dsaKey.version,
            fingerprint: record.dsaKey.fingerprint,
            publicKey: fromBase64(record.dsaKey.publicKey),
            secretKey: fromBase64(record.dsaKey.secretKey),
          },
        };
        resolve(fullKeys);
      } catch (err) {
        reject(err);
      }
    };

    req.onerror = () => reject(req.error);
  });
}

export async function hasIdentityKeys(userId: string): Promise<boolean> {
  const keys = await loadIdentityKeys(userId);
  return keys !== null;
}

export async function getKemSecretKey(userId: string, keyId: string): Promise<Uint8Array | null> {
  const db = await openKeyDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(userId);

    request.onsuccess = () => {
      const record = request.result;
      const key = record?.kemKey?.keyId === keyId
        ? record.kemKey
        : record?.previousKemKeys?.find((previous: { keyId: string }) => previous.keyId === keyId);
      resolve(key ? fromBase64(key.secretKey) : null);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function clearIdentityKeys(userId: string): Promise<void> {
  const db = await openKeyDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(userId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
