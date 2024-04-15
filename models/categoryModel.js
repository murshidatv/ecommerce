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
      
     
 })

 module.exports=mongoose.model('Category',categorySchema)