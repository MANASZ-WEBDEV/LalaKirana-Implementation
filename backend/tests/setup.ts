import dotenv from 'dotenv';
import dns from 'node:dns';
import { supabase } from '../src/db/supabase.js';

dns.setDefaultResultOrder('ipv4first');
dotenv.config();

export async function cleanupTestUsers(emails: string[]) {
  if (emails.length === 0) return;

  try {
    const { error } = await supabase.rpc('cleanup_test_user_data', {
      email_list: emails,
    });

    if (error) {
      console.error(`Failed to clean up test users via RPC: ${error.message}`);
      await supabase.from('users').delete().in('email', emails);
    }
  } catch (err: any) {
    console.error(`Failed to clean up test users (exception): ${err.message || err}`);
    try {
      await supabase.from('users').delete().in('email', emails);
    } catch {
      // best effort
    }
  }
}
