import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

/** Generated so there is no binary asset to keep in sync with the wordmark. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000',
          color: '#fff',
          fontSize: 112,
          fontWeight: 700,
          letterSpacing: '-0.05em',
        }}
      >
        R
      </div>
    ),
    size,
  )
}
