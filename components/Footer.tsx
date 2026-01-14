import Link from 'next/link'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="w-full mt-8 py-4 text-center text-white text-opacity-60 text-xs space-y-2">
      <div className="flex items-center justify-center gap-3">
        <Link href="/privacy" className="hover:text-white transition">
          Privacy
        </Link>
        <span className="text-white/30">·</span>
        <Link href="/terms" className="hover:text-white transition">
          Terms
        </Link>
      </div>
      <p>&copy; {currentYear} Group Nom. Made with hunger.</p>
    </footer>
  )
}
