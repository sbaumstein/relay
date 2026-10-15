'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { timestampLabel } from '@/lib/datetime'
import type { Message } from '@/types'

const MAX_BODY_LENGTH = 2000

interface MessageThreadProps {
  /** The person this conversation is with. */
  otherUserId: string
  /**
   * The claim a newly sent message attaches to. Resolved on the server (most
   * recent active shared claim, else most recent shared claim) — the client
   * must never pick a claim id of its own, since the RLS insert policy only
   * accepts claims the sender is genuinely party to.
   */
  sendClaimId: string | null
  currentUserId: string
  counterpartyName: string
  initialMessages: Message[]
  /** claim_id → "Power Ride 45 · Oct 16", for the run dividers. */
  claimLabels: Record<string, string>
  /** True when the server read failed (e.g. migration not applied yet). */
  loadFailed?: boolean
}

export function MessageThread({
  otherUserId,
  sendClaimId,
  currentUserId,
  counterpartyName,
  initialMessages,
  claimLabels,
  loadFailed = false,
}: MessageThreadProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [unavailable, setUnavailable] = useState(loadFailed)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  // A conversation can span more than one class, so each run of messages gets
  // labelled with the claim it concerns; with a single claim the header
  // already says which class it is.
  const multiClaim = Object.keys(claimLabels).length > 1

  const refetch = useCallback(async () => {
    try {
      const res = await fetch(`/api/messages?user_id=${encodeURIComponent(otherUserId)}`)
      if (!res.ok) return
      const data = await res.json()
      if (Array.isArray(data.messages)) {
        setMessages(data.messages as Message[])
        setUnavailable(false)
      }
    } catch {
      // Offline or a transient failure — keep showing what we already have.
    }
  }, [otherUserId])

  // Mark the counterparty's messages read as soon as the conversation is open.
  useEffect(() => {
    void fetch('/api/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: otherUserId }),
    }).catch(() => {})
  }, [otherUserId])

  // No realtime subscription in v1: coming back to the tab is the refresh.
  useEffect(() => {
    const onFocus = () => { void refetch() }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refetch])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  const send = async () => {
    const trimmed = body.trim()
    if (!trimmed || sending) return
    if (trimmed.length > MAX_BODY_LENGTH) {
      toast.error(`Message must be ${MAX_BODY_LENGTH} characters or fewer`)
      return
    }

    setSending(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim_id: sendClaimId, body: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Could not send your message')
        return
      }
      setBody('')
      if (data.message) {
        setMessages((prev) => [...prev, data.message as Message])
        setUnavailable(false)
      } else {
        await refetch()
      }
    } catch {
      toast.error('Could not send your message')
    } finally {
      setSending(false)
    }
  }

  return (
    <div>
      {unavailable && (
        <div className="border border-white/20 rounded-xl p-4 mb-4">
          <p className="text-sm text-white/60">
            Messages aren&apos;t available right now. Try again in a moment.
          </p>
        </div>
      )}

      <p className="text-xs text-white/50 uppercase tracking-widest mb-3">Conversation</p>

      <div
        className="space-y-3"
        style={{ paddingBottom: 'calc(4.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {messages.length === 0 ? (
          <div className="border border-white/20 rounded-xl p-6 text-center">
            <p className="text-sm text-white/60">
              No messages yet. Send the first one to {counterpartyName}.
            </p>
          </div>
        ) : (
          messages.map((m, i) => {
            const mine = m.sender_id === currentUserId
            // A divider opens every run of messages about a different class,
            // so two classes can't interleave with no context.
            const showDivider =
              multiClaim && (i === 0 || messages[i - 1].claim_id !== m.claim_id)
            return (
              <div key={m.id}>
                {showDivider && (
                  <div className="flex items-center gap-2 pt-3 pb-1">
                    <span className="h-px flex-1 bg-white/15" />
                    <span className="text-[10px] text-white/50 uppercase tracking-widest whitespace-nowrap">
                      re: {claimLabels[m.claim_id] ?? 'another class'}
                    </span>
                    <span className="h-px flex-1 bg-white/15" />
                  </div>
                )}
                <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[80%]">
                    <div
                      className={
                        mine
                          ? 'rounded-xl px-3.5 py-2.5 bg-white text-neutral-900'
                          : 'rounded-xl px-3.5 py-2.5 border border-white/20 text-white'
                      }
                    >
                      <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                    </div>
                    <p className={`text-[11px] text-white/40 mt-1 ${mine ? 'text-right' : ''}`}>
                      {timestampLabel(m.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Sits above the fixed bottom nav (about 4rem) plus the home indicator. */}
      <div
        className="fixed left-0 right-0 z-30 border-t border-white/15 backdrop-blur-md bg-surface/95 px-4 py-3"
        style={{ bottom: 'calc(4rem + env(safe-area-inset-bottom, 0px))' }}
      >
        {sendClaimId ? (
          <div className="max-w-2xl mx-auto flex items-end gap-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void send()
                }
              }}
              rows={1}
              maxLength={MAX_BODY_LENGTH}
              placeholder="Write a message"
              className="flex-1 min-w-0 resize-none rounded-xl border border-white/20 bg-transparent px-3 py-2.5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/50"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={sending || body.trim().length === 0}
              className="flex-shrink-0 bg-white text-neutral-900 font-semibold rounded-xl px-4 py-2.5 text-xs uppercase tracking-widest hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:pointer-events-none"
            >
              {sending ? 'Sending' : 'Send'}
            </button>
          </div>
        ) : (
          /* Every shared claim has settled, so there is nothing live to discuss.
             The history stays readable. */
          <p className="max-w-2xl mx-auto text-center text-xs text-white/50 py-1.5">
            This conversation closed when your last spot together settled.
          </p>
        )}
      </div>
    </div>
  )
}
