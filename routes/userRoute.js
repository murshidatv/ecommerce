const express = require("express");
const user_route = express();
const path = require('path');
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







user_route.get('/logout',auth.isLogin,userController.userLogout);



//user_route.get('/',auth.isLogout,userController.loginUser);

user_route.post('/login', userController.verifyLogin);
user_route.get("/", auth.isLogout,userController.homePage);
//user_route.get('/',auth.isLogout,userController.loadHome);
user_route.get('/login',auth.isLogout,userController.loginUser);
user_route.post('/login',userController.verifyLogin);


user_route.get('/home',auth.isLogin,userController.homePage);



user_route.get('/email-verified', userController.emailVerified);
user_route.post('/resend-otp/:userId',userController.resendOTP);


user_route.get('/single-product',auth.isLogin,userController.listProducts);
//user_route.get('/Product/:productId',userController.viewProductList);

//user_route.get('/profile',auth.isLogin,userController.viewProfile);





module.exports = user_route;