const bcrypt=require('bcryptjs');
const {recordAudit}=require('./auditService');
const fail=(status,message)=>Object.assign(new Error(message),{status});
async function removeCustomer(pool,actor,target,password,requestId) {
  if(typeof password!=='string' || !password.length) throw fail(400,'Administrator password is required.');
  if(!target || ['undefined','null'].includes(target)) throw fail(400,'Valid customer identifier required.');
  const admin=await pool.query('SELECT password FROM users WHERE id=$1',[actor.id]);
  if(!admin.rows[0]?.password || !await bcrypt.compare(password,admin.rows[0].password)) throw fail(403,'Incorrect administrator password. No customer records were changed.');
  const client=await pool.connect();
  let id;
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.actor_id',$1,true),set_config('app.request_id',$2,true)",[String(actor.id),requestId || '']);
    const result=await client.query(`SELECT id FROM users WHERE role='user' AND COALESCE(status,'active') <> 'deleted'
      AND (id::text=$1 OR customer_code=$1 OR LOWER(email)=LOWER($1)) FOR UPDATE`,[target]);
    if(!result.rows.length) throw fail(404,'Customer not found. Staff accounts cannot be removed here.');
    id=result.rows[0].id;
    await client.query(`UPDATE users SET name='Deleted Customer',email='removed-' || id || '@deleted.invalid',
      phone=NULL,password=NULL,google_id=NULL,avatar_url=NULL,refresh_token=NULL,verification_token=NULL,
      reset_token=NULL,status='deleted',token_version=token_version+1,updated_at=NOW() WHERE id=$1`,[id]);
    await client.query('COMMIT');
  }catch(e){await client.query('ROLLBACK');client.release();throw e;}
  // Audit is best-effort: a logging failure (e.g. migration not yet applied) must not undo the removal.
  try {
    await recordAudit({source:'application',action:'customer.removed',actor_id:actor.id,actor_role:actor.role,
      request_id:requestId,resource:`customers/${id}`,outcome:'success',details:{mode:'account_removed_history_retained'}},client);
  }catch(e){console.error('[god-eye] customer removal audit write failed:',e.message);}
  finally{client.release();}
  return {message:'Customer account removed. Order and financial history retained.'};
}
module.exports={removeCustomer};
