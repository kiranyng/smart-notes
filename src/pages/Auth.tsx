import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { LucideLoader2, LucideAlertCircle } from 'lucide-react';

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false); // Toggle between Login and Sign Up
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      let response;
      if (isSignUp) {
        response = await supabase.auth.signUp({
          email,
          password,
          options: {
            // Disable email confirmation for simplicity in this example
            // NOTE: Supabase project settings might still enforce it.
             emailRedirectTo: window.location.origin, // Still required by Supabase client
          },
        });
         // Check if user data exists but identities array is empty, might indicate confirmation needed
         if (response.data.user && response.data.user.identities && response.data.user.identities.length === 0) {
            setMessage("Signup successful! Check your email for a confirmation link if required by project settings.");
            // Keep user on Auth page until confirmed if needed, or let them try login
         } else if (response.data.user) {
             setMessage("Sign up successful! You can now log in.");
             setIsSignUp(false); // Switch to login view
             setEmail(''); // Clear fields
             setPassword('');
         } else if (!response.error) {
             // Handle cases where user might be null but no error (e.g., email confirmation required)
             setMessage("Signup request sent. Check your email if confirmation is required.");
         }


      } else {
        response = await supabase.auth.signInWithPassword({
          email,
          password,
        });
      }

      const { error: authError } = response;

      if (authError) {
        throw authError;
      }

      // Login success is handled by the AuthProvider redirecting via state change
      // No explicit navigation needed here

    } catch (err: any) {
      console.error("Auth error:", err);
      setError(err.error_description || err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 -m-4"> {/* Added -m-4 to counteract padding */}
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-900">
          {isSignUp ? 'Create Account' : 'Welcome Back!'}
        </h1>
        <form className="space-y-6" onSubmit={handleAuth}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative flex items-center" role="alert">
              <LucideAlertCircle className="h-5 w-5 mr-2" />
              <span className="block sm:inline">{error}</span>
            </div>
          )}
           {message && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative" role="alert">
              {message}
            </div>
          )}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <LucideLoader2 className="animate-spin h-5 w-5" />
              ) : (
                isSignUp ? 'Sign Up' : 'Log In'
              )}
            </button>
          </div>
        </form>
        <p className="text-sm text-center text-gray-600">
          {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null); // Clear errors on toggle
              setMessage(null);
              setEmail(''); // Clear fields on toggle
              setPassword('');
            }}
            className="font-medium text-blue-600 hover:text-blue-500"
            disabled={loading}
          >
            {isSignUp ? 'Log In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Auth;
