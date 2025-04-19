import { LucideArrowLeft } from 'lucide-react' // Keep if needed for back button, but tabs are primary nav
import { Link } from 'react-router-dom' // Keep if needed for back button

const History = () => {
  return (
    <div className="p-4">
      {/* Removed back button as tabs are primary navigation */}
      <h1 className="text-2xl font-bold mb-4">Plan History</h1>
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-700">
          Your past daily plans will be displayed here. You'll be able to browse by date and view previous entries.
        </p>
        <p className="text-gray-500 text-sm mt-2">
          (Coming soon: Calendar view, search, and summaries of past plans.)
        </p>
      </div>
      {/* Calendar or other navigation will go here */}
    </div>
  )
}

export default History
