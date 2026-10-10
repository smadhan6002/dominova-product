// Browser-native cryptographic hashing using Web Crypto API
// Never stores plain passwords; uses SHA-256 with a unique cryptographic salt

export async function hashPassword(password: string, salt?: string): Promise<{ hash: string; salt: string }> {
  const enc = new TextEncoder()
  const useSalt = salt || Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  
  const salted = enc.encode(`${useSalt}:${password}`)
  const hashBuffer = await crypto.subtle.digest('SHA-256', salted)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

  return { hash, salt: useSalt }
}

export async function verifyPassword(password: string, expectedHash: string, salt: string): Promise<boolean> {
  const { hash } = await hashPassword(password, salt)
  return hash === expectedHash
}
