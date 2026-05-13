import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

export const cloudSyncEnabled = !!supabaseUrl && !!supabaseKey;
export const slideshowBucket = import.meta.env.VITE_SUPABASE_PROJECT_BUCKET?.trim() || 'project-zips';

export const supabase = cloudSyncEnabled
  ? createClient(supabaseUrl!, supabaseKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
