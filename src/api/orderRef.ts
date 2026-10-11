/** A cryptographically random reference shared by catalog and custom enquiries. */
export function makeOrderReference() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const code = Array.from(crypto.getRandomValues(new Uint8Array(10)), value => alphabet[value % alphabet.length]).join("")
  return `WS-${new Date().getFullYear()}-${code}`
}
