export const CURRENT_PROTOCOL_VERSION = 'pulse-v1-mlkem768-mldsa65';

export const SUPPORTED_PROTOCOL_VERSIONS = [
  'pulse-v1-mlkem768-mldsa65',
] as const;

export type SupportedProtocolVersion = typeof SUPPORTED_PROTOCOL_VERSIONS[number];

export function isSupportedProtocolVersion(version: string): version is SupportedProtocolVersion {
  return (SUPPORTED_PROTOCOL_VERSIONS as readonly string[]).includes(version);
}

export function assertCompatibleProtocol(version: string): void {
  if (!isSupportedProtocolVersion(version)) {
    throw new Error(
      `Unsupported protocol version: "${version}". PulseChat client requires "${CURRENT_PROTOCOL_VERSION}". Downgrade attacks are rejected.`
    );
  }
}
