import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // Import default calendar styles
import { supabase } from '../supabaseClient';
import { DailyPlanData, TodoItem, ScheduleItem } from '../types/supabase'; // Import types
import { useAuth } from '../contexts/AuthContext';
import { LucideLoader2, LucideAlertCircle, LucideCalendarX2, LucideChevronLeft, LucideChevronRight, LucideInfo, LucideEdit, LucideCheckSquare, LucideSquare, LucideListTodo, LucideClock } from 'lucide-react'; // Added icons
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';

// Define Value type for react-calendar
type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

// Helper to safely parse JSON strings from DB (copied from DailyPlan for now)
const safeJsonParse = <T,>(jsonString: string | null | undefined, defaultValue: T): T => {
  if (!jsonString) return defaultValue;
  try {
    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed)) { // Basic check for arrays
       return parsed as T;
    }
    console.warn("Parsed JSON is not an array, returning default. String was:", jsonString);
    return defaultValue;
  } catch (e) {
    console.error("Failed to parse JSON:", e, "String was:", jsonString);
    return defaultValue;
  }
};


const History = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [allPlans, setAllPlans] = useState<DailyPlanData[]>([]);
  const [planDates, setPlanDates] = useState<Set<string>>(new Set());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedPlan, setSelectedPlan] = useState<DailyPlanData | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for parsed structured data of the selected plan
  const [parsedTodos, setParsedTodos] = useState<TodoItem[]>([]);
  const [parsedSchedule, setParsedSchedule] = useState<ScheduleItem[]>([]);

  // Fetch all plans
  useEffect(() => {
    // ... (keep existing fetchAllPlans logic) ...
     const fetchAllPlans = async (userId: string) => {
      setLoadingPlans(true);
      setError(null);
      setAllPlans([]);
      setPlanDates(new Set());
      setSelectedPlan(null); // Clear selected plan when refetching
      setParsedTodos([]); // Clear parsed data
      setParsedSchedule([]);

      try {
        const { data, error: planError } = await supabase
          .from('daily_plans')
          .select('*')
          .eq('user_id', userId)
          .order('plan_date', { ascending: false });

        if (planError) throw planError;

        if (data) {
          setAllPlans(data);
          const dates = new Set(data.map(plan => plan.plan_date));
          setPlanDates(dates);
          findPlanForDate(selectedDate, data); // Find initial plan
        } else {
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
      setLoadingPlans(false);
      setError("Please log in to view your history.");
      setAllPlans([]); setPlanDates(new Set()); setSelectedPlan(null);
      setParsedTodos([]); setParsedSchedule([]);
    }
     if (!authLoading) { setSelectedDate(new Date()); }

  }, [user, authLoading]);

  // Parse Todos and Schedule when selectedPlan changes
  useEffect(() => {
    if (selectedPlan) {
      const todos = safeJsonParse<TodoItem[]>(selectedPlan.todos, []);
      const schedule = safeJsonParse<ScheduleItem[]>(selectedPlan.schedule, []).sort((a, b) => (a?.time || '').localeCompare(b?.time || '')); // Sort defensively
      setParsedTodos(todos);
      setParsedSchedule(schedule);
    } else {
      setParsedTodos([]);
      setParsedSchedule([]);
    }
  }, [selectedPlan]); // Re-run only when selectedPlan changes


  // Function to find the plan for a given date
  const findPlanForDate = (date: Date, plans: DailyPlanData[]) => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    const plan = plans.find(p => p.plan_date === formattedDate) || null;
    setSelectedPlan(plan); // This will trigger the useEffect above to parse data
  };

  // Handle calendar date change
  const handleDateChange = (value: Value) => {
    const newDate = Array.isArray(value) ? value[0] : value;
    if (newDate) {
      setSelectedDate(newDate);
      findPlanForDate(newDate, allPlans);
    }
  };

  // Function to add custom styling to calendar tiles
  const tileClassName = ({ date, view }: { date: Date; view: string }): string | null => {
    if (view === 'month') {
      const formattedDate = format(date, 'yyyy-MM-dd');
      if (planDates.has(formattedDate)) return 'has-plan';
    }
    return null;
  };

  // Simplified renderDetail for non-structured fields
  const renderSimpleDetail = (label: string, value: string | number | undefined | null) => {
    if (value === undefined || value === null || value === '' || (typeof value === 'number' && value === 0 && label !== 'Water Intake (glasses)')) {
      return null;
    }
    return (
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</h3>
        <p className="text-gray-800 text-base">{value}</p>
      </div>
    );
  };

   // Render detail with pre-wrap for multi-line text fields
   const renderTextAreaDetail = (label: string, value: string | undefined | null) => {
     if (value === undefined || value === null || value === '') {
       return null;
     }
     return (
       <div className="mb-3">
         <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</h3>
         <pre className="text-gray-800 whitespace-pre-wrap font-sans text-base bg-gray-50 p-2 rounded border">{value}</pre>
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
      <style>{`
          /* ... (keep existing calendar styles) ... */
          .react-calendar { border: 1px solid #d1d5db; border-radius: 0.75rem; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); background-color: white; width: 100%; max-width: 400px; margin: 0 auto 2rem auto; padding: 0.5rem; }
          .react-calendar__tile { border-radius: 0.5rem; transition: background-color 0.2s ease-in-out, transform 0.1s ease-in-out; padding: 0.75em 0.5em; }
          .react-calendar__tile:enabled:hover, .react-calendar__tile:enabled:focus { background-color: #e5e7eb; transform: scale(1.05); }
          .react-calendar__tile--now { background: #dbeafe; font-weight: bold; color: #1e40af; }
          .react-calendar__tile--active { background: #2563eb !important; color: white !important; transform: scale(1.1); box-shadow: 0 0 0 2px white, 0 0 0 4px #2563eb; }
          .react-calendar__navigation button { color: #3b82f6; min-width: 44px; background: none; font-size: 1.1rem; margin-top: 8px; border-radius: 0.375rem; padding: 0.25rem 0.5rem; }
          .react-calendar__navigation button:enabled:hover, .react-calendar__navigation button:enabled:focus { background-color: #f3f4f6; }
          .react-calendar__navigation button[disabled] { background-color: #f9fafb; color: #9ca3af; }
          .react-calendar__month-view__days__day--weekend { color: #f87171; }
          .react-calendar__month-view__days__day--neighboringMonth { color: #9ca3af; }
          .has-plan { font-weight: bold; position: relative; }
          .has-plan::after { content: ''; position: absolute; bottom: 5px; left: 50%; transform: translateX(-50%); width: 6px; height: 6px; border-radius: 50%; background-color: #3b82f6; }
          .react-calendar__tile--active.has-plan { background-color: #2563eb !important; }
          .react-calendar__tile--active.has-plan::after { background-color: white; }
      `}</style>

      {authLoading && ( <div className="flex justify-center items-center p-6"> <LucideLoader2 className="h-6 w-6 animate-spin text-blue-500" /> <span className="ml-2 text-gray-600">Loading authentication...</span> </div> )}
      {!authLoading && !user && ( <div className="text-center p-6 bg-yellow-50 border border-yellow-300 rounded-lg shadow"> <LucideAlertCircle className="h-8 w-8 mx-auto mb-3 text-yellow-500" /> <p className="text-yellow-800 font-medium">Please log in to view your history.</p> </div> )}

      {!authLoading && user && (
        <>
          {error && ( <div className="mb-4 p-4 bg-red-50 border border-red-300 text-red-700 rounded-lg shadow flex items-center"> <LucideAlertCircle className="h-5 w-5 mr-3 flex-shrink-0" /> <span>{error}</span> </div> )}
          {loadingPlans && ( <div className="flex justify-center items-center p-6"> <LucideLoader2 className="h-6 w-6 animate-spin text-blue-500" /> <span className="ml-2 text-gray-600">Loading plans...</span> </div> )}

          {!loadingPlans && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Calendar View */}
              <div className="lg:col-span-1">
                <Calendar
                  onChange={handleDateChange} value={selectedDate} tileClassName={tileClassName}
                  maxDate={new Date()} prev2Label={null} next2Label={null}
                  prevLabel={<LucideChevronLeft size={24} />} nextLabel={<LucideChevronRight size={24} />}
                  className="shadow-xl"
                />
              </div>

              {/* Selected Plan Details */}
              <div className="lg:col-span-2">
                <div className="flex justify-between items-center mb-4 border-b border-gray-300 pb-2">
                  <h2 className="text-2xl font-semibold text-gray-800">
                    Plan for: {format(selectedDate, 'MMMM d, yyyy')}
                  </h2>
                  {selectedPlan && (
                    <button onClick={handleEditPlan} className="flex items-center bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all transform hover:scale-105" title="Edit this plan">
                      <LucideEdit className="h-4 w-4 mr-2" /> Edit Plan
                    </button>
                  )}
                </div>

                {selectedPlan ? (
                  <div className="bg-white p-6 rounded-xl shadow-lg space-y-6"> {/* Increased spacing */}

                    {/* Render simple fields */}
                    {renderTextAreaDetail('Summary', selectedPlan.high_level_note)}

                    {/* Render TODOs List */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                       <h3 className="text-lg font-semibold text-gray-700 flex items-center bg-gray-50 p-3 border-b"><LucideListTodo className="mr-2 h-5 w-5 text-blue-500"/> TODOs</h3>
                       {parsedTodos.length > 0 ? (
                         <ul className="divide-y divide-gray-200 max-h-60 overflow-y-auto p-3">
                           {parsedTodos.map(todo => (
                             <li key={todo.id} className="flex items-center py-2">
                               {todo.completed ? <LucideCheckSquare size={18} className="text-green-500 mr-3 shrink-0"/> : <LucideSquare size={18} className="text-gray-400 mr-3 shrink-0"/>}
                               <span className={`text-sm ${todo.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}>{todo.text}</span>
                             </li>
                           ))}
                         </ul>
                       ) : (
                         <p className="text-sm text-gray-500 italic p-3">No TODOs recorded.</p>
                       )}
                     </div>

                    {/* Render Schedule List */}
                     <div className="border border-gray-200 rounded-lg overflow-hidden">
                       <h3 className="text-lg font-semibold text-gray-700 flex items-center bg-gray-50 p-3 border-b"><LucideClock className="mr-2 h-5 w-5 text-indigo-500"/> Schedule</h3>
                       {parsedSchedule.length > 0 ? (
                         <ul className="divide-y divide-gray-200 max-h-60 overflow-y-auto p-3">
                           {parsedSchedule.map(item => (
                             <li key={item.id} className="flex items-center py-2">
                               <span className="text-sm font-semibold font-mono bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded mr-3 shrink-0 w-[5rem] text-center">{item.time}</span>
                               <span className="text-sm text-gray-800">{item.description}</span>
                             </li>
                           ))}
                         </ul>
                       ) : (
                         <p className="text-sm text-gray-500 italic p-3">No schedule recorded.</p>
                       )}
                     </div>

                    {/* Render other fields in a grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 pt-2 border-t border-gray-200 mt-4">
                      {renderSimpleDetail('Breakfast', selectedPlan.breakfast)}
                      {renderSimpleDetail('Lunch', selectedPlan.lunch)}
                      {renderSimpleDetail('Dinner', selectedPlan.dinner)}
                      {renderSimpleDetail('Snacks', selectedPlan.snacks)}
                      {renderSimpleDetail('Water Intake (glasses)', selectedPlan.water_intake_glasses)}
                      {renderSimpleDetail('Mood', selectedPlan.mood)}
                      {renderSimpleDetail('Weather', selectedPlan.weather)}
                    </div>

                    {renderTextAreaDetail('Notes', selectedPlan.notes)}

                    <p className="text-xs text-gray-400 mt-4 text-right pt-4 border-t border-gray-200">
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
                 {allPlans.length === 0 && !loadingPlans && !error && (
                   <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-blue-800 flex items-start shadow">
                     <LucideInfo className="h-5 w-5 mr-3 flex-shrink-0 mt-1 text-blue-600" />
                     <div> <p className="font-semibold">No History Yet</p> <p>It looks like you haven't saved any daily plans yet. Go to the "Today" tab to create your first plan!</p> </div>
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
