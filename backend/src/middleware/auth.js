const jwt=require('jsonwebtoken');
function auth(req,res,next){try{const h=req.headers.authorization||'';const t=h.startsWith('Bearer ')?h.slice(7):null;if(!t)return res.status(401).json({message:'Login required'});req.user=jwt.verify(t,process.env.JWT_SECRET);return next()}catch{return res.status(401).json({message:'Invalid or expired session'})}}
auth.admin=(req,res,next)=>req.user?.role==='admin'?next():res.status(403).json({message:'Admin only'});
module.exports=auth;
