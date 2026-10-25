import * as Crypto from 'expo-crypto';

/** SHA-256 of an E.164 number as 64 lowercase hex characters. Only this hash is stored; never the number. */
export async function hashPhone(e164: string): Promise<string> {
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, e164,
    { encoding: Crypto.CryptoEncoding.HEX });
  const hash = digest.toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(hash)) throw new Error('Unexpected phone hash format');
  return hash;
}
