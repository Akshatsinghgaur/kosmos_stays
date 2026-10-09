const mongoose=require('mongoose');
module.exports=mongoose.model('User',new mongoose.Schema({
 name:{type:String,required:true,trim:true}, email:{type:String,unique:true,required:true,lowercase:true,trim:true},
 passwordHash:{type:String,required:true}, passwordResetTokenHash:{type:String,default:null}, passwordResetExpiresAt:{type:Date,default:null}, role:{type:String,enum:['admin','host'],default:'host'}, active:{type:Boolean,default:true},
 phone:{type:String,default:''}, businessName:{type:String,default:''}, telegramCleanerId:{type:String,default:''}, telegramCleanerName:{type:String,default:''}, telegramHostId:{type:String,default:''}
},{timestamps:true}));
