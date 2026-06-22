import { khataService } from '../features/khata/khata.service.js';

async function main() {
  try {
    const result = await khataService.getCustomers({ page: 1, limit: 20, search: 'E2E Cust 6249' });
    console.log('Search result:', result);
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
