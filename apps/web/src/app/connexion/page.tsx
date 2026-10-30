'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PasswordInput } from '../../components/password-input';
import { apiUrl } from '../../lib/api-url';

export default function LoginPage() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  useEffect(() => {
    let active = true;
    fetch(apiUrl('/auth/session'), { method: 'POST', credentials: 'include' })
      .then(async (response) => response.ok ? response.json() : null)
      .then((session) => {
        if (active && session?.authenticated) router.replace('/');
      })
      .catch(() => undefined)
      .finally(() => { if (active) setCheckingSession(false); });
    return () => { active = false; };
  }, [router]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch(apiUrl('/auth/login'), { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: data.get('email'), password: data.get('password'), code: data.get('code') || undefined }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? 'Connexion impossible');
      const sessionResponse = await fetch(apiUrl('/auth/session'), { method: 'POST', credentials: 'include' });
      const session = await sessionResponse.json();
      if (!sessionResponse.ok || !session.authenticated) throw new Error('Connexion non établie. Ouvrez le site et l’API avec le même hôte (localhost ou 127.0.0.1), puis réessayez.');
      document.cookie = `motif_csrf=${encodeURIComponent(result.csrf)}; path=/; SameSite=Strict${location.protocol === 'https:' ? '; Secure' : ''}`;
      setMessage('Connexion réussie. Ouverture de votre espace…');
      router.replace('/');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'API indisponible'); }
    finally { setBusy(false); }
  }
  return <main className="auth-page"><Link className="brand" href="/">MOTIF<span className="period">.</span></Link><form className="auth-card" onSubmit={submit}><span className="eyebrow">VOTRE ESPACE</span><h1>Ravi de vous<br/><em>revoir.</em></h1><p>Connectez-vous pour retrouver vos sélections enregistrées.</p><label>Adresse e-mail<input name="email" type="email" autoComplete="email" required maxLength={254}/></label><label htmlFor="login-password">Mot de passe</label><PasswordInput id="login-password" name="password" autoComplete="current-password" required minLength={14} maxLength={128}/><label>Code d’authentification <small>(si le MFA est activé)</small><input name="code" inputMode="numeric" autoComplete="one-time-code" minLength={6} maxLength={32}/></label><button className="button primary" disabled={busy||checkingSession}>{checkingSession?'Vérification…':busy?'Connexion…':'Se connecter ↗'}</button>{message&&<p className="auth-message" role="status">{message}</p>}<small>Vous devez confirmer votre adresse e-mail avant votre première connexion.</small><Link href="/inscription">Nouveau ici ? Créer un compte ↗</Link></form></main>;
}
