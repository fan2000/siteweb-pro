const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1']);

export function getAllowedWebOrigins() {
  const configured = process.env.WEB_ORIGIN;
  if (!configured) return [];

  let configuredUrl: URL;
  try {
    configuredUrl = new URL(configured);
  } catch {
    return [];
  }

  const allowed = new Set([configuredUrl.origin]);
  if (process.env.NODE_ENV !== 'production' && configuredUrl.protocol === 'http:' && LOOPBACK_HOSTS.has(configuredUrl.hostname)) {
    for (const hostname of LOOPBACK_HOSTS) {
      allowed.add(new URL(`http://${hostname}:${configuredUrl.port || '80'}`).origin);
    }
  }

  return [...allowed];
}

export function isAllowedWebOrigin(origin: string | undefined) {
  return typeof origin === 'string' && getAllowedWebOrigins().includes(origin);
}
