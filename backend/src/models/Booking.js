const mongoose=require('mongoose');
module.exports=mongoose.model('Booking',new mongoose.Schema({
 bookingId:{type:String,unique:true,index:true}, unitId:{type:mongoose.Schema.Types.ObjectId,ref:'Unit'}, hostId:{type:mongoose.Schema.Types.ObjectId,ref:'User'},
 customerName:String, ids:[{filename:String,originalName:String,mimeType:String,size:Number,uploadedAt:Date}], checkIn:Date, checkOut:Date, amount:Number, source:String,
 status:{type:String,enum:['upcoming','active','checked_out','cancelled'],default:'active'}, actualCheckOutAt:{type:Date,default:null}
},{timestamps:true}));
