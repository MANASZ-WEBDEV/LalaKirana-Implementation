import dotenv from 'dotenv';
import { supabase } from '../src/db/supabase.js';

dotenv.config();

export async function cleanupTestUsers(emails: string[]) {
  if (emails.length === 0) return;
  await supabase.from('users').delete().in('email', emails);
}
