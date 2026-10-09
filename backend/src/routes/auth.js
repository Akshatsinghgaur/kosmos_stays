const router=require('express').Router(),bcrypt=require('bcryptjs'),jwt=require('jsonwebtoken'),crypto=require('crypto'),User=require('../models/User');
const { rateLimit } = require('express-rate-limit');
const authAttemptLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false, message: { message: 'Too many attempts. Please try again in 15 minutes.' } });
function tokenFor(u){if(!process.env.JWT_SECRET)throw new Error('JWT_SECRET is missing');return jwt.sign({id:String(u._id),role:u.role,name:u.name,email:u.email},process.env.JWT_SECRET,{expiresIn:'7d'})}
function safe(u){return {id:String(u._id),name:u.name,email:u.email,role:u.role,phone:u.phone||'',businessName:u.businessName||'',telegramCleanerId:u.telegramCleanerId||'',telegramCleanerName:u.telegramCleanerName||'',telegramHostId:u.telegramHostId||''}}
router.post('/register',authAttemptLimit,async(req,res)=>{try{const name=req.body.name?.trim(),email=req.body.email?.trim().toLowerCase(),password=req.body.password;if(!name||!email||!password)return res.status(400).json({message:'Name, email and password are required'});if(password.length<8)return res.status(400).json({message:'Password must be at least 8 characters'});// Public sign-up must never grant administrator privileges. Promote the verified owner account with the one-time script.
const u=await User.create({name,email,passwordHash:await bcrypt.hash(password,10),role:'host'});return res.status(201).json({token:tokenFor(u),user:safe(u)})}catch(e){console.error('Register:',e.message);return res.status(e.code===11000?409:500).json({message:e.code===11000?'Email already registered':'Could not create account. Check server configuration.'})}});
router.post('/login',authAttemptLimit,async(req,res)=>{try{const email=req.body.email?.trim().toLowerCase(),password=req.body.password;const u=await User.findOne({email,active:true});if(!u||!(await bcrypt.compare(password||'',u.passwordHash)))return res.status(401).json({message:'Invalid email or password'});return res.json({token:tokenFor(u),user:safe(u)})}catch(e){console.error('Login:',e.message);return res.status(500).json({message:'Could not log in. Please try again.'})}});

router.post('/forgot-password',authAttemptLimit,async(req,res)=>{
 try{
  const email=req.body.email?.trim().toLowerCase();
  if(!email)return res.status(400).json({message:'Enter your account email address'});
  if(!process.env.SMTP_HOST||!process.env.SMTP_USER||!process.env.SMTP_PASS||!process.env.SMTP_FROM)return res.status(503).json({message:'Password reset email is not configured yet. Ask the administrator to configure SMTP.'});
  const user=await User.findOne({email,active:true});
  // Keep the response identical whether or not the email exists.
  if(user){
   const token=crypto.randomBytes(32).toString('hex');
   user.passwordResetTokenHash=crypto.createHash('sha256').update(token).digest('hex');
   user.passwordResetExpiresAt=new Date(Date.now()+15*60*1000);
   await user.save();
   const nodemailer=require('nodemailer');
   const transporter=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:String(process.env.SMTP_SECURE||'false')==='true',auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}});
   await transporter.sendMail({from:process.env.SMTP_FROM,to:user.email,subject:'Reset your Kosmos Stays password',text:`Your Kosmos Stays password reset code is:\n\n${token}\n\nThis code expires in 15 minutes. If you did not request this, ignore this email.`});
  }
  return res.json({message:'If an active account uses this email, password reset instructions have been sent.'});
 }catch(e){console.error('Forgot password:',e.message);return res.status(500).json({message:'Could not send reset instructions. Please try again later.'})}
});
router.post('/reset-password',authAttemptLimit,async(req,res)=>{
 try{
  const email=req.body.email?.trim().toLowerCase(),token=String(req.body.token||''),password=String(req.body.password||'');
  if(!email||!token||password.length<8)return res.status(400).json({message:'Email, reset code and a password of at least 8 characters are required'});
  const hash=crypto.createHash('sha256').update(token).digest('hex');
  const user=await User.findOne({email,active:true,passwordResetTokenHash:hash,passwordResetExpiresAt:{$gt:new Date()}});
  if(!user)return res.status(400).json({message:'Reset code is invalid or expired. Request a new one.'});
  user.passwordHash=await bcrypt.hash(password,10);user.passwordResetTokenHash=null;user.passwordResetExpiresAt=null;await user.save();
  return res.json({message:'Password updated successfully. You can now log in.'});
 }catch(e){console.error('Reset password:',e.message);return res.status(500).json({message:'Could not reset password. Please try again.'})}
});
router.get('/me',require('../middleware/auth'),async(req,res)=>{const u=await User.findById(req.user.id).select('-passwordHash');if(!u)return res.status(404).json({message:'Account not found'});res.json(safe(u))});
router.patch('/me',require('../middleware/auth'),async(req,res)=>{try{const allowed=['name','phone','businessName','telegramCleanerId','telegramCleanerName','telegramHostId'];const patch={};for(const k of allowed)if(req.body[k]!==undefined)patch[k]=String(req.body[k]).trim();if(patch.name!==undefined&&!patch.name)return res.status(400).json({message:'Name cannot be empty'});const u=await User.findByIdAndUpdate(req.user.id,{$set:patch},{new:true,runValidators:true}).select('-passwordHash');res.json(safe(u))}catch(e){res.status(400).json({message:'Could not update profile'})}});
router.post('/test-cleaner',require('../middleware/auth'),async(req,res)=>{try{const User=require('../models/User');const telegram=require('../telegram');const user=await User.findById(req.user.id);if(!user?.telegramCleanerId)return res.status(400).json({message:'Add your cleaner Telegram ID first'});if(!process.env.TELEGRAM_BOT_TOKEN)return res.status(503).json({message:'Telegram notifications are not configured by the administrator yet'});await telegram.sendTest(process.env.TELEGRAM_BOT_TOKEN,user.telegramCleanerId);res.json({message:'Test message sent to your cleaner'})}catch(e){res.status(400).json({message:'Could not send test message. Ask your cleaner to open @kosmosstays_bot and press Start.'})}});
module.exports=router;
