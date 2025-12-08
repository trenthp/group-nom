import { SwipeIcon, UsersIcon, TargetIcon, LocationIcon } from '@/components/icons'

export default function Features() {
  const features = [
    {
      icon: <SwipeIcon size={48} className="text-orange-600" />,
      title: 'Swipe to Vote',
      description: 'Tinder-style swiping makes voting on restaurants quick and fun. Right for yes, left for no.',
    },
    {
      icon: <UsersIcon size={48} className="text-orange-600" />,
      title: 'Real-Time Groups',
      description: 'Create a session, share the code, and vote together in real-time. No app download needed.',
    },
    {
      icon: <TargetIcon size={48} className="text-orange-600" />,
      title: 'Find Your Match',
      description: 'Our algorithm finds the restaurant everyone agrees on. No more debates, just decisions.',
    },
    {
      icon: <LocationIcon size={48} className="text-orange-600" />,
      title: 'Local Discovery',
      description: 'Filter by cuisine, rating, price, and distance to find the perfect spot nearby.',
    },
  ]

  return (
    <section className="py-20 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            How It Works
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Three simple steps to restaurant consensus
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="text-center p-6 rounded-2xl bg-orange-50 hover:bg-orange-100 transition"
            >
              <div className="mb-4 flex justify-center">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl p-8 md:p-12 text-center">
          <div className="max-w-3xl mx-auto">
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
              The 3-Step Process
            </h3>
            <div className="grid md:grid-cols-3 gap-8 mt-8">
              <div className="text-white">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  1
                </div>
                <h4 className="font-semibold text-lg mb-2">Create & Share</h4>
                <p className="text-orange-100 text-sm">
                  Start a session and share the 6-digit code with your group
                </p>
              </div>
              <div className="text-white">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  2
                </div>
                <h4 className="font-semibold text-lg mb-2">Swipe Together</h4>
                <p className="text-orange-100 text-sm">
                  Everyone swipes through nearby restaurants simultaneously
                </p>
              </div>
              <div className="text-white">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  3
                </div>
                <h4 className="font-semibold text-lg mb-2">See Your Match</h4>
                <p className="text-orange-100 text-sm">
                  Get instant results showing where everyone wants to go
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
