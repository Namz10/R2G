export async function sha256(input: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = enc.encode(input);
  const hashBuf = await crypto.subtle.digest('SHA-256', buf);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map(b => b.toString(16).padStart(2, '0')).join('');
}
