const pool = require('./server/src/db/pool');
pool.query("SELECT column_name, character_maximum_length FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone'")
  .then(res => { console.log(res.rows); process.exit(0); })
  .catch(e => { console.error(e); process.exit(1); });
