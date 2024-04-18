const mongoose = require('mongoose');

const address = new mongoose.Schema({
    user:{
        type : mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    
    address:[{
        name:{
            type:String
        },
        mobile:{
            type:String
        },
        address:{
            type:String
        },
        city:{
            type:String
        },
        pincode:{
            type: Number
        },
        district:{
            type:String
        },
        state:{
            type:String
        }
        
    }]
})

module.exports = mongoose.model('Address',address);