require('dotenv').config();
const fs=require('fs');
const path=require('path');
const pool=require('../src/db/pool');
const {migrationSql}=require('../src/db/migrate_crm_chat_broadcast');
(async()=>{ const client=await pool.connect();try {
  await client.query('BEGIN');
  await client.query(migrationSql);
  await client.query(fs.readFileSync(path.join(__dirname,'../src/db/audit.sql'),'utf8'));
  await client.query('COMMIT'); console.log('CRM and audit migration completed');
}catch(e){await client.query('ROLLBACK');console.error(e.message);process.exitCode=1;}finally{client.release();await pool.end();}})();
