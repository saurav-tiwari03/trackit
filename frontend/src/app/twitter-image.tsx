import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 1200, height: 600 };
export const contentType = 'image/png';
export const alt = 'TrackIt - Clean Task & Project Manager';

export default async function TwitterImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 64,
          backgroundColor: '#0b0b0f',
          backgroundImage:
            'radial-gradient(900px 500px at 25% 30%, rgba(99,102,241,0.35), transparent), radial-gradient(900px 500px at 85% 20%, rgba(34,197,94,0.22), transparent)',
          backgroundRepeat: 'no-repeat',
          color: 'white',
          fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.05 }}>TrackIt</div>
          <div style={{ fontSize: 24, opacity: 0.85, maxWidth: 720, lineHeight: 1.35 }}>
            The task manager that actually gets USED.
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
            {['Inbox', 'Projects', 'Calendar', 'Habits', 'Notes'].map((t) => (
              <div
                key={t}
                style={{
                  fontSize: 16,
                  padding: '10px 14px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                }}
              >
                {t}
              </div>
            ))}
          </div>
          {/* CTA */}
          <div
            style={{
              marginTop: 16,
              fontSize: 18,
              fontWeight: 600,
              padding: '14px 28px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white',
              width: 'fit-content',
            }}
          >
            Try Free →
          </div>
        </div>

        {/* Logo on right */}
        <div
          style={{
            width: 140,
            height: 140,
            borderRadius: 34,
            background: 'linear-gradient(135deg, #6366f1 0%, #22c55e 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 900,
              color: 'white',
            }}
          >
            T
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
