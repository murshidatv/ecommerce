const express = require("express");
const admin_route =express();
const  nocache = require("nocache")
const multerMiddleware =require('../middleware/multer').upload

const session = require("express-session");
const config = require("../config/config");
//admin_route.use(session({secret:config.sessionSecret}));

admin_route.use(session({
    secret: config.sessionSecret,
    resave: false,  // Set to false to avoid deprecated warning
    saveUninitialized: false  // Set to false to avoid deprecated warning
}));

admin_route.use(nocache());

const bodyParser = require("body-parser");
admin_route.use(bodyParser.json());
admin_route.use(bodyParser.urlencoded({extended:true}));

admin_route.set('view engine','ejs');
admin_route.set('views','./views/admin');


const auth = require("../middleware/adminAuth");


const adminController = require("../controllers/admin/adminController");
const categoryController=require('../controllers/admin/categoryController');
const orderController=require('../controllers/admin/orderController');

admin_route.get('/',auth.isLogout,adminController.loadlogin);

admin_route.post('/',adminController.verifyLogin);

//admin_route.get('/home',auth.isLogin,adminController.loadDashboard);
admin_route.get('/home',auth.isLogin,adminController.loadDashboard);
admin_route.get('/listuser',auth.isLogin,adminController.adminDashboard);



//user mangement
admin_route.get('/listUser',auth.isLogin,adminController.listUser);
admin_route.get('/listUser/block_user/:id',auth.isLogin,adminController.blockUser);


//category Management
admin_route.get('/category',auth.isLogin,categoryController.category);
admin_route.get('/add-category',auth.isLogin,categoryController.addCategory)
admin_route.post('/new-category',auth.isLogin,categoryController.newCategory);
admin_route.get('/load-edit/:categoryId',auth.isLogin,categoryController.LoadEdit);
admin_route.post('/edit-category/:categoryId',auth.isLogin,categoryController.ediCategory)
admin_route.post('/category/:categoryId/update-status', categoryController.updateCategoryStatus);


// product management
admin_route.get('/product',auth.isLogin,categoryController.product);
admin_route.get('/add-product',auth.isLogin,categoryController.loadProduct)
admin_route.post('/new-product',auth.isLogin, multerMiddleware.array('images', 3),categoryController.addProduct)
admin_route.get('/edit-product/:productId',auth.isLogin,categoryController.LoadEditProduct);
admin_route.post('/edit-product/:productId',auth.isLogin, multerMiddleware.array('images', 3),categoryController.editProduct);
//admin_route.get('/product/:productId',categoryController.deleteProduct);
admin_route.post('/product/:id/update-status', categoryController.updateProductStatus);

admin_route.get('/logout',auth.isLogin,adminController.logout);

//order management 

admin_route.get('/loadorder',auth.isLogin,categoryController.order);
admin_route.post('/update-status/:orderId', auth.isLogin, categoryController.updateStatus);
admin_route.post('/confirm-order-cancellation/:orderId',auth.isLogin, categoryController.confirmOrderCancellation);

admin_route.get('/canceled-orders',auth.isLogin, categoryController.viewCanceledOrders);
admin_route.get('/order-return',auth.isLogin,categoryController.viewReturnedOrders);



admin_route.get('*',function(req,res){

    res.redirect('/admin');

})


module.exports = admin_route;