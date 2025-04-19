// Define a type for the daily plan data structure
export interface DailyPlanData {
  id: string;
  user_id: string;
  plan_date: string; // YYYY-MM-DD format
  plan_content: string;
  todos: string;
  notes: string;
  breakfast: string;
  lunch: string;
  dinner: string;
  snacks: string;
  water_intake_glasses: number;
  schedule: string;
  mood: string;
  weather: string;
  high_level_note: string;
  created_at: string;
  updated_at: string;
}
