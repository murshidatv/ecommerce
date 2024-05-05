const User = require('../../models/userModel');
const Category = require('../../models/categoryModel')
const Product = require('../../models/productModel');
const Order = require('../../models/orderModel');
const config=require('../../config/config');

const bcrypt = require('bcrypt');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');





const uuid = require('uuid');
const { v4: uuidv4 } = require('uuid');

const nodemailer = require('nodemailer');


const { product } = require('../admin/categoryController');
const { render } = require('ejs');

const randomstring = require('randomstring');

const strongPassword = async (password) => {
  try {
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);
      return passwordHash;
  } catch (error) {
      throw new Error('Error hashing password: ' + error.message);
  }
}

/*

*/

// send mail
const verifyMail = async (name, email, otp) => {
  try {

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: 'murshidatv@gmail.com',
        pass: 'jvnf zmkk gkru btna'
      }

    });

    const mailOption = {
      from: 'murshidatv@gmail.com',
      to: email,
      subject: 'otp verification ',
      html: `<p>Hi ${name},your OTP is ${otp}.Please use this to verify your email.<p>`

    }
    transporter.sendMail(mailOption, (error, info) => {
      if (error) {
        console.log(error);
      } else {
        console.log("Email has been sent:", info.response);
      }
    })
  } catch (error) {
    console.log(error.message);
  }
}

//reset password sent mail

const resetPassword=async(name,email,token)=>{
  try {
    
      
        
    const transporter=  nodemailer.createTransport({
          host:'smtp.gmail.com',
          port:587,
          secure: false,
          requireTLS:true,
          auth:{
              user:config.emailUser,
              pass:config.emailPassword
          }
  
      });
  
  const mailOption={
      from:config.emailUser,
      to:email,
      subject:'For reset password ',
      html:`<p>Hi ${name}, please click here to <a href="http://localhost:4000/forgot-password?token=${token}">Reset</a> your password</p>`
      
  }
  transporter.sendMail(mailOption,(error,info)=>{
       if(error) {
          console.log(error);
       }else{
          console.log("Email has been sent:",info.response);
       }
  })
  } catch (error) {
      console.log(error.message);
  }
  }


//register 
const register= async(req,res)=>{
    try{
        res.render('register')
    }catch(error){
        console.log(error.message);
    }

}

const userData = async (req, res) => {
  try {
      const sequirepass = await strongPassword(req.body.password);
      const data = new User({
          name: req.body.name,
          email: req.body.email,
          password: sequirepass,
          mobile: req.body.mobile,
          image: req.file.filename,
          is_admin: 0,
          referralCodeUsed: req.body.referralCodeUsed, 
      });
      

      // Check if the user exists in the database based on email
      const existingUserEmail = await User.findOne({ email: data.email });
      if (existingUserEmail) {
          res.render('register', { message: "User already exists. Please choose a different email." });
          return;
      }

      // Check if the mobile number exists in the database
      const existingUserPhone = await User.findOne({ mobile: data.mobile });
      if (existingUserPhone) {
          res.render('register', { message: "Mobile number already exists. Please choose a different mobile number." });
          return;
      }

      // Check if the referral code exists in the database
      if (data.referralCodeUsed) {
          const referrer = await User.findOne({ referralCode: data.referralCodeUsed });
          if (!referrer) {
              res.render('register', { message: "Invalid referral code. Please check and try again." });
              return;
          }
      }

      const user = await data.save();

      if (user) {
          // Generate OTP
          const otp = randomstring.generate({
              length: 6,
              charset: 'numeric',
          });

          // Store OTP in the user's otp field
          user.otp = otp;
           // Generate referral code
            const referralCode = crypto.randomBytes(8).toString('hex'); 

           // Set referral code in user record
            user.referralCode = referralCode;

          await user.save();
          console.log("OTP set:", user.otp);

          // Send OTP to email
          verifyMail(req.body.name, req.body.email, otp);
          res.render('otp', { userId: user.id });

          // If referral code was used, credit both the user and the referrer
          if (data.referralCodeUsed) {
              const referrer = await User.findOne({ referralCode: data.referralCodeUsed });
              if (referrer) {
                  // Credit the user and the referrer
                  user.wallet += 50;
                  referrer.wallet += 50;

                  // Update the wallet history for the user
                  user.walletHistory.push({
                      type: 'credit',
                      amount: 50,
                      description: 'Received 50 Rs for using referral code',
                  });

                  // Update the wallet history for the referrer
                  referrer.walletHistory.push({
                      type: 'credit',
                      amount: 50,
                      description: 'Received 50 Rs for referral',
                  });

                  await user.save();
                  await referrer.save();
              }
          }
      } else {
          res.render('register', { message: "Registration failed" });
      }

  } catch (error) {
      console.log(error.message);
  }
};



