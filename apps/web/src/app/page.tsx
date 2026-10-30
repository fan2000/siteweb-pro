import Image from 'next/image';
import Catalog from '@/components/catalog';
import { AccountLink } from '@/components/account-link';

const offers = [
  { id:'audio-studio-01', name:'Casque Studio Form', category:'Audio', kind:'Affiliation', price:189, image:'/assets/headphones.svg', description:'Un casque enveloppant pour les longues sessions d’écoute.', demo:true },
  { id:'desk-dock-02', name:'Hub de bureau Link 8', category:'Bureau', kind:'Dropshipping', price:74, image:'/assets/dock.svg', description:'Un point de connexion clair pour votre espace de travail.', demo:true },
  { id:'creative-suite-03', name:'Suite créative en ligne', category:'Logiciels', kind:'Service partenaire', price:18, image:'/assets/creative.svg', description:'Un espace en ligne pour structurer et partager vos créations.', demo:true },
  { id:'audio-pods-04', name:'Écouteurs Air Mini', category:'Audio', kind:'Dropshipping', price:59, image:'/assets/earbuds.svg', description:'Un format nomade pour vos journées en mouvement.', demo:true },
  { id:'home-lamp-05', name:'Lampe de bureau Halo', category:'Maison', kind:'Dropshipping', price:96, image:'/assets/lamp.svg', description:'Un éclairage d’appoint pensé pour le coin bureau.', demo:true },
  { id:'security-cloud-06', name:'Espace sécurisé en ligne', category:'Logiciels', kind:'Service partenaire', price:6, image:'/assets/security.svg', description:'Un service en ligne pour garder ses accès à portée de main.', demo:true },
  { id:'desk-keys-07', name:'Clavier compact Form 68', category:'Bureau', kind:'Dropshipping', price:112, image:'/assets/keyboard.svg', description:'Un clavier compact pour libérer de la place sur le bureau.', demo:true },
  { id:'studio-tool-08', name:'Outil de travail en équipe', category:'Logiciels', kind:'Service partenaire', price:12, image:'/assets/creative.svg', description:'Un espace numérique pour rassembler les projets et les échanges.', demo:true },
];

export default async function Home() {
  let catalog = offers;
  try {
    const origin = process.env.API_ORIGIN ?? 'http://localhost:4000/api';
    const response = await fetch(`${origin}/offers`, { cache: 'no-store', signal: AbortSignal.timeout(1800) });
    if (response.ok) {
      const rows = await response.json();
      if (Array.isArray(rows) && rows.length) catalog = rows.map((row) => ({
        id: row.id, name: row.name, category: row.category,
        kind: ({ AFFILIATE: 'Affiliation', DROPSHIP: 'Dropshipping', SERVICE: 'Service partenaire' } as Record<string, string>)[row.kind] ?? 'Offre partenaire',
        price: row.priceCents / 100, image: row.image, description: row.description, demo: row.demo,
      }));
    }
  } catch { /* Keep the visibly marked local demo catalogue available while API/DB are starting. */ }
  return <main>
    <div className="announcement"><span className="live-dot"/> La bonne tech, au bon endroit. <span className="announcement-sep">|</span> Matériel · Logiciels · Services <a href="#catalogue">Explorer ↗</a></div>
    <header className="header"><a className="brand" href="#top"><Image src="/assets/mark.svg" width={36} height={36} alt=""/> <span>MOTIF<span className="period">.</span></span></a><nav><a href="#catalogue">Explorer</a><a href="#parcours">Comment ça marche</a><a href="#services">Services numériques</a></nav><AccountLink/></header>
    <section className="hero" id="top"><div className="hero-copy"><div className="kicker"><span>LA TECH, MIEUX CHOISIE</span><i/> Édition Nº 01</div><h1>Tout ce qu’il<br/>vous faut.<br/><em>Rien de trop.</em></h1><p>Du bon matériel aux services numériques qui simplifient la vie. Découvrez, comparez et choisissez comment acheter.</p><div className="hero-actions"><a className="button primary" href="#catalogue">Explorer les trouvailles <span>↘</span></a><a className="button text-button" href="#services">Voir les services ↗</a></div><div className="hero-note"><span>✳</span><p>Des offres sélectionnées.<br/><b>À vous de décider.</b></p><strong>08<small>offres à explorer</small></strong></div></div><div className="hero-art"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><span className="art-stamp">ACCESSOIRES<br/>& IDÉES FUTÉES<br/><small>01 — 08</small></span><Image className="hero-product" src="/assets/headphones.svg" width={430} height={380} alt="Illustration de casque audio" priority/><span className="hero-caption">CHOISI AVEC INTENTION · 2026</span></div></section>
    <div className="ticker" aria-label="Univers MOTIF"><div className="ticker-track">MATÉRIEL DE TOUS LES JOURS <b>✳</b> OUTILS NUMÉRIQUES <b>✳</b> PARCOURS TRANSPARENTS <b>✳</b> MATÉRIEL DE TOUS LES JOURS <b>✳</b> OUTILS NUMÉRIQUES <b>✳</b> PARCOURS TRANSPARENTS <b>✳</b></div></div>
    <Catalog offers={catalog}/>
    <section className="service-section" id="services"><div><span className="eyebrow">02 / DIGITAL</span><h2>Pas seulement<br/><em>des objets.</em></h2><p>Les bons services numériques peuvent aussi faire gagner du temps et ouvrir de nouvelles possibilités.</p><a className="button primary" href="#catalogue">Explorer les services ↗</a></div><div className="service-visual"><div className="orbit-ring ring-a"/><div className="orbit-ring ring-b"/><div className="service-core">M<span>✳</span></div><span className="service-chip chip-a">✎ &nbsp;Créer</span><span className="service-chip chip-b">⌁ &nbsp;Protéger</span><span className="service-chip chip-c">▦ &nbsp;S’organiser</span></div></section>
    <section className="how-section" id="parcours"><div className="section-heading"><div><span className="eyebrow">COMMENT ÇA MARCHE</span><h2>Simple comme<br/><em>ça devrait l’être.</em></h2></div><p>Un seul endroit pour découvrir. Des parcours clairs jusqu’à l’achat.</p></div><div className="steps"><article><span>01</span><h3>Explorez</h3><p>Parcourez les offres par univers, prix ou mode d’achat.</p></article><article><span>02</span><h3>Comparez</h3><p>Comprenez le produit, le vendeur et la suite avant de choisir.</p></article><article><span>03</span><h3>Achetez à votre façon</h3><p>Les offres affiliées redirigent vers le partenaire; les produits physiques suivent le parcours du vendeur.</p></article></div></section>
    <footer><a className="brand" href="#top"><Image src="/assets/mark.svg" width={32} height={32} alt=""/> MOTIF<span className="period">.</span></a><p>La tech qui fait le job.<br/><span>Certains liens pourront être affiliés. Les offres visibles sont des exemples de démonstration.</span></p><small>© 2026 MOTIF · La sélection vous appartient.</small></footer>
  </main>;
}
