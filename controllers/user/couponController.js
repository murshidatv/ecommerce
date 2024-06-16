const { render } = require('ejs');
const Coupon=require('../../models/couponModel');
const User = require('../../models/userModel'); 

const loadCoupon = async(req,res)=>{
    try {
        const coupon = await Coupon.find();
        res.render('couponmanage', { coupon });
        
    } catch (error) {
        console.log(error.message);
    }
}


const applyCoupon = async (req, res) => {
    try {
      const { userId, couponCode } = req.body;
      const user = await User.findById(userId).populate('cart.product');
  
      if (!user) {
        return res.status(400).send('User not found.');
      }
  
      const coupon = await Coupon.findOne({ code: couponCode });
  
      if (!coupon) {
        return res.status(400).send('Invalid coupon code.');
      }
  
      if (new Date(coupon.expirationDate) < new Date()) {
        return res.status(400).send('Coupon has expired.');
      }
  
      if (coupon.usageLimits.totalUses <= 0) {
        return res.status(400).send('Coupon has reached its usage limit.');
      }
  
      const userCouponUsage = user.couponsUsed || {};
      if (userCouponUsage[couponCode] >= coupon.usageLimits.perUser) {
        return res.status(400).send('You have reached the usage limit for this coupon.');
      }
  
      const cartTotal = user.cart.reduce((total, cartItem) => {
        return total + (cartItem.product.price * cartItem.quantity);
      }, 0);
  
      if (cartTotal < coupon.conditions.minOrderAmount) {
        return res.status(400).send(`Minimum order amount to use this coupon is ${coupon.conditions.minOrderAmount}.`);
      }
  
      let discountAmount = 0;
  
      if (coupon.type === 'percentage') {
        discountAmount = (coupon.value / 100) * cartTotal;
      } else if (coupon.type === 'fixed') {
        discountAmount = coupon.value;
      }
  
      const totalAmountAfterDiscount = cartTotal - discountAmount;
  
      user.coupon = {
        code: coupon.code,
        discountAmount,
        totalAmountAfterDiscount
      };
  
      userCouponUsage[couponCode] = (userCouponUsage[couponCode] || 0) + 1;
      user.couponsUsed = userCouponUsage;
  
      coupon.usageLimits.totalUses -= 1;
  
      await user.save();
      await coupon.save();
  
      res.status(200).send({
        discountAmount,
        totalAmountAfterDiscount,
        cartTotal
      });
    } catch (error) {
      console.log(error.message);
      res.status(500).send('Internal Server Error');
    }
  };
  
  const removeCoupon = async (req, res) => {
    try {
      const { userId } = req.body;
      const user = await User.findById(userId).populate('cart.product');
  
      if (!user) {
        return res.status(400).send('User not found.');
      }
  
      user.coupon = null;
  
      const cartTotal = user.cart.reduce((total, cartItem) => {
        return total + (cartItem.product.price * cartItem.quantity);
      }, 0);
  
      await user.save();
  
      res.status(200).send({ cartTotal });
    } catch (error) {
      console.log(error.message);
      res.status(500).send('Internal Server Error');
    }
  };
  

module.exports = {
    loadCoupon,
    applyCoupon,
    removeCoupon
};





