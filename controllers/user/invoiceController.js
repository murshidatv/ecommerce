

const Invoice = require('../../models/invoice');
const Order = require('../../models/orderModel');
const address = require('../../models/addressModel');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');




const createInvoiceFromOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId).populate('userId').populate('address').populate('products.product');
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

if (order.status === 'Cancelled' || order.status === 'Returned') {
  return res.status(400).json({ error: `Order is ${order.status}` });
}
    const invoice = new Invoice({ orderId: order._id });
    await invoice.save();

    res.status(201).json(invoice);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Function to generate an invoice PDF
const generateInvoicePdf = async (req, res) => {
  try {
    


const invoice = await Invoice.findById(req.params.id).populate({
  path: 'orderId',
  populate: [
    { path: 'products.product' },    { path: 'coupon' },
    { path: 'userId', populate: { path: 'chosenAddress' } },
  ]
});

if (!invoice) {
  return res.status(404).json({ error: 'Invoice not found' });
}

const order = invoice.orderId;
const user = order.userId;

if (!user || !user.chosenAddress) {
  return res.status(404).json({ error: 'User or address not found' });
}

const address = user.chosenAddress;
  

    // Ensure the invoices directory exists
    const invoicesDir = path.join(__dirname, '../invoices');
    if (!fs.existsSync(invoicesDir)) {
      fs.mkdirSync(invoicesDir);
    }

    // Create a file path for the invoice PDF
    const filePath = path.join(invoicesDir, `invoice-${invoice._id}.pdf`);
    const doc = new PDFDocument();

    // Pipe the PDF document to a file and the response
    doc.pipe(fs.createWriteStream(filePath));
    doc.pipe(res);
 // Add invoice title
 doc.fontSize(25).text('Invoice', { align: 'center' });
 doc.moveDown(2);

      // Draw a line after the title
    doc.moveTo(50, doc.y)
      .lineTo(550, doc.y)
      .stroke();



    // Define starting positions for the grid
    const leftColumnX = 50;
    const rightColumnX = 300;
    let currentY = doc.y + 10;  // Add some space after the line

    // Add company details in left column
    doc.fontSize(10).text('Ship From:', leftColumnX, currentY);
    currentY += 20;
    doc.fontSize(10).text('Zouq Group of Companies', leftColumnX, currentY);
    currentY += 15;
    doc.fontSize(10).text('Zee Arcades', leftColumnX, currentY);
    currentY += 15;
    doc.fontSize(10).text('Floor No:7', leftColumnX, currentY);
    currentY += 15;
    doc.fontSize(10).text('Malappuram, 676304', leftColumnX, currentY);
    currentY += 15;
    doc.fontSize(10).text('Phone: (123) 777-1111', leftColumnX, currentY);

    // Draw a line to separate sections
    currentY += 20;
    doc.moveTo(50, currentY)
      .lineTo(550, currentY)
      .stroke();

    
      doc.moveDown(2);
 
   


    // Add order details
  
     
 doc.fontSize(10).text(`Date: ${order.orderDate.toDateString()}`, { align: 'left' });

 doc.fontSize(10).text(`Customer Name: ${order.userId.name}`, { align: 'left' });
 
    
 doc.moveDown(2);
    doc.fontSize(10).text(`Order Id: ${order._id}`, { align: 'left' });
   
    doc.fontSize(10).text(`Order Status: ${order.status}`, { align: 'left' });
   
    doc.fontSize(10).text(`Payment Method: ${order.payment}`, { align: 'left' });
    
    doc.moveDown(2);
   
// Extract address details if available


    currentY += 10;  // Add some space after the line


// Ensure all fields are accessible and construct the address string
let addressDetails = '';

if (order.userId.chosenAddress) {
  const { name, mobile, address, city, pincode, district, state } = order.userId.chosenAddress;
  
  addressDetails = `${name ? name + '\n' : ''}${mobile ? mobile + '\n' : ''}${address ? address + ', ' : ''}${city ? city + ', ' : ''}${pincode ? pincode + ', ' : ''}${district ? district + ', ' : ''}${state ? state : ''}`;
}

    doc.fontSize(10).text(`Address: ${addressDetails}`, rightColumnX, currentY);
    currentY += 10;  // Move down before drawing another line
    doc.moveDown(4);






    // Add table header
    doc.fontSize(14).text('Order Details', { underline: true, align: 'center' });
    doc.moveDown(2);

    // Draw table
    const tableTop = doc.y;
    const tableLeft = 80; // Set a fixed left position for the table
    const cellPadding = 5;

    // Table header
    doc.fontSize(10);
    doc.rect(tableLeft, tableTop, 100, 20).stroke();
    doc.text('Product Name', tableLeft + cellPadding, tableTop + cellPadding);
    doc.rect(tableLeft + 100, tableTop, 100, 20).stroke();
    doc.text('Quantity', tableLeft + 100 + cellPadding, tableTop + cellPadding);
    doc.rect(tableLeft + 200, tableTop, 100, 20).stroke();
    doc.text('Price', tableLeft + 200 + cellPadding, tableTop + cellPadding);
    doc.rect(tableLeft + 300, tableTop, 100, 20).stroke();
    doc.text('Total', tableLeft + 300 + cellPadding, tableTop + cellPadding);

    // Table rows
    let currentTop = tableTop + 20;
    order.products.forEach(item => {
      doc.rect(tableLeft, currentTop, 100, 20).stroke();
      doc.text(item.product.productName, tableLeft + cellPadding, currentTop + cellPadding);
      doc.rect(tableLeft + 100, currentTop, 100, 20).stroke();
      doc.text(item.quantity.toString(), tableLeft + 100 + cellPadding, currentTop + cellPadding);
      doc.rect(tableLeft + 200, currentTop, 100, 20).stroke();
      doc.text(`Rs.${item.product.price.toFixed(2)}`, tableLeft + 200 + cellPadding, currentTop + cellPadding);
      doc.rect(tableLeft + 300, currentTop, 100, 20).stroke();
      doc.text(`Rs.${(item.quantity * item.product.price).toFixed(2)}`, tableLeft + 300 + cellPadding, currentTop + cellPadding);
      currentTop += 20;
    });

    doc.moveDown(3);
    // Add order summary
    doc.fontSize(10).text(`Total Amount: Rs.${order.totalAmount.toFixed(2)}`);
    doc.text(`Discount: Rs.${order.discountAmount.toFixed(2)}`);
    doc.text(`Final Amount: Rs.${(order.totalAmount - order.discountAmount).toFixed(2)}`);

    // End the document
    doc.end();
  } catch (err) {
    // Handle errors and respond with an error message
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createInvoiceFromOrder,
  generateInvoicePdf,
};


