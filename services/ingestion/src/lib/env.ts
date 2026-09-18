/** Reads a required Lambda environment variable or throws - fails fast into the state machine's Catch. */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} env var is required`);
  }
  return value;
}
