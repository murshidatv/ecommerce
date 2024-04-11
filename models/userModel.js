const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    
    
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true
    },
    mobile:{
        type:String,
        required:true
    },
    image:{
        type:String,
        required:true
    },
    password:{
        type:String,
        required:true
    },
    createdAt: {
        type: Date,
        default: Date.now
      },
    otp:{
        type:String,
        
        },
    otp_expiry_time:{
        type:Number,
        default:0
        },
    isBlocked : {
        type: Boolean,
        default:false
        },
    is_admin:{
        type:Number,
        required:true
    },
   
    is_verified:{
        type:Boolean,
        default:0
    }
});

module.exports = mongoose.model('User',userSchema);