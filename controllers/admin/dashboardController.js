const User = require('../../models/userModel');
const Order = require('../../models/orderModel');
const Product = require('../../models/productModel')
const PDFDocument = require('pdfkit');
const table = require('pdfkit-table');
const ejs = require('ejs');
const fs = require('fs');
const util = require('util');
const pdf = require('html-pdf');
const ExcelJS = require('exceljs');

const puppeteer = require('puppeteer');
const { order } = require('./orderController');
const { getUserDetailsAndOrders } = require('./adminController')

const { getTotalRevenue } = require('./adminController')

const getDashboardData = async (req, res) => {
  try {
    // Fetch total users count
    const totalUsers = await User.countDocuments();

    // Fetch total orders count
    const totalOrders = await Order.countDocuments();

    const cancelledOrders = await Order.countDocuments({ status: 'Cancelled' });

    const totalproduct = await Product.countDocuments();

    const totalRevenue = await getTotalRevenue();

    const blockUser = await User.countDocuments({ isBlocked: true });

    res.render('report', { totalUsers, totalOrders, cancelledOrders, blockUser, totalproduct, totalRevenue });
  } catch (error) {
    console.error('Error fetching dashboard data:', error.message);
    res.status(500).send('Internal Server Error');
  }
};
const salesReport = async (req, res) => {
  try {
    const orders = await Order.find({ status: 'delivered' });
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
}
const downloadSalesReport = async (req, res) => {
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
    console.log("years", years, "revenueData", revenueData);
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
    doc.fontSize(20).font('Helvetica-Bold').text('Sales Report', { align: 'center' }).moveDown(1);

    // Add table for monthly logins
    doc.fontSize(16).text('Monthly Logins', { align: 'left' }).moveDown(0.5);

    const drawTable = (doc, data, startX, startY, columnWidths) => {
      const tableTop = startY;
      let currentY = tableTop;

      // Draw table headers
      doc.font('Helvetica-Bold');
      data.headers.forEach((header, i) => {
        doc.text(header, startX + columnWidths.slice(0, i).reduce((a, b) => a + b, 0), currentY);
      });
      currentY += 20;
      doc.font('Helvetica');

      // Draw table rows
      data.rows.forEach(row => {
        row.forEach((cell, j) => {
          doc.text(cell, startX + columnWidths.slice(0, j).reduce((a, b) => a + b, 0), currentY);
        });
        currentY += 20;
      });

      return currentY;
    };

    // Define column widths for the monthly logins table
    const columnWidths = [150, 150];
    const monthlyLoginsTable = {
      headers: ['Month', 'Number of Logins'],
      rows: mergedData.map(({ monthName, count }) => [monthName, count])
    };
    const tableStartY = drawTable(doc, monthlyLoginsTable, 50, doc.y + 20, columnWidths);

    // Add user details and order details as separate tables
    doc.addPage();
    doc.fontSize(16).text('User Details', { align: 'left' }).moveDown(0.5);

    const userDetailsTable = {
      headers: ['Detail', 'Count'],
      rows: [
        ['Total Users', totalUsers],
        ['Blocked Users', blockUser]
      ]
    };
    drawTable(doc, userDetailsTable, 50, doc.y + 20, columnWidths);

    doc.moveDown(2);
    doc.fontSize(16).text('Order Details', { align: 'left' }).moveDown(0.5);

    const orderDetailsTable = {
      headers: ['Detail', 'Count'],
      rows: [
        ['Total Orders', totalOrders],
        ['Cancelled Orders', cancelledOrders],
        ['Returned Orders', returnOrderCount],
        ['Pending Orders', pendingOrdersCount],
        ['Online Payments', onlinePayment]
      ]
    };
    drawTable(doc, orderDetailsTable, 50, doc.y + 20, columnWidths);

    doc.addPage();

    // Add other details as cards
    const drawCard = (doc, title, content, startX, startY) => {
      const cardWidth = 500;
      const cardHeight = 100;
      doc.rect(startX, startY, cardWidth, cardHeight).stroke();
      doc.font('Helvetica-Bold').text(title, startX + 10, startY + 10);
      doc.font('Helvetica').text(content, startX + 10, startY + 30);
      return startY + cardHeight + 20;
    };

    let cardStartY = 50;
    cardStartY = drawCard(doc, 'Total Products', `Total Products: ${totalProduct}`, 50, cardStartY);
    cardStartY = drawCard(doc, 'Total Revenue', `Total Revenue: ${totalRevenue}`, 50, cardStartY);

    doc.addPage();
    doc.fontSize(16).text('Most Selling Product', { underline: true, align: 'left' }).moveDown(0.5);
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

    // Add delivered orders table
    // doc.addPage();
    doc.fontSize(16).text('Delivered Orders Details', { underline: true, align: 'left' }).moveDown(0.5);

    const deliveredOrdersTable = {
      headers: ['Order ID', 'Customer Name', 'Products'],
      rows: deliveredOrders.map(order => [
        order._id,
        order.userId.name,
        order.products.map(p => `${p.product.productName} (Qty: ${p.quantity})`).join(', ')
      ])
    };
    drawTable(doc, deliveredOrdersTable, 50, doc.y + 20, [200, 200, 250]);

    // Finalize the PDF document
    doc.end();
  }


  catch (error) {
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
      //{ header: 'Blocked Users', key: 'blockUser' },
      { header: 'Total Orders', key: 'totalOrders' },
      // { header: 'CancelledOrders ', key: 'cancelledOrders' },
      { header: 'Total Product ', key: 'totalProduct' },
      { header: 'Total Revenue ', key: 'totalRevenue' },
      //{ header: 'DeliveredOrders ', key: 'deliveredOrders' },
      { header: 'Online Payment ', key: 'onlinePayment' },
      { header: 'Return OrderCount ', key: 'returnOrderCount' },


    ];

    worksheet.addRow({ totalUsers,/* blockUser*/onlinePayment, totalOrders, totalProduct, totalRevenue,/*deliveredOrders,*/returnOrderCount });

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


module.exports = {
  getDashboardData,
  dashboardData,
  downloadSalesReports,
  salesReport,
  downloadSalesReport,
  getTotalRevenue,
  getUserDetailsAndOrders,
  downloadSalesReportsExcel,
  getYearlyRevenue,
}