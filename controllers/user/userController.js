const User = require('../../models/userModel');
const Category=require('../../models/categoryModel')
const Product=require('../../models/productModel');
const bcrypt = require('bcrypt');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');

const uuid = require('uuid');
const { v4: uuidv4 } = require('uuid');

const nodemailer=require('nodemailer');

const randomstring=require('randomstring');
const securePassword = async(password)=>{
    try{

        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;

    }catch(error){
        console.log(error.message);
    }
}


// send mail
const verifyMail=async(name,email,otp)=>{
    try {
      
        
          
      const transporter=  nodemailer.createTransport({
            host:'smtp.gmail.com',
            port:587,
            secure: false,
            requireTLS:true,
            auth:{
                user:'murshidatv@gmail.com',
                pass:'jvnf zmkk gkru btna'
            }
    
        });
    
    const mailOption={
        from:'murshidatv@gmail.com',
        to:email,
        subject:'otp verification ',
        html:`<p>Hi ${name},your OTP is ${otp}.Please use this to verify your email.<p>`
        
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




const loadRegister = async(req,res)=>{
    try{
        res.render('registration');

    }catch(error){
        console.log(error.message);
    }
}


  
   const insertUser = async(req,res) =>{
    try{
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
            name:req.body.name,
            email:req.body.email,
            mobile:req.body.mobile,
            image:req.file.filename,
            password:secPassword,
            is_admin:0
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
            res.render('registration',{message:"Your registration has been successfull..."});
            console.log("data save...")
        }
        else{
            res.render('registration',{message:"Your registration has been failed"});
        }
    }catch(error){
        console.log(error.message);
    }
}

/*
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


*/
const verify = async (userId, enteredOTP) => {
  try {
      const userData = await User.findById(userId);
      
      if (!userData) {
          throw new Error('User not found');
      }

      const currentTime = Math.floor(new Date().getTime() / 1000);
      const otpExpiryTime = userData.otp_expiry_time || 0;

      if (otpExpiryTime > 0 && currentTime > otpExpiryTime) {
          userData.otp = '';
          userData.otp_expiry_time = 0;
          await userData.save();
          return { success: false, message: 'OTP has expired. Please request a new one', expired: true };
      }

      if (userData.otp === enteredOTP) {
          userData.is_verified = true;
          userData.otp_expiry_time = 0;
          await userData.save();
          return { success: true, message: 'Email verified successfully' };
      } else {
          return { success: false, message: 'Incorrect OTP. Please try again.' };
      }
  } catch (error) {
      console.error(error.message);
      return { success: false, message: 'Internal Server Error' };
  }
};



  const resendOTP = async (req, res) => {
    try {
        console.log('Resend OTP ');
    //   const userId = req.params.userId;
    const userDataId = mongoose.Types.ObjectId.createFromHexString(req.params.userDataId);
  
  
  
      console.log('User ID',userDataId);
      // Retrieve user
      const userData = await User.findById(userDataId);
    
     console.log('userData',userData);
      if (userData) {
        // Generate and store new OTP
        const newOTP = randomstring.generate({
          length: 6,
          charset: 'numeric',
        });
  
        userData.otp = newOTP;
        userData.otp_expiry_time=Math.floor(new Date().getTime()/1000)+300;
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

const loginUser = async(req,res)=>{
    try{
        res.render('login');
    }catch (error){
        console.log(error.message);
    }
}

/*
const verifyLogin = async(req,res) =>{
    try {
        
        const email = req.body.email;
        const password = req.body.password;

        const userData = await User.findOne({email:email});

        if (userData) {
            const passwordMatch = await bcrypt.compare(password,userData.password);

            if (passwordMatch && userData.is_admin === 0) {
                 if (userData.is_verified === 0) {
                    console.log('Please verify your mail');
                 } else {
                    req.session.user_id = userData._id;
                    res.redirect('/home');
                 }
            } else {
                res.render('login',{message:'Incorrect Username and Password'});
            }
        } else {
            res.render('login',{message:'Invalid Username'});
        }
    } catch (error) {
        console.log(error.message);
    }
}
*/
//login user and redirect to home
/*
const verifyLogin = async (req, res) => {
    try {
      const { email, password } = req.body;
  
      if (!email || !password) {
        return res.render('login', { message: "Email and password are required" });
      }
  
      const userData = await User.findOne({ email });
  
      if (!userData) {
        return res.render('login', { message: "Incorrect email or password..." });
      }
  
      const passwordMatch = await bcrypt.compare(password, userData.password);
      
      if (!passwordMatch) {
        return res.render('login', { message: "Incorrect email or password" });
      }
  
      if (!userData.is_verified) {
        return res.render('login', { message: "Incorrect email or password" });
      }
  
      if (userData.isBlocked) {
        return res.render('login', { message: "User account is blocked, choose another account" });
      }
      req.session.user_id = userData._id;
      res.redirect('/home');
     // req.session.user_id = userLogin._id;
     // res.redirect('/home');
    } catch (error) {
      console.log(error.message);
      // Handle other error conditions or uncomment the line below to send a generic error response.
      // res.status(500).send('Internal Server Error');
    }
  };



*/
const verifyLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.render('login', { message: "Email and password are required" });
    }

    const userLogin = await User.findOne({ email });
    console.log(userLogin);
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
const homePage = async (req, res) => {
    try {
        const isLoggedIn = req.session.user_id ? true : false;
         res.render('home', { isLoggedIn});     
        
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');
    }
  };
  
  



  const userLogout=async(req,res)=>{
      try{
          req.session.destroy();
          res.redirect('/');
        
      }catch(error){
          console.log(error.message);
      }
  
  }
  



// render login
const login = async(req,res)=>{
    try{
        res.render('login')
    }catch(error){
        console.log(error.message);
    }

}

  




// Controller function to list all products with IDs
const listProducts = async (req, res) => {
    try {
        // Retrieve all products from the database
        const products = await Product.find();

        // Extract relevant data (e.g., ID and other fields) from the products
        const productList = products.map(product => ({
            id: product._id,
            name: product.name,
            // Include other fields as needed
        }));

        // Send the list of products as a response
        res.json({ products: productList });
    } catch (error) {
        console.error('Error listing products:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};



/*
 
  const viewProfile = async (req, res) => {
    try {
      const user = await User.findById(req.session.user_id);
      res.render('profile', { user });
    } catch (error) {
      console.error(error.message);
      res.status(500).send('Internal Server Error');
    }
  };
  
  
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
        .sort({ price: sortOption === 'asc' ? 1 : -1 })
        .skip((page - 1) * perPage)
        .limit(perPage);
  
   
  
      res.render('productList', { 
        products, 
        categories, 
        selectedCategory, 
        sortDropdownValue: sortOption, 
        searchQuery,
        currentPage: page,
       
      });
      
    } catch (error) {
      // Log the error to the console
      console.error('Error occurred while processing request:', error);
      // Render the error page with an error message
      res.status(500).render('error', { errorMessage: 'An error occurred while processing your request. Please try again later.' });
    }
  };
 */
  
  const errorload=async(req,res)=>{
    try {
      res.status(500).render('error', { errorMessage: 'An error occurred.' });
  
    } catch (error) {
      
    }
  }
  
  
  
  
  
  

module.exports = {
    loadRegister,
    insertUser,
    loginUser,
    verifyLogin,
    homePage,
    userLogout,
    emailVerified,
    resendOTP,
    //viewProduct,
    listProducts,
   // viewProductList,
   // viewProfile,
    
    
}