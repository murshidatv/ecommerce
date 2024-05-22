const express = require("express");
const user_route = express();
const path = require('path');
const addressController = require('../controllers/user/address');
const userController = require('../controllers/user/userController');
const couponController=require('../controllers/user/couponController')
const razorpayInstance=require('../config/razorpayConfig')

//user_route.use(session({secret:config.sessionSecret}));
const auth = require("../middleware/auth");

user_route.set('view engine', 'ejs');
user_route.set('views', './views/users');

const session = require("express-session");
const config = require("../config/config");
/*
user_route.get('/google/callback', userController.googleAuthCallback);
user_route.get('/google', userController.googleAuth);

*/
const passport = require('passport'); //for login using google
require('../middleware/passport');
user_route.use(passport.initialize());
user_route.use(passport.session());  //for login using google

//user_route.get('/verify',userController.verify)
user_route.get('/google/Verify', passport.authenticate('google', {
    scope: ['email', 'profile']
}));
user_route.get('/userVerification/google/callback',
    passport.authenticate('google', {
        successRedirect: '/home',
        failureRedirect: '/login',
    }));


user_route.use(session({
    secret: config.sessionSecret,
    resave: false,  // Set to false to avoid deprecated warning
    saveUninitialized: false  // Set to false to avoid deprecated warning
}));




const bodyParser = require('body-parser');
user_route.use(bodyParser.json());
user_route.use(bodyParser.urlencoded({ extended: true }))

const multer = require("multer");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../public/userImages'));
    },
    filename: function (req, file, cb) {
        const name = Date.now() + '-' + file.originalname;
        cb(null, name);
    }
})
const upload = multer({ storage: storage });





user_route.get('/register', auth.isLogout, userController.register);
user_route.get("/", auth.isLogout, userController.homepage);
user_route.post('/login', userController.verifylogin);

user_route.post('/register', upload.single('image'), userController.userData);
user_route.post('/verify/:userId', userController.verify);

user_route.get('/login', auth.isLogout, userController.login);
user_route.post('/login', userController.verifylogin);
user_route.get("/", auth.isLogout, userController.homepage);
user_route.get("/home", auth.isLogin, userController.homepage);
user_route.get('/email-verified', userController.emailVerified);
user_route.get('/logout', auth.isLogin, userController.userLogout);
user_route.post('/resend-otp/:userId', userController.resendOTP);

user_route.get('/forgot', userController.forgotLoad);
user_route.post('/forgot', userController.forgotPass);
user_route.get('/forgot-password', userController.forgotpassword);
user_route.post('/forgot-password', userController.restPassword);





user_route.get('/view-offered-categories', userController.viewOfferedCategories);
user_route.get('/category/:categoryId/products', userController.viewOfferedCategoriesProducts);
user_route.get('/errorload', userController.errorload)
user_route.get('/product-list', userController.viewProductList);
user_route.get('/product/:productId', userController.viewProduct);


user_route.get('/profile', auth.isLogin, userController.viewProfile);
user_route.get('/editProfileImage', userController.viewEditProfileImage);

user_route.post('/updateProfileImage', upload.single('image'), userController.updateProfileImage);
user_route.post('/updateProfile', userController.updateProfile);


user_route.get('/address', auth.isLogin, addressController.loadAddress);

user_route.get('/add-Address', auth.isLogin, addressController.loadaddAddress);
user_route.post('/add-Address', addressController.addAddress);

user_route.get('/update-address/:addressId', auth.isLogin, addressController.loadEditAddress);
user_route.post('/update-address/:addressId', auth.isLogin, addressController.updateAddress);
user_route.get('/delete-address/:addressId', auth.isLogin, addressController.deleteAddress);


user_route.get('/change-password', auth.isLogin, userController.loadchangepassword);
user_route.post('/changepass', auth.isLogin, userController.changepassword);


//cart router
user_route.get('/cartList', auth.isLogin, userController.loadCartList);
user_route.get('/add-to-cart/:productId', userController.addtoCart);
user_route.get('/deleteCartItem/:userId/:productId', userController.deleteCart);
user_route.post('/updateCartItemQuantity/:productId',userController.updateQuantity)
//user_route.get('/search', userController.search);


//checkout-address router
user_route.get('/chooseAddress', auth.isLogin, addressController.chooseAddress);
user_route.post('/SelectedAddress', auth.isLogin, addressController.SelectedAddress);
user_route.get('/choose-addAddress', auth.isLogin, addressController.chooseaddAddress);
user_route.post('/addnewaddress', auth.isLogin, addressController.addnewAddress);
user_route.get('/edit-address/:addressId', auth.isLogin, addressController.loadAddressEdit);
user_route.post('/edit-address/:addressId', auth.isLogin, addressController.editAddress);
user_route.get('/delete-chooseaddress/:addressId', auth.isLogin, addressController.deletechooseAddress);


//checkout

user_route.get('/checkout', auth.isLogin, userController.loadcheckout);
user_route.get('/ordersucess', auth.isLogin, userController.orderSucess);
user_route.post('/place-order', auth.isLogin, userController.placeorder);

//orderManagement
user_route.get('/order-history', auth.isLogin, userController.loadorderHistory);
user_route.post('/cancel-order/:orderId', auth.isLogin, userController.orderCancel);
user_route.get('/reasonpage/:orderId', auth.isLogin, userController.reasonpage);

user_route.get('/view-order/:orderId', userController.viewOrder);
user_route.post('/orders/:orderId/return', userController.requestReturn);


// wishlist
user_route.get('/wishlist', auth.isLogin, userController.whitelist);
user_route.get('/addwhitelist/:productId', auth.isLogin, userController.addwhitelist);
user_route.get('/wishlist/:productId', userController.deletewishlist);

user_route.get('/wallet',auth.isLogin,userController.wallet);

user_route.get('/razorpayPage',userController.razorpayPage)
user_route.post('/capture-payment',userController.capturePayment)

user_route.post('/razorpay-callback', userController.handleRazorpayCallback);



//coupon management
user_route.get('/loadcoupon',auth.isLogin,couponController.loadCoupon);










module.exports = user_route;