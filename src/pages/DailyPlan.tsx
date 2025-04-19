import { useState, useEffect } from 'react'
import { LucideUploadCloud, LucideLoader2 } from 'lucide-react' // Removed LucideArrowLeft
import { supabase } from '../supabaseClient'

// Helper function to format date as YYYY-MM-DD
const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are 0-indexed
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const DailyPlan = () => {
  const [formData, setFormData] = useState({
    plan_content: '', // Keep for general plan/tasks
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const today = formatDate(new Date());

  // Fetch user ID and today's plan on component mount
  useEffect(() => {
    const fetchUserAndPlan = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        fetchDailyPlan(user.id);
      } else {
        console.warn("User not logged in. Cannot save/load plans.");
        // Optionally redirect to login or show a message
      }
    };
    fetchUserAndPlan();
  }, []); // Empty dependency array means this runs once on mount

  const fetchDailyPlan = async (currentUserId: string) => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from('daily_plans')
      .select('*') // Select all columns
      .eq('user_id', currentUserId)
      .eq('plan_date', today)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error("Error fetching daily plan:", error);
      setError("Failed to load daily plan.");
    } else if (data) {
      // Populate form data with fetched data
      setFormData({
        plan_content: data.plan_content || '',
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
    }
    setLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: id === 'water_intake_glasses' ? parseInt(value, 10) || 0 : value,
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImage(e.target.files[0]);
      setError(null); // Clear previous errors
    } else {
      setSelectedImage(null);
    }
  };

  const handleUploadAndAnalyze = async () => {
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
        let parsedData = {};
        try {
            // Attempt to find and parse JSON within the text
            const jsonMatch = extractedText.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch && jsonMatch[1]) {
                parsedData = JSON.parse(jsonMatch[1]);
            } else {
                 // Fallback: try parsing the whole text if no ```json``` block is found
                 parsedData = JSON.parse(extractedText);
            }
             // Update form data with extracted values, using defaults for missing fields
            setFormData(prev => ({
                ...prev,
                todos: parsedData.todos || '',
                schedule: parsedData.schedule || '',
                breakfast: parsedData.breakfast || '',
                lunch: parsedData.lunch || '',
                dinner: parsedData.dinner || '',
                snacks: parsedData.snacks || '',
                water_intake_glasses: parseInt(parsedData.water_intake_glasses, 10) || 0,
                mood: parsedData.mood || '',
                weather: parsedData.weather || '',
                notes: parsedData.notes || '',
                high_level_note: parsedData.high_level_note || '',
                // Keep plan_content separate or decide how it relates to todos/notes
                // For now, let's put todos/notes into plan_content as a fallback/summary
                plan_content: `${parsedData.todos || ''}\n\nNotes:\n${parsedData.notes || ''}`.trim()
            }));
            alert("Image processed! Plan fields updated.");
        } catch (parseError) {
            console.error("Failed to parse Gemini response as JSON:", parseError);
            setError("Failed to parse extracted data. Please check the image or enter manually.");
             // Optionally put the raw text into plan_content
            setFormData(prev => ({ ...prev, plan_content: extractedText }));
        }


      } catch (err) {
        console.error("Error calling Gemini API:", err);
        setError(`Failed to process image: ${err instanceof Error ? err.message : String(err)}`);
        setFormData(prev => ({ ...prev, plan_content: "Error extracting plan." })); // Clear or show error in textarea
      } finally {
        setLoading(false);
        setSelectedImage(null);
      }
    };
    reader.readAsDataURL(selectedImage); // Read image as base64
  };

  const handleSavePlan = async () => {
    if (!userId) {
      setError("Please log in to save your plan.");
      return;
    }

    setLoading(true);
    setError(null);

    // Check if a plan already exists for today
    const { data: existingPlan, error: fetchError } = await supabase
      .from('daily_plans')
      .select('id')
      .eq('user_id', userId)
      .eq('plan_date', today)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error("Error checking for existing plan:", fetchError);
      setError("Failed to check for existing plan.");
      setLoading(false);
      return;
    }

    let supabaseError = null;
    const planDataToSave = {
      user_id: userId,
      plan_date: today,
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
      console.error("Error saving plan:", supabaseError);
      setError(`Failed to save plan: ${supabaseError.message}`);
      alert("Failed to save plan.");
    } else {
      alert("Plan saved successfully!");
    }

    setLoading(false);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Today's Plan ({today})</h1>

      {/* Image Upload and Analyze */}
      <div className="mb-6 p-4 border rounded-md bg-gray-50">
        <label htmlFor="image-upload" className="block text-gray-700 text-sm font-bold mb-2">
          Upload Planner Image (Optional)
        </label>
        <input
          id="image-upload"
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />
        {selectedImage && (
          <p className="mt-2 text-sm text-gray-600">Selected: {selectedImage.name}</p>
        )}
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        <button
          onClick={handleUploadAndAnalyze}
          disabled={!selectedImage || loading}
          className={`mt-4 w-full bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded ${(!selectedImage || loading) ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {loading ? (
            <>
              <LucideLoader2 className="inline mr-2 h-5 w-5 animate-spin"/> Analyzing...
            </>
          ) : (
            <>
              <LucideUploadCloud className="inline mr-2 h-5 w-5"/> Upload & Analyze
            </>
          )}
        </button>
      </div>

      {/* Daily Plan Fields */}
      <div className="space-y-4">
         {/* Date - Display only, not editable here */}
        <div>
          <label htmlFor="plan_date" className="block text-gray-700 text-sm font-bold mb-1">
            Date
          </label>
          <input
            id="plan_date"
            type="text"
            value={today}
            disabled // Date is not editable on this page
            className="w-full border border-gray-300 rounded-md p-2 bg-gray-100 cursor-not-allowed"
          />
        </div>

        {/* TODOs */}
        <div>
          <label htmlFor="todos" className="block text-gray-700 text-sm font-bold mb-1">
            TODOs
          </label>
          <textarea
            id="todos"
            value={formData.todos}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded-md p-2 h-32 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="List your tasks for today..."
          />
        </div>

        {/* Schedule */}
        <div>
          <label htmlFor="schedule" className="block text-gray-700 text-sm font-bold mb-1">
            Schedule
          </label>
          <textarea
            id="schedule"
            value={formData.schedule}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded-md p-2 h-32 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Outline your schedule..."
          />
        </div>

        {/* Meals */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="breakfast" className="block text-gray-700 text-sm font-bold mb-1">Breakfast</label>
            <input type="text" id="breakfast" value={formData.breakfast} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="What did you eat?" />
          </div>
          <div>
            <label htmlFor="lunch" className="block text-gray-700 text-sm font-bold mb-1">Lunch</label>
            <input type="text" id="lunch" value={formData.lunch} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="What did you eat?" />
          </div>
          <div>
            <label htmlFor="dinner" className="block text-gray-700 text-sm font-bold mb-1">Dinner</label>
            <input type="text" id="dinner" value={formData.dinner} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="What did you eat?" />
          </div>
          <div>
            <label htmlFor="snacks" className="block text-gray-700 text-sm font-bold mb-1">Snacks</label>
            <input type="text" id="snacks" value={formData.snacks} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Any snacks?" />
          </div>
        </div>

        {/* Water Intake */}
        <div>
          <label htmlFor="water_intake_glasses" className="block text-gray-700 text-sm font-bold mb-1">
            Water Intake (glasses)
          </label>
          <input
            id="water_intake_glasses"
            type="number"
            value={formData.water_intake_glasses}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Number of glasses"
            min="0"
          />
        </div>

        {/* Mood */}
        <div>
          <label htmlFor="mood" className="block text-gray-700 text-sm font-bold mb-1">
            Mood
          </label>
          <input
            id="mood"
            type="text"
            value={formData.mood}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="How are you feeling?"
          />
        </div>

        {/* Weather */}
        <div>
          <label htmlFor="weather" className="block text-gray-700 text-sm font-bold mb-1">
            Weather
          </label>
          <input
            id="weather"
            type="text"
            value={formData.weather}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Today's weather?"
          />
        </div>

         {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-gray-700 text-sm font-bold mb-1">
            Notes
          </label>
          <textarea
            id="notes"
            value={formData.notes}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded-md p-2 h-32 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Any additional notes..."
          />
        </div>

        {/* High-level note */}
        <div>
          <label htmlFor="high_level_note" className="block text-gray-700 text-sm font-bold mb-1">
            High-level note about the day
          </label>
          <textarea
            id="high_level_note"
            value={formData.high_level_note}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded-md p-2 h-32 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Summarize your day..."
          />
        </div>

        {/* Original Plan Content (Optional, maybe keep for raw Gemini output) */}
         {/*
        <div>
          <label htmlFor="plan_content" className="block text-gray-700 text-sm font-bold mb-1">
            Raw Plan Content (from Image Analysis)
          </label>
          <textarea
            id="plan_content"
            value={formData.plan_content}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded-md p-2 h-32 resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100"
            placeholder="Raw output from image analysis..."
            disabled
          />
        </div>
        */}

      </div>


      {/* Save Button */}
      <button
        onClick={handleSavePlan}
        disabled={loading || !userId}
        className={`mt-6 w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ${loading || !userId ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
         {loading ? (
          <>
            <LucideLoader2 className="inline mr-2 h-5 w-5 animate-spin"/> Saving...
          </>
        ) : (
          "Save Plan"
        )}
      </button>
    </div>
  );
};

export default DailyPlan;
