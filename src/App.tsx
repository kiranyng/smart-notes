import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Home from './pages/Home'
import DailyPlan from './pages/DailyPlan'
import History from './pages/History'
import { LucideHome, LucideCalendarDays, LucideHistory } from 'lucide-react' // Import icons

const App = () => {
  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen">
        {/* Tab Navigation */}
        <nav className="bg-blue-600 text-white p-4 shadow-md sticky top-0 z-10">
          <div className="container mx-auto flex justify-around">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `flex flex-col items-center px-2 py-1 rounded-md transition-colors ${
                  isActive ? 'bg-blue-700' : 'hover:bg-blue-500'
                }`
              }
            >
              <LucideHome className="h-5 w-5" />
              <span className="text-xs mt-1">Home</span>
            </NavLink>
            <NavLink
              to="/daily-plan"
              className={({ isActive }) =>
                `flex flex-col items-center px-2 py-1 rounded-md transition-colors ${
                  isActive ? 'bg-blue-700' : 'hover:bg-blue-500'
                }`
              }
            >
              <LucideCalendarDays className="h-5 w-5" />
              <span className="text-xs mt-1">Today</span>
            </NavLink>
            <NavLink
              to="/history"
              className={({ isActive }) =>
                `flex flex-col items-center px-2 py-1 rounded-md transition-colors ${
                  isActive ? 'bg-blue-700' : 'hover:bg-blue-500'
                }`
              }
            >
              <LucideHistory className="h-5 w-5" />
              <span className="text-xs mt-1">History</span>
            </NavLink>
          </div>
        </nav>

        {/* Page Content */}
        <main className="flex-grow container mx-auto p-4">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/daily-plan" element={<DailyPlan />} />
            <Route path="/history" element={<History />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
