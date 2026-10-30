'use client';

import { FormEvent, useState } from 'react';

const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
export default function LoginPage() {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${api}/auth/login`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: data.get('email'), password: data.get('password'), code: data.get('code') || undefined }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? 'Connexion impossible');
      document.cookie = `motif_csrf=${encodeURIComponent(result.csrf)}; path=/; SameSite=Strict${location.protocol === 'https:' ? '; Secure' : ''}`;
      setAuthenticated(true);
      setMessage(result.mfaEnabled ? 'Connexion réussie. La session utilise votre code MFA.' : 'Session ouverte. Activez le MFA pour renforcer la protection du compte.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'API indisponible'); }
    finally { setBusy(false); }
  }
  return <main className="auth-page"><a className="brand" href="/">MOTIF<span className="period">.</span></a><form className="auth-card" onSubmit={submit}><span className="eyebrow">VOTRE ESPACE</span><h1>Ravi de vous<br/><em>revoir.</em></h1><p>Connectez-vous pour retrouver vos sélections enregistrées.</p><label>Adresse e-mail<input name="email" type="email" autoComplete="email" required maxLength={254}/></label><label>Mot de passe<input name="password" type="password" autoComplete="current-password" required minLength={14} maxLength={128}/></label><label>Code d’authentification <small>(si le MFA est activé)</small><input name="code" inputMode="numeric" autoComplete="one-time-code" minLength={6} maxLength={32}/></label><button className="button primary" disabled={busy}>{busy?'Connexion…':'Se connecter ↗'}</button>{message&&<p className="auth-message" role="status">{message}</p>}{authenticated&&<a href="/compte/securite">Configurer ou gérer l’authentification forte ↗</a>}<small>L’inscription de production est désactivée tant que la livraison des e-mails de vérification n’est pas configurée.</small><a href="/inscription">Nouveau ici ? Créer un compte ↗</a></form></main>;
}
