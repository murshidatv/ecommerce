// const moment = require('moment');
const Order = require('../../models/orderModel');
const User = require("../../models/userModel");
const Product = require("../../models/productModel");
const Category = require("../../models/categoryModel");
const excel4node = require('excel4node');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const salesReportGet = async (req, res) => {
    try {
        let orders = await Order.find({}).populate('userId');

        orders = orders.filter(order => order.products.some(product => product.orderStatus));
        const { dailyStats, monthlyStats, yearlyStats } = await getOrderStats();
        return res.render('adm-sales-report.ejs', { orders, dailyStats, monthlyStats, yearlyStats });
    } catch (err) {
        console.log(err);
    }
};

const customSalesReportGet = async (req, res) => {
    try {
        let reportType = req.params.reportType, fromDate, toDate;
        const currentDate = new Date();
        if (reportType === 'daily') {
            fromDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 1);
            toDate = new Date();
        } else if (reportType === 'monthly') {
            fromDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, currentDate.getDate());
            toDate = new Date();
        } else if (reportType === 'yearly') {
            fromDate = new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), currentDate.getDate());
            toDate = new Date();
        } else {
            fromDate = req.query.fromDate;
            toDate = req.query.toDate;
        }
        if (new Date(fromDate) >= new Date(toDate)) return res.json({ error: 'start date must be less than end date' });

        let orders = await Order.find({
            deliveredAt: {
                $gte: new Date(fromDate),
                $lte: new Date(toDate)
            }
        }).populate('userId');
        orders = orders.filter(order => order.products.some(product => product.orderStatus));
        const { dailyStats, monthlyStats, yearlyStats } = await getOrderStats();
        const noOfUsers = await usersCount(fromDate, toDate);
        const noOfOrders = await orderCount(fromDate, toDate);
        const revenueAmount = await getRevenueAmount(fromDate, toDate);
        const productsSale = await getTopProductsSale(fromDate, toDate);
        const topCategoryies = await getTopCategoryies(fromDate, toDate);
        const paymentOptions = await getNoOfPayments(fromDate, toDate);
        const orderStatus = await getProductStatus(fromDate, toDate);
        const data = { noOfOrders, noOfUsers, revenueAmount };
        return res.status(200).json({ message: 'success', orders, dailyStats, monthlyStats, yearlyStats, data });
    } catch (err) {
        console.log(err);
    }
};

async function getOrderStats() {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  
    // Daily stats
    const dailyOrders = await Order.find({
      orderDate: { $gte: twentyFourHoursAgo }
    });
    const dailyOrderCount = dailyOrders.length;
    const dailyRevenueAmount = dailyOrders.reduce((total, order) => total + order.totalAmount, 0);
  
    // Monthly stats
    const monthlyOrders = await Order.find({
      orderDate: { $gte: thirtyDaysAgo }
    });
    const monthlyOrderCount = monthlyOrders.length;
    const monthlyRevenueAmount = monthlyOrders.reduce((total, order) => total + order.totalAmount, 0);
  
    // Yearly stats
    const yearlyOrders = await Order.find({
      orderDate: { $gte: oneYearAgo }
    });
    const yearlyOrderCount = yearlyOrders.length;
    const yearlyRevenueAmount = yearlyOrders.reduce((total, order) => total + order.totalAmount, 0);
  
    return {
      dailyStats: { dailyOrderCount, dailyRevenueAmount },
      monthlyStats: { monthlyOrderCount, monthlyRevenueAmount },
      yearlyStats: { yearlyOrderCount, yearlyRevenueAmount }
    };
  }
  
  
  
  
  