const verify = async (req, res) => {
  try {
      const userId = req.params.userId;
      const enteredOTP = req.body.otp;
      const user = await User.findById(userId);
      if (user) {
          const currentTime = Math.floor(new Date().getTime() / 1000);
          const otpExpiryTime = user.otp_expiry_time || 0;

          if (otpExpiryTime > 0 && currentTime > otpExpiryTime) {
              user.otp = '';
              user.otp_expiry_time = 0;
              await user.save();
              return res.status(400).json({ message: 'OTP has expired. Please request a new one', expired: true });
          }

          if (user.otp === enteredOTP) {
              user.is_verified = true;
              user.otp_expiry_time = 0;
              await user.save();
              return res.json({ success: true, message: 'Email verified successfully' });
          } else {
              return res.status(400).json({ message: 'Incorrect OTP. Please try again.' });
          }
      } else {
          return res.status(404).json({ message: 'User not Found' });
      }
  } catch (error) {
      console.log(error.message);
      return res.status(500).json({ message: 'Internal Server Error' });
  }
};



const resendOTP = async (req, res) => {
  try {
      console.log('Resend OTP ');
  //   const userId = req.params.userId;
  const userId = mongoose.Types.ObjectId.createFromHexString(req.params.userId);



    console.log('User ID',userId);
    // Retrieve user
    const user = await User.findById(userId);
  
   console.log('user',user);
    if (user) {
      // Generate and store new OTP
      const newOTP = randomstring.generate({
        length: 6,
        charset: 'numeric',
      });

      user.otp = newOTP;
      user.otp_expiry_time=Math.floor(new Date().getTime()/1000)+300;
      await user.save();

      // Send new OTP to email
      verifyMail(user.name, user.email, newOTP);

      res.render('otp', { userId: userId, message: 'New OTP sent successfully.' });
      console.log('New OTP is',newOTP)
    } else {
      res.status(404).send('User not found');
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).send('Internal Server Error');
  }
};

const emailVerified = (req, res) => {
    try {
        res.render('email-verified');
    } catch (error) {
        console.log(error.message);
    }
};

// render login
const login=async(req,res)=>{
    try{
        res.render('login')
    }catch(error){
        console.log(error.message);
    }

}
//login user and redirect to home


const verifylogin = async (req, res) => {
    try {
      const { email, password } = req.body;
  
      if (!email || !password) {
        return res.render('login', { message: "Email and password are required" });
      }
  
      const userLogin = await User.findOne({ email });
  
      if (!userLogin) {
        return res.render('login', { message: "Incorrect email or password..." });
      }
  
      const passwordMatch = await bcrypt.compare(password, userLogin.password);
      
      if (!passwordMatch) {
        return res.render('login', { message: "Incorrect email or password" });
      }
  
      if (!userLogin.is_verified) {
        return res.render('login', { message: "Incorrect email or password" });
      }
  
      if (userLogin.isBlocked) {
        return res.render('login', { message: "User account is blocked, choose another account" });
      }
  
      req.session.user_id = userLogin._id;
      res.redirect('/home');
    } catch (error) {
      console.log(error.message);
      // Handle other error conditions or uncomment the line below to send a generic error response.
      // res.status(500).send('Internal Server Error');
    }
  };


