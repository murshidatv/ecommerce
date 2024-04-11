const User = require("../../models/userModel");
const bcrypt = require('bcrypt');
const randomstring = require('randomstring');
const securePassword = require('secure-password');
const Product = require('../../models/productModel');
const Add_User = require("../../models/adminModel");
 




const loadlogin = async(req,res)=>{
    try{

        res.render('login');
    }catch(error){
        console.log(error.meassage);
    }

}

const verifyLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (email && password) {
            const userLogin = await User.findOne({ email: email });
            if (userLogin) {
                const passwordMatch = await bcrypt.compare(password, userLogin.password);
                if (passwordMatch) {
                   if(userLogin.is_admin === 1)
                   {
                    req.session.user_id=userLogin._id;
                    res.redirect('/admin/home');
                   }
                    else{
                        res.render('login', { message: "Incorrect email or password" });
  
                    }
                } else {
                    res.render('login', { message: "Incorrect email or password" });
                }
            } else {
                res.render('login', { message: "Incorrect email or password..." });
            }
        } else {
            res.render('login',{ message: "Email and password are required" });
        }
    } catch (error) {
        console.log(error.message);
        // res.status(500).send('Internal Server Error');
    }
  }
  
  /*
const verifyLogin = async(req,res)=>{
    try{

        const email = req.body.email;
        const password = req.body.password;

        const userData = await User.findOne({email:email});
        if(userData){

            const passwordMatch = await bcrypt.compare(password,userData.password);
            if(passwordMatch){
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
*/
const loadDashboard = async(req,res)=>{


try{
    const userData = await User.findById({_id:req.session.user_id});
    res.render('home',{admin:userData});

}catch(error){
    console.log(error.message);
}
}





const logout = async(req,res)=>{
    try{
        req.session.destroy();
        res.redirect('/admin');

    }catch(error){
        console.log(error.message);
    }
}






const adminDashboard = async(req,res)=>{
    try{

        const usersData = await User.find({is_admin:0});
        res.render('userlist',{users:usersData});

       
        /*const adminData = await Add_User.find();
        res.render('dashboard',{users:adminData});
*/

    }catch(error){
        console.log(error.message);
    }
   
}

/*Add New User

const newUserLoad = async(req,res)=>{
    try{
        res.render('new-user');
    
    }catch(error){
        console.log(error.message);
    }
}

const addUser = async (req, res) => {
    try {
        const name = req.body.name;
        const email = req.body.email;
        const mobile = req.body.mobile;

        //*Ensure that the required fields are present
        if (!name || !email || !mobile) {
            return res.status(400).render('new-user', { message: 'Name, email, and mobile are required.' });
        }

        const user = new Add_User({
            name: name,
            email: email,
            mobile: mobile,
            is_admin: 0
        });

        const userData = await user.save();
        //console.log('User added:', userData);
        
        if (userData) {
            res.redirect('/admin/dashboard');
        } else {
            res.render('new-user', { message: 'Something went wrong.' });
        }

    } catch (error) {
        console.log(error.message);
    }
    
}

//edit user

const editUserLoad = async(req,res)=>{
    try{
        const id = req.query.id;
         const userData = await Add_User.findById({_id:id})
        if(userData){
            res.render('edit-user',{ user:userData });

        }
        else{
            res.redirect('/admin/dashboard');
        }
       // res.render('edit-user');

    }catch(error){
        console.log(error.message);
        res.redirect('/admin/dashboard');
    }


}

const updateUsers = async(req,res)=>{
    try{
        const userData = await Add_User.findByIdAndUpdate({_id:req.body.id},{$set:{ name:req.body.name, email:req.body.email, mobile:req.body.mno}});
        res.redirect('/admin/dashboard');
    
    }catch(error){

    }
}

//delete users
const deleteUser = async(req,res)=>{
    try{
       // console.log(123,req.query);
        const id = req.query.id;
        await Add_User.deleteOne({ _id:id});
        res.redirect('/admin/dashboard');
    

    }catch(error){
        console.log(error.message);
    }
}
*/
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
        const id = req.params.id;
        const user = await User.findById({ _id: id });

        if (user.isBlocked === false) {
            await User.findByIdAndUpdate(id, { $set: { isBlocked: true } });
        } else {
            await User.findByIdAndUpdate(id, { $set: { isBlocked: false } });
        }

        
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