const salesReportTotalGet = async (req, res) => {
    try {
        const noOfUsers = await usersCount();
        const noOfOrders = await orderCount();
        const revenueAmount = await getRevenueAmount();
        const productsSale = await getTopProductsSale();
        const topCategories = await getTopCategories();
        const paymentOptions = await getNoOfPayments();
        const orderStatus = await getProductStatus();

        const data = { noOfOrders, noOfUsers, revenueAmount, productsSale, topCategories, paymentOptions, orderStatus };
        
        return res.json({ data });
    } catch (error) {
        console.error('Error fetching sales report total:', error);
        return res.status(500).json({ error: 'Server Error' });
    }
};

  
const usersCount = async (fromDate, toDate) => {
    try {
        let query = {};

        if (fromDate && toDate) {
            query.createdAt = { $gte: new Date(fromDate), $lte: new Date(toDate) };
        }

        const noOfUsers = await User.countDocuments(query);
        return noOfUsers;
    } catch (error) {
        console.error('Error counting users:', error);
        throw error;
    }
};


const orderCount = async (fromDate, toDate) => {
    try {
        let query = {};

        if (fromDate && toDate) {
            query.deliveredAt = { $gte: new Date(fromDate), $lte: new Date(toDate) };
        }

        const noOfOrders = await Order.countDocuments(query);
        return noOfOrders;
    } catch (error) {
        console.error('Error counting orders:', error);
        throw error;
    }
};
  
  
async function getRevenueAmount(fromDate, toDate) {
    try {
        let revenueAmount = 0;

        if (fromDate && toDate) {
            const formattedFromDate = new Date(fromDate);
            const formattedToDate = new Date(toDate);
            console.log('Formatted Dates:', formattedFromDate, formattedToDate);

            revenueAmount = await Order.aggregate([
                {
                    $match: {
                        deliveredAt: {
                            $gte: formattedFromDate,
                            $lte: formattedToDate
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalAmount: { $sum: "$totalAmount" }
                    }
                }
            ]);
        } else {
            revenueAmount = await Order.aggregate([
                {
                    $group: {
                        _id: null,
                        totalAmount: { $sum: "$totalAmount" }
                    }
                }
            ]);
        }

        console.log('Aggregation Result:', revenueAmount);
        return revenueAmount.length > 0 ? revenueAmount[0].totalAmount : 0;
    } catch (error) {
        console.error('Error getting revenue amount:', error);
        throw error;
    }
}

  
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
  
  
async function getTopCategories(fromDate, toDate) {
    try {
        let pipeline = [];

        if (fromDate && toDate) {
            pipeline.push({
                $match: {
                    orderDate: {
                        $gte: new Date(fromDate),
                        $lte: new Date(toDate)
                    }
                }
            });
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
                    count: { $sum: '$products.quantity' }
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
                _id: "$payment",
                count: { $sum: 1 }
            }
        });

        const noOfPayments = await Order.aggregate(pipeline);
        return noOfPayments;
    } catch (error) {
        console.error('Error getting number of payments:', error);
        throw error;
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
                productId: "$products.product",
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
    } catch (error) {
        console.error('Error getting product status:', error);
        throw error;
    }
}
  
  
  
  
  
const genPdfGet = async (req, res) => {
    try {
        const reportType = req.params.reportType;
        let fromDate, toDate;

        const currentDate = new Date();
        if (reportType === 'daily') {
            fromDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 1);
            toDate = new Date();
        } else if (reportType === 'monthly') {
            fromDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, currentDate.getDate());
            toDate = new Date();
        } else if (reportType === 'yearly') {
            fromDate = new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), currentDate.getDate());
            toDate = new Date();
        } else {
            fromDate = req.query.fromDate;
            toDate = req.query.toDate;
        }

        const no_of_orders = await orderCount(fromDate, toDate);
        const total_revenue = await getRevenueAmount(fromDate, toDate);
        const no_of_users = await usersCount(fromDate, toDate);

        const top_products = await getTopProductsSale(fromDate, toDate);
        const top_categories = await getTopCategories(fromDate, toDate);
        const top_payments = await getNoOfPayments(fromDate, toDate);
        const order_status = await getProductStatus(fromDate, toDate);

        // Create PDF
        const doc = new PDFDocument({ font: 'Helvetica', margin: 50 });
        const pdfFilePath = './sales-report.pdf'; // Path to save the PDF file

        doc.pipe(fs.createWriteStream(pdfFilePath)); // Pipe the PDF to a writable stream

        // Set response headers for attachment
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="sales-report.pdf"');

        // Generate the PDF content
        genSalesReportPDF(doc, no_of_orders, total_revenue, no_of_users, top_products, top_categories, top_payments, order_status);

        // End the document
        doc.end();

        // Send success response
        res.status(200).send('Sales report generated successfully!');
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).send('An error occurred while generating the sales report.');
    }
};
  
  
  
