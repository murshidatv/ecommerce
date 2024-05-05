const mongoose=require("mongoose");

 const categorySchema = new mongoose.Schema({
    
    categoryName:{
        type:String,
        required:true
    },
   
    status:{
        type:Boolean,
        default:true
    },
    blocked: {
        type: Boolean,
        default: false, 
      },
     
   
    offer: {
        type: {
            type: String,
        },
        amount: {
            type: Number,
        },
        endDate: {
            type: Date,
        },
    },
     
 });

 module.exports=mongoose.model('Category',categorySchema);