//home page
const homepage = async (req, res) => {
  try {
      const isLoggedIn = req.session.user_id ? true : false;
       res.render('home', { isLoggedIn});     
      
  } catch (error) {
      console.log(error.message);
      res.status(500).send('Internal Server Error');
  }
};




//forgot
const forgotLoad= async(req,res)=>{
  try {
    res.render('forget');
  } catch (error) {
    console.log(error.message);
  }
}
const forgotPass=async(req,res)=>{
  try {
    const email= req.body.email;
   const dataUser= await User.findOne({email:email});
   if (dataUser) {
   console.log(dataUser);
    if(dataUser.is_verified === false){
      res.render('forget',{message:"please verify your mail"});

    }
    const randomString=randomstring.generate();
    const updateData=await User.updateOne({email:email},{$set:{token:randomString}})
    resetPassword(dataUser.name,dataUser.email,randomString);
    res.render('forget',{message:"please check your mail for reset your password"})

   }else{
    res.render('forget',{message:"user email is incorrect"})
   }
  } catch (error) {
    console.log(error.message);
  }
}


const forgotpassword=async(req,res)=>{
  try {
    const token=req.query.token;
   const tokenData= await User.findOne({token:token})
   if(tokenData){
    res.render('forgot-password',{userId:tokenData._id});

   }
  } catch (error) {
    console.log(error.message);
  }
}

const restPassword=async(req,res)=>{
  try {
    const password=req.body.password;
    const user_id=req.body.userId;
    const securePassword=await strongPassword(password);
    const updateuserData=await  User.findByIdAndUpdate({_id:user_id},{$set:{password:securePassword,  token:''}})
    res.redirect('/login')
  } catch (error) {
    console.log(error.message);
  }
}


const userLogout=async(req,res)=>{
    try{
        req.session.destroy();
        res.redirect('/');
      
    }catch(error){
        console.log(error.message);
    }

};



const viewProduct = async (req, res) => {
  try {
    const productId = req.params.productId;
    const product = await Product.findById(productId).populate('category');
    res.render('single-product', { product });
  } catch (error) {
    console.log(error.message);
  }
}


// const viewProductList=async(req,res)=>{
//     try {
//         const products = await Product.find();
//         const categories=await Category.find();
//         res.render('productList',{ products, categories })
//     } catch (error) {
//         console.log(error.message);
//     }
// }

const viewProductList = async (req, res) => {
  try {
    const categories = await Category.find();
    const selectedCategory = req.query.category;
    const sortOption = req.query.sort || 'asc';
    const searchQuery = req.query.search || '';

    // Pagination variables
    const page = parseInt(req.query.page) || 1; // Current page number
    const perPage = 6; // Number of products per page

    let query = {};

    if (selectedCategory && selectedCategory !== 'all') {
      query = { ...query, category: selectedCategory };
    }

    if (searchQuery) {
      query = {
        ...query,
        $or: [
          { productName: { $regex: new RegExp(searchQuery, 'i') } },
        ],
      };
    }


    let sortCriteria = {};
    switch (sortOption) {
      case 'priceAsc':
        sortCriteria = { Price: 1 };
        break;
      case 'priceDesc':
        sortCriteria = { Price: -1 };
        break;
      case 'nameAsc':
        sortCriteria = { productName: 1 };
        break;
      case 'nameDesc':
        sortCriteria = { productName: -1 };
        break;
      // Add cases for other sorting options if needed
      default:
        // Default sorting criteria if none provided
        sortCriteria = { productName: 1 };
    }
    // Fetch the total number of products that match the query
    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / perPage);

    // Now, perform the query with the sorting criteria
    const products = await Product.find(query)
      .populate('category')
      .sort(sortCriteria)
      .skip((page - 1) * perPage)
      .limit(perPage);

    /* const products = await Product.find(query)
       .populate('category')
       .sort({ Price: sortOption === 'asc' ? 1 : -1 })
       .skip((page - 1) * perPage)
       .limit(perPage);
       */

    // Fetch offered categories
    //const offeredCategories = await Category.find({ offer: { $exists: true } });

    res.render('productList', {
      products,
      categories,
      selectedCategory,
      sortDropdownValue: sortOption,
      searchQuery,
      currentPage: page,
      totalPages,
      //offeredCategories // Pass offeredCategories to the template
    });
  } catch (error) {
    // Log the error to the console
    console.error('Error occurred while processing request:', error);
    // Render the error page with an error message
    res.status(500).render('error', { errorMessage: 'An error occurred while processing your request. Please try again later.' });
  }
};



