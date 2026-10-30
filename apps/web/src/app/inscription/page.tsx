'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { PasswordInput } from '../../components/password-input';
import { apiUrl } from '../../lib/api-url';
export default function RegisterPage() {
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const [resending, setResending] = useState(false); const [canResend, setCanResend] = useState(false); const [email, setEmail] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(''); const form = new FormData(event.currentTarget); const submittedEmail = String(form.get('email') ?? ''); setEmail(submittedEmail);
    try {
      const response = await fetch(apiUrl('/auth/register'), { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email:submittedEmail,password:form.get('password')}) });
      const result = await response.json(); if (!response.ok) { if (response.status === 409) setCanResend(true); throw new Error(result.message ?? 'Inscription impossible'); }
      setMessage('Compte créé. Consultez votre boîte e-mail pour confirmer votre adresse avant de vous connecter.');
      setCanResend(true);
    } catch(error) { setMessage(error instanceof Error ? error.message : 'API indisponible'); } finally { setBusy(false); }
  }
  async function resend() {
    setResending(true);
    try {
      const response = await fetch(apiUrl('/auth/resend-verification'), { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email}) });
      const result = await response.json(); if (!response.ok) throw new Error(result.message ?? 'Envoi impossible');
      setMessage(result.message); setCanResend(false);
    } catch(error) { setMessage(error instanceof Error ? error.message : 'Envoi impossible'); } finally { setResending(false); }
  }
  return <main className="auth-page"><Link className="brand" href="/">MOTIF<span className="period">.</span></Link><form className="auth-card" onSubmit={submit}><span className="eyebrow">CRÉER VOTRE ESPACE</span><h1>La tech, à<br/><em>votre façon.</em></h1><p>Une adresse vérifiée et un mot de passe long protègent votre compte.</p><label>Adresse e-mail<input name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event=>setEmail(event.target.value)}/></label><label htmlFor="register-password">Mot de passe</label><PasswordInput id="register-password" name="password" autoComplete="new-password" required minLength={14} maxLength={128}/><small>14 caractères minimum.</small><button className="button primary" disabled={busy}>{busy?'Création…':'Créer mon compte ↗'}</button>{message&&<p className="auth-message" role="status">{message}</p>}{canResend&&<button className="button primary" type="button" disabled={resending} onClick={resend}>{resending?'Envoi…':'Renvoyer le lien de confirmation ↗'}</button>}<small>Un e-mail de confirmation vous sera envoyé. Le lien expire après 30 minutes.</small><Link href="/connexion">Déjà un compte ? Se connecter ↗</Link></form></main>;
}
