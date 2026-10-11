/** Public key classification only; this does not authenticate a JWT. */
export function isPublicSupabaseKey(value: string) {
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(value)) return true;
  try {
    const parts = value.split(".");
    if (
      parts.length !== 3 ||
      !parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))
    )
      return false;
    const payload = parts[1].replaceAll("-", "+").replaceAll("_", "/");
    return JSON.parse(atob(payload)).role === "anon";
  } catch {
    return false;
  }
}

/** Stop a misconfigured build before privileged credentials reach browser assets. */
export function validatePublicBuildEnv(
  env: Record<string, string | undefined>,
) {
  for (const [name, value] of Object.entries(env)) {
    if (
      value &&
      name.startsWith("VITE_") &&
      /SECRET|SERVICE_ROLE|PASSWORD|PRIVATE_KEY/i.test(name)
    )
      throw new Error(
        "Server secrets must not use a VITE_ environment variable.",
      );
  }
  for (const name of [
    "VITE_SUPABASE_ANON_KEY",
    "VITE_SUPABASE_PUBLISHABLE_KEY",
  ]) {
    if (env[name] && !isPublicSupabaseKey(env[name].trim()))
      throw new Error(
        "The Supabase browser key must be a publishable key or legacy anon key.",
      );
  }
}
