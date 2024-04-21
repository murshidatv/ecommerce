const User = require('../../models/userModel');
const Category = require('../../models/categoryModel')
const Product = require('../../models/productModel');
const Order = require('../../models/orderModel');

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
const securePassword = async (password) => {
  try {

    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;

  } catch (error) {
    console.log(error.message);
  }
}


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




const loadRegister = async (req, res) => {
  try {
    res.render('registration');

  } catch (error) {
    console.log(error.message);
  }
}



const insertUser = async (req, res) => {
  try {
    const secPassword = await securePassword(req.body.password);
    const existingUser = await User.findOne({ email: req.body.email });

    if (existingUser) {
      return res.render('registration', { message: "Email already exists, try another one" });
    }
    // Check if the mobile number exists in the database
    const existingUserMobile = await User.findOne({ mobile: req.body.mobile });
    if (existingUserMobile) {
      res.render('registration', { message: "Mobile number already exists. Please choose a different mobile number." });
      return;
    }

    const user = new User({
      name: req.body.name,
      email: req.body.email,
      mobile: req.body.mobile,
      image: req.file.filename,
      password: secPassword,
      is_admin: 0
    });

    const userData = await user.save();

    //const user = await data.save();

    if (userData) {
      // Generate OTP
      const otp = randomstring.generate({
        length: 6,
        charset: 'numeric',
      });

      // Store OTP in the user's otp field
      userData.otp = otp;

      await userData.save();
      console.log("OTP set:", userData.otp);

      // Send OTP to email
      verifyMail(req.body.name, req.body.email, otp);
      res.render('otp', { userId: userData.id });


      await userData.save();
      res.render('registration', { message: "Your registration has been successfull..." });
      console.log("data save...")
    }
    else {
      res.render('registration', { message: "Your registration has been failed" });
    }
  } catch (error) {
    console.log(error.message);
  }
}


const verify = async (req, res) => {
  try {
    const userId = req.params.userId;
    const enteredOTP = req.body.otp;
    const userData = await User.findById(userId);
    if (userData) {
      const currentTime = Math.floor(new Date().getTime() / 1000);
      const otpExpiryTime = userData.otp_expiry_time || 0;

      if (otpExpiryTime > 0 && currentTime > otpExpiryTime) {
        userData.otp = '';
        userData.otp_expiry_time = 0;
        await userData.save();
        return res.status(400).json({ message: 'OTP has expired. Please request a new one', expired: true });
      }

      if (userData.otp === enteredOTP) {
        userData.is_verified = true;
        userData.otp_expiry_time = 0;
        await userData.save();
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
    const userDataId = mongoose.Types.ObjectId.createFromHexString(req.params.userDataId);



    console.log('User ID', userDataId);
    // Retrieve user
    const userData = await User.findById(userDataId);

    console.log('userData', userData);
    if (userData) {
      // Generate and store new OTP
      const newOTP = randomstring.generate({
        length: 6,
        charset: 'numeric',
      });

      userData.otp = newOTP;
      console.log(newOTP);
      userData.otp_expiry_time = Math.floor(new Date().getTime() / 1000) + 300;
      await userData.save();

      // Send new OTP to email
      verifyMail(userData.name, userData.email, newOTP);
      // Send JSON response indicating success
      res.json({ success: true, message: 'New OTP sent successfully.' });
      //res.render('otp', { userDataId: userDataId, message: 'New OTP sent successfully.' });
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








// login user methods started

const loginUser = async (req, res) => {
  try {
    res.render('login');
  } catch (error) {
    console.log(error.message);
  }
}


const verifyLogin = async (req, res) => {
  try {

    const email = req.body.email;
    const password = req.body.password;

    const userData = await User.findOne({ email: email });

    if (userData) {
      const passwordMatch = await bcrypt.compare(password, userData.password);

      if (passwordMatch && userData.is_admin === 0) {
        // if (userData.is_verified === 0) {
        //     console.log('Please verify your mail');
        // } else {
        req.session.user_id = userData._id;
        res.redirect('/home');
        // }
      } else {
        res.render('login', { message: 'Incorrect Username and Password' });
      }
    } else {
      res.render('login', { message: 'Invalid Username' });
    }
  } catch (error) {
    console.log(error.message);
  }
}



//home page
const homePage = async (req, res) => {
  try {
    const isLoggedIn = req.session.user_id ? true : false;
    res.render('home', { isLoggedIn });

  } catch (error) {
    console.log(error.message);
    res.status(500).send('Internal Server Error');
  }
};


const userLogout = async (req, res) => {
  try {
    req.session.destroy();
    res.redirect('/');

  } catch (error) {
    console.log(error.message);
  }

}

/* 

const loadHome = async(req,res) =>{
   try {
       const userData = await User.findById({_id:req.session.user_id});

       if(userData.is_admin === 0){
           res.render('home',{user:userData});
       }
   } catch (error) {
       console.log(error.message);
   }
}

const userLogout = async(req,res)=>{
   try{
       req.session.destroy();
       res.redirect('/');

   }catch(error){
       console.log(error.message);
   }
}
*/



// render login
const login = async (req, res) => {
  try {
    res.render('login')
  } catch (error) {
    console.log(error.message);
  }

};
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

    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / perPage);

    const products = await Product.find(query)
      .populate('category')
      .sort({ Price: sortOption === 'asc' ? 1 : -1 })
      .skip((page - 1) * perPage)
      .limit(perPage);

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


const orderSucess =async(req,res)=>{
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

    // Calculate the total amount without discount
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
        totalAmount:cartTotal,
        
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
      res.render('ordersuccess', {  order });

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







/*
module.exports = {
  async search(req, res) {
    try {
      let query = {};

      // Filter by name if provided in query parameters
      if (req.query.name) {
        query.name = { $regex: req.query.name, $options: 'i' };
      }

      // Implement sorting based on query parameters
      let sortQuery = {};

      if (req.query.sortBy) {
        switch (req.query.sortBy) {
          case 'popularity':
            sortQuery = { popularity: -1 };
            break;
          case 'priceLowToHigh':
            sortQuery = { Price: 1 };
            break;
          case 'priceHighToLow':
            sortQuery = { Price: -1 };
            break;
          case 'averageRatings':
            sortQuery = { averageRatings: -1 };
            break;
          case 'featured':
            sortQuery = { featured: -1 };
            break;
          case 'newArrivals':
            sortQuery = { createdAt: -1 };
            break;
          case 'alphabetical':
            sortQuery = { name: 1 };
            break;
          default:
            sortQuery = {};
        }
      }

      const products = await Product.find(query).sort(sortQuery);
      
      // If the request is AJAX, return only the product list HTML
      if (req.xhr) {
        res.render('partials/productList', { products }); // Render a partial template with search results
      } else {
        res.render('productList', { products }); // Render the productList.ejs template with search results
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server Error' });
    }
  }
};

*/
module.exports = {
  loadRegister,
  insertUser,
  loginUser,
  verify,
  verifyLogin,
  homePage,
  userLogout,
  emailVerified,
  resendOTP,
  viewProduct,
  viewProductList,

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
  loadorderHistory,



}