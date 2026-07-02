import { supabase } from '../../db/supabase.js';

export interface ReceiptTranslation {
  id: string;
  token: string;
  hindi: string;
  category: 'brand' | 'product' | 'qualifier' | 'general';
  created_at: string;
}

export const translationsService = {
  getAllTranslations: async () => {
    const { data, error } = await supabase
      .from('receipt_translations')
      .select('*')
      .order('token', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch receipt translations: ${error.message}`);
    }

    return data as ReceiptTranslation[];
  },

  createTranslation: async (payload: { token: string; hindi: string; category: string }) => {
    const { data, error } = await supabase
      .from('receipt_translations')
      .insert({
        token: payload.token,
        hindi: payload.hindi,
        category: payload.category,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create receipt translation: ${error.message}`);
    }

    return data as ReceiptTranslation;
  },

  updateTranslation: async (id: string, payload: { token?: string; hindi?: string; category?: string }) => {
    const { data, error } = await supabase
      .from('receipt_translations')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update receipt translation: ${error.message}`);
    }

    return data as ReceiptTranslation;
  },

  deleteTranslation: async (id: string) => {
    const { error } = await supabase
      .from('receipt_translations')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete receipt translation: ${error.message}`);
    }

    return { success: true };
  },
};