const viewOfferedCategories = async (req, res) => {
  try {
      // Find categories that have an offer
      const offeredCategories = await Category.find({ offer: { $exists: true } });

      // Pass the offered categories to the view
      res.render('offeredCategories', { offeredCategories });
  } catch (error) {
      console.error(error.message);
      res.status(500).send('Internal Server Error');
  }
};


const viewOfferedCategoriesProducts=async(req,res)=>{
  try {
    const categoryId = req.params.categoryId;

    // Fetch products under the specified category
    const products = await Product.find({ category: categoryId }).populate({ path: 'category', select: 'categoryName' });
    const category = await Category.findById(categoryId); 

    res.render('productsUnderCategory', { category,products,categoryName: category.categoryName });
  } catch (error) {
    console.log(error.message);
  }
};



const viewProfile = async (req, res) => {
  try {
    const user = await User.findById(req.session.user_id);
    res.render('profile', { user });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Internal Server Error');
  }
};



const errorload = async (req, res) => {
  try {
    res.status(500).render('error', { errorMessage: 'An error occurred.' });

  } catch (error) {

  }
};


const viewEditProfileImage = async (req, res) => {
  try {
    const user = await User.findById(req.session.user_id);

    res.render('editProfileImage', { user });
  } catch (error) {
    console.log(error.message);
  }

};







const updateProfileImage = async (req, res) => {
  try {
    const userId = req.session.user_id;

    if (req.file) {
      const imagePath = req.file.filename;

      // Update the user's image path in the database
      await User.findByIdAndUpdate(userId, { image: imagePath });
    }

    res.redirect('/profile');
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Internal Server Error');
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const { name, email, mobile } = req.body;
    console.log(name, email, mobile)

    if (!name || !email || !mobile) {
      return res.status(400).send('Invalid input data');
    }


    // Find the user by ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).send('User not found');
    }

    // Update user information
    user.name = name;
    user.email = email;
    user.mobile = mobile;

    await user.save();

    res.redirect('/profile');
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Internal Server Error');
  }
};


const loadchangepassword = async (req, res) => {
  try {
    res.render('changepassword')
  } catch (error) {
    console.log(error.message);
  }
}


const changepassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.session.user_id;

  try {
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).send('User not found');
    }

    // Compare the old password with the stored hashed password
    const isPasswordMatch = await bcrypt.compare(oldPassword, user.password);

    if (!isPasswordMatch) {
      res.render('changepassword', { message: "incorrect old password" })
    }

    // Hash the new password and update the user's password
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;

    await user.save();

    res.redirect('/profile')
  } catch (error) {
    console.error('Error changing password:', error.message);
    res.status(500).send('Internal Server Error');
  }
};

