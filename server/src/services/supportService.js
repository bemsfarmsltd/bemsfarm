const pool=require('../db/pool');
const {initCrmTables}=require('../db/migrate_crm_chat_broadcast');
async function resolveCustomer(target, { requireActive = false } = {}){
  const statusFilter = requireActive ? "AND COALESCE(status,'active') <> 'deleted'" : "";
  const r = await pool.query(
    `SELECT id, name, email, phone, status FROM users WHERE role='user' ${statusFilter} AND (id::text=$1 OR customer_code=$1 OR LOWER(email)=LOWER($1))`,
    [String(target)]
  );
  if(!r.rows.length) throw Object.assign(new Error('Customer not found'),{status:404});
  return r.rows[0];
}
async function getMessages(customerId){

  const r=await pool.query(`SELECT m.*,u.name AS admin_name FROM customer_messages m LEFT JOIN users u ON u.id=m.admin_id
    WHERE m.customer_id=$1 ORDER BY m.created_at DESC,m.id DESC LIMIT 200`,[customerId]);
  return {messages:r.rows.reverse()};
}
async function sendMessage(customerId,message,actor){
  if(typeof message!=='string' || !message.trim() || message.length>4000) throw Object.assign(new Error('Message must contain 1–4,000 characters'),{status:400});

  const db=await pool.connect();
  try{
    await db.query('BEGIN');
    const conv=await db.query(`INSERT INTO customer_conversations(customer_id,last_message,status) VALUES($1,$2,'open')
      ON CONFLICT(customer_id) DO UPDATE SET last_message=EXCLUDED.last_message,last_message_at=NOW(),updated_at=NOW(),status='open' RETURNING id`,[customerId,message.trim().slice(0,100)]);
    const r=await db.query(`INSERT INTO customer_messages(conversation_id,customer_id,sender_type,admin_id,message)
      VALUES($1,$2,$3,$4,$5) RETURNING *`,[conv.rows[0].id,customerId,actor?'admin':'customer',actor?.id || null,message.trim()]);
    if(!actor) {
      await db.query(`INSERT INTO notifications(type,title,body,is_read) VALUES('system','New customer support message',$1,false)`,[`Customer #${customerId} sent a message. Open Customer Messages to reply.`]);
      try {
        const { notifyAdmin } = require('./notificationService');
        const userRes = await pool.query("SELECT name, email FROM users WHERE id=$1", [customerId]);
        const senderName = userRes.rows[0]?.name || userRes.rows[0]?.email || `Customer #${customerId}`;
        notifyAdmin({
          type: 'support_message',
          title: `💬 New Support Message from ${senderName}`,
          message: `${senderName}: "${message.trim().slice(0, 150)}${message.trim().length > 150 ? '…' : ''}"`,
          link: `/customers/messages?customer=${customerId}`,
          severity: 'info',
          data: {
            customer_id: customerId,
            customer_name: senderName,
            message: message.trim(),
          },
          actor: { id: customerId, name: senderName, role: 'customer' },
        });

        const { broadcastSupportMessage } = require('./socketService');
        broadcastSupportMessage({
          customer_id: customerId,
          customer_name: senderName,
          message: message.trim(),
        });
      } catch (notifErr) {
        console.warn("Admin notification dispatch notice:", notifErr?.message);
      }
    }
    await db.query('COMMIT');return {message:{...r.rows[0],admin_name:actor?.name}};
  }catch(err){await db.query('ROLLBACK');throw err;}finally{db.release();}
}
async function markRead(customerId,sender){

  await pool.query('UPDATE customer_messages SET is_read=true WHERE customer_id=$1 AND sender_type=$2 AND is_read=false',[customerId,sender]);
}
module.exports={resolveCustomer,getMessages,sendMessage,markRead};
