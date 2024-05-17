const User = require('../../models/userModel');
const Order = require('../../models/orderModel');
const Product=require('../../models/productModel')
const PDFDocument = require('pdfkit');
const table = require('pdfkit-table');
const ejs = require('ejs');
const fs = require('fs');
const util = require('util');
const pdf = require('html-pdf');
const ExcelJS = require('exceljs');

const puppeteer = require('puppeteer');
const { order } = require('./orderController');
const { getUserDetailsAndOrders } =require('../../controllers/admin/adminController')

const { getTotalRevenue } =require('./adminController')

const getDashboardData = async (req, res) => {
  try {
      // Fetch total users count
      const totalUsers = await User.countDocuments();
      console.log("Total Users Count:",totalUsers );
      // Fetch total orders count
      const totalOrders = await Order.countDocuments();
      console.log("Total orderrs Count:",totalOrders)
      const cancelledOrders = await Order.countDocuments({ status: 'Cancelled' });
      console.log("Total Cancelled Orders Count:",cancelledOrders)
      const totalproduct= await Product.countDocuments();
      console.log("Total products Count:",totalproduct)
      const totalRevenue = await getTotalRevenue();
      console.log("Total Revenue:",totalRevenue)
      const blockUser = await User.countDocuments({ isBlocked: true });
      console.log("Total blocked Users Count:",blockUser)
      res.render('report', { totalUsers, totalOrders, cancelledOrders,blockUser,totalproduct,totalRevenue});
  } catch (error) {
      console.error('Error fetching dashboard data:', error.message);
      res.status(500).send('Internal Server Error');
  }
};


module.exports ={
  getDashboardData,

}