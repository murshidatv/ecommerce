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
const moment = require('moment');

const puppeteer = require('puppeteer');
const { order } = require('./orderController');
const { getUserDetailsAndOrders } =require('./adminController')

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


    // Fetch most selling product
    const mostSellingProduct = await Order.aggregate([
      { $match: { status: 'delivered' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalQuantity: { $sum: '$items.quantity' }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 1 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' }
    ]);

    const mostSellingProductDetails = mostSellingProduct.length > 0 ? mostSellingProduct[0].product : null;

    res.render('report', { 
      totalUsers, 
      totalOrders, 
      cancelledOrders, 
      blockUser, 
      totalproduct, 
      totalRevenue, 
      mostSellingProduct: mostSellingProductDetails 
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error.message);
    res.status(500).send('Internal Server Error');
  }
};

    
const salesReport= async (req, res) => {
  try {
      const orders = await Order.find({ status: 'delivered' });
      res.json(orders);
  } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
  }
}
const downloadSalesReport=async (req, res) => {
  try {
      const pdf = await generatePDF();
      res.set({ 'Content-Type': 'application/pdf', 'Content-Length': pdf.length });
      res.send(pdf);
  } catch (error) {
      console.error(error);
      res.status(500).send('An error occurred while generating the PDF.');
  }
}


