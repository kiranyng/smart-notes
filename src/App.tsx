import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import DailyPlan from './pages/DailyPlan'
import History from './pages/History'
import Auth from './pages/Auth' // Import Auth page
import { useAuth } from './contexts/AuthContext' // Import useAuth hook
import { LucideHome, LucideCalendarDays, LucideHistory, LucideLogOut, LucideLoader2 } from 'lucide-react' // Import icons

// ProtectedRoute component to guard routes
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { session, loading } = useAuth();

  if (loading) {
    // AuthProvider already shows a loading indicator, but we can show one here too
    // This prevents brief flashes of the login page while auth state is resolving
    return (
       <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]"> {/* Adjust height as needed */}
         <LucideLoader2 className="h-8 w-8 animate-spin text-blue-500" />
       </div>
     );
  }

  if (!session) {
    // Redirect them to the /auth page, preserving the intended route
    return <Navigate to="/auth" replace />;
  }

  // If session exists and loading is false, render the requested component
  return children;
};


const App = () => {
  const { session, signOut, user, loading } = useAuth(); // Get auth state and signOut function

  // Don't render the main app structure until auth state is determined
  if (loading) {
     return (
       <div className="flex justify-center items-center min-h-screen bg-gray-100"> {/* Ensure loading screen has background */}
         <LucideLoader2 className="h-10 w-10 animate-spin text-blue-600" />
       </div>
     );
   }


  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen bg-gray-50"> {/* Ensure main container has light background */}
        {/* Conditionally render Nav if user is logged in */}
        {session && (
          <nav className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 shadow-lg sticky top-0 z-50"> {/* Gradient background, more shadow, higher z-index */}
            <div className="container mx-auto flex justify-between items-center">
              {/* Left side: Tabs */}
              <div className="flex justify-start space-x-1 sm:space-x-4"> {/* Reduced space on small screens */}
                 <NavLink
                  to="/"
                  className={({ isActive }) =>
                    `flex flex-col items-center px-2 py-1 rounded-md transition-colors transform hover:scale-105 ${ /* Added transform effect */
                      isActive ? 'bg-blue-800 shadow-inner' : 'hover:bg-blue-700'
                    }`
                  }
                  title="Home"
                >
                  <LucideHome className="h-5 w-5" />
                  <span className="text-xs mt-1 font-medium">Home</span> {/* Slightly bolder text */}
                </NavLink>
                <NavLink
                  to="/daily-plan" // Keep this route for "Today"
                  className={({ isActive }) =>
                    `flex flex-col items-center px-2 py-1 rounded-md transition-colors transform hover:scale-105 ${
                      isActive ? 'bg-blue-800 shadow-inner' : 'hover:bg-blue-700'
                    }`
                  }
                   title="Today's Plan"
                >
                  <LucideCalendarDays className="h-5 w-5" />
                  <span className="text-xs mt-1 font-medium">Today</span>
                </NavLink>
                <NavLink
                  to="/history"
                  className={({ isActive }) =>
                    `flex flex-col items-center px-2 py-1 rounded-md transition-colors transform hover:scale-105 ${
                      isActive ? 'bg-blue-800 shadow-inner' : 'hover:bg-blue-700'
                    }`
                  }
                   title="History"
                >
                  <LucideHistory className="h-5 w-5" />
                  <span className="text-xs mt-1 font-medium">History</span>
                </NavLink>
              </div>

              {/* Right side: User info and Logout */}
              <div className="flex items-center space-x-2">
                 {user && (
                   <span className="text-sm hidden sm:inline truncate max-w-[150px] font-medium" title={user.email}> {/* Added truncate & font-medium */}
                     {user.email}
                   </span>
                 )}
                 <button
                    onClick={signOut}
                    title="Logout"
                    className="flex flex-col items-center px-2 py-1 rounded-md transition-colors hover:bg-red-600 transform hover:scale-105" /* Added transform */
                  >
                    <LucideLogOut className="h-5 w-5" />
                     <span className="text-xs mt-1 font-medium">Logout</span>
                  </button>
              </div>
            </div>
          </nav>
        )}

        {/* Page Content */}
        {/* Ensure main content area takes up space even when Auth page is shown */}
        <main className={`flex-grow container mx-auto p-4 ${!session ? 'flex items-center justify-center' : ''}`}>
          <Routes>
             {/* Public route for authentication - redirect if already logged in */}
            <Route path="/auth" element={!session ? <Auth /> : <Navigate to="/" replace />} />

            {/* Protected routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            {/* DailyPlan route now handles both today and specific dates via query param */}
            <Route
              path="/daily-plan"
              element={
                <ProtectedRoute>
                  <DailyPlan />
                </ProtectedRoute>
              }
            />
             <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <History />
                </ProtectedRoute>
              }
            />
             {/* Redirect any other path to home if logged in, or auth if not */}
             <Route path="*" element={<Navigate to={session ? "/" : "/auth"} replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
