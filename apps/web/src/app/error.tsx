'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error to any monitoring wired to the console in production.
    console.error(error);
  }, [error]);

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
          'radial-gradient(1200px 600px at 80% -10%, rgba(239,68,68,.10), transparent 60%), #09090f',
        color: '#e7e7ee',
      }}
    >
      <p style={{ fontSize: 56, margin: 0 }}>⚠️</p>
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Qualcosa è andato storto</h1>
      <p style={{ fontSize: 14, color: '#a1a1b5', margin: 0, maxWidth: 380 }}>
        Si è verificato un errore imprevisto. Puoi riprovare — se il problema persiste, ricarica la
        pagina.
      </p>
      <div style={{ display: 'flex', gap: 12, marginTop: 6 }}>
        <button
          onClick={reset}
          style={{
            padding: '11px 20px',
            border: 'none',
            borderRadius: 12,
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Riprova
        </button>
        <a
          href="/dashboard"
          style={{
            padding: '11px 20px',
            borderRadius: 12,
            border: '1px solid #1e1e2e',
            background: '#15151d',
            color: '#e7e7ee',
            fontSize: 14,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Dashboard
        </a>
      </div>
    </div>
  );
}
