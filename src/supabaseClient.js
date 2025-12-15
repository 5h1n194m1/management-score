// C:\management-score\src\supabaseClient.js

import { createClient } from '@supabase/supabase-js'

// Ambil variabel dari file .env.local
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Cek keamanan
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("FATAL CONFIG ERROR: VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY hilang di .env.local.")
} else {
    // Log baru
    console.log("LOG: Supabase URL and Key loaded successfully.");
}

// Inisialisasi dan ekspor klien Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Log baru
console.log("LOG: Supabase client initialized.");