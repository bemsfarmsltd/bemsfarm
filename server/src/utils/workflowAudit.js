const pool = require("../db/pool");

/**
 * Record an auditable order lifecycle event.
 * Follows spec Section 67: actor + action + entity + timestamp + previous state + new state + metadata
 */
async function logOrderAudit(clientOrPool, {
  order_id,
  actor_id = null,
  actor_name = null,
  actor_role = null,
  action,
  previous_state = null,
  new_state = null,
  metadata = {}
}) {
  try {
    const executor = clientOrPool || pool;

    let normalizedActorType = 'system';
    const roleLower = String(actor_role || '').toLowerCase().trim();
    if (['admin', 'superadmin', 'manager', 'cashier', 'staff', 'delivery_manager'].includes(roleLower)) {
      normalizedActorType = 'admin';
    } else if (roleLower === 'driver') {
      normalizedActorType = 'driver';
    } else if (roleLower === 'customer' || roleLower === 'user') {
      normalizedActorType = 'customer';
    } else if (roleLower === 'kitchen') {
      normalizedActorType = 'kitchen';
    }

    try {
      await executor.query(
        `INSERT INTO order_audit_logs 
         (order_id, actor_id, actor_name, actor_role, action, previous_state, new_state, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          String(order_id),
          actor_id,
          actor_name,
          actor_role,
          action,
          previous_state,
          new_state,
          JSON.stringify(metadata || {})
        ]
      );
    } catch (auditErr) {
      console.warn("[logOrderAudit] order_audit_logs warning:", auditErr.message);
    }

    // Record to order_tracking_events using the SAME executor (prevents foreign-key deadlock with FOR UPDATE)
    // Protected by SAVEPOINT so it never aborts an outer transaction
    const isTransaction = clientOrPool && typeof clientOrPool.query === 'function';
    if (isTransaction) {
      try {
        await executor.query("SAVEPOINT tracking_event_sp");
        await executor.query(
          `INSERT INTO order_tracking_events 
           (order_id, event_type, description, actor_type, actor_id, created_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [
            String(order_id),
            action,
            metadata?.description || `Order transitioned: ${previous_state || 'none'} -> ${new_state || action}`,
            normalizedActorType,
            actor_id
          ]
        );
        await executor.query("RELEASE SAVEPOINT tracking_event_sp");
      } catch (trackErr) {
        await executor.query("ROLLBACK TO SAVEPOINT tracking_event_sp").catch(() => {});
        console.warn("[logOrderAudit] order_tracking_events warning:", trackErr.message);
      }
    } else {
      await pool.query(
        `INSERT INTO order_tracking_events 
         (order_id, event_type, description, actor_type, actor_id, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          String(order_id),
          action,
          metadata?.description || `Order transitioned: ${previous_state || 'none'} -> ${new_state || action}`,
          normalizedActorType,
          actor_id
        ]
      ).catch(e => console.warn('[logOrderAudit] order_tracking_events warning:', e.message));
    }

  } catch (err) {
    console.error("[logOrderAudit] Error writing audit log:", err.message);
  }
}

/**
 * Record an auditable inventory stock movement.
 * Follows spec Section 12 & 50 & 51.
 */
async function logInventoryTransaction(client, {
  order_id = null,
  product_id,
  quantity,
  previous_quantity,
  new_quantity,
  pos_terminal = null,
  pos_operator_id = null,
  transaction_type, // 'pos_packaging_stockout' | 'return_to_stock' | 'disposal' | 'manual_adjustment'
  source_reference = null,
  notes = null
}) {
  try {
    await client.query(
      `INSERT INTO inventory_transactions
       (order_id, product_id, quantity, previous_quantity, new_quantity, pos_terminal, pos_operator_id, transaction_type, source_reference, notes, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        order_id ? String(order_id) : null,
        product_id,
        quantity,
        previous_quantity,
        new_quantity,
        pos_terminal,
        pos_operator_id,
        transaction_type,
        source_reference,
        notes
      ]
    );
  } catch (err) {
    console.error("[logInventoryTransaction] Error writing inventory transaction:", err.message);
    throw err; // Must be atomic with stock updates
  }
}

module.exports = {
  logOrderAudit,
  logInventoryTransaction
};
