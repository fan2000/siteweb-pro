'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiUrl } from '../../lib/api-url';

type Session = { authenticated: boolean; email?: string; mfaEnabled?: boolean };

function csrfToken() {
  const value = document.cookie.split('; ').find((part) => part.startsWith('motif_csrf='))?.split('=').slice(1).join('=');
  return value ? decodeURIComponent(value) : '';
}

export default function AccountPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [message, setMessage] = useState('Vérification de votre session…');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(apiUrl('/auth/session'), { method: 'POST', credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Impossible de vérifier la session. Vérifiez que l’API est démarrée, puis rechargez la page.');
        const current = await response.json() as Session;
        if (!active) return;
        if (!current.authenticated) {
          router.replace('/connexion');
          return;
        }
        setSession(current);
        setMessage('Votre session est active.');
      })
      .catch((error: unknown) => {
        if (active) setMessage(error instanceof Error ? error.message : 'Impossible de vérifier la session.');
      });
    return () => { active = false; };
  }, [router]);

  async function logout() {
    setBusy(true);
    setMessage('Fermeture de la session…');
    try {
      const response = await fetch(apiUrl('/auth/logout'), {
        method: 'POST', credentials: 'include',
        headers: { 'X-CSRF-Token': csrfToken() },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? 'La déconnexion a échoué. Réessayez.');
      document.cookie = `motif_csrf=; path=/; max-age=0; SameSite=Strict${location.protocol === 'https:' ? '; Secure' : ''}`;
      router.replace('/connexion');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'La déconnexion a échoué. Réessayez.');
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-page">
    <Link className="brand" href="/">MOTIF<span className="period">.</span></Link>
    <section className="auth-card account-card" aria-labelledby="account-title">
      <span className="eyebrow">VOTRE ESPACE</span>
      <h1 id="account-title">Bienvenue<br/><em>chez vous.</em></h1>
      <p role="status">{message}</p>
      {session && <>
        <div className="account-details"><span>Connecté avec</span><strong>{session.email}</strong><span>Authentification forte</span><strong>{session.mfaEnabled ? 'Activée' : 'À configurer'}</strong></div>
        {!session.mfaEnabled && <p>Renforcez la sécurité de votre compte avec une application d’authentification.</p>}
        <Link className="button primary" href="/">Explorer les offres ↗</Link>
        <Link href="/compte/securite">{session.mfaEnabled ? 'Gérer l’authentification forte' : 'Configurer l’authentification forte'} ↗</Link>
        <button className="button text-button" type="button" onClick={logout} disabled={busy}>{busy ? 'Déconnexion…' : 'Se déconnecter'}</button>
      </>}
      {!session && <Link href="/">Retourner à l’accueil ↗</Link>}
    </section>
  </main>;
}
