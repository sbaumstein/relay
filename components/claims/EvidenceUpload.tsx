'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { X, Paperclip } from 'lucide-react'

interface EvidenceUploadProps {
  /** Public URLs of files uploaded so far */
  value: string[]
  onChange: (urls: string[]) => void
  prefix: string
  disabled?: boolean
}

const MAX_FILES = 5
const MAX_BYTES = 5 * 1024 * 1024

export function EvidenceUpload({ value, onChange, prefix, disabled }: EvidenceUploadProps) {
  const [uploading, setUploading] = useState(false)

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    if (value.length + files.length > MAX_FILES) {
      toast.error(`You can attach up to ${MAX_FILES} files`)
      return
    }

    setUploading(true)
    const supabase = createClient()
    const uploaded: string[] = []

    for (const file of Array.from(files)) {
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name} is larger than 5MB`)
        continue
      }
      const ext = file.name.split('.').pop()
      const path = `disputes/${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { data, error } = await supabase.storage.from('confirmations').upload(path, file)
      if (error) {
        toast.error(`Failed to upload ${file.name}: ${error.message}`)
        continue
      }
      const { data: { publicUrl } } = supabase.storage.from('confirmations').getPublicUrl(data.path)
      uploaded.push(publicUrl)
    }

    setUploading(false)
    if (uploaded.length > 0) onChange([...value, ...uploaded])
  }

  return (
    <div className="space-y-2">
      <label className={`inline-flex items-center gap-2 text-sm border border-white/30 px-3 py-2 cursor-pointer hover:border-white/60 transition-colors ${disabled || uploading ? 'opacity-40 pointer-events-none' : ''}`}>
        <Paperclip className="h-4 w-4" />
        {uploading ? 'Uploading…' : 'Attach screenshots'}
        <input
          type="file"
          accept="image/*,.pdf"
          multiple
          className="hidden"
          disabled={disabled || uploading}
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>

      {value.length > 0 && (
        <ul className="space-y-1">
          {value.map((url, i) => (
            <li key={url} className="flex items-center gap-2 text-xs">
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate max-w-xs">
                Attachment {i + 1}
              </a>
              <button
                type="button"
                onClick={() => onChange(value.filter((u) => u !== url))}
                className="text-white/40 hover:text-red-400"
                aria-label="Remove attachment"
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-white/40">Up to {MAX_FILES} files, 5MB each.</p>
    </div>
  )
}
