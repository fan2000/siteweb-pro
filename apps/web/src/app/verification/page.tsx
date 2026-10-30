'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
const api = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
function VerificationContent() {
  const params = useSearchParams(); const token = params.get('token'); const [message,setMessage]=useState('Vérification en cours…');
  useEffect(()=>{ if(!token){setMessage('Lien de vérification incomplet.');return;} fetch(`${api}/auth/verify-email`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})}).then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.message??'Lien invalide ou expiré');setMessage('Adresse vérifiée. Vous pouvez vous connecter.');}).catch(e=>setMessage(e instanceof Error?e.message:'Vérification impossible'));},[token]);
  return <main className="auth-page"><a className="brand" href="/">MOTIF<span className="period">.</span></a><section className="auth-card"><span className="eyebrow">CONFIRMATION</span><h1>Votre adresse<br/><em>e-mail.</em></h1><p className="auth-message" role="status">{message}</p><a className="button primary" href="/connexion">Aller à la connexion ↗</a></section></main>;
}
export default function VerificationPage() { return <Suspense fallback={<main className="auth-page"><p>Vérification en cours…</p></main>}><VerificationContent/></Suspense>; }