const getYearlyRevenue = async (req, res) => {
  try {
    // Fetch yearly revenue data
    const yearlyRevenue = await Order.aggregate([
      {
        $match: {
          status: 'delivered' 
        }
      },
      {
        $group: {
          _id: { $year: '$createdAt' }, // Group by year
          totalRevenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { _id: 1 } } // Sort by year
    ]);

    // Extract years and revenue data for chart rendering
    const years = yearlyRevenue.map(entry => entry._id);
    const revenueData = yearlyRevenue.map(entry => entry.totalRevenue);
console.log("years",years,"revenueData",revenueData);
    // Send the yearly revenue data as JSON
    res.json({ years, revenueData });
  } catch (error) {
    console.error('Error fetching yearly revenue:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};



const downloadSalesReports = async (req, res) => {
  try {
    // Get necessary data
    const { totalUsers, blockUser, mergedData, totalOrders, cancelledOrders, totalProduct, totalRevenue, deliveredOrders, mostSellingProduct, returnOrderCount, onlinePayment, pendingOrdersCount } = await getUserDetailsAndOrders();

    // Create a new PDF document
    const doc = new PDFDocument();

    // Set response headers for PDF download
    res.setHeader('Content-Disposition', 'attachment; filename="sales-report.pdf"');
    res.setHeader('Content-Type', 'application/pdf');

    // Pipe the PDF document to the response
    doc.pipe(res);

    // Add content to the PDF document
    doc.fontSize(20).font('Helvetica-Bold').text('Sales Report', { align: 'center' }).moveDown(0.5);

    // Add table for monthly logins
    doc.fontSize(16).text('Monthly Logins', { align: 'left' }).moveDown(0.5);
    const monthlyLoginsTable = {
      headers: ['Month', 'Number of Logins'],
      rows: mergedData.map(({ monthName, count }) => [monthName, count])
    };

    const tableTop = doc.y;
    const initialY = tableTop;
    const initialX = 50;
    const cellPadding = 10;

    // Calculate column widths based on the longest content in each column
    const columnWidths = monthlyLoginsTable.headers.map((header, i) => {
      const maxLength = Math.max(...monthlyLoginsTable.rows.map(row => row[i].toString().length));
      return doc.widthOfString(header) > maxLength * 8 ? doc.widthOfString(header) : maxLength * 8; // Adjust column width as needed
    });

    // Draw table headers
    monthlyLoginsTable.headers.forEach((header, i) => {
      doc.text(header, initialX + i * (columnWidths[i] + cellPadding), doc.y);
    });

    doc.moveDown();
    // Draw table rows
    monthlyLoginsTable.rows.forEach((row, i) => {
      row.forEach((cell, j) => {
        doc.text(cell.toString(), initialX + j * (columnWidths[j] + cellPadding), doc.y);
      });
      doc.moveDown();
    });

    // Add other details
    doc.text('User Details', { underline: true });
    doc.moveDown(); // Move down to leave space after the heading

    doc.text(`Total Users: ${totalUsers}`);
    doc.text(`Blocked Users: ${blockUser}`);
    doc.moveDown();
    doc.text('Order Details', { underline: true });
    doc.moveDown(); // Move down to leave space after the heading

    doc.text(`Total Orders: ${totalOrders}`);
    doc.text(`Cancelled Orders: ${cancelledOrders}`);
    doc.text(`Total ReturnOrderCount: ${returnOrderCount}`);
    doc.text(`Total PendingOrdersCount: ${pendingOrdersCount}`);

    
    doc.text(`Total Product: ${totalProduct}`);
    const deliveredOrdersCount = deliveredOrders.length;

    doc.text(`Total Delivered Orders: ${deliveredOrdersCount}`);
    doc.moveDown();

    doc.text('Total Revenue', { underline: true });
    doc.text(`Total Revenue: ${totalRevenue}`);

    doc.moveDown();
    doc.text('Most Selling Product', { underline: true });

if (mostSellingProduct) {
  const productDetails = `
    Product Name: ${mostSellingProduct.productName}
    Description: ${mostSellingProduct.description}
    Price: ${mostSellingProduct.price}
    Stock: ${mostSellingProduct.stock}
    Size: ${mostSellingProduct.size}
    Offer: ${mostSellingProduct.offer ? mostSellingProduct.offer.amount : 'No offer available'}
  `;
  doc.text(productDetails);
} else {
  doc.text('No most selling product found');
}
    // Add more details as needed...

    // Finalize the PDF document
    doc.end();
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('An error occurred');
  }
};
const downloadSalesReportsExcel = async (req, res) => {
  try {
    // Get other necessary data
    const { totalUsers, blockUser, mergedData, totalOrders, cancelledOrders, totalProduct, totalRevenue, deliveredOrders, mostSellingProduct, returnOrderCount, onlinePayment, pendingOrdersCount } = await getUserDetailsAndOrders();

    // Create a new workbook
    const workbook = new ExcelJS.Workbook();

    // Add a new worksheet to the workbook
    const worksheet = workbook.addWorksheet('Sales Report');

    // Add data to the worksheet
    worksheet.columns = [
      { header: 'Total Users', key: 'totalUsers' },
      { header: 'Blocked Users', key: 'blockUser' },
      { header: 'Total Orders', key: 'totalOrders' },
      { header: 'CancelledOrders ', key: 'cancelledOrders' },
      { header: 'TotalProduct ', key: 'totalProduct' },
      { header: 'TotalRevenue ', key: 'totalRevenue' },
      { header: 'DeliveredOrders ', key: 'deliveredOrders' },
      { header: 'onlinePayment ', key: 'onlinePayment' },
      { header: 'returnOrderCount ', key: 'returnOrderCount' },

      
    ];

    worksheet.addRow({ totalUsers, blockUser,onlinePayment,totalOrders,totalProduct ,totalRevenue,deliveredOrders,returnOrderCount});

    // Write the Excel file to a stream
    const stream = new require('stream').PassThrough();
    await workbook.xlsx.write(stream);

    // Set the headers for the download
    res.setHeader('Content-Disposition', 'attachment; filename="sales-report.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // Send the Excel file to the client
    stream.pipe(res);
  } catch (error) {
    console.error('Error generating Excel file:', error);
    res.status(500).send('An error occurred while generating the Excel file');
  }
};

const dashboardData = async (req, res) => {
  try {
      // Fetch the data for each period
      const weeklyData = await User.aggregate([
          { 
              $group: {
                  _id: { $week: "$createdAt" },
                  count: { $sum: 1 }
              }
          },
          { $sort: { "_id": 1 } }
      ]);

      const monthlyData = await User.aggregate([
          { 
              $group: {
                  _id: { $month: "$createdAt" },
                  count: { $sum: 1 }
              }
          },
          { $sort: { "_id": 1 } }
      ]);

      const yearlyData = await User.aggregate([
          { 
              $group: {
                  _id: { $year: "$createdAt" },
                  count: { $sum: 1 }
              }
          },
          { $sort: { "_id": 1 } }
      ]);

      // Prepare data for the chart
      const labels = weeklyData.map(entry => entry._id); // Assuming the labels are the same for all periods
      const weeklyCounts = weeklyData.map(entry => entry.count);
      const monthlyCounts = monthlyData.map(entry => entry.count);
      const yearlyCounts = yearlyData.map(entry => entry.count);

      res.json({ labels, weeklyData: weeklyCounts, monthlyData: monthlyCounts, yearlyData: yearlyCounts });
  } catch (error) {
      console.error('Error fetching dashboard data:', error);
      res.status(500).send('Internal Server Error');
  }
};

const getSalesData = async (req, res) => {
  try {
    const { period, startDate, endDate } = req.query;

    let matchCondition = { status: 'delivered' };

    if (startDate && endDate) {
      matchCondition.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    let groupBy;
    switch (period) {
      case 'daily':
        groupBy = { $dayOfMonth: '$createdAt' };
        break;
      case 'weekly':
        groupBy = { $week: '$createdAt' };
        break;
      case 'monthly':
        groupBy = { $month: '$createdAt' };
        break;
      case 'yearly':
        groupBy = { $year: '$createdAt' };
        break;
      default:
        return res.status(400).json({ error: 'Invalid period' });
    }

    const salesData = await Order.aggregate([
      { $match: matchCondition },
      {
        $group: {
          _id: groupBy,
          totalSales: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    res.json(salesData);
  } catch (error) {
    console.error('Error fetching sales data:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};


module.exports ={
  getDashboardData,
  dashboardData,
  downloadSalesReports,
  salesReport,
  downloadSalesReport,
  getTotalRevenue,
  getUserDetailsAndOrders,
  downloadSalesReportsExcel,
  getYearlyRevenue,
  getSalesData,

}