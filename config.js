// Supabase Configuration
// Replace these with your actual Supabase project credentials

const SUPABASE_CONFIG = {
    // 1. Go to your Supabase project dashboard
    // 2. Navigate to Settings → API
    // 3. Copy the "Project URL" and paste it below
    url: 'https://wveitaztddkovwsdophv.supabase.co', // Example: 'https://abcdefghijklmnop.supabase.co'
    
    // 4. Copy the "anon public" key and paste it below
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind2ZWl0YXp0ZGRrb3Z3c2RvcGh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2MzEyODQsImV4cCI6MjA3MjIwNzI4NH0.PJ7vqxzjRybCDe0y9D1d1iYyxsu9tNGgNwJUS3weos0' // Example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
};

// Export for use in main script
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
