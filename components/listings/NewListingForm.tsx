'use client'

import { useState, useEffect } from 'react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { CLASS_TYPES, SKILL_LEVELS } from '@/types'
import type { ClassType, SkillLevel, Profile, Studio } from '@/types'
import { LocationPicker } from './LocationPicker'
import { formatCents } from '@/lib/stripe/helpers'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({
  studio_id: z.string().min(1, 'Studio is required'),
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
})

type ListingFormValues = z.infer<typeof schema>

interface NewListingFormProps {
  profile: Profile
}

export function NewListingForm({ profile }: NewListingFormProps) {
  const [loading, setLoading] = useState(false)
  const [studios, setStudios] = useState<Studio[]>([])
  const [selectedStudio, setSelectedStudio] = useState<Studio | null>(null)
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
  const router = useRouter()

  const minDate = new Date()
  minDate.setHours(minDate.getHours() + 2)
  const minDateStr = minDate.toISOString().split('T')[0]

  useEffect(() => {
    fetch('/api/studios')
      .then((r) => r.json())
      .then((d) => setStudios(d.studios ?? []))
  }, [])

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ListingFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
  })

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setScreenshotFile(file)
    setScreenshotPreview(URL.createObjectURL(file))
  }

  const onSubmit = async (data: ListingFormValues) => {
    if (!screenshotFile) {
      toast.error('Please upload your booking confirmation screenshot')
      return
    }

    setLoading(true)

    // Upload screenshot to Supabase Storage
    const supabase = createClient()
    const ext = screenshotFile.name.split('.').pop()
    const fileName = `${profile.id}-${Date.now()}.${ext}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('confirmations')
      .upload(fileName, screenshotFile, { upsert: false })

    if (uploadError) {
      toast.error('Failed to upload screenshot: ' + uploadError.message)
      setLoading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('confirmations')
      .getPublicUrl(uploadData.path)

    const res = await fetch('/api/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        price_cents: Math.round((data.price_dollars ?? 0) * 100),
        instructor_name: data.instructor_name || undefined,
        description: data.description || undefined,
        duration_minutes: data.duration_minutes || undefined,
        neighborhood: data.neighborhood || undefined,
        confirmation_screenshot_url: publicUrl,
      }),
    })

    const json = await res.json()
    if (!res.ok) {
      toast.error(json.error ?? 'Something went wrong')
      setLoading(false)
      return
    }

    toast.success('Your listing is live!')
    router.push(`/listings/${json.listing.id}`)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">

      {/* Studio picker */}
      <div className="space-y-2">
        <Label>Studio *</Label>
        <Select onValueChange={(val) => {
          setValue('studio_id', val)
          setSelectedStudio(studios.find((s) => s.id === val) ?? null)
        }}>
          <SelectTrigger>
            <SelectValue placeholder="Select a studio" />
          </SelectTrigger>
          <SelectContent>
            {studios.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.studio_id && <p className="text-sm text-red-500">{errors.studio_id.message}</p>}

        {selectedStudio && (
          <Card className="border-blue-100 bg-blue-50">
            <CardContent className="py-3 text-sm text-blue-800 space-y-0.5">
              <p>
                <strong>Cancellation policy:</strong>{' '}
                {selectedStudio.cancellation_policy === 'fixed_fee'
                  ? `${formatCents(selectedStudio.cancellation_fee_cents ?? 0)} fee`
                  : 'Full class price'}
              </p>
              <p>
                <strong>Payment:</strong>{' '}
                {selectedStudio.payment_type === 'prepaid' ? 'Prepaid' : 'Pay in person'}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                If the buyer no-shows, they forfeit{' '}
                {selectedStudio.cancellation_policy === 'fixed_fee'
                  ? `${formatCents(selectedStudio.cancellation_fee_cents ?? 0)}`
                  : 'the full class amount'}{' '}
                to you from escrow.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="class_name">Class name *</Label>
          <Input id="class_name" placeholder="Power Ride 45" {...register('class_name')} />
          {errors.class_name && <p className="text-sm text-red-500">{errors.class_name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="instructor_name">Instructor (optional)</Label>
          <Input id="instructor_name" placeholder="Jane Smith" {...register('instructor_name')} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Class type *</Label>
          <Select onValueChange={(val) => setValue('class_type', val as ClassType)}>
            <SelectTrigger><SelectValue placeholder="Select a type" /></SelectTrigger>
            <SelectContent>
              {CLASS_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.class_type && <p className="text-sm text-red-500">{errors.class_type.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>Skill level *</Label>
          <Select onValueChange={(val) => setValue('skill_level', val as SkillLevel)}>
            <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
            <SelectContent>
              {SKILL_LEVELS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.skill_level && <p className="text-sm text-red-500">{errors.skill_level.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="class_date">Date *</Label>
          <Input id="class_date" type="date" min={minDateStr} {...register('class_date')} />
          {errors.class_date && <p className="text-sm text-red-500">{errors.class_date.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="class_time">Time *</Label>
          <Input id="class_time" type="time" {...register('class_time')} />
          {errors.class_time && <p className="text-sm text-red-500">{errors.class_time.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="duration_minutes">Duration (min)</Label>
          <Input id="duration_minutes" type="number" placeholder="45" {...register('duration_minutes')} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Location *</Label>
        <LocationPicker
          onSelect={(address, neighborhood) => {
            setValue('address', address, { shouldValidate: true })
            if (neighborhood) setValue('neighborhood', neighborhood)
          }}
          error={errors.address?.message}
        />
      </div>

      <div className="space-y-2 max-w-xs">
        <Label htmlFor="price_dollars">What did you pay for this class? ($) *</Label>
        <Input
          id="price_dollars"
          type="number"
          step="0.01"
          min="1"
          placeholder="30.00"
          {...register('price_dollars')}
        />
        <p className="text-xs text-muted-foreground">
          This is the full amount the buyer pays into escrow.
        </p>
        {errors.price_dollars && <p className="text-sm text-red-500">{errors.price_dollars.message}</p>}
      </div>

      {/* Screenshot upload */}
      <div className="space-y-2">
        <Label htmlFor="screenshot">Booking confirmation screenshot *</Label>
        <p className="text-xs text-muted-foreground">
          Upload a screenshot of your booking confirmation. This is shown to buyers as proof of the booking.
        </p>
        <Input
          id="screenshot"
          type="file"
          accept="image/*"
          onChange={handleScreenshotChange}
          className="cursor-pointer"
        />
        {screenshotPreview && (
          <img
            src={screenshotPreview}
            alt="Confirmation preview"
            className="mt-2 rounded-lg border max-h-48 object-contain"
          />
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Additional notes (optional)</Label>
        <Textarea
          id="description"
          placeholder="Anything the buyer should know — what to bring, transfer instructions..."
          rows={3}
          {...register('description')}
        />
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>
          {loading ? 'Posting…' : 'Post listing'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
