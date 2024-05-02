const express = require("express");
const user_route = express();
const path = require('path');
const addressController=require('../controllers/user/address');
const session = require("express-session");
const config = require("../config/config");


user_route.use(session({
    secret: config.sessionSecret,
    resave: false,  // Set to false to avoid deprecated warning
    saveUninitialized: false  // Set to false to avoid deprecated warning
}));


//user_route.use(session({secret:config.sessionSecret}));
const auth = require("../middleware/auth");

user_route.set('view engine','ejs');
user_route.set('views','./views/users');

const bodyParser = require('body-parser');
user_route.use(bodyParser.json());
user_route.use(bodyParser.urlencoded({extended:true}))

const multer = require("multer");

const storage = multer.diskStorage({
    destination:function(req,file,cb){
    cb(null,path.join(__dirname,'../public/userImages'));
    },
    filename:function(req,file,cb){
        const name = Date.now()+'-'+file.originalname;
        cb(null,name);
    }
    })
const upload = multer({storage:storage});

const userController = require("../controllers/user/userController");

user_route.get('/register',auth.isLogout,userController.loadRegister);

user_route.post('/register',upload.single('image'),userController.insertUser);

user_route.post('/verify/:userId', userController.verifyLogin);

user_route.post('/login', userController.verifyLogin);


//user_route.get('/',auth.isLogout,userController.loginUser);

user_route.post('/login', userController.verifyLogin);
user_route.get("/", auth.isLogout,userController.homePage);
//user_route.get('/',auth.isLogout,userController.loadHome);
user_route.get('/login',auth.isLogout,userController.loginUser);
user_route.post('/login',userController.verifyLogin);


user_route.get('/home',auth.isLogin,userController.homePage);



user_route.get('/email-verified', userController.emailVerified);
user_route.post('/resend-otp/:userDataId',userController.resendOTP);
user_route.get('/logout',auth.isLogin,userController.userLogout)


user_route.get('/view-offered-categories', userController.viewOfferedCategories);
user_route.get('/category/:categoryId/products', userController.viewOfferedCategoriesProducts);
user_route.get('/errorload',userController.errorload)
user_route.get('/product-list',userController.viewProductList);
user_route.get('/product/:productId',userController.viewProduct);


user_route.get('/profile',auth.isLogin,userController.viewProfile);
user_route.get('/editProfileImage', userController.viewEditProfileImage);

user_route.post('/updateProfileImage', upload.single('image'), userController.updateProfileImage);
user_route.post('/updateProfile',userController.updateProfile);


user_route.get('/address',auth.isLogin,addressController.loadAddress);

user_route.get('/add-Address',auth.isLogin,addressController.loadaddAddress);
user_route.post('/add-Address',addressController.addAddress);

user_route.get('/update-address/:addressId',auth.isLogin,addressController.loadEditAddress);
user_route.post('/update-address/:addressId',auth.isLogin,addressController.updateAddress);
user_route.get('/delete-address/:addressId',auth.isLogin,addressController.deleteAddress);


user_route.get ('/change-password',auth.isLogin,userController.loadchangepassword);
user_route.post('/changepass',auth.isLogin,userController.changepassword);


//cart router
user_route.get('/cartList',auth.isLogin,userController.loadCartList);
user_route.get('/add-to-cart/:productId',userController.addtoCart);
user_route.get('/deleteCartItem/:userId/:productId',userController.deleteCart);
//user_route.post('/updateCartItemQuantity/:productId',userController.updateQuantity)
//user_route.get('/search', userController.search);


//checkout-address router
user_route.get('/chooseAddress',auth.isLogin,addressController.chooseAddress);
user_route.post('/SelectedAddress',auth.isLogin,addressController.SelectedAddress);
user_route.get('/choose-addAddress',auth.isLogin,addressController.chooseaddAddress);
user_route.post('/addnewaddress',auth.isLogin,addressController.addnewAddress);
user_route.get('/edit-address/:addressId',auth.isLogin,addressController.loadAddressEdit);
user_route.post('/edit-address/:addressId',auth.isLogin,addressController.editAddress);
user_route.get('/delete-chooseaddress/:addressId',auth.isLogin,addressController.deletechooseAddress);


//checkout

user_route.get('/checkout',auth.isLogin,userController.loadcheckout);
user_route.get('/ordersucess',auth.isLogin,userController.orderSucess);
user_route.post('/place-order',auth.isLogin,userController.placeorder);

//orderManagement
user_route.get('/order-history', auth.isLogin, userController.loadorderHistory);
user_route.post('/cancel-order/:orderId', auth.isLogin, userController.orderCancel);
user_route.get('/reasonpage/:orderId', auth.isLogin, userController.reasonpage);
user_route.get('/view-order/:orderId', userController.viewOrder);

module.exports = user_route;