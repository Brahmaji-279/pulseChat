import { create } from 'zustand';
import {
  FullClientIdentityKeys,
  loadIdentityKeys,
  saveIdentityKeys,
  getKemSecretKey,
  generateFullIdentityKeys,
  toBase64,
  VerifiedContactKey,
  getVerifiedContactKeys,
  onKeyChanged,
  KeyChangeEvent,
  rotateClientKeys,
} from '../crypto/index.js';
import { api } from '../services/api.js';

interface CryptoState {
  keys: FullClientIdentityKeys | null;
  isKeysLoaded: boolean;
  isRotating: boolean;
  kemFingerprint: string | null;
  dsaFingerprint: string | null;
  verifiedContacts: Record<string, VerifiedContactKey>;
  keyAlerts: KeyChangeEvent[];
  initKeys: (userId: string, username: string) => Promise<FullClientIdentityKeys>;
  getContactKey: (username: string, refresh?: boolean) => Promise<VerifiedContactKey>;
  rotateKeys: (userId: string, username: string) => Promise<void>;
  dismissKeyAlert: (username: string) => void;
  clearKeys: () => void;
}

export const useCryptoStore = create<CryptoState>((set, get) => {
  // Listen for key substitution events
  onKeyChanged((event: KeyChangeEvent) => {
    set((state) => ({
      keyAlerts: [...state.keyAlerts.filter((a) => a.username !== event.username), event],
    }));
  });

  return {
    keys: null,
    isKeysLoaded: false,
    isRotating: false,
    kemFingerprint: null,
    dsaFingerprint: null,
    verifiedContacts: {},
    keyAlerts: [],

    initKeys: async (userId: string, username: string) => {
      try {
        let loadedKeys = await loadIdentityKeys(userId);

        if (!loadedKeys) {
          // Generate new ML-KEM-768 and ML-DSA-65 keypairs
          loadedKeys = generateFullIdentityKeys(username);
          await saveIdentityKeys(userId, loadedKeys);
        }

        const publishedKeys = await api.getUserPublicKeys(username);
        const publishedDsaKey = publishedKeys.keys.find((key) => key.algorithm === 'ML-DSA-65');
        const publishedKemKey = publishedKeys.keys.find((key) => key.algorithm === 'ML-KEM-768');
        const localDsaKey = toBase64(loadedKeys.dsaKey.publicKey);
        const localKemKey = toBase64(loadedKeys.kemKey.publicKey);

        if (
          (publishedDsaKey &&
            (publishedDsaKey.keyId !== loadedKeys.dsaKey.keyId || publishedDsaKey.publicKey !== localDsaKey)) ||
          (publishedKemKey &&
            (publishedKemKey.keyId !== loadedKeys.kemKey.keyId || publishedKemKey.publicKey !== localKemKey))
        ) {
          throw new Error('Account security settings do not match this device. Refresh the account setup before messaging.');
        }

        // Complete interrupted first-time key publication without replacing another device's current keys.
        if (!publishedDsaKey) {
          await api.registerKey({
            keyId: loadedKeys.dsaKey.keyId,
            algorithm: 'ML-DSA-65',
            publicKey: localDsaKey,
            keyVersion: loadedKeys.dsaKey.version,
          });
        }
        if (!publishedKemKey) {
          await api.registerKey({
            keyId: loadedKeys.kemKey.keyId,
            algorithm: 'ML-KEM-768',
            publicKey: localKemKey,
            keyVersion: loadedKeys.kemKey.version,
            signatureOrBinding: loadedKeys.kemBindingSignature,
            signingKeyId: loadedKeys.dsaKey.keyId,
          });
        }

        set({
          keys: loadedKeys,
          isKeysLoaded: true,
          kemFingerprint: loadedKeys.kemKey.fingerprint,
          dsaFingerprint: loadedKeys.dsaKey.fingerprint,
        });

        return loadedKeys;
      } catch (err) {
        console.error('[CryptoStore] Failed to initialize keys:', err);
        throw err;
      }
    },

    getContactKey: async (username: string, refresh = false) => {
      const cached = get().verifiedContacts[username];
      if (cached && !refresh) return cached;

      const verified = await getVerifiedContactKeys(username, api.getUserPublicKeys);
      set((state) => ({
        verifiedContacts: {
          ...state.verifiedContacts,
          [username]: verified,
        },
      }));
      return verified;
    },

    rotateKeys: async (userId: string, username: string) => {
      set({ isRotating: true });
      try {
        const currentKeys = get().keys;
        const currentVersion = currentKeys ? currentKeys.kemKey.version : 1;

        const result = await rotateClientKeys(username, currentVersion);

        // Register new keys with backend (DSA first, then KEM)
        await api.registerKey({
          keyId: result.dsaPayload.keyId,
          algorithm: result.dsaPayload.algorithm,
          publicKey: result.dsaPayload.publicKey,
          keyVersion: result.dsaPayload.keyVersion,
        });

        await api.registerKey({
          keyId: result.kemPayload.keyId,
          algorithm: result.kemPayload.algorithm,
          publicKey: result.kemPayload.publicKey,
          keyVersion: result.kemPayload.keyVersion,
          signatureOrBinding: result.kemPayload.signatureOrBinding,
          signingKeyId: result.kemPayload.signingKeyId,
        });

        await saveIdentityKeys(userId, result.newKeys);
        set({
          keys: result.newKeys,
          kemFingerprint: result.newKeys.kemKey.fingerprint,
          dsaFingerprint: result.newKeys.dsaKey.fingerprint,
          isRotating: false,
        });
      } catch (err) {
        const currentKeys = get().keys;
        if (currentKeys) {
          try {
            await saveIdentityKeys(userId, currentKeys);
          } catch (restoreErr) {
            console.error('[CryptoStore] Failed to restore the previous device credentials:', restoreErr);
          }
        }
        set({ isRotating: false });
        console.error('[CryptoStore] Key rotation failed:', err);
        throw err;
      }
    },

    dismissKeyAlert: (username: string) => {
      set((state) => ({
        keyAlerts: state.keyAlerts.filter((a) => a.username !== username),
      }));
    },

    clearKeys: () => {
      set({
        keys: null,
        isKeysLoaded: false,
        kemFingerprint: null,
        dsaFingerprint: null,
        verifiedContacts: {},
        keyAlerts: [],
      });
    },
  };
});
