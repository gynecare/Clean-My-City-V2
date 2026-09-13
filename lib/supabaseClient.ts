import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables. ' +
      'Add them to .env.local (see README.md).'
  );
}

// This client uses the secret service role key and must only ever be
// imported from server-side code (API routes), never from a client component.
export const supabase = createClient(supabaseUrl, supabaseServiceKey);
