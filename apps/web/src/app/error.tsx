'use client';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="auth-page"><section className="auth-card"><span className="eyebrow">MOTIF · INDISPONIBLE</span><h1>Un petit<br/><em>contretemps.</em></h1><p>La page n’a pas pu se charger correctement.</p><button className="button primary" onClick={reset}>Réessayer ↗</button></section></main>;
}
