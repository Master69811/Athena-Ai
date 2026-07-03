import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        padding: 24,
        textAlign: 'center',
        background:
          'radial-gradient(1200px 600px at 80% -10%, rgba(99,102,241,.10), transparent 60%), #09090f',
        color: '#e7e7ee',
      }}
    >
      <p
        style={{
          fontSize: 72,
          fontWeight: 800,
          margin: 0,
          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        404
      </p>
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Pagina non trovata</h1>
      <p style={{ fontSize: 14, color: '#a1a1b5', margin: 0, maxWidth: 360 }}>
        La pagina che cerchi non esiste o è stata spostata.
      </p>
      <Link
        href="/dashboard"
        style={{
          marginTop: 6,
          padding: '11px 20px',
          borderRadius: 12,
          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          color: '#fff',
          fontSize: 14,
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        Torna alla dashboard
      </Link>
    </div>
  );
}
