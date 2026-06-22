import { supabase } from '../db/supabase.js';

async function main() {
  const { data, error } = await supabase
    .from('customers')
    .select('*');
  
  if (error) {
    console.error('Error fetching customers:', error);
  } else {
    console.log('Existing customers:', data);
  }
}

main();
