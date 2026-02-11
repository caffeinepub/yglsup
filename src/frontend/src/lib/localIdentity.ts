import { Ed25519KeyIdentity } from '@dfinity/identity';

const IDENTITY_STORAGE_KEY = 'yglsup_local_identity';

/**
 * Generate a new Ed25519 keypair identity
 */
export function generateIdentity(): Ed25519KeyIdentity {
  return Ed25519KeyIdentity.generate();
}

/**
 * Serialize identity to JSON string for storage
 */
export function serializeIdentity(identity: Ed25519KeyIdentity): string {
  const keyPair = identity.getKeyPair();
  return JSON.stringify({
    publicKey: Array.from(keyPair.publicKey.toDer()),
    secretKey: Array.from(keyPair.secretKey),
  });
}

/**
 * Deserialize identity from JSON string
 */
export function deserializeIdentity(serialized: string): Ed25519KeyIdentity {
  const { publicKey, secretKey } = JSON.parse(serialized);
  return Ed25519KeyIdentity.fromSecretKey(Uint8Array.from(secretKey));
}

/**
 * Load identity from localStorage, or generate and save a new one
 */
export function loadOrCreateIdentity(): Ed25519KeyIdentity {
  try {
    const stored = localStorage.getItem(IDENTITY_STORAGE_KEY);
    if (stored) {
      return deserializeIdentity(stored);
    }
  } catch (error) {
    console.warn('Failed to load stored identity, generating new one:', error);
  }

  // Generate new identity and save it
  const newIdentity = generateIdentity();
  saveIdentity(newIdentity);
  return newIdentity;
}

/**
 * Save identity to localStorage
 */
export function saveIdentity(identity: Ed25519KeyIdentity): void {
  try {
    const serialized = serializeIdentity(identity);
    localStorage.setItem(IDENTITY_STORAGE_KEY, serialized);
  } catch (error) {
    console.error('Failed to save identity:', error);
  }
}

/**
 * Clear stored identity from localStorage
 */
export function clearIdentity(): void {
  localStorage.removeItem(IDENTITY_STORAGE_KEY);
}