async function genSalesReportPDF(doc, ...parameters) {
    const [no_of_orders, total_revenue, no_of_users, top_products, top_categories, top_payments, order_status] = parameters;

    doc.fontSize(18).font('Helvetica-Bold').text('SALES REPORT', { align: 'center' }).moveDown();

    doc.font('Helvetica').fontSize(10).text(`Date : ${new Date(Date.now()).toLocaleDateString()}`, { align: 'right' });

    doc.font('Helvetica-Bold').fontSize(14).text('MARGIN');
    doc.moveDown(0.3)
        .font('Helvetica')
        .fontSize(8).text(`Abcd street`)
        .fontSize(8).text(`Vengara, Kerala, 676304`)
        .fontSize(8).text(`1800-208-9898`);

    generateHr(doc, doc.y + 10);

    // Orders, revenue, and number of users
    doc.moveDown(2);
    doc.font('Helvetica-Bold').moveDown(0.5)
        .text(`Orders : ${no_of_orders}`).moveDown(0.5)
        .text(`Revenue : ${total_revenue}$`).moveDown(0.5)
        .text(`Users signup  : ${no_of_users}`);
    generateHr(doc, doc.y + 10);

    // Top selling products
    doc.moveDown(2);
    doc.font('Helvetica-Bold').fontSize(14).text('Top Selling Products');
    doc.font('Helvetica').fontSize(10).moveDown();
    top_products.forEach((product, index) => {
        doc.text(`${index + 1}. ${product.productName} : ${product.count}`).moveDown(0.3);
    });
    generateHr(doc, doc.y + 10);

    // Top selling categories
    doc.moveDown(2);
    doc.font('Helvetica-Bold').fontSize(14).text(`Top Selling Categories`);
    doc.font('Helvetica').fontSize(10).moveDown();
    top_categories.forEach((category, index) => {
        doc.text(`${index + 1}. ${category.categoryName} : ${category.count}`).moveDown(0.3);
    });
    generateHr(doc, doc.y + 10);

    // Most used payment options
    doc.moveDown(2);
    doc.font('Helvetica-Bold').fontSize(14).text('Most Used Payment Options');
    doc.font('Helvetica').fontSize(10).moveDown();
    top_payments.forEach((payment, index) => {
        doc.text(`${index + 1}. ${payment._id} : ${payment.count}`).moveDown(0.3);
    });
    generateHr(doc, doc.y + 10);

    // Order status
    doc.moveDown(2);
    doc.font('Helvetica-Bold').fontSize(14).text('Order Status');
    doc.font('Helvetica').fontSize(10).moveDown();
    order_status.forEach((status, index) => {
        doc.text(`${index + 1}. ${status._id} : ${status.count}`).moveDown(0.3);
    });
    generateHr(doc, doc.y + 10);

    return;
}

function generateHr(doc, y) {
    doc
        .strokeColor("#aaaaaa")
        .lineWidth(1)
        .moveTo(50, y)
        .lineTo(550, y)
        .stroke();
}

  
  
  
  
