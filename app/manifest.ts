import type { MetadataRoute } from 'next'

/**
 * Makes the site installable to a phone home screen. `display: standalone` is
 * what drops the browser chrome, so an installed Relay opens like an app.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Relay — Pass Your Spot',
    short_name: 'Relay',
    description: "Can't make it to class? Pass your spot to someone who can.",
    start_url: '/browse',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    orientation: 'portrait',
    icons: [
      { src: '/icon', sizes: '512x512', type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  }
}
