const { render } = require('ejs');
const Coupon=require('../../models/couponModel');


const loadCoupon = async(req,res)=>{
    try {
        const coupon = await Coupon.find();
        res.render('couponmanage', { coupon });
        
    } catch (error) {
        console.log(error.message);
    }
}
module.exports ={

    loadCoupon,
}