const User = require("../../models/userModel");
const bcrypt = require('bcrypt');
const randomstring = require('randomstring');
const securePassword = require('secure-password');
const Product = require('../../models/productModel');
const Add_User = require("../../models/adminModel");
 

const loadlogin = async(req,res)=>{
    try{
    // Render the login page
        res.render('login');
    }catch(error){
        console.log(error.meassage);
    }

}
const verifyLogin = async(req,res)=>{
    try{
        // Retrieve email and password from request body
        const email = req.body.email;
        const password = req.body.password;
        // Find user by email
        const userData = await User.findOne({email:email});
        if(userData){
        // Compare passwords
            const passwordMatch = await bcrypt.compare(password,userData.password);
            if(passwordMatch){
                // If user is an admin, set session and redirect to admin home
                if(userData.is_admin === 0){
                    res.render('login',{message:"Email or password is incorrect."});
                    
                }
                else{
                    req.session.user_id = userData._id;
                    res.redirect("/admin/home");
                }
            }
            else{
                res.render('login',{message:"Email or password is incorrect."});
            }

        }
        else{
            res.render('login',{message:"Email or password is incorrect."});
        }

    }catch(error){
        console.log(error.message);

    }
}

const loadDashboard = async(req,res)=>{
try{
    // Load user data and render the home page
    const userData = await User.findById({_id:req.session.user_id});
    res.render('home',{admin:userData});

}catch(error){
    console.log(error.message);
}
}


const logout = async(req,res)=>{
    try{
        // Destroy session and redirect to admin login page
        req.session.destroy();
        res.redirect('/admin');

    }catch(error){
        console.log(error.message);
    }
}






const adminDashboard = async(req,res)=>{
    try{
        // Retrieve regular users and render the user list page
        const usersData = await User.find({is_admin:0});
        res.render('userlist',{users:usersData});
  
        /*const adminData = await Add_User.find();
        res.render('dashboard',{users:adminData});*/

    }catch(error){
        console.log(error.message);
    }
   
}

const listUser = async (req, res) => {
    try {
        // Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const skipIndex = (page - 1) * limit;

        // Filtering
        const filter = {};
       

        // Search
        const searchQuery = req.query.search;
        if (searchQuery) {
            filter.$or = [
                { name: { $regex: searchQuery, $options: 'i' } },
                { email: { $regex: searchQuery, $options: 'i' } }
            ];
        }

        // Fetch users based on pagination, filtering, and search
        const userData = await User.find(filter)
            .skip(skipIndex)
            .limit(limit);

        // Count total number of users (for pagination)
        const totalCount = await User.countDocuments(filter);
        // Render user list page with pagination
        res.render('userlist', {
            user: userData,
            totalCount,
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit)
        });
    } catch (error) {
        console.log(error.message);
    }
};
const blockUser = async (req, res) => {
    try {
        // Retrieve user ID
        const id = req.params.id;
        // Find user by ID
        const user = await User.findById({ _id: id });
        // Toggle user's "isBlocked" status
        if (user.isBlocked === false) {
            await User.findByIdAndUpdate(id, { $set: { isBlocked: true } });
        } else {
            await User.findByIdAndUpdate(id, { $set: { isBlocked: false } });
        }

        // Redirect to user list page
        res.redirect('/admin/listUser');
    } catch (error) {
        console.log(error.message);
    }
};



module.exports = {
    loadlogin,
    verifyLogin,
    loadDashboard,
    logout,
    adminDashboard,
   /* newUserLoad,
    addUser,
    editUserLoad,
    updateUsers,
    deleteUser,*/
    listUser,
    blockUser
}