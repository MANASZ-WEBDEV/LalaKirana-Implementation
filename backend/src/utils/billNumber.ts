import { supabase } from '../db/supabase.js';

export async function getNextBillNumber(): Promise<string> {
  try {
    const { data, error } = await supabase.rpc('generate_bill_number');
    if (error) throw error;
    return data as string;
  } catch (err) {
    // Fallback: local generation in case of network issues
    const year = new Date().getFullYear();
    const rand = Math.floor(10000 + Math.random() * 90000);
    return `LK-${year}-${rand}`;
  }
}
