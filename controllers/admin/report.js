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


const renderFileAsync = util.promisify(ejs.renderFile);

// exports.downloadSalesReports = async (req, res) => {
//   try {
//     // Get other necessary data
//     const { totalUsers, blockUser, mergedData, totalOrders, cancelledOrders, totalProduct, totalRevenue, deliveredOrders, mostSellingProduct, returnOrderCount, onlinePayment, pendingOrdersCount } = await getUserDetailsAndOrders();

//     // Render the EJS template to HTML with all required data passed as local variables
//     ejs.renderFile('views/admin/sales-report.ejs', { totalUsers, blockUser, mergedData,totalOrders, cancelledOrders, totalProduct, totalRevenue, deliveredOrders, mostSellingProduct, returnOrderCount, onlinePayment, pendingOrdersCount }, function(err, html){
//       if (err) {
//         console.error('Error generating HTML:', err);
//         res.status(500).send('An error occurred while generating the HTML');
//       } else {
//         var options = { format: 'Letter' };

//         // Create a PDF from the HTML string
//         pdf.create(html, options).toStream(function(err, stream){
//           if (err) {
//             console.error('Error generating PDF:', err);
//             res.status(500).send('An error occurred while generating the PDF');
//           } else {
//             // Set the filename for download
//             res.setHeader('Content-Disposition', 'attachment; filename="sales-report.pdf"');
//             stream.pipe(res);
//           }
//         });
//       }
//     });
//   } catch (error) {
//     console.error('Error:', error);
//     res.status(500).send('An error occurred');
//   }
// };

exports.downloadSalesReports = async (req, res) => {
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
exports.downloadSalesReportsExcel = async (req, res) => {
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







// async function generatePDF() {
//     // Launch a new browser instance
//     const browser = await puppeteer.launch();

//     // Create a new page
//     const page = await browser.newPage();

//     // Go to the dashboard page
   
//     await page.goto('http://localhost:3000/dashboard', { waitUntil: 'networkidle0' });

//     // Generate the PDF from the page content
//     const pdf = await page.pdf({ format: 'A4' });

//     // Close the browser
//     await browser.close();

//     return pdf;
// }


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
  

exports.getDashboardData = async (req, res) => {
    try {
        // Fetch total users count
        const totalUsers = await User.countDocuments();

        // Fetch total orders count
        const totalOrders = await Order.countDocuments();

        const cancelledOrders = await Order.countDocuments({ status: 'Cancelled' });

        const totalproduct= await Product.countDocuments();

        const totalRevenue = await getTotalRevenue();

        const blockUser = await User.countDocuments({ isBlocked: true });
      
      
        res.render('adminhome', { totalUsers, totalOrders, cancelledOrders,blockUser,totalproduct,totalRevenue});
    } catch (error) {
        console.error('Error fetching dashboard data:', error.message);
        res.status(500).send('Internal Server Error');
    }
};



exports.dashboardData = async (req, res) => {
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


exports.orderData = async (req, res) => {
  try {
    const orderData = await Order.aggregate([
      { 
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]);

    const labels = orderData.map(entry => entry._id);
    const counts = orderData.map(entry => entry.count);
    res.json({ labels, data: counts });
  } catch (error) {
    console.error('Error fetching order data:', error);
    res.status(500).send('Internal Server Error');
  }
};
exports.salesReport= async (req, res) => {
  try {
      const orders = await Order.find({ status: 'delivered' });
      res.json(orders);
  } catch (err) {
      console.error(err);
      res.status(500).send('Server Error');
  }
}






// async function generatePDF() {
//     // Launch a new browser instance
//     const browser = await puppeteer.launch();

//     // Create a new page
//     const page = await browser.newPage();

    
//     await page.goto('http://localhost:3000/admin/getUserDetailsAndOrders', { waitUntil: 'networkidle0' });

//     // Generate the PDF from the page content
//     const pdf = await page.pdf({ format: 'A4' });

//     // Close the browser
//     await browser.close();

//     return pdf;
// }


exports.downloadSalesReport=async (req, res) => {
  try {
      const pdf = await generatePDF();
      res.set({ 'Content-Type': 'application/pdf', 'Content-Length': pdf.length });
      res.send(pdf);
  } catch (error) {
      console.error(error);
      res.status(500).send('An error occurred while generating the PDF.');
  }
}



exports.getUserDetailsAndOrders = async (req, res) => {
  try {
    // Aggregate user logins by month with month names
    const monthlyLogins = await User.aggregate([
      {
        $group: {
          _id: { $month: "$createdAt" },
          monthName: { $first: { $dateToString: { format: "%B", date: "$createdAt" } } },
          count: { $sum: 1 }
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
    const blockUser = await User.countDocuments({ isBlocked: 'true' });
    const onlinePayment = await Order.countDocuments({ payment: 'onlinePayment' });

    // Count total users, total orders, total cancelled orders, total products, and total revenue
    const totalUsers = await User.countDocuments();
    const totalOrders = await Order.countDocuments();
    const cancelledOrders = await Order.countDocuments({ status: 'Cancelled' });
    const totalProduct = await Product.countDocuments();
    const totalRevenue = await getTotalRevenue();

    // Render the sales report template with the fetched data
    res.render('sales-report', {
      totalUsers,
      totalOrders,
      cancelledOrders,
      blockUser,
      totalProduct,
      totalRevenue,
      mergedData,
      deliveredOrders,
      mostSellingProduct: mostSellingProductDetails,
      returnOrderCount,
      onlinePayment,
      pendingOrdersCount,
    });
  } catch (error) {
    console.error('Error fetching user details and orders:', error.message);
    res.status(500).send('Internal Server Error');
  }
};


exports.getYearlyRevenue = async (req, res) => {
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