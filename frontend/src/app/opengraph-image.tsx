import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'TrackIt - Clean Task & Project Manager';

export default async function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 64,
          backgroundColor: '#0b0b0f',
          backgroundImage:
            'radial-gradient(1000px 500px at 30% 20%, rgba(99,102,241,0.35), transparent), radial-gradient(900px 500px at 80% 10%, rgba(34,197,94,0.25), transparent)',
          backgroundRepeat: 'no-repeat',
          color: 'white',
          fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
        }}
      >
        {/* Top: Logo and brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: 'linear-gradient(135deg, #6366f1 0%, #22c55e 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                fontSize: 36,
                fontWeight: 800,
                color: 'white',
              }}
            >
              T
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.1 }}>TrackIt</div>
            <div style={{ fontSize: 16, opacity: 0.75 }}>Tasks. Projects. Calm.</div>
          </div>
        </div>

        {/* Middle: Main headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: 56,
              fontWeight: 700,
              lineHeight: 1.05,
            }}
          >
            <div>The Task Manager</div>
            <div>That Actually Gets Used</div>
          </div>
          <div style={{ fontSize: 22, opacity: 0.82, maxWidth: 820, lineHeight: 1.35 }}>
            Inbox, projects, calendar, habits, notes & team collaboration — all in one clean workspace.
          </div>
        </div>

        {/* Bottom: Features + CTA */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {['Inbox', 'Projects', 'Calendar', 'Habits', 'Notes'].map((t) => (
              <div
                key={t}
                style={{
                  fontSize: 16,
                  padding: '10px 14px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  opacity: 0.95,
                }}
              >
                {t}
              </div>
            ))}
          </div>
          {/* CTA Button */}
          <div
            style={{
              fontSize: 18,
              fontWeight: 600,
              padding: '14px 28px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              color: 'white',
            }}
          >
            Try Free →
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
