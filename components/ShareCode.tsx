'use client'

import { useState } from 'react'

interface ShareCodeProps {
  code: string
}

export default function ShareCode({ code }: ShareCodeProps) {
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedUrl, setCopiedUrl] = useState(false)

  const copyCode = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    })
  }

  const copyUrl = () => {
    const url = `${window.location.origin}/session/${code}`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    })
  }

  return (
    <div className="bg-white bg-opacity-20 backdrop-blur rounded-xl p-4 text-white text-center">
      <p className="text-sm opacity-90 mb-2">Session Code</p>
      <div className="flex items-center justify-center gap-3">
        <code className="text-3xl font-mono font-bold tracking-wider">{code}</code>
        <div className="flex gap-2">
          <button
            onClick={copyCode}
            title="Copy code"
            className="bg-white text-orange-600 w-10 h-10 rounded-lg font-semibold hover:bg-orange-50 transition flex items-center justify-center"
          >
            {copiedCode ? '✓' : '📋'}
          </button>
          <button
            onClick={copyUrl}
            title="Copy URL"
            className="bg-white text-orange-600 w-10 h-10 rounded-lg font-semibold hover:bg-orange-50 transition flex items-center justify-center"
          >
            {copiedUrl ? '✓' : '🔗'}
          </button>
        </div>
      </div>
      <p className="text-xs opacity-75 mt-2">Share the 📋code or 🔗link with friends to join</p>
    </div>
  )
}
