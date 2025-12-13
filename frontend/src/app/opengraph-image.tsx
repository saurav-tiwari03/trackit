import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpenGraphImage() {
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
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
                width={52}
                height={52}
                style={{ borderRadius: 14 }}
              />
            ) : (
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: 'white',
                  color: '#0b0b0f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 28,
                }}
              >
                T
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.1 }}>TrackIt</div>
            <div style={{ fontSize: 16, opacity: 0.75 }}>Tasks. Projects. Calm.</div>
          </div>
        </div>

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
            <div>A clean workspace</div>
            <div>for focused work.</div>
          </div>
          <div style={{ fontSize: 22, opacity: 0.82, maxWidth: 820, lineHeight: 1.35 }}>
            Inbox, projects, calendar scheduling, attachments, mentions and notifications.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {['Inbox', 'Projects', 'Calendar', 'Attachments', 'Mentions', 'Notifications'].map(
            (t) => (
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
            )
          )}
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
