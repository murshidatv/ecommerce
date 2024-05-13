const User =require('../../models/userModel')
const bcrypt=require('bcrypt')
const Order = require('../../models/orderModel');
const Product = require('../../models/productModel');

exports.loadLogin=async(req,res)=>{
    try {
        res.render('adminlogin');
    } catch (error) {
        console.log(error.message);
    }
}
 
exports.verifylogin = async (req, res) => {
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
                  res.redirect('/admin/adminhome');
                 }
                  else{
                      res.render('adminlogin', { message: "Incorrect email or password" });

                  }
              } else {
                  res.render('adminlogin', { message: "Incorrect email or password" });
              }
          } else {
              res.render('adminlogin', { message: "Incorrect email or password..." });
          }
      } else {
          res.render('adminlogin',{ message: "Email and password are required" });
      }
  } catch (error) {
      console.log(error.message);
      // res.status(500).send('Internal Server Error');
  }
}


// exports.loadHome = async (req, res) => {
//     try {
//         // Fetch the necessary data
//         const totalUsers = await User.countDocuments();
//         const totalOrders = await Order.countDocuments();
//         const cancelledOrders = await Order.countDocuments({ status: 'Cancelled' });
//         const blockUser = await User.countDocuments({ isBlocked: true });
//         const pendingOrdersCount = await Order.countDocuments({ status: 'Pending' });
// console.log("totalUsers, totalOrders, cancelledOrders, blockUser, pendingOrdersCount",totalUsers, totalOrders, cancelledOrders, blockUser, pendingOrdersCount);
//         // Render the adminhome EJS template with the fetched data
//         res.render('adminhome', { totalUsers, totalOrders, cancelledOrders, blockUser, pendingOrdersCount });
//     } catch (error) {
//         console.log(error.message);
//         // Handle the error
//     }
// }






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
        const totalRevenue = await getTotalRevenue();

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
  

exports.listUser = async (req, res) => {
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
exports.blockUser = async (req, res) => {
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



exports.logout = (req, res) => {
    try {
        req.session.destroy();
        res.redirect('/admin');
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Internal Server Error');

    }
}