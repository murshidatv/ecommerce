const mongoose=require("mongoose");

 const productSchema = new mongoose.Schema({
    
    productName:{
        type:String,
        required:true,
        index: true
    },
    category:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category'
        
    },
    status:{
        type:Boolean,
        default:true
    },
    size:{
        type:String,
        required:true
    },
    blocked: {
        type: Boolean,
        default: false,
    },
    oldPrice: {
        type: Number,
    },
    price: {
        type: Number,
    },
    stock:{
        type:Number,
        required: true,
        min: 0, 
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
    description:{
        type:String
    },
    images:{
        type:[String],
    
    },
    deleted:{
        type:Boolean,
        default:false
    }
 })

 module.exports=mongoose.model('Product',productSchema)