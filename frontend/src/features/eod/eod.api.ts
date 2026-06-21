import { api } from '@/shared/api/axios';
import type { EODEntry, EODSubmitInput } from '@/types/inventory.types';

export const eodApi = {
  getEODEntry: (date: string) =>
    api.get<EODEntry[]>(`/inventory/eod?date=${date}`).then((r) => r.data),

  submitEODEntry: (input: EODSubmitInput) =>
    api.post<{ message: string; count: number; entries: EODEntry[] }>('/inventory/eod', input).then((r) => r.data),
};
