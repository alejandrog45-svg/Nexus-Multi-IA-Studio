// Detects files that must never be sent to an AI provider (secrets, keys, credentials).
// Shared by the client (blocks on upload) and the server (second barrier before calling Gemini).

const SENSITIVE_NAME = /(^|[\\/])(\.env(\..*)?|\.npmrc|\.netrc|id_(rsa|dsa|ecdsa|ed25519)|credentials(\..*)?|secrets?(\..*)?|.*\.(pem|key|p12|pfx|keystore|jks))$/i;

const SENSITIVE_CONTENT: RegExp[] = [
  /AIza[0-9A-Za-z_-]{35}/, // Google API key
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/, // PEM private keys
  /\b(sk|gsk|ghp|gho|ghs|github_pat)_[A-Za-z0-9_]{20,}/, // OpenAI / Groq / GitHub tokens
  /\bAKIA[0-9A-Z]{16}\b/, // AWS access key id
  /\bxox[abprs]-[A-Za-z0-9-]{10,}/, // Slack tokens
];

export function isSensitiveFileName(name: string): boolean {
  return SENSITIVE_NAME.test(name || '');
}

export function hasSensitiveContent(content: string): boolean {
  if (!content) return false;
  return SENSITIVE_CONTENT.some((re) => re.test(content));
}

export function isSensitiveFile(name: string, content?: string): boolean {
  return isSensitiveFileName(name) || hasSensitiveContent(content || '');
}
