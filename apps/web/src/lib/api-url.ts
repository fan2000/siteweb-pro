const DEFAULT_API_URL = 'http://localhost:4000/api';
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1']);

export function apiUrl(path: string) {
  const configured = process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL;
  const endpoint = new URL(configured);

  if (typeof window !== 'undefined' && LOOPBACK_HOSTS.has(window.location.hostname) && LOOPBACK_HOSTS.has(endpoint.hostname)) {
    endpoint.hostname = window.location.hostname;
  }

  return new URL(path.replace(/^\/+/, ''), `${endpoint.toString().replace(/\/+$/, '')}/`).toString();
}
