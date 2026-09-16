'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { CLASS_TYPES, SKILL_LEVELS, NEIGHBORHOODS } from '@/types'
import type { ClassType, SkillLevel, Listing } from '@/types'

const schema = z.object({
  class_name: z.string().min(1, 'Class name is required'),
  instructor_name: z.string().optional(),
  class_type: z.enum([
    'yoga', 'pilates', 'spinning', 'barre', 'hiit',
    'boxing', 'strength', 'dance', 'meditation', 'other',
  ] as [ClassType, ...ClassType[]]),
  skill_level: z.enum([
    'beginner', 'intermediate', 'advanced', 'all_levels',
  ] as [SkillLevel, ...SkillLevel[]]),
  description: z.string().optional(),
  class_date: z.string().min(1, 'Date is required'),
  class_time: z.string().min(1, 'Time is required'),
  duration_minutes: z.coerce.number().optional(),
  address: z.string().min(1, 'Address is required'),
  neighborhood: z.string().optional(),
  price_dollars: z.coerce.number().min(1, 'Price is required'),
  discount_dollars: z.union([z.coerce.number(), z.literal('')]).optional(),
}).refine(
  (d) => {
    if (d.discount_dollars === '' || d.discount_dollars == null) return true
    return Number(d.discount_dollars) < Number(d.price_dollars)
  },
  { message: 'Last-minute price must be below the full price', path: ['discount_dollars'] },
)

type EditFormValues = z.infer<typeof schema>

export function EditListingForm({ listing }: { listing: Listing }) {
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  const {
    register, handleSubmit, setValue, formState: { errors },
  } = useForm<EditFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: {
      class_name: listing.class_name,
      instructor_name: listing.instructor_name ?? '',
      class_type: listing.class_type,
      skill_level: listing.skill_level,
      description: listing.description ?? '',
      class_date: listing.class_date,
      // <input type="time"> expects HH:MM
      class_time: (listing.class_time ?? '').slice(0, 5),
      duration_minutes: listing.duration_minutes ?? undefined,
      address: listing.address,
      neighborhood: listing.neighborhood ?? '',
      price_dollars: listing.price_cents / 100,
      discount_dollars:
        listing.discount_price_cents == null ? '' : listing.discount_price_cents / 100,
    },
  })

  const onInvalid = (formErrors: Record<string, { message?: string } | undefined>) => {
    const firstKey = Object.keys(formErrors)[0]
    if (!firstKey) return
    toast.error(formErrors[firstKey]?.message ?? 'Please fix the highlighted fields')
    const el =
      document.getElementById(`field-${firstKey}`) ??
      document.querySelector<HTMLElement>(`[name="${firstKey}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const onSubmit = async (data: EditFormValues) => {
    setLoading(true)
    const res = await fetch(`/api/listings/${listing.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        price_cents: Math.round((data.price_dollars ?? 0) * 100),
        discount_price_cents:
          data.discount_dollars === '' || data.discount_dollars == null
            ? null
            : Math.round(Number(data.discount_dollars) * 100),
        instructor_name: data.instructor_name || null,
        description: data.description || null,
        duration_minutes: data.duration_minutes || null,
        neighborhood: data.neighborhood || null,
        // Resolved in the seller's timezone, same as when posting.
        class_datetime: new Date(`${data.class_date}T${data.class_time}`).toISOString(),
      }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { toast.error(json.error ?? 'Something went wrong'); return }
    toast.success('Listing updated')
    router.push(`/listings/${listing.id}`)
    router.refresh()
  }

  const onDelete = async () => {
    if (!window.confirm('Remove this listing? It will no longer appear on browse.')) return
    setDeleting(true)
    const res = await fetch(`/api/listings/${listing.id}`, { method: 'DELETE' })
    const json = await res.json()
    setDeleting(false)
    if (!res.ok) { toast.error(json.error ?? 'Could not remove the listing'); return }
    toast.success('Listing removed')
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid as never)} className="space-y-6 max-w-2xl">
      <div className="space-y-2">
        <Label htmlFor="class_name">Class name *</Label>
        <Input id="class_name" {...register('class_name')} />
        {errors.class_name && <p className="text-sm text-red-500">{errors.class_name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="instructor_name">Instructor</Label>
        <Input id="instructor_name" {...register('instructor_name')} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2" id="field-class_type">
          <Label>Class type *</Label>
          <Select
            defaultValue={listing.class_type}
            onValueChange={(v) => setValue('class_type', v as ClassType)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CLASS_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2" id="field-skill_level">
          <Label>Skill level *</Label>
          <Select
            defaultValue={listing.skill_level}
            onValueChange={(v) => setValue('skill_level', v as SkillLevel)}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SKILL_LEVELS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="class_date">Date *</Label>
          <Input id="class_date" type="date" {...register('class_date')} />
          {errors.class_date && <p className="text-sm text-red-500">{errors.class_date.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="class_time">Time *</Label>
          <Input id="class_time" type="time" {...register('class_time')} />
          {errors.class_time && <p className="text-sm text-red-500">{errors.class_time.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="duration_minutes">Duration (min)</Label>
          <Input id="duration_minutes" type="number" {...register('duration_minutes')} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address *</Label>
        <Input id="address" {...register('address')} />
        {errors.address && <p className="text-sm text-red-500">{errors.address.message}</p>}
      </div>

      <div className="space-y-2" id="field-neighborhood">
        <Label>Neighborhood</Label>
        <Select
          defaultValue={listing.neighborhood ?? undefined}
          onValueChange={(v) => setValue('neighborhood', v)}
        >
          <SelectTrigger><SelectValue placeholder="Select a neighborhood" /></SelectTrigger>
          <SelectContent>
            {NEIGHBORHOODS.map((n) => (
              <SelectItem key={n} value={n}>{n}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="price_dollars">Price ($) *</Label>
        <Input id="price_dollars" type="number" step="0.01" min="1" {...register('price_dollars')} />
        {errors.price_dollars && <p className="text-sm text-red-500">{errors.price_dollars.message}</p>}
      </div>

      <div className="space-y-2" id="field-discount_dollars">
        <Label htmlFor="discount_dollars">
          Last-minute price <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Input id="discount_dollars" type="number" step="0.01" min="0" {...register('discount_dollars')} />
        <p className="text-xs text-muted-foreground">
          Drops to this automatically within 2 hours of class. Leave blank for none.
        </p>
        {errors.discount_dollars && (
          <p className="text-sm text-red-500">{errors.discount_dollars.message as string}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Notes for the buyer</Label>
        <Textarea id="description" rows={3} {...register('description')} />
      </div>

      <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
        <div className="flex gap-3">
          <Button type="submit" disabled={loading || deleting}>
            {loading ? 'Saving…' : 'Save changes'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push(`/listings/${listing.id}`)}
            disabled={loading || deleting}
          >
            Cancel
          </Button>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={onDelete}
          disabled={loading || deleting}
          className="text-red-600 border-red-300 hover:bg-red-50"
        >
          {deleting ? 'Removing…' : 'Remove listing'}
        </Button>
      </div>
    </form>
  )
}
