import { LucideCalendarDays, LucideHistory, LucideHome } from 'lucide-react' // Added LucideHome
import { Link } from 'react-router-dom'

const Home = () => {
  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Daily Planner Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quote of the Day */}
        <div className="bg-white rounded-lg shadow-md p-6 flex flex-col items-center text-center">
          <h2 className="text-xl font-bold mb-2">Quote of the Day</h2>
          <p className="text-gray-700 italic">"The best way to predict the future is to create it."</p>
          <p className="text-gray-500 text-sm mt-2">- Peter Drucker</p>
        </div>
        {/* Word of the Day */}
        <div className="bg-white rounded-lg shadow-md p-6 flex flex-col items-center text-center">
          <h2 className="text-xl font-bold mb-2">Word of the Day</h2>
          <p className="text-gray-700 font-semibold">Serendipity</p>
          <p className="text-gray-500 text-sm mt-2">The occurrence and development of events by chance in a happy or beneficial way.</p>
        </div>
        {/* Daily Visit Streak */}
        <div className="bg-white rounded-lg shadow-md p-6 flex flex-col items-center text-center">
          <h2 className="text-xl font-bold mb-2">Daily Visit Streak</h2>
          <p className="text-gray-700 text-2xl font-mono">7 days 🔥</p>
          <p className="text-gray-500 text-sm mt-2">Keep up the great work!</p>
        </div>
        {/* Analytics Placeholder */}
        <div className="bg-white rounded-lg shadow-md p-6 flex flex-col items-center text-center">
          <h2 className="text-xl font-bold mb-2">Your Progress</h2>
          <p className="text-gray-700">Analytics and insights based on your daily plans will appear here.</p>
          <p className="text-gray-500 text-sm mt-2">Track your habits, mood trends, and task completion over time.</p>
        </div>
      </div>
      {/* Navigation Links (Optional, tabs are primary nav) */}
      {/*
      <div className="mt-8 flex justify-center space-x-4">
        <Link to="/daily-plan" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded flex items-center">
          Today's Plan <LucideCalendarDays className="inline ml-2 h-5 w-5"/>
        </Link>
        <Link to="/history" className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded flex items-center">
          View History <LucideHistory className="inline ml-2 h-5 w-5"/>
        </Link>
      </div>
      */}
    </div>
  )
}

export default Home
