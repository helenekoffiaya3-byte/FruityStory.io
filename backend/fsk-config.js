/**
 * FruityStory Developer Platform — FSK (FruityStory Key)
 *
 * FSK is the internal provider/API-key configuration contract.
 * Secrets are NEVER generated from or stored in the frontend.
 * Runtime/provider secrets must be supplied through Netlify environment variables.
 */

export const FSK_CONFIG = Object.freeze({
  prefix: "fsk_live_",
  name: "FruityStory Key",
  environment: "live",
  apiVersion: "v1",
  scopes: [
    "video:generate",
    "video:read",
    "video:publish",
    "developer:keys",
  ],
});

export function getFskRuntimeConfig(env = process.env) {
  return {
    issuer: env.FSK_ISSUER || "FruityStory.io",
    apiBaseUrl: env.FSK_API_BASE_URL || "/api/v1",
    signingSecretConfigured: Boolean(env.FSK_SIGNING_SECRET),
    providerSecretConfigured: Boolean(env.FSK_PROVIDER_SECRET),
  };
}

export function assertFskServerConfiguration(env = process.env) {
  if (!env.FSK_SIGNING_SECRET) {
    throw new Error("Missing FSK_SIGNING_SECRET server secret");
  }
  return true;
}
