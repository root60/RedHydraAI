import { decrypt, encrypt, generateFingerprint, hashPassword } from './crypto';

async function deviceKey() {
  try {
    const fp = await generateFingerprint();
    return `redhydra-${hashPassword(fp + navigator.userAgent)}`;
  } catch {
    return 'redhydra-static-fallback-key';
  }
}

export async function secureSetJSON<T>(key: string, value: T) {
  const password = await deviceKey();
  const payload = await encrypt(JSON.stringify(value), password);
  localStorage.setItem(key, payload);
}

export async function secureGetJSON<T>(key: string, fallback: T): Promise<T> {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    const password = await deviceKey();
    const text = await decrypt(raw, password);
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

export function secureRemove(key: string) {
  localStorage.removeItem(key);
}
