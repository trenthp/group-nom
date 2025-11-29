export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="w-full mt-8 py-4 text-center text-white text-opacity-60 text-xs">
      <p>&copy; {currentYear} Group Nom. Made with hunger.</p>
    </footer>
  )
}
