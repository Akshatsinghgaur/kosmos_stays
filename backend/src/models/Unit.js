const mongoose=require('mongoose');
module.exports=mongoose.model('Unit',new mongoose.Schema({
 unitCode:{type:String,unique:true,required:true,trim:true,uppercase:true}, hostId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
 status:{type:String,enum:['available','occupied','cleaning'],default:'available'}, active:{type:Boolean,default:true}, archivedAt:{type:Date,default:null},
 subscriptionStatus:{type:String,enum:['pending','active','expired','suspended'],default:'pending'}, subscriptionStartedAt:{type:Date,default:null}, subscriptionExpiresAt:{type:Date,default:null}, subscriptionAmount:{type:Number,default:299}, lastPaymentNote:{type:String,default:''}, cleaningStartedAt:{type:Date,default:null}, overdueAlertedAt:{type:Date,default:null}
},{timestamps:true}));
