'use client';

import { FormEvent, useState } from 'react';
const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
export default function RegisterPage() {
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(''); const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(`${api}/auth/register`, { method:'POST', credentials:'include', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email:form.get('email'),password:form.get('password')}) });
      const result = await response.json(); if (!response.ok) throw new Error(result.message ?? 'Inscription impossible');
      setMessage('Compte créé. En développement, le lien de vérification est visible dans le journal du serveur API.');
    } catch(error) { setMessage(error instanceof Error ? error.message : 'API indisponible'); } finally { setBusy(false); }
  }
  return <main className="auth-page"><a className="brand" href="/">MOTIF<span className="period">.</span></a><form className="auth-card" onSubmit={submit}><span className="eyebrow">CRÉER VOTRE ESPACE</span><h1>La tech, à<br/><em>votre façon.</em></h1><p>Une adresse vérifiée et un mot de passe long protègent votre compte.</p><label>Adresse e-mail<input name="email" type="email" autoComplete="email" required maxLength={254}/></label><label>Mot de passe<input name="password" type="password" autoComplete="new-password" required minLength={14} maxLength={128}/><small>14 caractères minimum.</small></label><button className="button primary" disabled={busy}>{busy?'Création…':'Créer mon compte ↗'}</button>{message&&<p className="auth-message" role="status">{message}</p>}<small>Un service e-mail transactionnel est requis en production; l’inscription production est donc désactivée pour le moment.</small><a href="/connexion">Déjà un compte ? Se connecter ↗</a></form></main>;
}
