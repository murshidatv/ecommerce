const User = require("../../models/userModel");
const Order = require('../../models/orderModel');
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
          // Check if email or password is blank
          if (!email || !password) {
            return res.render('login', { message: "Email and password are required." });
        }
        // Find user by email
        const userData = await User.findOne({email:email});
        if(userData){
        // Compare passwords
            const passwordMatch = await bcrypt.compare(password,userData.password);
            if(passwordMatch){
                // If user is an admin, set session and redirect to admin home
                if(userData.is_admin === 0){
                   // res.render('login',{message:"Email or password is incorrect."});
                   // Render the login page without any message
                return res.render('login');
                    
                }
                else{
                    req.session.user_id = userData._id;
                    res.redirect("/admin/home");
                }
            }
            else{
                res.render('login',{message:"Email or password is incorrect."});
                // Render the login page without any message
               // return res.render('login');
            }

        }
        else{
            res.render('login',{message:"Email or password is incorrect."});
            // Render the login page without any message
           // return res.render('login');
        }

    }catch(error){
        console.log(error.message);

    }
}

const loadDashboard = async(req,res)=>{
try{
    // Load user data and render the home page
    const userData = await User.findById({_id:req.session.user_id});
    res.render('dashboard',{admin:userData});

}catch(error){
    console.log(error.message);
}
}





