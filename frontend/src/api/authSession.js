// Expiry is only a client-side UX check. The server still verifies the signature.
export function isTokenExpired(token, now = Date.now()) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(payload));
    return typeof exp === 'number' && exp * 1000 <= now;
  } catch {
    return false; // Unknown/malformed tokens must still be rejected by the server.
  }
}

export function expireSession(token) {
  if (!token || localStorage.getItem('token') !== token) return false;
  ['token', 'role', 'username'].forEach(key => localStorage.removeItem(key));
  window.dispatchEvent(new Event('auth:expired'));
  return true;
}
