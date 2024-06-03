const Invoice = require('../../models/invoice');
const Order = require('../../models/orderModel');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const createInvoiceFromOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).populate('userId').populate('address').populate('products.product');
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const invoice = new Invoice({ orderId: order._id });
    await invoice.save();

    res.status(201).json(invoice);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

const generateInvoicePdf = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate({
      path: 'orderId',
      populate: {
        path: 'products.product userId address coupon',
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const order = invoice.orderId;

    const invoicesDir = path.join(__dirname, '../invoices');
    if (!fs.existsSync(invoicesDir)) {
      fs.mkdirSync(invoicesDir);
    }

    const filePath = path.join(invoicesDir, `invoice-${invoice._id}.pdf`);
    const doc = new PDFDocument();

    doc.pipe(fs.createWriteStream(filePath));
    doc.pipe(res);

    // Company Details
    doc.fontSize(16).text('Zouq Group of Companies', { align: 'right' });
    doc.fontSize(12).text('Zee Arcades', { align: 'right' });
    doc.fontSize(12).text('Floor No:7', { align: 'right' });
    doc.fontSize(12).text('Vengara,Malappuram,676304', { align: 'right' });
    doc.fontSize(12).text('Phone: (123) 777-1111', { align: 'right' });
    doc.moveDown(2);
   
    
    // Invoice Title
    doc.fontSize(25).text('Invoice', { align: 'center' });
    doc.moveDown(2);

    // Order Details
    
    doc.fontSize(11).text(`Customer Name : ${order.userId.name}`);
    doc.text(`Order Id : ${order.userId._id}`);
    doc.text(`Order Date : ${order.orderDate.toDateString()}`);
   
    doc.text(`Payment Method : ${order.payment}`);
    //doc.text(`Delivery Address: ${order.userId.addresses}`);
    doc.moveDown(3);

    

    // Table Header
    doc.fontSize(12).text('Order Details', { underline: true ,align: 'center' });
    doc.moveDown(1);
    /*doc.fontSize(10).text('Product Name', { continued: true });
    doc.text('Quantity', { align: 'right', continued: true });
    doc.text('Price', { align: 'right', continued: true });
    doc.text('Total', { align: 'right' });
    doc.moveDown(1);
*/
    // Table Rows
    order.products.forEach(item => {
      doc.text(`Product Name : ${item.product.productName}`);
      doc.text(`Quantity : ${item.quantity}`);
     // doc.text(`Price : Rs.${item.product.price.toFixed(2)}`);
     //doc.text(`Total Price : Rs.${(item.quantity * item.product.price).toFixed(2)}`);
    });

    doc.moveDown(.5);

    // Summary
    doc.fontSize(12).text(`Total Amount: Rs.${order.totalAmount.toFixed(2)}`);
    doc.text(`Discount: Rs.${order.discountAmount.toFixed(2)}`);
    doc.text(`Final Amount: Rs.${(order.totalAmount - order.discountAmount).toFixed(2)}`);

    doc.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



module.exports = {
  createInvoiceFromOrder,
  generateInvoicePdf
};
