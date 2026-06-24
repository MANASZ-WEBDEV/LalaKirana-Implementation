import { supabase } from '../../db/supabase.js';

export const storeSettingsService = {
  /**
   * Get all store settings as a key-value object.
   */
  getStoreSettings: async () => {
    const { data, error } = await supabase
      .from('store_settings')
      .select('key, value');

    if (error) {
      throw new Error(`Failed to fetch store settings: ${error.message}`);
    }

    const settings: Record<string, string> = {
      store_name: 'LalaKirana',
      store_address: '',
      store_phone: '',
      receipt_footer: 'Thank you! Visit again',
      receipt_language: 'english',
    };

    if (data) {
      for (const row of data) {
        settings[row.key] = row.value;
      }
    }

    return settings;
  },

  /**
   * Update store settings.
   */
  updateStoreSettings: async (settings: Record<string, string>) => {
    for (const [key, value] of Object.entries(settings)) {
      const { error } = await supabase
        .from('store_settings')
        .upsert({ key, value, updated_at: new Date().toISOString() });

      if (error) {
        throw new Error(`Failed to update setting ${key}: ${error.message}`);
      }
    }
    return { success: true };
  },
};
