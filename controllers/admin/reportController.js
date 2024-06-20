

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

    console.log(`Orders found: ${orders.length}`); // Logging the number of orders found

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

  const doc = new PDFDocument();

  doc.pipe(fs.createWriteStream(filePath))
    .on('finish', () => {
      res.download(filePath, fileName, (err) => {
        if (err) {
          res.status(500).send(err.message);
        } else {
          // Optionally, delete the file after download to clean up
          fs.unlinkSync(filePath);
        }
      });
    })
    .on('error', (err) => {
      res.status(500).send(err.message);
    });

  doc.fontSize(20).text('Sales Report', { align: 'center' });
  doc.moveDown();

  orders.forEach(order => {
    doc.fontSize(12).text(`Order ID: ${order._id}`);
    doc.text(`User: ${order.userName}`);
    doc.text(`Total Amount: $${order.totalAmount}`);
    doc.text(`Order Date: ${moment(order.orderDate).format('YYYY-MM-DD')}`);
    doc.text(`Status: ${order.status}`);
    doc.text(`Payment Method: ${order.payment}`);
    if (order.deliveredAt) {
      doc.text(`Delivered At: ${moment(order.deliveredAt).format('YYYY-MM-DD')}`);
    }
    if (order.returned) {
      doc.text(`Returned: Yes`);
      if (order.returnReason) {
        doc.text(`Return Reason: ${order.returnReason}`);
      }
    }
    doc.moveDown();
  });

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
