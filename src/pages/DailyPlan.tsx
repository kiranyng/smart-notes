import { useState, useEffect } from 'react'
import { LucideUploadCloud, LucideLoader2, LucideSave, LucideImageOff, LucideAlertTriangle } from 'lucide-react' // Added icons
import { supabase } from '../supabaseClient'
import { useAuth } from '../contexts/AuthContext'; // Import useAuth
import { useSearchParams, useNavigate } from 'react-router-dom'; // Import hooks for query params and navigation
import { format, parse, isValid } from 'date-fns'; // Import date-fns functions

// Helper function to format date as YYYY-MM-DD
const formatDateForAPI = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

// Helper function to parse YYYY-MM-DD string to Date object
const parseDateFromAPI = (dateString: string): Date | null => {
  const parsed = parse(dateString, 'yyyy-MM-dd', new Date());
  return isValid(parsed) ? parsed : null;
};

const DailyPlan = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth(); // Get user and auth loading state

  // Determine the date being viewed/edited
  const dateParam = searchParams.get('date');
  const initialDate = dateParam ? parseDateFromAPI(dateParam) : new Date();
  const [targetDate, setTargetDate] = useState<Date>(initialDate && isValid(initialDate) ? initialDate : new Date()); // Default to today if param is invalid
  const isEditingPast = dateParam !== null && formatDateForAPI(targetDate) !== formatDateForAPI(new Date());
  const formattedTargetDate = formatDateForAPI(targetDate); // YYYY-MM-DD format for API/display

  const [formData, setFormData] = useState({
    // Removed plan_content as it wasn't used and we have specific fields
    todos: '',
    notes: '',
    breakfast: '',
    lunch: '',
    dinner: '',
    snacks: '',
    water_intake_glasses: 0,
    schedule: '',
    mood: '',
    weather: '',
    high_level_note: '',
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false); // For page-specific loading (save/analyze/fetch)
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(true); // Separate state for initial fetch

  // Fetch plan for the targetDate on component mount or when targetDate/user changes
  useEffect(() => {
    // Function to clear form data
    const clearFormData = () => {
       setFormData({
        todos: '', notes: '', breakfast: '', lunch: '',
        dinner: '', snacks: '', water_intake_glasses: 0, schedule: '',
        mood: '', weather: '', high_level_note: '',
      });
    }

    // Wait for auth loading to finish
    if (!authLoading) {
      if (user) {
        fetchDailyPlan(user.id, formattedTargetDate);
      } else {
        // User is definitely not logged in
        console.warn("User not logged in. Cannot load plan.");
        clearFormData(); // Clear form if user logs out
        setIsFetching(false); // Stop fetching state
      }
    }
    // Dependency array includes user, authLoading, and the formatted target date
  }, [user, authLoading, formattedTargetDate]);

  const fetchDailyPlan = async (currentUserId: string, dateToFetch: string) => {
    setIsFetching(true); // Indicate fetching started
    setLoading(true); // Also use general loading for fetch
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('daily_plans')
        .select('*') // Select all columns
        .eq('user_id', currentUserId)
        .eq('plan_date', dateToFetch) // Use the date to fetch
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
        throw fetchError;
      } else if (data) {
        // Populate form data with fetched data
        setFormData({
          todos: data.todos || '',
          notes: data.notes || '',
          breakfast: data.breakfast || '',
          lunch: data.lunch || '',
          dinner: data.dinner || '',
          snacks: data.snacks || '',
          water_intake_glasses: data.water_intake_glasses || 0,
          schedule: data.schedule || '',
          mood: data.mood || '',
          weather: data.weather || '',
          high_level_note: data.high_level_note || '',
        });
      } else {
         // No plan found for this date, ensure form is clear
         setFormData({
            todos: '', notes: '', breakfast: '', lunch: '',
            dinner: '', snacks: '', water_intake_glasses: 0, schedule: '',
            mood: '', weather: '', high_level_note: '',
          });
      }
    } catch (err: any) {
       console.error(`Error fetching daily plan for ${dateToFetch}:`, err);
       setError(`Failed to load plan for ${format(targetDate, 'MMMM d, yyyy')}.`);
    } finally {
       setIsFetching(false); // Indicate fetching finished
       setLoading(false); // Stop general loading
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: id === 'water_intake_glasses' ? parseInt(value, 10) || 0 : value,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isEditingPast) return; // Don't allow image changes for past dates
    if (e.target.files && e.target.files[0]) {
      setSelectedImage(e.target.files[0]);
      setError(null); // Clear previous errors
    } else {
      setSelectedImage(null);
    }
  };

  const handleUploadAndAnalyze = async () => {
     if (isEditingPast) {
       setError("Cannot analyze images for past dates.");
       return;
     }
     if (!user) {
       setError("Please log in to analyze images.");
       return;
     }
    if (!selectedImage) {
      setError("Please select an image first.");
      return;
    }

    setLoading(true);
    setError(null);

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      setError("Gemini API key not configured in .env file.");
      setLoading(false);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Image = reader.result?.toString().split(',')[1];

      if (!base64Image) {
        setError("Failed to read image file.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-001:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: "Extract the daily plan, tasks, schedule, meals (breakfast, lunch, dinner, snacks), water intake, mood, and weather from this image. Format the output as a JSON object with keys: todos, schedule, breakfast, lunch, dinner, snacks, water_intake_glasses (number), mood, weather, notes, high_level_note. If a field is not found, use an empty string or 0 for water intake." },
                  {
                    inline_data: {
                      mime_type: selectedImage.type,
                      data: base64Image
                    }
                  }
                ]
              }
            ]
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Gemini API error response:", errorData);
          throw new Error(`API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        console.log("Gemini API response:", data);

        // Attempt to extract JSON from the response text
        const extractedText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        let parsedData: any = {}; // Use 'any' temporarily for parsing flexibility
        try {
            // Attempt to find and parse JSON within the text (handles ```json ... ``` markdown)
            const jsonMatch = extractedText.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch && jsonMatch[1]) {
                parsedData = JSON.parse(jsonMatch[1]);
            } else {
                 // Fallback: try parsing the whole text if no ```json``` block is found
                 parsedData = JSON.parse(extractedText);
            }
             // Update form data with extracted values, using defaults for missing fields
            setFormData(prev => ({
                ...prev, // Keep existing fields not overwritten by Gemini
                todos: parsedData.todos || prev.todos || '', // Prioritize parsed, then previous, then default
                schedule: parsedData.schedule || prev.schedule || '',
                breakfast: parsedData.breakfast || prev.breakfast || '',
                lunch: parsedData.lunch || prev.lunch || '',
                dinner: parsedData.dinner || prev.dinner || '',
                snacks: parsedData.snacks || prev.snacks || '',
                water_intake_glasses: parseInt(parsedData.water_intake_glasses, 10) || prev.water_intake_glasses || 0,
                mood: parsedData.mood || prev.mood || '',
                weather: parsedData.weather || prev.weather || '',
                notes: parsedData.notes || prev.notes || '',
                high_level_note: parsedData.high_level_note || prev.high_level_note || '',
            }));
            alert("Image processed! Plan fields updated.");
        } catch (parseError) {
            console.error("Failed to parse Gemini response as JSON:", parseError);
            setError("Failed to parse extracted data. Please check the image or enter manually.");
             // Optionally put the raw text into notes or a dedicated field
            setFormData(prev => ({ ...prev, notes: `${prev.notes}\n\n[Image Analysis Raw]:\n${extractedText}`.trim() }));
        }


      } catch (err) {
        console.error("Error calling Gemini API:", err);
        setError(`Failed to process image: ${err instanceof Error ? err.message : String(err)}`);
        // Optionally update a field to show the error
        setFormData(prev => ({ ...prev, notes: `${prev.notes}\n\n[Image Analysis Error]: ${err instanceof Error ? err.message : String(err)}`.trim() }));
      } finally {
        setLoading(false);
        setSelectedImage(null); // Clear selected image after processing
         // Clear the file input visually
         const fileInput = document.getElementById('image-upload') as HTMLInputElement;
         if (fileInput) {
           fileInput.value = '';
         }
      }
    };
    reader.readAsDataURL(selectedImage); // Read image as base64
  };

  const handleSavePlan = async () => {
    // Use user from context directly
    if (!user) {
      setError("Please log in to save your plan.");
      alert("Please log in to save your plan."); // Also show alert
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Check if a plan already exists for the target date
      const { data: existingPlan, error: fetchError } = await supabase
        .from('daily_plans')
        .select('id')
        .eq('user_id', user.id) // Use user.id from context
        .eq('plan_date', formattedTargetDate) // Use the target date
        .maybeSingle(); // Use maybeSingle to handle 0 or 1 row without error

      if (fetchError) {
         throw fetchError; // Throw if there's an actual DB error
      }

      let supabaseError = null;
      const planDataToSave = {
        user_id: user.id, // Use user.id from context
        plan_date: formattedTargetDate, // Use the target date
        ...formData, // Include all fields from formData
      };

      if (existingPlan) {
        // Update existing plan
        const { error } = await supabase
          .from('daily_plans')
          .update(planDataToSave)
          .eq('id', existingPlan.id);
        supabaseError = error;
      } else {
        // Insert new plan
        const { error } = await supabase
          .from('daily_plans')
          .insert([planDataToSave]);
        supabaseError = error;
      }

      if (supabaseError) {
        throw supabaseError;
      }

      alert(`Plan for ${format(targetDate, 'MMMM d, yyyy')} saved successfully!`);
      // Optionally navigate back to history if editing a past date
      if (isEditingPast) {
        navigate('/history');
      }

    } catch (err: any) {
       console.error("Error saving plan:", err);
       setError(`Failed to save plan: ${err.message}`);
       alert(`Failed to save plan: ${err.message}`);
    } finally {
       setLoading(false);
    }
  };

  // If auth is loading, show a simple loading state for this page
   if (authLoading) {
     return (
       <div className="p-4 flex justify-center items-center min-h-[calc(100vh-10rem)]">
         <LucideLoader2 className="h-6 w-6 animate-spin text-blue-500" />
         <span className="ml-2 text-gray-600">Loading user data...</span>
       </div>
     );
   }

   // Show loading state while fetching the plan data
   if (isFetching) {
     return (
       <div className="p-4 flex justify-center items-center min-h-[calc(100vh-10rem)]">
         <LucideLoader2 className="h-6 w-6 animate-spin text-blue-500" />
         <span className="ml-2 text-gray-600">Loading plan data for {format(targetDate, 'MMMM d, yyyy')}...</span>
       </div>
     );
   }

  return (
    <div className="p-4 max-w-4xl mx-auto"> {/* Constrain width */}
      <h1 className="text-3xl font-bold mb-2 text-gray-800">
        {isEditingPast ? 'Edit Plan' : 'Today\'s Plan'}
      </h1>
      <p className="text-lg text-gray-600 mb-6">
        {format(targetDate, 'EEEE, MMMM d, yyyy')}
      </p>

      {/* Image Upload and Analyze - Disabled for past dates */}
      {!isEditingPast ? (
        <div className="mb-8 p-6 border border-dashed border-gray-300 rounded-lg bg-gray-50 shadow-sm">
          <label htmlFor="image-upload" className="block text-gray-700 text-sm font-bold mb-2">
            Upload Planner Image (Optional)
          </label>
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            disabled={!user || loading || isEditingPast} // Disable if no user, loading, or editing past
            className={`block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-100 file:text-blue-700
              hover:file:bg-blue-200 file:transition-colors
              disabled:opacity-50 disabled:cursor-not-allowed`}
          />
          {selectedImage && (
            <p className="mt-2 text-sm text-gray-600">Selected: {selectedImage.name}</p>
          )}
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <button
            onClick={handleUploadAndAnalyze}
            disabled={!selectedImage || loading || !user || isEditingPast} // Disable if no image, loading, no user, or editing past
            className={`mt-4 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg flex justify-center items-center shadow hover:shadow-md transition-all ${(!selectedImage || loading || !user || isEditingPast) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading && !authLoading ? ( // Show analyze loading only if not auth loading
              <>
                <LucideLoader2 className="inline mr-2 h-5 w-5 animate-spin"/> Analyzing...
              </>
            ) : (
              <>
                <LucideUploadCloud className="inline mr-2 h-5 w-5"/> Upload & Analyze
              </>
            )}
          </button>
          {!user && <p className="text-xs text-red-600 mt-1 text-center">Login required to analyze.</p>}
        </div>
      ) : (
        <div className="mb-8 p-4 border border-yellow-300 rounded-lg bg-yellow-50 text-yellow-800 flex items-center shadow-sm">
          <LucideImageOff className="h-5 w-5 mr-3 flex-shrink-0" />
          <span>Image upload and analysis is disabled for past dates.</span>
        </div>
      )}

      {/* Daily Plan Fields */}
      <div className="space-y-6 bg-white p-6 rounded-lg shadow-md">
         {/* High-level note */}
        <div>
          <label htmlFor="high_level_note" className="block text-gray-700 text-sm font-bold mb-1">Summary / High-level Note</label>
          <textarea id="high_level_note" value={formData.high_level_note} onChange={handleInputChange} disabled={!user || loading} rows={3} className="w-full border border-gray-300 rounded-md p-2 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder="Summarize your day..."/>
        </div>
        {/* TODOs */}
        <div>
          <label htmlFor="todos" className="block text-gray-700 text-sm font-bold mb-1">TODOs</label>
          <textarea id="todos" value={formData.todos} onChange={handleInputChange} disabled={!user || loading} rows={5} className="w-full border border-gray-300 rounded-md p-2 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder="List your tasks..."/>
        </div>
        {/* Schedule */}
        <div>
          <label htmlFor="schedule" className="block text-gray-700 text-sm font-bold mb-1">Schedule</label>
          <textarea id="schedule" value={formData.schedule} onChange={handleInputChange} disabled={!user || loading} rows={5} className="w-full border border-gray-300 rounded-md p-2 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder="Outline your schedule..."/>
        </div>
        {/* Meals */}
        <fieldset className="border border-gray-200 rounded-md p-4">
           <legend className="text-sm font-bold text-gray-600 px-2">Meals & Hydration</legend>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <div>
              <label htmlFor="breakfast" className="block text-gray-700 text-xs font-medium mb-1">Breakfast</label>
              <input type="text" id="breakfast" value={formData.breakfast} onChange={handleInputChange} disabled={!user || loading} className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder="What did you eat?" />
            </div>
            <div>
              <label htmlFor="lunch" className="block text-gray-700 text-xs font-medium mb-1">Lunch</label>
              <input type="text" id="lunch" value={formData.lunch} onChange={handleInputChange} disabled={!user || loading} className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder="What did you eat?" />
            </div>
            <div>
              <label htmlFor="dinner" className="block text-gray-700 text-xs font-medium mb-1">Dinner</label>
              <input type="text" id="dinner" value={formData.dinner} onChange={handleInputChange} disabled={!user || loading} className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder="What did you eat?" />
            </div>
            <div>
              <label htmlFor="snacks" className="block text-gray-700 text-xs font-medium mb-1">Snacks</label>
              <input type="text" id="snacks" value={formData.snacks} onChange={handleInputChange} disabled={!user || loading} className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder="Any snacks?" />
            </div>
             {/* Water Intake */}
            <div className="sm:col-span-2">
              <label htmlFor="water_intake_glasses" className="block text-gray-700 text-xs font-medium mb-1">Water Intake (glasses)</label>
              <input id="water_intake_glasses" type="number" value={formData.water_intake_glasses} onChange={handleInputChange} disabled={!user || loading} className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder="Number of glasses" min="0"/>
            </div>
          </div>
        </fieldset>

         {/* Mood & Weather */}
         <fieldset className="border border-gray-200 rounded-md p-4">
           <legend className="text-sm font-bold text-gray-600 px-2">Context</legend>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
            <div>
              <label htmlFor="mood" className="block text-gray-700 text-xs font-medium mb-1">Mood</label>
              <input id="mood" type="text" value={formData.mood} onChange={handleInputChange} disabled={!user || loading} className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder="How were you feeling?"/>
            </div>
            <div>
              <label htmlFor="weather" className="block text-gray-700 text-xs font-medium mb-1">Weather</label>
              <input id="weather" type="text" value={formData.weather} onChange={handleInputChange} disabled={!user || loading} className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder="What was the weather?"/>
            </div>
          </div>
        </fieldset>

         {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-gray-700 text-sm font-bold mb-1">Additional Notes</label>
          <textarea id="notes" value={formData.notes} onChange={handleInputChange} disabled={!user || loading} rows={4} className="w-full border border-gray-300 rounded-md p-2 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed" placeholder="Any other details..."/>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-8 flex justify-end"> {/* Align button to the right */}
        <button
          onClick={handleSavePlan}
          disabled={loading || !user} // Disable if loading or no user
          className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg flex items-center shadow hover:shadow-md transition-all ${loading || !user ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {loading && !authLoading ? ( // Show save