const loadCartList = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const user = await User.findById(userId).populate('cart.product');
    const cartCount = user.cart.length;
    res.render('cart', { user, cartCount, userId });
  } catch (error) {
    console.log(error.message);
  }
}
const addtoCart = async (req, res) => {
  try {
    const productId = req.params.productId;
    const product = await Product.findById(productId);
    const userId = req.session.user_id;
    if (!userId) {
      //req.flash('error', 'Please log in to add products to your cart.');
      return res.redirect('/login');
    }

    const user = await User.findById(userId);
    if (user && user.cart) {
      const existingCartItem = user.cart.find(item => item && item.product && item.product.equals(product._id));

      if (existingCartItem) {
        existingCartItem.quantity += 1;
      } else {
        user.cart.push({
          product: product._id,
          quantity: 1,
        });
      }
    }
    await user.save();
    //req.flash('success', `${product.productName} added to the cart!`);
    return res.redirect('/product-list');
  } catch (error) {
    console.log(error.message);
    //req.flash('error', 'Failed to add the product to the cart.');
    return res.status(500).send('Internal Server Error');
  }
};


const updateQuantity = async (req, res) => {
  const productId = req.params.productId;
  const newQuantity = req.body.quantity;
  try {
    const user = await User.findOneAndUpdate(
      { _id: req.session.user_id, 'cart.product': productId },
      { $set: { 'cart.$.quantity': newQuantity } },
      { new: true }
    );
    res.redirect("/cartList")
  } catch (error) {
    console.log(error.message);
  }
}

const deleteCart = async (req, res) => {
  try {
    const userId = req.params.userId;
    const productId = req.params.productId;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const cartIndex = user.cart.findIndex(item => item.product.equals(productId));
    if (cartIndex === -1) {
      return res.status(404).json({ message: 'Cart item not found' });
    }
    user.cart.splice(cartIndex, 1);
    await user.save();
    res.redirect('/cartList');
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

const loadcheckout = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const user = await User.findById(userId).populate('chosenAddress  cart.product');
    if (!user) {
      return res.status(404).send('User not found');
    }
   
    const chosenAddress = user.chosenAddress;
    res.render('checkout', { user, chosenAddress });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('Internal Server Error');
  }
};


const loadorderHistory = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const orderId = req.params.orderId; // Make sure orderId is available in the route

    // Pagination options
    const page = parseInt(req.query.page) || 1; // Parse the page number to integer
    const limit = req.query.limit || 15; // Change as per your requirement

    // Get all orders for the user
    const allOrders = await Order.find({ userId: userId }).sort({ _id: -1 }).populate('products');

    // Calculate pagination values
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const orders = allOrders.slice(startIndex, endIndex);

    res.render('orderhistory', { orders, orderId, page, limit }); // Pass limit to the template
  } catch (error) {
    console.error('Error fetching order details:', error.message);
    res.status(500).send('Internal Server Error');
  }
};


const orderSucess = async (req, res) => {
  try {
    res.render('ordersuccess');
  } catch (error) {
    console.log(error.message);
  }
}


