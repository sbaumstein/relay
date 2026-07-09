import { Resend } from 'resend'
import type { Listing, Claim } from '@/types'

export const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder')

const whitelist = process.env.TEST_EMAIL_WHITELIST
  ? process.env.TEST_EMAIL_WHITELIST.split(',').map((e) => e.trim().toLowerCase())
  : null

export function isEmailAllowed(email: string): boolean {
  if (!whitelist) return true
  return whitelist.includes(email.toLowerCase())
}

interface ClaimEmailParams {
  claimerEmail: string
  claimerName: string | null
  sellerEmail: string
  sellerName: string | null
  listing: Listing
  claim: Claim
}

export async function sendClaimEmails({
  claimerEmail,
  claimerName,
  sellerEmail,
  sellerName,
  listing,
  claim,
}: ClaimEmailParams) {
  const classDate = new Date(listing.class_datetime).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const classTime = new Date(listing.class_datetime).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  const claimerSubject = `You're in! ${listing.class_name} at ${listing.studio_name}`
  const claimerBody = `
    <h2>You've claimed a workout class!</h2>
    <p>Hi ${claimerName ?? 'there'},</p>
    <p>Your spot has been secured for:</p>
    <ul>
      <li><strong>Class:</strong> ${listing.class_name}</li>
      <li><strong>Studio:</strong> ${listing.studio_name}</li>
      ${listing.instructor_name ? `<li><strong>Instructor:</strong> ${listing.instructor_name}</li>` : ''}
      <li><strong>Date:</strong> ${classDate}</li>
      <li><strong>Time:</strong> ${classTime}</li>
      <li><strong>Address:</strong> ${listing.address}</li>
      ${claim.amount_cents > 0 ? `<li><strong>You paid:</strong> $${(claim.amount_cents / 100).toFixed(2)}</li>` : ''}
    </ul>
    <p>See you at the class!</p>
  `

  const sellerSubject =
    claim.amount_cents > 0
      ? `Your spot was claimed — $${(claim.seller_payout_cents / 100).toFixed(2)} payout incoming`
      : `Your spot for ${listing.class_name} was claimed`
  const sellerBody = `
    <h2>Great news — your class spot was claimed!</h2>
    <p>Hi ${sellerName ?? 'there'},</p>
    <p>Someone has claimed your spot for <strong>${listing.class_name}</strong> at <strong>${listing.studio_name}</strong>.</p>
    ${
      claim.amount_cents > 0
        ? `<p>You'll receive a payout of <strong>$${(claim.seller_payout_cents / 100).toFixed(2)}</strong> to your connected Stripe account within 2-7 business days.</p>`
        : ''
    }
    <p>Thanks for using Workout Exchange!</p>
  `

  const sends = []
  if (isEmailAllowed(claimerEmail))
    sends.push(resend.emails.send({ from: process.env.RESEND_FROM_EMAIL!, to: claimerEmail, subject: claimerSubject, html: claimerBody }))
  if (isEmailAllowed(sellerEmail))
    sends.push(resend.emails.send({ from: process.env.RESEND_FROM_EMAIL!, to: sellerEmail, subject: sellerSubject, html: sellerBody }))
  await Promise.all(sends)
}

export async function sendListingPostedEmail({
  sellerEmail,
  sellerName,
  listing,
}: {
  sellerEmail: string
  sellerName: string | null
  listing: Listing
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  if (!isEmailAllowed(sellerEmail)) return
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: sellerEmail,
    subject: `Your listing for ${listing.class_name} is live!`,
    html: `
      <h2>Your class spot is now listed!</h2>
      <p>Hi ${sellerName ?? 'there'},</p>
      <p>Your listing for <strong>${listing.class_name}</strong> at <strong>${listing.studio_name}</strong> is now live on Workout Exchange.</p>
      <p><a href="${appUrl}/listings/${listing.id}">View your listing</a></p>
      <p>We'll notify you as soon as someone claims it.</p>
    `,
  })
}
