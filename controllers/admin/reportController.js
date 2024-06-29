

const Order = require('../../models/orderModel');
const moment = require('moment');
const PDFDocument = require('pdfkit');
const json2xls = require('json2xls');
const fs = require('fs');
const path = require('path');

exports.renderDashboard = (req, res) => {
  res.render('admin/dashboard');
};


exports.generateReport = async (req, res) => {
  const { type, startDate, endDate } = req.query;

  let start = startDate ? moment(startDate).startOf('day') : moment().startOf('year');
  let end = endDate ? moment(endDate).endOf('day') : moment().endOf('day');

  try {
    const orders = await Order.find({
      orderDate: { $gte: start.toDate(), $lte: end.toDate() }
    }).populate('userId');

   
    if (type === 'pdf') {
      generatePDF(orders, res);
    } else if (type === 'excel') {
      generateExcel(orders, res);
    } else {
      res.status(400).send('Invalid report type');
    }
  } catch (err) {
    console.error(err); // Log any errors
    res.status(500).send(err.message);
  }
};

const generatePDF = (orders, res) => {
  const reportsDir = path.join(__dirname, '../reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir);
  }
  let fileName = `report_${Date.now()}.pdf`;
  let filePath = path.join(reportsDir, fileName);

  const doc = new PDFDocument({ margin: 30 });
  doc.pipe(fs.createWriteStream(filePath))
    .on('finish', () => {
      res.download(filePath, fileName, (err) => {
        if (err) {
          res.status(500).send(err.message);
        } else {
          fs.unlinkSync(filePath);
        }
      });
    })
    .on('error', (err) => {
      res.status(500).send(err.message);
    });

  const reportDate = moment().format('YYYY-MM-DD');
  const startDate = orders.length ? moment(orders[0].orderDate).format('YYYY-MM-DD') : 'N/A';
  const endDate = orders.length ? moment(orders[orders.length - 1].orderDate).format('YYYY-MM-DD') : 'N/A';

  doc.moveDown();
  doc.fontSize(15).text('Sales Report', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(11).text('Zouqs-Bag', { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(11).text('www.zouqs.shop', { align: 'center' });
  doc.moveDown(2);
  doc.fontSize(11).text(`Report Date: ${reportDate}`, { align: 'right' });
  doc.moveDown(0.5);
  doc.fontSize(11).text(`Date Range: ${startDate} - ${endDate}`, { align: 'right' });
  doc.moveDown(2);


  if (orders.length === 0) {
    doc.moveDown(6);
    doc.fontSize(12).text('No order details found for the selected date range.', { align: 'center' });
    doc.end();
    return;
  }

  // Draw table header
  const tableTop = doc.y;
  const tableLeft = 20; // Set a fixed left position for the table
  const cellPadding = 5;
  const columnWidths = [150, 70, 70, 70, 60, 80, 70]; // Set column widths
  const rowHeight = 20;

  const headers = ['Order ID', 'User', 'Total Amount', 'Order Date', 'Status', 'Payment Method', 'Returned'];

  doc.fontSize(10);
  let currentLeft = tableLeft;
  headers.forEach((header, i) => {
    doc.rect(currentLeft, tableTop, columnWidths[i], rowHeight).stroke();
    doc.text(header, currentLeft + cellPadding, tableTop + cellPadding);
    currentLeft += columnWidths[i];
  });

  let currentTop = tableTop + rowHeight;

  // Table rows
  let totalAmount = 0;
  let returnedAmount = 0;
  let returnedOrdersCount = 0;

  orders.forEach(order => {
    totalAmount += order.totalAmount;
    if (order.returned) {
      returnedAmount += order.totalAmount;
      returnedOrdersCount++;
    }

    const row = [
      order._id || 'N/A',
      order.userName || 'N/A',
      `Rs.${order.totalAmount}` || 'N/A',
      moment(order.orderDate).format('YYYY-MM-DD') || 'N/A',
      order.status || 'N/A',
      order.payment || 'N/A',
      order.returned ? 'Yes' : 'No',
    ];

    currentLeft = tableLeft;
    row.forEach((cell, i) => {
      doc.rect(currentLeft, currentTop, columnWidths[i], rowHeight).stroke();
      doc.text(cell, currentLeft + cellPadding, currentTop + cellPadding);
      currentLeft += columnWidths[i];
    });
    currentTop += rowHeight;
  });

  // Calculate the net total amount after deducting returned orders
  const netTotalAmount = totalAmount - returnedAmount;

  // Add total amount and order count at the bottom
  doc.moveDown(2);

  const summaryTop = currentTop + 40; // Adjust the position further down if necessary
  const bottomLeft = tableLeft;
  const bottomRight = tableLeft + columnWidths.reduce((a, b) => a + b, 0);

  doc.fontSize(11)
    .text(`Total Orders: ${orders.length}`, bottomLeft, summaryTop)
    .text(`Total Amount: Rs.${totalAmount.toFixed(2)}`, bottomRight - 150, summaryTop, { width: 150, align: 'right' });

  // Add returned orders and amount details
  doc.fontSize(11)
    .text(`Returned Orders: ${returnedOrdersCount}`, bottomLeft, summaryTop + 20)
    .text(`Returned Amount: Rs.${returnedAmount.toFixed(2)}`, bottomRight - 150, summaryTop + 20, { width: 150, align: 'right' });

  // Add net total amount
  doc.fontSize(11)
   
    .text(`Net Total Amount: Rs.${netTotalAmount.toFixed(2)}`, bottomRight - 250, summaryTop + 40, { width: 250, align: 'right' });

  doc.end();
};

const generateExcel = (orders, res) => {
  const reportsDir = path.join(__dirname, '../reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir);
  }
  let fileName = `report_${Date.now()}.xlsx`;
  let filePath = path.join(reportsDir, fileName);

  const data = orders.map(order => ({
    'Order ID': order._id,
    'User': order.userName,
    'Total Amount': order.totalAmount,
    'Order Date': moment(order.orderDate).format('YYYY-MM-DD'),
    'Status': order.status,
    'Payment Method': order.payment,
    'Delivered At': order.deliveredAt ? moment(order.deliveredAt).format('YYYY-MM-DD') : '',
    'Returned': order.returned ? 'Yes' : 'No',
    'Return Reason': order.returnReason || ''
  }));

  const xls = json2xls(data);

  fs.writeFileSync(filePath, xls, 'binary');

  res.download(filePath, fileName, (err) => {
    if (err) {
      res.status(500).send(err.message);
    } else {
      // Optionally, delete the file after download to clean up
      fs.unlinkSync(filePath);
    }
  });
};
