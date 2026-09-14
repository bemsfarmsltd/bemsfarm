const router=require('express').Router();
const rateLimit=require('express-rate-limit');
const pool=require('../db/pool');
const {protect,requireRole}=require('../middleware/authMiddleware');
const {initCrmTables}=require('../db/migrate_crm_chat_broadcast');
// Identity is derived from verified authentication, never from a request payload.
const optionalAuth=(req,res,next)=>req.headers.authorization || req.cookies?.token ? protect(req,res,next) : next();
router.use(rateLimit({windowMs:60000,limit:30,standardHeaders:true,legacyHeaders:false}));
router.post(['/product-click','/demand-click'],optionalAuth,async(req,res,next)=>{
  try{
    if(!Number.isSafeInteger(Number(req.body.productId)) || Number(req.body.productId)<=0) return res.status(400).json({message:'Valid product required'});
    const p=(await pool.query('SELECT id,name,stock,available_for_sale FROM products WHERE id=$1',[req.body.productId])).rows[0];
    if(!p)return res.status(404).json({message:'Product not found'});
    const demand=req.path==='/demand-click';
    if(demand && Number(p.stock)>0 && p.available_for_sale!==false)return res.status(409).json({message:'Product is currently available'});
    if(req.user && req.user.role!=='user')return res.status(204).end();
    if(!demand){
      if(req.user)await pool.query(`INSERT INTO ai_user_activity(user_id,type,entity_type,entity_id,metadata) VALUES($1,'product_viewed','product',$2,$3)`,[req.user.id,String(p.id),JSON.stringify({name:p.name})]);
      return res.json({success:true});
    }

    const db=await pool.connect();
    try{
      await db.query('BEGIN');
      // Authenticated repeat clicks within a minute do not inflate demand.
      await db.query('SELECT pg_advisory_xact_lock($1)',[p.id]);
      const recent=req.user ? await db.query("SELECT id FROM product_demand_telemetry WHERE product_id=$1 AND user_id=$2 AND created_at>NOW()-INTERVAL '1 minute'",[p.id,req.user.id]):{rowCount:0};
      if(!recent.rowCount){
        await db.query(`INSERT INTO product_demand_telemetry(product_id,product_name,source,user_id) VALUES($1,$2,$3,$4)`,[p.id,p.name,String(req.body.source||'catalog').slice(0,50),req.user?.id||null]);
        await db.query(`INSERT INTO notifications(type,title,body,is_read) SELECT 'low_stock',$1,$2,false WHERE NOT EXISTS
          (SELECT 1 FROM notifications WHERE type='low_stock' AND title=$1 AND created_at>NOW()-INTERVAL '15 minutes')`,
          [`Out-of-stock demand: ${p.name}`.slice(0,200),'Customer demand recorded. Review Customer CRM → Product demand before purchasing.']);
      }
      await db.query('COMMIT');res.status(201).json({success:true});
    }catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();}
  }catch(e){next(e);}
});
router.get('/demand-summary',protect,requireRole('superadmin','admin','manager','accountant'),async(req,res,next)=>{
  try{const r=await pool.query(`SELECT d.product_id,MAX(p.name) AS product_name,COUNT(*) AS demand_clicks,
    COUNT(DISTINCT d.user_id) AS unique_customers,COUNT(*) FILTER(WHERE d.user_id IS NULL) AS guest_clicks,
    MAX(d.created_at) AS last_demanded_at,MAX(p.stock) AS stock FROM product_demand_telemetry d
    LEFT JOIN products p ON p.id=d.product_id WHERE d.created_at>NOW()-INTERVAL '30 days'
    GROUP BY d.product_id ORDER BY demand_clicks DESC LIMIT 100`);res.json({demand:r.rows});}catch(e){next(e);}
});
module.exports=router;
