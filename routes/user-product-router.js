const express = require('express');
const userProductRouter = express.Router();
const Category = require('../models/categoryModel');
const Product = require('../models/productModel');



const session = require("express-session");
const config = require("../config/config");




//const auth = require('../config/auth')

userProductRouter.get('/',async(req,res)=>{
    let products = await Product.find({});
    let categories = await Category.find({});
    let count =null;
    let list =null;

   
     


    res.render('user/products',{products,categories,user});
});
userProductRouter.get('/:category',async(req,res)=>{
    try {
        let category = req.params.category;
        let categories = await Category.find({});
        let products = await Product.find({category:category});
        let count =null
        const user = req.session.user;
      
        // let t = await Cart.findOne({ userId: id }).populate("cart.product");
       
        console.log(products.length);
        res.render('user/products',{products,categories,user});
        // res.json({status:true})
    } catch (err) {
        if(err) res.render('user/404')
    }
   
});



userProductRouter.get('/product-details/:id',async(req,res)=>{
    let id = req.params.id;
    try{

        let product = await Product.findById(id)
        let images = product.images;
        const user = req.session.user;
       
        res.render('user/single-product',{product,images,user});
    }catch(err){
        if(err)
        res.render('user/404');
    }
})








module.exports = userProductRouter