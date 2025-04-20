import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // Import default calendar styles
import { supabase } from '../supabaseClient';
import { DailyPlanData } from '../types/supabase';
import { useAuth } from '../contexts/AuthContext';
import { LucideLoader2, LucideAlertCircle, LucideCalendarX2, LucideChevronLeft, LucideChevronRight, LucideInfo, LucideEdit } from 'lucide-react'; // Added LucideEdit
import { format, parseISO } from 'date-fns'; // Use date-fns for reliable date formatting/comparison
import { useNavigate } from 'react-router-dom'; // Import useNavigate

// Define Value type for react-calendar
type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

const History = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate(); // Hook for navigation
  const [allPlans, setAllPlans] = useState<DailyPlanData[]>([]);
  const [planDates, setPlanDates] = useState<Set<string>>(new Set()); // Store dates with plans (YYYY-MM-DD)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date()); // Calendar selected date
  const [selectedPlan, setSelectedPlan] = useState<DailyPlanData | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all plans when user is available
  useEffect(() => {
    const fetchAllPlans = async (userId: string) => {
      setLoadingPlans(true);
      setError(null);
      setAllPlans([]);
      setPlanDates(new Set());
      setSelectedPlan(null); // Clear selected plan when refetching

      try {
        const { data, error: planError } = await supabase
          .from('daily_plans')
          .select('*')
          .eq('user_id', userId)
          .order('plan_date', { ascending: false }); // Fetch all plans

        if (planError) {
          throw planError;
        }

        if (data) {
          setAllPlans(data);
          // Extract unique dates with plans
          const dates = new Set(data.map(plan => plan.plan_date));
          setPlanDates(dates);
          // Find and set plan for initially selected date (today)
          findPlanForDate(selectedDate, data);
        } else {
           // No data found, ensure selected plan is null
           setSelectedPlan(null);
        }
      } catch (err: any) {
        console.error("Error fetching all plans:", err);
        setError(`Failed to load history: ${err.message || 'Unknown error'}`);
      } finally {
        setLoadingPlans(false);
      }
    };

    if (!authLoading && user) {
      fetchAllPlans(user.id);
    } else if (!authLoading && !user) {
      // Clear state if user logs out
      setLoadingPlans(false);
      setError("Please log in to view your history.");
      setAllPlans([]);
      setPlanDates(new Set());
      setSelectedPlan(null);
    }
     // Reset selected date to today when user changes
     // This prevents showing a stale date if a different user logs in
     if (!authLoading) {
        setSelectedDate(new Date());
     }

  }, [user, authLoading]); // Re-run when user or auth state changes

  // Function to find the plan for a given date from the fetched plans
  const findPlanForDate = (date: Date, plans: DailyPlanData[]) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    const plan = plans.find(p => p.plan_date === formattedDate) || null;
    setSelectedPlan(plan);
  };

  // Handle calendar date change
  const handleDateChange = (value: Value) => {
    // react-calendar returns Date object(s)
    const newDate = Array.isArray(value) ? value[0] : value;
    if (newDate) {
      setSelectedDate(newDate);
      findPlanForDate(newDate, allPlans); // Find plan for the newly selected date
    }
  };

  // Function to add custom styling or content to calendar tiles
  const tileClassName = ({ date, view }: { date: Date; view: string }): string | null => {
    // Check only in month view
    if (view === 'month') {
      const formattedDate = format(date, 'yyyy-MM-dd');
      if (planDates.has(formattedDate)) {
        // Add a class to dates that have a plan entry
        return 'has-plan';
      }
    }
    return null;
  };

  // Helper to render plan details in a readable format
  const renderDetail = (label: string, value: string | number | undefined | null, isTextArea = false) => {
    if (value === undefined || value === null || value === '' || (typeof value === 'number' && value === 0 && label !== 'Water Intake (glasses)')) {
      return null; // Don't render empty/zero fields (except water)
    }
    return (
      <div className="mb-4 border-b border-gray-200 pb-2 last:border-b-0">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</h3>
        {isTextArea ? (
          <pre className="text-gray-800 whitespace-pre-wrap font-sans text-base">{value}</pre> /* Use <pre> for multi-line */
        ) : (
          <p className="text-gray-800 text-base">{value}</p>
        )}
      </div>
    );
  };

  // Handle edit button click
  const handleEditPlan = () => {
    if (selectedPlan) {
      navigate(`/daily-plan?date=${selectedPlan.plan_date}`);
    }
  };


  return (
    <div className="p-4">
      <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">Plan History</h1>

      {/* Inline styles for react-calendar customization */}
      <style>
        {`
          .react-calendar {
            border: 1px solid #d1d5db; /* gray-300 */
            border-radius: 0.75rem; /* rounded-xl */
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); /* shadow-lg */
            background-color: white;
            width: 100%; /* Make calendar full width */
            max-width: 400px; /* Optional: constrain max width */
            margin: 0 auto 2rem auto; /* Center calendar and add more bottom margin */
            padding: 0.5rem; /* Add some internal padding */
          }
          .react-calendar__tile {
            border-radius: 0.5rem; /* rounded-lg */
            transition: background-color 0.2s ease-in-out, transform 0.1s ease-in-out;
            padding: 0.75em 0.5em; /* Adjust padding */
          }
          .react-calendar__tile:enabled:hover,
          .react-calendar__tile:enabled:focus {
            background-color: #e5e7eb; /* gray-200 */
            transform: scale(1.05);
          }
          .react-calendar__tile--now {
            background: #dbeafe; /* blue-100 */
            font-weight: bold;
            color: #1e40af; /* blue-800 */
          }
          .react-calendar__tile--active {
            background: #2563eb !important; /* blue-600 */
            color: white !important;
            transform: scale(1.1);
            box-shadow: 0 0 0 2px white, 0 0 0 4px #2563eb; /* Ring effect */
          }
          .react-calendar__navigation button {
            color: #3b82f6; /* blue-500 */
            min-width: 44px;
            background: none;
            font-size: 1.1rem; /* Slightly larger arrows */
            margin-top: 8px;
            border-radius: 0.375rem; /* rounded-md */
             padding: 0.25rem 0.5rem;
          }
          .react-calendar__navigation button:enabled:hover,
          .react-calendar__navigation button:enabled:focus {
            background-color: #f3f4f6; /* gray-100 */
          }
          .react-calendar__navigation button[disabled] {
            background-color: #f9fafb; /* gray-50 */
            color: #9ca3af; /* gray-400 */
          }
          .react-calendar__month-view__days__day--weekend {
            color: #f87171; /* red-400 */
          }
          .react-calendar__month-view__days__day--neighboringMonth {
            color: #9ca3af; /* gray-400 */
          }
          /* Custom class for days with plans */
          .has-plan {
            /* background-color: #bfdbfe; */ /* blue-200 - Use dot instead */
            /* border-radius: 50%; */
            font-weight: bold;
            position: relative; /* Needed for dot */
          }
          .has-plan::after { /* Dot indicator */
             content: '';
             position: absolute;
             bottom: 5px; /* Position dot */
             left: 50%;
             transform: translateX(-50%);
             width: 6px;
             height: 6px;
             border-radius: 50%;
             background-color: #3b82f6; /* blue-500 */
          }
          .react-calendar__tile--active.has-plan {
             background-color: #2563eb !important; /* Ensure active selection overrides */
          }
           .react-calendar__tile--active.has-plan::after {
             background-color: white; /* Make dot visible on active background */
           }
        `}
      </style> {/* Ensure the template literal is closed before the style tag */}

      {authLoading && (
        <div className="flex justify-center items-center p-6">
          <LucideLoader2 className="h-6 w-6 animate-spin text-blue-500" />
          <span className="ml-2 text-gray-600">Loading authentication...</span>
        </div>
      )}

      {!authLoading && !user && (
        <div className="text-center p-6 bg-yellow-50 border border-yellow-300 rounded-lg shadow">
          <LucideAlertCircle className="h-8 w-8 mx-auto mb-3 text-yellow-500" />
          <p className="text-yellow-800 font-medium">Please log in to view your history.</p>
        </div>
      )}

      {!authLoading && user && (
        <>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-300 text-red-700 rounded-lg shadow flex items-center">
              <LucideAlertCircle className="h-5 w-5 mr-3 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {loadingPlans && (
            <div className="flex justify-center items-center p-6">
              <LucideLoader2 className="h-6 w-6 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-600">Loading plans...</span>
            </div>
          )}

          {!loadingPlans && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8"> {/* Changed to lg breakpoint */}
              {/* Calendar View */}
              <div className="lg:col-span-1">
                <Calendar
                  onChange={handleDateChange}
                  value={selectedDate}
                  tileClassName={tileClassName}
                  maxDate={new Date()} // Disable future dates
                  prev2Label={null} // Hide double arrows
                  next2Label={null} // Hide double arrows
                  prevLabel={<LucideChevronLeft size={24} />} // Larger icons
                  nextLabel={<LucideChevronRight size={24} />}
                  className="shadow-xl" // More shadow
                />
              </div>

              {/* Selected Plan Details */}
              <div className="lg:col-span-2">
                <div className="flex justify-between items-center mb-4 border-b border-gray-300 pb-2">
                  <h2 className="text-2xl font-semibold text-gray-800">
                    Plan for: {format(selectedDate, 'MMMM d, yyyy')}
                  </h2>
                  {selectedPlan && (
                    <button
                      onClick={handleEditPlan}
                      className="flex items-center bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all transform hover:scale-105"
                      title="Edit this plan"
                    >
                      <LucideEdit className="h-4 w-4 mr-2" />
                      Edit Plan
                    </button>
                  )}
                </div>

                {selectedPlan ? (
                  <div className="bg-white p-6 rounded-xl shadow-lg space-y-4"> {/* Added space-y */}
                    {renderDetail('Summary', selectedPlan.high_level_note, true)}
                    {renderDetail('TODOs', selectedPlan.todos, true)}
                    {renderDetail('Schedule', selectedPlan.schedule, true)}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 pt-2"> {/* Grid for meals/etc */}
                      {renderDetail('Breakfast', selectedPlan.breakfast)}
                      {renderDetail('Lunch', selectedPlan.lunch)}
                      {renderDetail('Dinner', selectedPlan.dinner)}
                      {renderDetail('Snacks', selectedPlan.snacks)}
                      {renderDetail('Water Intake (glasses)', selectedPlan.water_intake_glasses)}
                      {renderDetail('Mood', selectedPlan.mood)}
                      {renderDetail('Weather', selectedPlan.weather)}
                    </div>
                    {renderDetail('Notes', selectedPlan.notes, true)}
                    {/* Optionally display created/updated timestamps */}
                     <p className="text-xs text-gray-400 mt-4 text-right">
                       Last Updated: {format(parseISO(selectedPlan.updated_at), 'Pp')}
                     </p>
                  </div>
                ) : (
                  <div className="text-center p-8 bg-white rounded-xl shadow-lg">
                    <LucideCalendarX2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 text-lg">No plan recorded for this date.</p>
                    <p className="text-gray-500 text-sm mt-1">Select another date or create a plan for today!</p>
                  </div>
                )}
                 {/* Info box if no plans exist at all */}
                 {allPlans.length === 0 && !loadingPlans && !error && (
                   <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 flex items-start shadow">
                     <LucideInfo className="h-5 w-5 mr-3 flex-shrink-0 mt-1 text-blue-600" />
                     <div>
                       <p className="font-semibold">No History Yet</p>
                       <p>It looks like you haven't saved any daily plans yet. Go to the "Today" tab to create your first plan!</p>
                     </div>
                   </div>
                 )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default History;
