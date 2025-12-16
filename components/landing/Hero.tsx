'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

export default function Hero() {
  const [isSpinning, setIsSpinning] = useState(false)

  const handleLogoTap = () => {
    if (!isSpinning) {
      setIsSpinning(true)
      setTimeout(() => setIsSpinning(false), 1200)
    }
  }

  return (
    <section className="px-4 py-12 md:py-16">
      <div className="max-w-4xl mx-auto text-center">
        {/* Logo with rotating text */}
        <div className="relative w-32 h-32 md:w-40 md:h-40 mx-auto mb-6">
          <svg
            className={`absolute inset-0 w-full h-full ${isSpinning ? 'spin-once-reverse' : ''}`}
            viewBox="0 0 200 200"
          >
            <defs>
              <path
                id="circlePath"
                d="M 100, 100 m -70, 0 a 70,70 0 1,1 140,0 a 70,70 0 1,1 -140,0"
                fill="none"
              />
            </defs>
            <text className="fill-white opacity-88 text-[22px] font-bold tracking-[.02em]" style={{ fontFamily: "'Alan Sans', sans-serif" }}>
              <textPath href="#circlePath" startOffset="0%">
                Group Nom • Group Nom • Group Nom •
              </textPath>
            </text>
          </svg>
          <Image
            src="/logo_groupNom.svg"
            alt="Group Nom"
            width={96}
            height={96}
            className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl cursor-pointer ${isSpinning ? 'spin-once' : ''}`}
            onClick={handleLogoTap}
          />
        </div>

        <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
          Find Where to Eat, <span className="text-orange-200">Together</span>
        </h1>

        <p className="text-lg md:text-xl text-orange-100 mb-8 max-w-xl mx-auto">
          Swipe together, match together, eat together.
        </p>

        <Link
          href="/"
          className="inline-block bg-white text-orange-600 font-semibold py-3 px-8 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition"
        >
          Try It Now
        </Link>
      </div>
    </section>
  )
}
