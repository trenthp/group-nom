'use client'

export default function GlobalError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #f97316, #dc2626)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <h1 style={{ color: 'white', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
              Something went wrong
            </h1>
            <p style={{ color: '#fed7aa', marginBottom: '1.5rem' }}>
              We hit an unexpected error. Please try again.
            </p>
            <button
              onClick={reset}
              style={{
                background: 'white',
                color: '#ea580c',
                fontWeight: 600,
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer',
                marginRight: '0.5rem',
              }}
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.href = '/'}
              style={{
                background: '#c2410c',
                color: 'white',
                fontWeight: 600,
                padding: '0.75rem 1.5rem',
                borderRadius: '0.5rem',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Go Home
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
