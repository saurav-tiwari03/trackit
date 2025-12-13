import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 600 };
export const contentType = 'image/png';

export default async function TwitterImage() {
  // Reuse the same logo-based style as OpenGraph
  let logo: ArrayBuffer | null = null;
  try {
    logo = await fetch(new URL('../../public/logo.png', import.meta.url)).then((r) =>
      r.arrayBuffer()
    );
  } catch {
    logo = null;
  }

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
          background:
            'radial-gradient(900px 500px at 25% 30%, rgba(99,102,241,0.35), transparent), radial-gradient(900px 500px at 85% 20%, rgba(34,197,94,0.22), transparent), #0b0b0f',
          color: 'white',
          fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.05 }}>TrackIt</div>
          <div style={{ fontSize: 22, opacity: 0.85, maxWidth: 720, lineHeight: 1.35 }}>
            Minimal task & project manager with Inbox, Calendar and collaboration.
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {['Inbox', 'Projects', 'Calendar', 'Notifications'].map((t) => (
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
        </div>

        <div
          style={{
            width: 140,
            height: 140,
            borderRadius: 34,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo as any}
              alt="TrackIt"
              width={112}
              height={112}
              style={{ borderRadius: 24 }}
            />
          ) : (
            <div
              style={{
                width: 112,
                height: 112,
                borderRadius: 24,
                background: 'white',
                color: '#0b0b0f',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: 56,
              }}
            >
              T
            </div>
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}
