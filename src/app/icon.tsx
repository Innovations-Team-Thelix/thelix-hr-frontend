import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
          borderRadius: 7,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
        }}
      >
        {/* Person silhouette icon */}
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'white',
            opacity: 0.95,
          }}
        />
        <div
          style={{
            width: 14,
            height: 7,
            borderRadius: '6px 6px 0 0',
            background: 'white',
            opacity: 0.95,
          }}
        />
        {/* HR text */}
        <div
          style={{
            fontSize: 6,
            fontWeight: 800,
            color: 'rgba(255,255,255,0.85)',
            letterSpacing: 1,
            lineHeight: 1,
            marginTop: 1,
          }}
        >
          HRIS
        </div>
      </div>
    ),
    { ...size }
  );
}
