const Category =require('../../models/categoryModel');
const Product=require('../../models/productModel');
const Order=require('../../models/orderModel');
const User=require('../../models/userModel');

exports.order = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const searchQuery = req.query.search || '';
    const filterStatus = req.query.status || '';
    const statuses = ['Pending', 'processing', 'Shipped', 'Delivered', 'Cancelled'];

    let query = {};
    if (searchQuery) {
      // Search for users by name
      const users = await User.find({ name: { $regex: new RegExp(searchQuery, 'i') } });
      const userIds = users.map(user => user._id);
      query.userId = { $in: userIds };
    }
    if (filterStatus) {
      query.status = filterStatus;
    }

    const order = await Order.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({
        path: 'products.product',
        select: 'productName Price',
      })
      .populate('userId');

    const totalOrders = await Order.countDocuments(query);

    // Pass newStatus as null to prevent ReferenceError
    res.render('ordermanagement', {
      order,
      currentPage: page,
      totalPages: Math.ceil(totalOrders / limit),
      searchQuery,
      filterStatus,
      newStatus: null,
      limit,
      statuses
    });
    console.log(order)
  } catch (error) {
    console.error('Error fetching orders:', error.message);
    res.status(500).send('Internal Server Error');
  }
};


