import { useState, useEffect, ChangeEvent, FormEvent, KeyboardEvent } from 'react';
import {
  LucideUploadCloud, LucideLoader2, LucideSave, LucideImageOff,
  LucideAlertTriangle, LucidePlus, LucideTrash2, LucideCheckSquare, LucideSquare, LucideClock, LucideListTodo, LucidePlusCircle // Added LucidePlusCircle back for button
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { format, parse, isValid, parseISO } from 'date-fns';
import { TodoItem, ScheduleItem } from '../types/supabase';
import { v4 as uuidv4 } from 'uuid';

// Helper function to format date as YYYY-MM-DD
const formatDateForAPI = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

// Helper function to parse YYYY-MM-DD string to Date object
const parseDateFromAPI = (dateString: string): Date | null => {
  const parsed = parse(dateString, 'yyyy-MM-dd', new Date());
  return isValid(parsed) ? parsed : null;
};

// Helper to safely parse JSON strings from DB
const safeJsonParse = <T,>(jsonString: string | null | undefined, defaultValue: T): T => {
  if (!jsonString) return defaultValue;
  try {
    const parsed = JSON.parse(jsonString);
    if (Array.isArray(parsed)) {
       return parsed as T;
    }
    console.warn("Parsed JSON is not an array, returning default. String was:", jsonString);
    return defaultValue;
  } catch (e) {
    console.error("Failed to parse JSON:", e, "String was:", jsonString);
    return defaultValue;
  }
};


const DailyPlan = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const dateParam = searchParams.get('date');
  const initialDate = dateParam ? parseDateFromAPI(dateParam) : new Date();
  const [targetDate, setTargetDate] = useState<Date>(initialDate && isValid(initialDate) ? initialDate : new Date());
  const isEditingPast = dateParam !== null && formatDateForAPI(targetDate) !== formatDateForAPI(new Date());
  const formattedTargetDate = formatDateForAPI(targetDate);

  // State for structured data
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [newTodoText, setNewTodoText] = useState('');
  const [newScheduleTime, setNewScheduleTime] = useState('');
  const [newScheduleDesc, setNewScheduleDesc] = useState('');

  // State for other form fields
  const [formData, setFormData] = useState({
    notes: '', breakfast: '', lunch: '', dinner: '', snacks: '',
    water_intake_glasses: 0, mood: '', weather: '', high_level_note: '',
  });

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false); // Combined loading state
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(true);

  // --- Fetch Plan ---
  useEffect(() => {
     const clearForm = () => {
      setTodos([]);
      setSchedule([]);
      setFormData({
        notes: '', breakfast: '', lunch: '', dinner: '', snacks: '',
        water_intake_glasses: 0, mood: '', weather: '', high_level_note: '',
      });
    };

    if (!authLoading) {
      if (user) {
        fetchDailyPlan(user.id, formattedTargetDate);
      } else {
        console.warn("User not logged in.");
        clearForm();
        setIsFetching(false);
      }
    }
     return () => {
       setIsFetching(false);
     };
  }, [user, authLoading, formattedTargetDate]);

  const fetchDailyPlan = async (currentUserId: string, dateToFetch: string) => {
    setIsFetching(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('daily_plans')
        .select('*')
        .eq('user_id', currentUserId)
        .eq('plan_date', dateToFetch)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      if (data) {
        setTodos(safeJsonParse<TodoItem[]>(data.todos, []));
        const parsedSchedule = safeJsonParse<ScheduleItem[]>(data.schedule, []);
        const sortedSchedule = parsedSchedule.sort((a, b) => {
          const timeA = a?.time || '';
          const timeB = b?.time || '';
          return timeA.localeCompare(timeB);
        });
        setSchedule(sortedSchedule);
        setFormData({
          notes: data.notes || '', breakfast: data.breakfast || '', lunch: data.lunch || '',
          dinner: data.dinner || '', snacks: data.snacks || '', water_intake_glasses: data.water_intake_glasses || 0,
          mood: data.mood || '', weather: data.weather || '', high_level_note: data.high_level_note || '',
        });
      } else {
        setTodos([]); setSchedule([]);
        setFormData({ notes: '', breakfast: '', lunch: '', dinner: '', snacks: '', water_intake_glasses: 0, mood: '', weather: '', high_level_note: '' });
      }
    } catch (err: any) {
      console.error(`Error fetching daily plan for ${dateToFetch}:`, err);
      setError(`Failed to load plan for ${format(targetDate, 'MMMM d, yyyy')}.`);
      setTodos([]); setSchedule([]);
      setFormData({ notes: '', breakfast: '', lunch: '', dinner: '', snacks: '', water_intake_glasses: 0, mood: '', weather: '', high_level_note: '' });
    } finally {
      setIsFetching(false);
    }
  };
  // --- End Fetch Plan ---

  // --- Input Handlers ---
  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
     const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: id === 'water_intake_glasses' ? parseInt(value, 10) || 0 : value,
    }));
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
     if (isEditingPast) return;
    if (e.target.files && e.target.files[0]) {
      setSelectedImage(e.target.files[0]);
      setError(null);
    } else {
      setSelectedImage(null);
    }
  };
  // --- End Input Handlers ---

  // --- TODO Handlers ---
  const handleAddTodo = (e?: FormEvent | MouseEvent) => { // Accept MouseEvent for button click
    e?.preventDefault();
    if (newTodoText.trim() === '' || !user) return;
    const newTodo: TodoItem = { id: uuidv4(), text: newTodoText.trim(), completed: false };
    setTodos(prevTodos => [...prevTodos, newTodo]);
    setNewTodoText('');
  };

  const handleTodoInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNewTodoText(e.target.value);
  };

  const handleTodoKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTodo();
    }
  };

  const handleToggleTodo = (id: string) => {
     if (!user) return;
    setTodos(prevTodos =>
      prevTodos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const handleDeleteTodo = (id: string) => {
     if (!user) return;
    setTodos(prevTodos => prevTodos.filter(todo => todo.id !== id));
  };
  // --- End TODO Handlers ---

  // --- Schedule Handlers ---
  const handleAddScheduleItem = (e?: FormEvent | MouseEvent) => { // Accept MouseEvent
     e?.preventDefault();
     if (newScheduleTime.trim() === '' || newScheduleDesc.trim() === '' || !user) return;
     const newItem: ScheduleItem = { id: uuidv4(), time: newScheduleTime.trim(), description: newScheduleDesc.trim() };
     setSchedule(prevSchedule => [...prevSchedule, newItem].sort((a, b) => (a?.time || '').localeCompare(b?.time || '')));
     setNewScheduleTime('');
     setNewScheduleDesc('');
   };

   const handleScheduleDescKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
     if (e.key === 'Enter' && newScheduleTime.trim() !== '') {
       e.preventDefault();
       handleAddScheduleItem();
     }
   };

   const handleDeleteScheduleItem = (id: string) => {
      if (!user) return;
     setSchedule(prevSchedule => prevSchedule.filter(item => item.id !== id));
   };
  // --- End Schedule Handlers ---

  // --- Gemini Analyze ---
  const handleUploadAndAnalyze = async () => {
    // ... (keep existing logic) ...
     if (isEditingPast) { setError("Cannot analyze images for past dates."); return; }
    if (!user) { setError("Please log in to analyze images."); return; }
    if (!selectedImage) { setError("Please select an image first."); return; }
    setLoading(true); setError(null);
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) { setError("Gemini API key not configured."); setLoading(false); return; }
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Image = reader.result?.toString().split(',')[1];
      if (!base64Image) { setError("Failed to read image file."); setLoading(false); return; }
      try {
        const prompt = `Extract daily plan details from this image. Format the output STRICTLY as a JSON object with the following keys: "todos" (array of strings), "schedule" (array of objects with "time" and "description" strings), "breakfast" (string), "lunch" (string), "dinner" (string), "snacks" (string), "water_intake_glasses" (number), "mood" (string), "weather" (string), "notes" (string), "high_level_note" (string). If a field isn't found, use an empty string/array or 0 for water. Example schedule item: {"time": "09:00", "description": "Meeting"}. Example todo: "Buy groceries".`;
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-001:generateContent?key=${apiKey}`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: selectedImage.type, data: base64Image } }] }] })
         });

        if (!response.ok) {
           const errorData = await response.json();
           console.error("Gemini API error response:", errorData);
           throw new Error(`API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
         }
        const data = await response.json();
        console.log("Gemini API response:", data);
        const extractedText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

        let parsedData: any = {};
        try {
          const jsonMatch = extractedText.match(/```json\n([\s\S]*?)\n```/);
          if (jsonMatch && jsonMatch[1]) {
            parsedData = JSON.parse(jsonMatch[1]);
          } else {
            parsedData = JSON.parse(extractedText); // Fallback
          }

          setTodos(Array.isArray(parsedData.todos) ? parsedData.todos.map((text: string) => ({ id: uuidv4(), text, completed: false })) : []);
          setSchedule(Array.isArray(parsedData.schedule) ? parsedData.schedule.map((item: any) => ({ id: uuidv4(), time: item.time || '', description: item.description || '' })).sort((a: ScheduleItem, b: ScheduleItem) => (a?.time || '').localeCompare(b?.time || '')) : []);
          setFormData(prev => ({
            ...prev,
            breakfast: parsedData.breakfast || '', lunch: parsedData.lunch || '', dinner: parsedData.dinner || '',
            snacks: parsedData.snacks || '', water_intake_glasses: parseInt(parsedData.water_intake_glasses, 10) || 0,
            mood: parsedData.mood || '', weather: parsedData.weather || '', notes: parsedData.notes || '',
            high_level_note: parsedData.high_level_note || '',
          }));
          alert("Image processed! Plan fields updated.");

        } catch (parseError) {
          console.error("Failed to parse Gemini JSON response:", parseError);
          setError("Failed to parse extracted data. Raw text added to notes.");
          setFormData(prev => ({ ...prev, notes: `${prev.notes}\n\n[Image Analysis Raw]:\n${extractedText}`.trim() }));
        }

      } catch (err) {
         console.error("Error calling Gemini API:", err);
         setError(`Failed to process image: ${err instanceof Error ? err.message : String(err)}`);
         setFormData(prev => ({ ...prev, notes: `${prev.notes}\n\n[Image Analysis Error]: ${err instanceof Error ? err.message : String(err)}`.trim() }));
       } finally {
         setLoading(false);
         setSelectedImage(null);
         const fileInput = document.getElementById('image-upload') as HTMLInputElement;
         if (fileInput) fileInput.value = '';
       }
    };
    reader.readAsDataURL(selectedImage);
  };
  // --- End Gemini Analyze ---

  // --- Save Plan ---
  const handleSavePlan = async () => {
     if (!user) { setError("Please log in to save."); alert("Please log in to save."); return; }
    setLoading(true); setError(null);
    try {
      const { data: existingPlan, error: fetchError } = await supabase
        .from('daily_plans')
        .select('id')
        .eq('user_id', user.id)
        .eq('plan_date', formattedTargetDate)
        .maybeSingle();
      if (fetchError) throw fetchError;

      const planDataToSave = {
        user_id: user.id, plan_date: formattedTargetDate, ...formData,
        todos: JSON.stringify(todos), schedule: JSON.stringify(schedule),
      };

      let supabaseError = null;
      if (existingPlan) {
        const { error } = await supabase.from('daily_plans').update(planDataToSave).eq('id', existingPlan.id);
        supabaseError = error;
      } else {
        const { error } = await supabase.from('daily_plans').insert([planDataToSave]);
        supabaseError = error;
      }
      if (supabaseError) throw supabaseError;
      alert(`Plan for ${format(targetDate, 'MMMM d, yyyy')} saved successfully!`);
      if (isEditingPast) navigate('/history');
    } catch (err: any) {
      console.error("Error saving plan:", err);
      setError(`Failed to save plan: ${err.message}`);
      alert(`Failed to save plan: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  // --- End Save Plan ---

  // --- Render Logic ---
  if (authLoading || isFetching) {
     return (
      <div className="p-4 flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <LucideLoader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-600 text-lg">Loading...</span>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
       <h1 className="text-3xl font-bold mb-2 text-gray-800">
        {isEditingPast ? 'Edit Plan' : 'Today\'s Plan'}
      </h1>
      <p className="text-lg text-gray-600 mb-6">
        {format(targetDate, 'EEEE, MMMM d, yyyy')}
      </p>

       {!isEditingPast && (
         <div className="mb-8 p-6 border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors rounded-lg bg-gray-50 shadow-sm">
           <label htmlFor="image-upload" className="block text-gray-700 text-sm font-bold mb-2 cursor-pointer">Upload Planner Image (Optional)</label>
           <input id="image-upload" type="file" accept="image/*" onChange={handleImageChange} disabled={!user || loading || isEditingPast} className={`block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 file:transition-colors disabled:opacity-50 disabled:cursor-not-allowed`} />
           {selectedImage && <p className="mt-2 text-sm text-gray-600">Selected: {selectedImage.name}</p>}
           {error && error.includes("image") && <p className="mt-2 text-sm text-red-600">{error}</p>}
           <button onClick={handleUploadAndAnalyze} disabled={!selectedImage || loading || !user || isEditingPast} className={`mt-4 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg flex justify-center items-center shadow hover:shadow-md transition-all transform hover:scale-[1.02] ${(!selectedImage || loading || !user || isEditingPast) ? 'opacity-50 cursor-not-allowed' : ''}`}>
             {loading && !authLoading ? (<><LucideLoader2 className="inline mr-2 h-5 w-5 animate-spin"/> Analyzing...</>) : (<><LucideUploadCloud className="inline mr-2 h-5 w-5"/> Upload & Analyze</>)}
           </button>
           {!user && <p className="text-xs text-red-600 mt-1 text-center">Login required to analyze.</p>}
         </div>
       )}
       {isEditingPast && (
         <div className="mb-8 p-4 border border-yellow-300 rounded-lg bg-yellow-50 text-yellow-800 flex items-center shadow-sm">
           <LucideImageOff className="h-5 w-5 mr-3 flex-shrink-0" />
           <span>Image upload and analysis is disabled for past dates.</span>
         </div>
       )}

      {error && !error.includes("image") && ( <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md flex items-center"> <LucideAlertTriangle className="h-5 w-5 mr-2" /> <span>{error}</span> </div> )}

      {/* Main Form Area */}
      <div className="space-y-8 bg-white p-6 rounded-lg shadow-xl">

        {/* --- TODO Section --- */}
        <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm transition-shadow hover:shadow-md">
          <div className="bg-gray-50 p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-700 flex items-center"><LucideListTodo className="mr-2 h-5 w-5 text-blue-500"/> TODOs</h3>
             {/* Add Todo Input with Button */}
             <div className="flex gap-2 mt-3">
               <input
                 type="text"
                 value={newTodoText}
                 onChange={handleTodoInputChange}
                 onKeyDown={handleTodoKeyDown}
                 placeholder="Add a new task..."
                 disabled={!user || loading}
                 className="flex-grow border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
               />
               <button
                 type="button" // Prevent form submission if Enter is pressed on button
                 onClick={handleAddTodo}
                 disabled={!user || loading || newTodoText.trim() === ''}
                 className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md disabled:opacity-50 flex items-center justify-center shrink-0 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                 title="Add Task"
               >
                 <LucidePlus size={18} />
               </button>
             </div>
          </div>
          {/* Todo List */}
          <ul className="divide-y divide-gray-200 max-h-72 overflow-y-auto">
            {todos.length === 0 && <li className="text-sm text-gray-500 italic p-4">No tasks added yet.</li>}
            {todos.map((todo) => (
              <li key={todo.id} className="flex items-center justify-between p-3 group hover:bg-gray-50 transition-colors">
                <div className="flex items-center flex-grow mr-2 cursor-pointer" onClick={() => handleToggleTodo(todo.id)}>
                  <button className="mr-3 text-gray-600 hover:text-green-600 focus:outline-none shrink-0">
                    {todo.completed ? <LucideCheckSquare size={20} className="text-green-500"/> : <LucideSquare size={20} />}
                  </button>
                  <span className={`text-sm break-words ${todo.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                    {todo.text}
                  </span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteTodo(todo.id); }}
                  className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0 focus:outline-none p-1"
                  title="Delete task"
                >
                  <LucideTrash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        </div>
        {/* --- End TODO Section --- */}

        {/* --- Schedule Section --- */}
        <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm transition-shadow hover:shadow-md">
           <div className="bg-gray-50 p-4 border-b border-gray-200">
             <h3 className="text-lg font-semibold text-gray-700 flex items-center"><LucideClock className="mr-2 h-5 w-5 text-indigo-500"/> Schedule</h3>
             {/* Add Schedule Item Inputs with Button */}
             <div className="flex flex-col sm:flex-row gap-2 mt-3">
               <input
                 type="time"
                 value={newScheduleTime}
                 onChange={(e) => setNewScheduleTime(e.target.value)}
                 disabled={!user || loading}
                 required
                 className="border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed shrink-0 w-full sm:w-auto"
               />
               <input
                 type="text"
                 value={newScheduleDesc}
                 onChange={(e) => setNewScheduleDesc(e.target.value)}
                 onKeyDown={handleScheduleDescKeyDown}
                 placeholder="Schedule description..."
                 disabled={!user || loading}
                 required
                 className="flex-grow border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
               />
               <button
                 type="button" // Prevent form submission
                 onClick={handleAddScheduleItem}
                 disabled={!user || loading || newScheduleTime.trim() === '' || newScheduleDesc.trim() === ''}
                 className="bg-indigo-500 hover:bg-indigo-600 text-white p-2 rounded-md disabled:opacity-50 flex items-center justify-center sm:justify-start shrink-0 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
                 title="Add Schedule Item"
               >
                 <LucidePlus size={18} />
               </button>
             </div>
           </div>
           {/* Schedule List */}
           <ul className="divide-y divide-gray-200 max-h-72 overflow-y-auto">
             {schedule.length === 0 && <li className="text-sm text-gray-500 italic p-4">No schedule items added yet.</li>}
             {schedule.map((item) => (
               <li key={item.id} className="flex items-center justify-between p-3 group hover:bg-gray-50 transition-colors">
                 <div className="flex items-center flex-grow mr-2">
                   <span className="text-sm font-semibold font-mono bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full mr-3 shrink-0 w-[5.5rem] text-center">{item.time}</span>
                   <span className="text-sm text-gray-800 break-words">{item.description}</span>
                 </div>
                 <button
                   onClick={() => handleDeleteScheduleItem(item.id)}
                   className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0 focus:outline-none p-1"
                   title="Delete item"
                 >
                   <LucideTrash2 size={16} />
                 </button>
               </li>
             ))}
           </ul>
         </div>
        {/* --- End Schedule Section --- */}

        {/* --- Other Fields (Meals, Context, Notes, Summary) --- */}
        {/* ... (Keep existing JSX for other fields) ... */}
         {/* High-level note */}
        <div>
          <label htmlFor="high_level_note" className="block text-gray-700 text-sm font-bold mb-1">Summary / High-level Note</label>
          <textarea id="high_level_note" value={formData.high_level_note} onChange={handleInputChange} disabled={!user || loading} rows={3} className="w-full border border-gray-300 rounded-md p-2 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder="Summarize your day..."/>
        </div>
        {/* Meals */}
        <fieldset className="border border-gray-200 rounded-lg p-4 transition-shadow hover:shadow-md">
           <legend className="text-sm font-semibold text-gray-600 px-2">Meals & Hydration</legend>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <div><label htmlFor="breakfast" className="block text-gray-700 text-xs font-medium mb-1">Breakfast</label><input type="text" id="breakfast" value={formData.breakfast} onChange={handleInputChange} disabled={!user || loading} className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder="What did you eat?" /></div>
            <div><label htmlFor="lunch" className="block text-gray-700 text-xs font-medium mb-1">Lunch</label><input type="text" id="lunch" value={formData.lunch} onChange={handleInputChange} disabled={!user || loading} className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder="What did you eat?" /></div>
            <div><label htmlFor="dinner" className="block text-gray-700 text-xs font-medium mb-1">Dinner</label><input type="text" id="dinner" value={formData.dinner} onChange={handleInputChange} disabled={!user || loading} className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder="What did you eat?" /></div>
            <div><label htmlFor="snacks" className="block text-gray-700 text-xs font-medium mb-1">Snacks</label><input type="text" id="snacks" value={formData.snacks} onChange={handleInputChange} disabled={!user || loading} className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder="Any snacks?" /></div>
            <div className="sm:col-span-2"><label htmlFor="water_intake_glasses" className="block text-gray-700 text-xs font-medium mb-1">Water Intake (glasses)</label><input id="water_intake_glasses" type="number" value={formData.water_intake_glasses} onChange={handleInputChange} disabled={!user || loading} className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder="Number of glasses" min="0"/></div>
           </div>
        </fieldset>
         {/* Mood & Weather */}
         <fieldset className="border border-gray-200 rounded-lg p-4 transition-shadow hover:shadow-md">
           <legend className="text-sm font-semibold text-gray-600 px-2">Context</legend>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
             <div><label htmlFor="mood" className="block text-gray-700 text-xs font-medium mb-1">Mood</label><input id="mood" type="text" value={formData.mood} onChange={handleInputChange} disabled={!user || loading} className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder="How were you feeling?"/></div>
             <div><label htmlFor="weather" className="block text-gray-700 text-xs font-medium mb-1">Weather</label><input id="weather" type="text" value={formData.weather} onChange={handleInputChange} disabled={!user || loading} className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder="What was the weather?"/></div>
           </div>
        </fieldset>
         {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-gray-700 text-sm font-bold mb-1">Additional Notes</label>
          <textarea id="notes" value={formData.notes} onChange={handleInputChange} disabled={!user || loading} rows={4} className="w-full border border-gray-300 rounded-md p-2 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder="Any other details..."/>
        </div>
        {/* --- End Other Fields --- */}

      </div>

      {/* Save Button */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSavePlan}
          disabled={loading || !user}
          className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg flex items-center shadow hover:shadow-md transition-all transform hover:scale-105 ${
            (loading || !user) ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {loading ? (
            <><LucideLoader2 className="inline mr-2 h-5 w-5 animate-spin"/> Saving...</>
          ) : (
            <><LucideSave className="inline mr-2 h-5 w-5"/> Save Plan</>
          )}
        </button>
        {!user && <p className="text-xs text-red-600 mt-1 text-center self-center ml-4">Login required to save.</p>}
      </div>
    </div>
  );
};

export default DailyPlan;
