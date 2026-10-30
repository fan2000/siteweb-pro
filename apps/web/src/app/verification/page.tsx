'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { apiUrl } from '../../lib/api-url';
export default function VerificationPage() {
  const [message, setMessage] = useState('Vérification en cours…');
  const [email, setEmail] = useState('');
  const [canResend, setCanResend] = useState(false);
  const [resending, setResending] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = new URLSearchParams(window.location.hash.slice(1)).get('token');
    window.history.replaceState(window.history.state, '', window.location.pathname);
    if (!token) {
      Promise.resolve().then(() => { setMessage('Lien de vérification incomplet ou déjà utilisé.'); setCanResend(true); });
      return;
    }

    fetch(apiUrl('/auth/verify-email'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message ?? 'Lien invalide ou expiré');
        setMessage(result.alreadyVerified ? 'Cette adresse a déjà été confirmée. Vous pouvez vous connecter.' : 'Adresse vérifiée. Vous pouvez vous connecter.');
      })
      .catch((error: unknown) => { setMessage(error instanceof Error ? error.message : 'Vérification impossible'); setCanResend(true); });
  }, []);

  async function resend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResending(true);
    try {
      const response = await fetch(apiUrl('/auth/resend-verification'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? 'Envoi impossible');
      setMessage(result.message);
      setCanResend(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Envoi impossible');
    } finally {
      setResending(false);
    }
  }

  return <main className="auth-page"><Link className="brand" href="/">MOTIF<span className="period">.</span></Link><section className="auth-card"><span className="eyebrow">CONFIRMATION</span><h1>Votre adresse<br/><em>e-mail.</em></h1><p className="auth-message" role="status">{message}</p>{canResend&&<form onSubmit={resend}><label>Adresse e-mail<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={event=>setEmail(event.target.value)}/></label><button className="button primary" disabled={resending}>{resending?'Envoi…':'Renvoyer le lien ↗'}</button></form>}<Link className="button primary" href="/connexion">Aller à la connexion ↗</Link></section></main>;
}