const getUserDetailsAndOrders  = async () => {
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


//--------------------------------------------------------------------------------------------------------------

const dashBoardDetails = async ( req, res ) => {
    const topProducts = await getTopProductsSale();
    const topCategoryies = await getTopCategoryies();
    const totalUsers = await usersCount();
    const totalOrders = await orderCount();
    const totalRevenue = await getRevenueAmount();
    // const topBrands = await topSaledBrands();
    const totalProducts = await Product.find({}).countDocuments();
    return res.status(200).json({ topProducts, topCategoryies, totalUsers, totalOrders, totalRevenue, totalProducts });
  }
  const customDetails = async ( req, res ) => {
    let { fromDate, toDate, filterType } = req.query;
    try{
        if(filterType === 'custom') {
            if(new Date(fromDate) >= new Date(toDate)) return res.status(200).json({ error: 'from Date should be before the to Date'});
            if(!fromDate || !toDate) return res.status(404).json({ error: 'Change the filter or choose the Date'});
        }else if(filterType === 'daily'){
            toDate = new Date();
            fromDate = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate() - 1);
        }else if(filterType === 'weekly'){
            toDate = new Date();
            fromDate = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate() - 7);
        }else if(filterType ==='monthly'){
            toDate = new Date();
            fromDate = new Date(toDate.getFullYear(), toDate.getMonth() - 1, toDate.getDate());
        }else if( filterType === 'yearly') {
            toDate = new Date();
            fromDate = new Date(toDate.getFullYear() -1 , toDate.getMonth(), toDate.getDate());
        }else {
            return res.status(400).json({ message: 'wrong filter type'});
        }
        const topProducts = await getTopProductsSale(fromDate, toDate);
        const topCategoryies = await getTopCategoryies(fromDate, toDate);
        const totalUsers = await usersCount(fromDate, toDate);
        const totalOrders = await orderCount(fromDate, toDate);
        const totalRevenue = await getRevenueAmount(fromDate, toDate);
        // const topBrands = await topSaledBrands(fromDate, toDate);
        const totalProducts = await Product.find({}).countDocuments();
        return res.status(200).json({ topProducts, topCategoryies, totalUsers, totalOrders, totalRevenue, totalProducts, topBrands });
    }catch(err){
        console.log(`Error inside customDetails : \n${err}`);
    }
  }
  async function usersCount(fromDate, toDate) {
    let noOfUsers;
    if(fromDate && toDate){
        noOfUsers = await User.find({ created_at: { $gte: new Date(fromDate), $lte: new Date(toDate) }}).countDocuments();
    }else {
        noOfUsers = await User.find({}).countDocuments();
    }
    return noOfUsers;
  }
  
  async function orderCount(fromDate, toDate) {
    let noOfOrders;
    if(fromDate && toDate){
        noOfOrders = await Order.find({ deliveredAt: { $gte: new Date(fromDate), $lte: new Date(toDate) }}).countDocuments();
    }else {
        noOfOrders = await Order.find({}).countDocuments();
    }
    return noOfOrders;
  }
  
  
  const getRevenueAmount = async (fromDate, toDate) => {
    try {
      let matchStage = {
        $or: [
          { payment: 'onlinePayment' },
          {
            payment: 'COD',
            status: 'Delivered',
            returned: { $ne: true },
            'cancellation.isCancelled': { $ne: true }
          }
        ]
      };
  
      if (fromDate && toDate) {
        matchStage.deliveredAt = {
          $gte: new Date(fromDate),
          $lte: new Date(toDate)
        };
      }
  
      const orders = await Order.find(matchStage);
  
      // Calculate total revenue
      let totalRevenue = orders.reduce((acc, order) => acc + order.totalAmount, 0);
  
      return totalRevenue;
    } catch (error) {
      console.error('Error calculating total revenue:', error);
      return null;
    }
  };
  
  
  
  
  const getTopProductsSale = async (fromDate, toDate) => {
      try {
          let pipeline = [];
  
          if (fromDate && toDate) {
              pipeline = [
                  {
                      $match: {
                          deliveredAt: {
                              $gte: new Date(fromDate),
                              $lte: new Date(toDate)
                          }
                      }
                  }
              ];
          }
  
          pipeline.push(
              {
                  $unwind: '$products'
              },
              {
                  $group: {
                      _id: '$products.product', // Corrected field reference
                      count: { $sum: '$products.quantity' } // Consider the quantity of each product
                  }
              },
              {
                  $lookup: {
                      from: 'products',
                      localField: '_id',
                      foreignField: '_id',
                      as: 'productInfo'
                  }
              },
              {
                  $project: {
                      _id: 1,
                      count: 1,
                      productName: { $arrayElemAt: ['$productInfo.productName', 0] } // Ensure correct field reference
                  }
              }
          );
  
          const productsSale = await Order.aggregate(pipeline);
          return productsSale;
      } catch (error) {
          console.error('Error getting top products sale:', error);
          throw error;
      }
  };
  
  
  
  const getTopCategoryies = async (fromDate, toDate) => {
    try {
      let pipeline = [];
  
      if (fromDate && toDate) {
        pipeline = [
          {
            $match: {
              orderDate: {
                $gte: new Date(fromDate),
                $lte: new Date(toDate)
              }
            }
          }
        ];
      }
  
      pipeline.push(
        {
          $unwind: '$products'
        },
        {
          $lookup: {
            from: 'products',
            localField: 'products.product',
            foreignField: '_id',
            as: 'productInfo'
          }
        },
        {
          $unwind: '$productInfo'
        },
        {
          $lookup: {
            from: 'categories',
            localField: 'productInfo.category',
            foreignField: '_id',
            as: 'categoryInfo'
          }
        },
        {
          $unwind: '$categoryInfo'
        },
        {
          $group: {
            _id: '$categoryInfo.categoryName',
            count: { $sum: '$products.quantity' } // Assuming each product has a 'quantity' field
          }
        },
        {
          $project: {
            categoryName: '$_id',
            count: 1,
            _id: 0
          }
        }
      );
  
      const categoriesSale = await Order.aggregate(pipeline);
      return categoriesSale;
    } catch (error) {
      console.error('Error getting top categories sale:', error);
      throw error;
    }
  }
  
  
  
  async function getNoOfPayments(fromDate, toDate) {
    try {
        const pipeline = [];
  
        // Match orders within the specified date range
        if (fromDate && toDate) {
            pipeline.push({
                $match: {
                    deliveredAt: {
                        $gte: new Date(fromDate),
                        $lte: new Date(toDate)
                    }
                }
            });
        }
  
        // Group by payment method
        pipeline.push({
            $group: {
                _id: "$paymentMethod",
                count: { $sum: 1 }
            }
        });
  
        const noOfPayment = await Order.aggregate(pipeline);
        return noOfPayment;
    } catch (err) {
        console.log(`Error on getNoOfPayments ${err}`);
        throw err; // Rethrow the error to be handled by the caller
    }
  }
  
  
  async function getProductStatus(fromDate, toDate) {
    try {
        const pipeline = [];
  
        // Match orders within the specified date range
        if (fromDate && toDate) {
            pipeline.push({
                $match: {
                    "products.deliveredAt": {
                        $gte: new Date(fromDate),
                        $lte: new Date(toDate)
                    }
                }
            });
        }
        
        // Unwind the products array to work with each product separately
        pipeline.push({ $unwind: "$products" });
  
        // Project fields and define status based on product fields
        pipeline.push({
            $project: {
                _id: "$products._id",
                productId: "$products.productId",
                orderStatus: "$products.orderStatus",
                returned: "$products.returned",
                orderValid: "$products.orderValid",
                status: {
                    $cond: {
                        if: { $eq: ["$products.orderStatus", true] },
                        then: "Delivered",
                        else: {
                            $cond: {
                                if: { $eq: ["$products.orderValid", true] },
                                then: "Arriving",
                                else: {
                                    $cond: {
                                        if: { $eq: ["$products.returned", true] },
                                        then: "Returned",
                                        else: "Cancelled"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
  
        // Group by status and count the number of products in each status group
        pipeline.push({
            $group: {
                _id: "$status",
                count: { $sum: 1 }
            }
        });
  
        const productStatus = await Order.aggregate(pipeline);
        return productStatus;
    } catch (err) {
        console.log(`Error on getProductStatus: ${err}`);
        throw err;
    }
  }
  
  
  // async function topSaledBrands(fromDate, toDate) {
  //   try {
  //     const pipeline = [];
  
  //     // Filter by date range (if provided)
  //     if (fromDate && toDate) {
  //       pipeline.push({
  //         $match: {
  //           deliveredAt: {
  //             $gte: new Date(fromDate),
  //             $lte: new Date(toDate),
  //           },
  //         },
  //       });
  //     }
  
  //     // Group by brand and count documents
  //     pipeline.push({
  //       $group: {
  //         _id: "$brand",
  //         count: { $sum: 1 },
  //       },
  //     });
  
  //     // Sort by count in descending order
  //     pipeline.push({
  //       $sort: {
  //         count: -1,
  //       },
  //     });
  
  //     const brands = await Product.aggregate(pipeline);
  //     return brands
  //   } catch (err) {
  //     console.log(`Error at topSaledBrands: ${err}`);
  //   }
  // }
  
  

module.exports = {
    loadlogin,
    verifyLogin,
    logout,
   
    adminDashboard,
    loadDashboard,
    /*newUserLoad,
    addUser,
    editUserLoad,
    updateUsers,
    deleteUser,
    */
    getTopProductsSale,
    getTopCategoryies,
     
    getUserDetailsAndOrders,
    getTotalRevenue,
    dashBoardDetails,
    customDetails,
    listUser,
    blockUser,
}
