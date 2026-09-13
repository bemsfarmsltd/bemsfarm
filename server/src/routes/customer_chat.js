const router=require('express').Router();
const {protect,requireRole}=require('../middleware/authMiddleware');
const {getMessages,sendMessage,markRead}=require('../services/supportService');
router.use(protect,requireRole('user'));
router.get('/messages',async(req,res,next)=>{try{res.json(await getMessages(req.user.id));}catch(e){next(e);}});
router.post('/messages',async(req,res,next)=>{try{res.status(201).json(await sendMessage(req.user.id,req.body.message));}catch(e){if(e.status)return res.status(e.status).json({message:e.message});next(e);}});
router.post('/read',async(req,res,next)=>{try{await markRead(req.user.id,'admin');res.json({success:true});}catch(e){next(e);}});
module.exports=router;
