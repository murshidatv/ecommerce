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





exports.getUserDetailsAndOrders  = async () => {
    try {
        // Aggregate user logins by month with month names
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        const monthlyLogins = await User.aggregate([
            {
                $group: {
                    _id: { $month: "$createdAt" },
                    count: { $sum: 1 }
                }
            },
            {
                $addFields: {
                    monthName: { $arrayElemAt: [monthNames, { $subtract: ["$_id", 1] }] }
                }
            },
            { $sort: { "_id": 1 } }
        ]);
        
        // Generate data for all months, filling in missing months with count 0
        const allMonths = Array.from({ length: 12 }, (_, index) => {
            const month = index + 1;
            const monthName = new Date(2000, month - 1, 1).toLocaleString('en-US', { month: 'long' });
            return { _id: month, monthName, count: 0 };
        });

        // Merge the aggregated data with the generated data to ensure all months are represented
        const mergedData = allMonths.map(month => {
            const match = monthlyLogins.find(entry => entry._id === month._id);
            return match || month;
        });

        // Fetch most selling product details
        const mostSellingProduct = await Order.aggregate([
            { $unwind: "$products" },
            {
                $group: {
                    _id: "$products.product",
                    totalQuantitySold: { $sum: "$products.quantity" }
                }
            },
            { $sort: { totalQuantitySold: -1 } },
            { $limit: 1 }
        ]);

        const mostSellingProductDetails = await Product.findById(mostSellingProduct[0]._id);

        // Fetch delivered orders
        const deliveredOrders = await Order.find({ status: 'delivered' })
            .populate('userId', 'name') // Populate user details
            .populate('products.product', 'productName quantity price'); // Populate product details

        // Count total pending orders
        const pendingOrdersCount = await Order.countDocuments({ status: 'Pending' });
        const returnOrderCount = await Order.countDocuments({ status: 'Returned' });
        const onlinePayment = await Order.countDocuments({ payment: 'onlinePayment' });

        // Count total users, total orders, total cancelled orders, total products, and total revenue
        const totalUsers = await User.countDocuments();
        const totalOrders = await Order.countDocuments();
        const cancelledOrders = await Order.countDocuments({ status: 'Cancelled' });
        const totalProduct = await Product.countDocuments();
        

        // Return the fetched data
        return {
            totalUsers,
            totalOrders,
            cancelledOrders,
            totalProduct,
            totalRevenue,
            mergedData,
            deliveredOrders,
            mostSellingProduct: mostSellingProductDetails,
            returnOrderCount,
            onlinePayment,
            pendingOrdersCount,
        };
        console.log("totalUsers, totalOrders, cancelledOrders, blockUser, pendingOrdersCount",totalUsers, totalOrders, cancelledOrders, blockUser, pendingOrdersCount);
    } catch (error) {
        console.error('Error fetching user details and orders:', error.message);
        throw error; // Rethrow the error to be caught by the calling function
    }
};

const getTotalRevenue = async () => {
    try {
      const orders = await Order.find({
        $or: [
          { payment: 'onlinePayment' }, // Only consider orders with online payment
          { $and: [ 
            { payment: 'COD' },
            { status: 'Delivered' },
            { returned: { $ne: true } },
            { 'cancellation.isCancelled': { $ne: true } }
          ]}
        ]
      });
  
      // Calculate total revenue
      let totalRevenue = 0;
      orders.forEach(order => {
        totalRevenue += order.totalAmount;
      });
  
      return totalRevenue;
    } catch (error) {
      console.error('Error calculating total revenue:', error);
      return null;
    }
  };




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
    logout,
    getTotalRevenue,
    adminDashboard,
    loadDashboard,
    /*newUserLoad,
    addUser,
    editUserLoad,
    updateUsers,
    deleteUser,
    */
    listUser,
    blockUser
}