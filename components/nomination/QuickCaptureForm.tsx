'use client'

import { useState, useRef } from 'react'
import type { Restaurant } from '@/lib/types'

interface QuickCaptureFormProps {
  restaurant: Restaurant
  onSuccess: (nomination: { id: string; photoUrl: string; whyILoveIt: string }) => void
  onCancel: () => void
}

export default function QuickCaptureForm({
  restaurant,
  onSuccess,
  onCancel,
}: QuickCaptureFormProps) {
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [whyILoveIt, setWhyILoveIt] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('Image must be under 10MB')
      return
    }

    setPhotoFile(file)
    setError(null)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPhotoPreview(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!photoFile) {
      setError('Please add a photo')
      return
    }

    if (whyILoveIt.trim().length < 10) {
      setError('Please tell us more about why you love this place (at least 10 characters)')
      return
    }

    setIsUploading(true)

    try {
      // 1. Upload photo to Vercel Blob
      const formData = new FormData()
      formData.append('file', photoFile)
      formData.append('gersId', restaurant.id)

      const uploadRes = await fetch('/api/upload/nomination-photo', {
        method: 'POST',
        body: formData,
      })

      if (!uploadRes.ok) {
        const uploadError = await uploadRes.json()
        throw new Error(uploadError.error || 'Failed to upload photo')
      }

      const { url: photoUrl } = await uploadRes.json()

      // 2. Create nomination
      const nominationRes = await fetch('/api/nominations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gersId: restaurant.id,
          photoUrl,
          whyILoveIt: whyILoveIt.trim(),
        }),
      })

      if (!nominationRes.ok) {
        const nominationError = await nominationRes.json()
        throw new Error(nominationError.error || 'Failed to create nomination')
      }

      const { nomination } = await nominationRes.json()
      onSuccess(nomination)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-md mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4">
        <h2 className="text-xl font-bold text-white">Nominate This Spot</h2>
        <p className="text-orange-100 text-sm">{restaurant.name}</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Photo Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Add a Photo <span className="text-red-500">*</span>
          </label>

          {photoPreview ? (
            <div className="relative">
              <img
                src={photoPreview}
                alt="Preview"
                className="w-full h-48 object-cover rounded-lg"
              />
              <button
                type="button"
                onClick={() => {
                  setPhotoFile(null)
                  setPhotoPreview(null)
                  if (fileInputRef.current) {
                    fileInputRef.current.value = ''
                  }
                }}
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/70"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:border-orange-400 hover:text-orange-500 transition"
            >
              <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-sm font-medium">Tap to add photo</span>
              <span className="text-xs text-gray-400 mt-1">Share your experience</span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoSelect}
            className="hidden"
          />
        </div>

        {/* Why I Love It */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Why do you love this place? <span className="text-red-500">*</span>
          </label>
          <textarea
            value={whyILoveIt}
            onChange={(e) => setWhyILoveIt(e.target.value)}
            placeholder="The tacos here are incredible, especially the al pastor..."
            rows={3}
            maxLength={500}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">
            {whyILoveIt.length}/500
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isUploading}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isUploading || !photoFile || whyILoveIt.trim().length < 10}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-medium hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? 'Nominating...' : 'Nominate'}
          </button>
        </div>
      </form>
    </div>
  )
}
