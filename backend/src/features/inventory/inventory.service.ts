import { supabase } from '../../db/supabase.js';

export const inventoryService = {
  adjustStock: async (
    productId: string,
    adjustData: {
      type: 'add' | 'remove' | 'set';
      qty: number;
      reason: 'new_arrival' | 'damage' | 'returned' | 'audit' | 'other';
      note?: string;
    },
    userId: string
  ) => {
    // 1. Fetch current product stock
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('stock_qty, name, unit')
      .eq('id', productId)
      .single();

    if (fetchError || !product) {
      throw new Error(`Product not found: ${fetchError?.message || ''}`);
    }

    const currentStock = Number(product.stock_qty);
    let changeQty = 0;

    // 2. Calculate change quantity
    if (adjustData.type === 'add') {
      changeQty = adjustData.qty;
    } else if (adjustData.type === 'remove') {
      changeQty = -adjustData.qty;
    } else if (adjustData.type === 'set') {
      changeQty = adjustData.qty - currentStock;
    }

    const newStock = currentStock + changeQty;

    // 3. Validate resulting stock
    if (newStock < 0) {
      throw new Error(`Invalid stock adjustment: resulting stock for "${product.name}" would be negative (${newStock} ${product.unit})`);
    }

    // 4. Update product stock quantity
    const { data: updatedProduct, error: updateError } = await supabase
      .from('products')
      .update({ stock_qty: newStock })
      .eq('id', productId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update product stock: ${updateError.message}`);
    }

    // 5. Map UI reasons to DB constraints for stock_log
    // stock_log reason check: bill_confirm | eod_entry | manual_adjust | damage | audit | returned
    let dbReason: 'bill_confirm' | 'eod_entry' | 'manual_adjust' | 'damage' | 'audit' | 'returned';
    if (adjustData.reason === 'damage') {
      dbReason = 'damage';
    } else if (adjustData.reason === 'returned') {
      dbReason = 'returned';
    } else if (adjustData.reason === 'audit') {
      dbReason = 'audit';
    } else {
      dbReason = 'manual_adjust'; // new_arrival and other maps to manual_adjust
    }

    // 6. Write to stock_log
    const { error: logError } = await supabase
      .from('stock_log')
      .insert({
        product_id: productId,
        change_qty: changeQty,
        reason: dbReason,
        note: adjustData.note || null,
        created_by: userId,
      });

    if (logError) {
      // Note: We don't rollback products update here in plain Supabase client, 
      // but in standard production we would use an RPC or postgres trigger transaction.
      throw new Error(`Failed to write stock log: ${logError.message}`);
    }

    return updatedProduct;
  },

  getEODEntry: async (date: string) => {
    const { data, error } = await supabase
      .from('eod_entries')
      .select('*')
      .eq('entry_date', date);

    if (error) {
      throw new Error(`Failed to fetch EOD entry: ${error.message}`);
    }

    return data;
  },

  submitEODEntry: async (
    entry_date: string,
    items: { product_id: string; qty_sold: number }[],
    userId: string
  ) => {
    // 1. Fetch existing EOD entries for this date
    const { data: existingEntries, error: fetchError } = await supabase
      .from('eod_entries')
      .select('id, product_id, qty_sold')
      .eq('entry_date', entry_date);

    if (fetchError) {
      throw new Error(`Failed to fetch existing EOD entries: ${fetchError.message}`);
    }

    const updatedRows: any[] = [];

    // 2. Identify removed entries (exist in DB but not in the new submitted items list)
    const submittedProductIds = new Set(items.map((i) => i.product_id));
    const removedEntries = existingEntries?.filter((e) => e.product_id && !submittedProductIds.has(e.product_id)) || [];

    // Restore stock and delete removed entries
    for (const removed of removedEntries) {
      const { data: product, error: prodError } = await supabase
        .from('products')
        .select('name, stock_qty, unit')
        .eq('id', removed.product_id)
        .single();

      if (prodError || !product) {
        // If product was deleted entirely, just delete the EOD entry
        await supabase.from('eod_entries').delete().eq('id', removed.id);
        continue;
      }

      const currentStock = Number(product.stock_qty);
      const newStock = currentStock + Number(removed.qty_sold);

      // Restore stock quantity
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock_qty: newStock })
        .eq('id', removed.product_id);

      if (updateError) {
        throw new Error(`Failed to restore product stock: ${updateError.message}`);
      }

      // Log stock restoration
      const { error: logError } = await supabase.from('stock_log').insert({
        product_id: removed.product_id,
        change_qty: Number(removed.qty_sold),
        reason: 'eod_entry',
        note: `EOD sales entry removed for ${entry_date}`,
        created_by: userId,
      });

      if (logError) {
        throw new Error(`Failed to write stock log: ${logError.message}`);
      }

      // Delete EOD entry
      const { error: deleteError } = await supabase
        .from('eod_entries')
        .delete()
        .eq('id', removed.id);

      if (deleteError) {
        throw new Error(`Failed to delete EOD entry: ${deleteError.message}`);
      }
    }

    // 3. Loop sequentially to handle stock deduction and inserts/updates for active items
    for (const item of items) {
      const existing = existingEntries?.find((e) => e.product_id === item.product_id);
      const oldQty = existing ? Number(existing.qty_sold) : 0;
      const diff = item.qty_sold - oldQty;

      // Fetch current product to check name, stock, and prices for snapshot
      const { data: product, error: prodError } = await supabase
        .from('products')
        .select('name, stock_qty, unit, price, cost_price')
        .eq('id', item.product_id)
        .single();

      if (prodError || !product) {
        throw new Error(`Product not found for ID "${item.product_id}": ${prodError?.message || ''}`);
      }

      // If change in quantity sold is zero, do nothing for this product
      if (diff === 0) {
        if (existing) {
          updatedRows.push(existing);
        }
        continue;
      }

      // Validate new stock quantity (deduction is +diff, so new stock is current - diff)
      const currentStock = Number(product.stock_qty);
      const newStock = currentStock - diff;

      if (newStock < 0) {
        throw new Error(
          `Invalid EOD entry: resulting stock for "${product.name}" would be negative (${newStock} ${product.unit}). Current stock is ${currentStock} ${product.unit}.`
        );
      }

      // Update product stock
      const { error: updateError } = await supabase
        .from('products')
        .update({ stock_qty: newStock })
        .eq('id', item.product_id);

      if (updateError) {
        throw new Error(`Failed to update product stock: ${updateError.message}`);
      }

      // Write to stock log (change_qty is -diff because it's a reduction in stock)
      const { error: logError } = await supabase.from('stock_log').insert({
        product_id: item.product_id,
        change_qty: -diff,
        reason: 'eod_entry',
        note: `EOD sales entry for ${entry_date}`,
        created_by: userId,
      });

      if (logError) {
        throw new Error(`Failed to write stock log: ${logError.message}`);
      }

      // UPSERT eod_entries
      if (existing) {
        const { data: updatedEntry, error: eodError } = await supabase
          .from('eod_entries')
          .update({
            qty_sold: item.qty_sold,
            created_by: userId,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (eodError) {
          throw new Error(`Failed to update EOD entry: ${eodError.message}`);
        }
        updatedRows.push(updatedEntry);
      } else {
        const { data: newEntry, error: eodError } = await supabase
          .from('eod_entries')
          .insert({
            entry_date,
            product_id: item.product_id,
            product_name: product.name,
            qty_sold: item.qty_sold,
            unit_price: Number(product.price) || 0,
            cost_price: Number(product.cost_price) || 0,
            created_by: userId,
          })
          .select()
          .single();

        if (eodError) {
          throw new Error(`Failed to insert EOD entry: ${eodError.message}`);
        }
        updatedRows.push(newEntry);
      }
    }

    return updatedRows;
  },
};
