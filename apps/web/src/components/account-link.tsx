'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiUrl } from '../lib/api-url';

export function AccountLink() {
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(apiUrl('/auth/session'), { method: 'POST', credentials: 'include' })
      .then(async (response) => response.ok ? response.json() : null)
      .then((session) => { if (active) setAuthenticated(Boolean(session?.authenticated)); })
      .catch(() => { if (active) setAuthenticated(false); });
    return () => { active = false; };
  }, []);

  return <Link className="login-link" href={authenticated ? '/compte' : '/connexion'}>
    {authenticated ? 'Mon compte' : 'Connexion'} <span>↗</span>
  </Link>;
}
