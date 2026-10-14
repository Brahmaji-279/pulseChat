import React, { useEffect, useState } from 'react';
import { Download, FileText, Loader2 } from 'lucide-react';
import { decryptAttachment } from '../crypto/attachments.js';
import { resolveAssetUrl } from '../services/api.js';

interface DecryptedAttachmentProps {
  url: string;
  type: 'image' | 'file';
  fileName?: string;
  fileSize?: number;
  keyBase64?: string;
  ivBase64?: string;
  mimeType?: string;
}

export const DecryptedAttachment: React.FC<DecryptedAttachmentProps> = ({
  url,
  type,
  fileName,
  fileSize,
  keyBase64,
  ivBase64,
  mimeType,
}) => {
  const [decryptedUrl, setDecryptedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;
    setDecryptedUrl(null);
    setError(null);

    const loadAttachment = async () => {
      if (!keyBase64 || !ivBase64) {
        throw new Error('This attachment is missing its decryption key.');
      }
      const response = await fetch(resolveAssetUrl(url)!, { signal: controller.signal });
      if (!response.ok) throw new Error('The attachment could not be downloaded.');
      const blob = await decryptAttachment(await response.arrayBuffer(), keyBase64, ivBase64, mimeType || '');
      objectUrl = URL.createObjectURL(blob);
      setDecryptedUrl(objectUrl);
    };

    void loadAttachment().catch((err: unknown) => {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : 'The attachment could not be decrypted.');
      }
    });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, keyBase64, ivBase64, mimeType]);

  if (error) return <span className="text-xs text-red-300">{error}</span>;
  if (!decryptedUrl) {
    return (
      <span className="flex items-center gap-2 text-xs text-white/50">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Decrypting attachment…
      </span>
    );
  }

  if (type === 'image') {
    return (
      <a href={decryptedUrl} target="_blank" rel="noreferrer">
        <img
          src={decryptedUrl}
          alt={fileName || 'Shared image'}
          className="max-h-72 max-w-full rounded-lg object-contain"
        />
      </a>
    );
  }

  return (
    <a
      href={decryptedUrl}
      download={fileName || true}
      className="flex items-center gap-2 text-violet-200 hover:text-white"
    >
      <FileText className="w-4 h-4 shrink-0" />
      <span className="break-all underline">{fileName || 'Download attachment'}</span>
      <Download className="w-3.5 h-3.5 shrink-0" />
      {fileSize ? (
        <span className="text-[10px] text-white/40 shrink-0">
          {(fileSize / (1024 * 1024)).toFixed(1)} MB
        </span>
      ) : null}
    </a>
  );
};