const placeorder = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const user = await User.findById(userId).populate('cart.product chosenAddress');

    if (user.cart.length === 0) {
      return res.status(400).send('Cart is empty. Cannot place an order with an empty cart.');
    }

    // Calculate the total amount 
    const cartTotal = calculateTotalAmount(user.cart);

    // Helper function to calculate the total amount of the cart
    function calculateTotalAmount(cart) {
      return cart.reduce((total, cartItem) => {
        const itemTotal = cartItem.product.Price * cartItem.quantity;
        return total + itemTotal;
      }, 0);


    }
    console.log(cartTotal);
    const paymentMethod = req.body.paymentMethod;
    const userName = user.name;

    if (paymentMethod === 'cashOnDelivery') {
      // Continue with order creation logic
      const order = new Order({
        userId,
        userName,
        chosenAddress: user.chosenAddress,
        products: user.cart.map(cartItem => ({
          product: cartItem.product,
          quantity: cartItem.quantity,
        })),
        totalAmount: cartTotal,

        payment: paymentMethod,
        razorpayOrderId: uuid.v4()
        // Generate a unique UUID as the placeholder value
      });

      await order.save();

      // Update stock for each product in the order
      for (const orderProduct of order.products) {
        const productId = orderProduct.product._id;
        const orderedQuantity = orderProduct.quantity;

        const product = await Product.findById(productId);

        if (product) {
          if (!isNaN(product.stock) && !isNaN(orderedQuantity)) {
            const remainingStock = Math.max(product.stock - orderedQuantity, 0);
            // Update the product stock
            await Product.findByIdAndUpdate(productId, { stock: remainingStock });
          } else {
            console.error('Invalid stock or ordered quantity:', product.stock, orderedQuantity);
          }
        } else {
          console.error('Product not found:', productId);
        }
      }

      // Clear the user's cart
      user.cart = [];
      await user.save();

      // Render the success page
      res.render('ordersuccess', { order });

    } else if (paymentMethod === 'onlinePayment') {
      // Create Razorpay order
      res.redirect('/checkout');

    }
    else {
      // Handle other payment methods if needed
      res.status(400).send('Invalid payment method selected.');
    }
  } catch (error) {
    console.error('Error in placeorder:', error);


    if (error.name === 'ValidationError') {
      res.status(400).send(`Validation Error: ${error.message}`);
    } else {
      res.status(500).send('Internal Server Error');
    }
  }
};




// CANCEL ORDER

const orderCancel = async (req, res) => {
  console.log('Reached orderCancel route');
  const orderId = req.params.orderId;
  const { predefinedReason, customReason } = req.body;

  try {
    const order = await Order.findById(orderId).populate('products.product');

    // Check if the order is already cancelled
    if (order.status === 'Cancelled') {
      return res.redirect('/order-history');
    }

    order.status = 'Cancellation';
    order.cancellation.isCancelled = false;
    order.cancellation.reason = predefinedReason || customReason || 'No reason provided';
    order.cancellation.cancelledByAdmin = false;

    await order.save();

    res.redirect('/order-history');
  } catch (error) {
    console.error('Error initiating cancellation:', error.message);
    res.status(500).send('Internal Server Error');
  }
};
//cancelled order-reason page
const reasonpage = async (req, res) => {
  try {

    const orderId = req.params.orderId;
    console.log("orderId:", orderId);
    const order = await Order.findById(orderId).populate('products.product');

    if (!order) {
      console.error('Order not found');
      return res.status(404).send('Order not found');
    }

    console.log("reasons", orderId);
    res.render('reason', { orderId, order });
  } catch (error) {
    console.error('Error fetching order details:', error.message);
    res.status(500).send('Internal Server Error');
  }
};

//to View Order details
const viewOrder = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findById(orderId).populate({
      path: 'products.product',
      model: 'Product'
    })
    if (!order) {
      return res.status(404).send('Order not found');
    }
    const totalOrderPrice = order.products.reduce((total, productDetail) => {
      return total + (productDetail.quantity * productDetail.product.Price);
    }, 0);
    console.log(totalOrderPrice);
    res.render('viewOrder', { order, totalOrderPrice });
  } catch (error) {

  }
}

module.exports = {
  
  register,
  userData,
  verify,
  verifylogin,
  login,
  homepage,
  userLogout,
  emailVerified,
  resendOTP,
  forgotLoad,
  forgotPass,
  forgotpassword,
  restPassword,


  viewProduct,
  viewProductList,
  viewOfferedCategories,
  viewOfferedCategoriesProducts,
  errorload,

  viewProfile,
  viewEditProfileImage,
  updateProfileImage,
  changepassword,
  loadchangepassword,
  updateProfile,

  loadCartList,
  addtoCart,
  updateQuantity,
  deleteCart,

  loadcheckout,
  placeorder,
  orderSucess,
  orderCancel,
  reasonpage,
  loadorderHistory,
  viewOrder,



}