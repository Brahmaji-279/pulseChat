import { fromBase64, toBase64 } from './key-generation.js';

export interface EncryptedAttachment {
  blob: Blob;
  key: string;
  iv: string;
}

export async function encryptAttachment(file: File): Promise<EncryptedAttachment> {
  const keyBytes = crypto.getRandomValues(new Uint8Array(32));
  const ivBytes = crypto.getRandomValues(new Uint8Array(12));
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: ivBytes },
    key,
    await file.arrayBuffer()
  );

  return {
    blob: new Blob([ciphertext], { type: 'application/octet-stream' }),
    key: toBase64(keyBytes),
    iv: toBase64(ivBytes),
  };
}

export async function decryptAttachment(
  ciphertext: ArrayBuffer,
  keyBase64: string,
  ivBase64: string,
  mimeType: string
): Promise<Blob> {
  const keyBytes = new Uint8Array(fromBase64(keyBase64));
  const ivBytes = new Uint8Array(fromBase64(ivBase64));
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt']);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    key,
    ciphertext
  );
  return new Blob([plaintext], { type: mimeType || 'application/octet-stream' });
}
