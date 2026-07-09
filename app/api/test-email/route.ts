import { NextRequest, NextResponse } from 'next/server'
import { resend, isEmailAllowed } from '@/lib/resend/client'

export async function POST(request: NextRequest) {
  const { email } = await request.json()

  if (!isEmailAllowed(email))
    return NextResponse.json({ error: 'Email not in whitelist' }, { status: 403 })

  const { data, error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL!,
    to: email,
    subject: 'Relay — email test',
    html: '<p>If you see this, Resend is working!</p>',
  })

  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ ok: true, id: data?.id })
}
