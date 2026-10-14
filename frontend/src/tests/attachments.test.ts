import { describe, expect, it } from 'vitest';
import { decryptAttachment, encryptAttachment } from '../crypto/attachments.js';

describe('encrypted attachments', () => {
  it('round-trips binary content with its generated decryption key', async () => {
    const originalBytes = new Uint8Array([0, 1, 2, 127, 128, 255]);
    const file = new File([originalBytes], 'sample.bin', { type: 'application/octet-stream' });

    const encrypted = await encryptAttachment(file);
    const decrypted = await decryptAttachment(
      await encrypted.blob.arrayBuffer(),
      encrypted.key,
      encrypted.iv,
      file.type
    );

    expect(Array.from(new Uint8Array(await decrypted.arrayBuffer()))).toEqual(Array.from(originalBytes));
    expect(encrypted.key).not.toBe('');
    expect(encrypted.iv).not.toBe('');
  });
});