const salesReportExcelGet = async (req, res) => {
    try {
        const reportType = req.params.reportType;
        let fromDate = req.query.fromDate;
        let toDate = req.query.toDate;

        const currentDate = new Date();
        if (reportType === 'daily') {
            fromDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 1);
            toDate = new Date();
        } else if (reportType === 'monthly') {
            fromDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, currentDate.getDate());
            toDate = new Date();
        } else if (reportType === 'yearly') {
            fromDate = new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), currentDate.getDate());
            toDate = new Date();
        } else {
            fromDate = req.query.fromDate;
            toDate = req.query.toDate;
        }

        const no_of_orders = await orderCount(fromDate, toDate);
        const total_revenue = await getRevenueAmount(fromDate, toDate);
        const no_of_users = await usersCount(fromDate, toDate);

        const top_products = await getTopProductsSale(fromDate, toDate);
        const top_categories = await getTopCategories(fromDate, toDate);
        const top_payments = await getNoOfPayments(fromDate, toDate);
        const order_status = await getProductStatus(fromDate, toDate);

        const parameters = [no_of_orders, total_revenue, no_of_users, top_products, top_categories, top_payments, order_status];

        const workbook = new excel4node.Workbook();
        const headerStyle = workbook.createStyle({
            font: { bold: true }
        });
        const worksheet1 = workbook.addWorksheet('Sheet 1');
        await genExcelReport(worksheet1, headerStyle, ...parameters);

        // Write the workbook to a buffer
        const buffer = await workbook.writeToBuffer();

        // Send the buffer as a response
        res.writeHead(200, {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="sales-report.xlsx"',
            'Content-Length': buffer.length
        });
        res.end(buffer);
    } catch (err) {
        console.log(err);
    }
}

  
async function genExcelReport(worksheet, headerStyle, no_of_orders, total_revenue, no_of_users, top_products, top_categories, top_payments, order_status) {

    // Add data to the worksheet
    let row = 2, col;
    worksheet.cell(row, 1).string('Sales Report').style(headerStyle);
    // worksheet.removeColumns(3, 1000); // Remove columns from 3 to the end


    worksheet.cell(row += 2, 1).string('No. of Orders');
    worksheet.cell(row, 2).number(no_of_orders);
    worksheet.cell(++row, 1).string('Total Revenue');
    worksheet.cell(row, 2).number(total_revenue);
    worksheet.cell(++row, 1).string('No. of Users');
    worksheet.cell(row, 2).number(no_of_users);

    row += 2;
    // Add top products
    worksheet.cell(row, 1).string('Top Products').style(headerStyle);
    row++;
    top_products.forEach((product, index) => {
        worksheet.cell(row + index, 1).string(`${index + 1}. ${product.productName}`);
        worksheet.cell(row + index, 2).number(product.count);
    });

    // Add top categories
    row += top_products.length + 1;
    worksheet.cell(row, 1).string('Top Categories').style(headerStyle);
    row++;
    top_categories.forEach((category, index) => {
        worksheet.cell(row + index, 1).string(`${index + 1}. ${category.categoryName}`);
        worksheet.cell(row + index, 2).number(category.count);
    });

    // Add top payments
    row += top_categories.length + 1;
    worksheet.cell(row, 1).string('Top Payments').style(headerStyle);
    row++;
    top_payments.forEach((payment, index) => {
        worksheet.cell(row + index, 1).string(`${index + 1}. ${payment._id}`);
        worksheet.cell(row + index, 2).number(payment.count);
    });

    // Add order status
    row += top_payments.length + 1;
    worksheet.cell(row, 1).string('Order Status').style(headerStyle);
    row++;
    order_status.forEach((status, index) => {
        worksheet.cell(row + index, 1).string(`${status._id}`);
        worksheet.cell(row + index, 2).number(status.count);
    });

    return worksheet;
}



module.exports = {
    salesReportTotalGet,
    salesReportGet,
    salesReportExcelGet,
    customSalesReportGet,
    genPdfGet,
    getTopCategories,
    
  };