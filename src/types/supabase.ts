// Define a type for the daily plan data structure
export interface DailyPlanData {
  id: string;
  user_id: string;
  plan_date: string; // YYYY-MM-DD format
  plan_content: string; // Keep for potential raw data or simple notes
  todos: string; // Will store JSON string of TodoItem[]
  notes: string;
  breakfast: string;
  lunch: string;
  dinner: string;
  snacks: string;
  water_intake_glasses: number;
  schedule: string; // Will store JSON string of ScheduleItem[]
  mood: string;
  weather: string;
  high_level_note: string;
  created_at: string;
  updated_at: string;
}

// Add types for structured Todos and Schedule items
export interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface ScheduleItem {
  id: string;
  time: string; // e.g., "09:00"
  description: string;
}
