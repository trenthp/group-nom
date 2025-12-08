import Link from 'next/link'

export default function CallToAction() {
  return (
    <section className="py-20 px-4 bg-gray-900">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
          Ready to End the Food Debate?
        </h2>
        <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
          No sign-up required. Start swiping with your group in seconds.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link
            href="/"
            className="bg-orange-500 text-white font-semibold py-4 px-8 rounded-lg shadow-lg hover:bg-orange-600 transform hover:scale-105 transition text-lg"
          >
            Start Now
          </Link>
        </div>

        <div className="border-t border-gray-800 pt-8 mt-8">
          <p className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} Group Nom. Made with hunger.
          </p>
        </div>
      </div>
    </section>
  )
}
