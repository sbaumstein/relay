/**
 * Classes happen at a physical studio at a wall-clock time, so they are always
 * shown in the studio's timezone — not the viewer's and not the server's.
 *
 * Without this, server components format dates in the server's zone, which is
 * UTC on Vercel: a 10PM class rendered as 2AM the next day.
 */
export const STUDIO_TIMEZONE = 'America/New_York'

type Parts = Intl.DateTimeFormatOptions

function fmt(value: string | Date, options: Parts): string {
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-US', { timeZone: STUDIO_TIMEZONE, ...options })
}

/** "Mon" */
export const weekdayShort = (v: string | Date) => fmt(v, { weekday: 'short' })

/** "Sep" */
export const monthShort = (v: string | Date) => fmt(v, { month: 'short' })

/** "16" — the day of month in studio time, which can differ from getDate(). */
export const dayOfMonth = (v: string | Date) => fmt(v, { day: 'numeric' })

/** "10:00 PM" */
export const timeLabel = (v: string | Date) =>
  fmt(v, { hour: 'numeric', minute: '2-digit' })

/** "Monday, September 16, 2026" */
export const longDateLabel = (v: string | Date) =>
  fmt(v, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

/** "Sep 16, 10:00 PM" */
export const shortDateTimeLabel = (v: string | Date) =>
  fmt(v, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

/** "9/16/2026" */
export const shortDateLabel = (v: string | Date) =>
  fmt(v, { month: 'numeric', day: 'numeric', year: 'numeric' })

/** "Sep 16, 2026, 10:00 PM" — for audit trails where the date matters. */
export const timestampLabel = (v: string | Date) =>
  fmt(v, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
