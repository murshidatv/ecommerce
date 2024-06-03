const moment = require('moment');
const Order = require('../../models/orderModel');

// Helper function to aggregate orders
const aggregateOrders = async (start, end) => {
  try {
    console.log(`Aggregating orders from ${start} to ${end}`);
    const orders = await Order.find({ orderDate: { $gte: start, $lte: end } });
    const totalSales = orders.reduce((acc, order) => acc + order.totalAmount, 0);
    const totalOrders = orders.length;
    console.log(`Total Sales: ${totalSales}, Total Orders: ${totalOrders}`);
    return { totalSales, totalOrders, orders };
  } catch (error) {
    console.error(`Error aggregating orders: ${error.message}`);
    throw error;
  }
};

// Controller functions
const getDailyReport = async (req, res) => {
  const startOfDay = moment().startOf('day').toDate();
  const endOfDay = moment().endOf('day').toDate();

  console.log(`Fetching daily report for ${startOfDay} to ${endOfDay}`);
  try {
    const report = await aggregateOrders(startOfDay, endOfDay);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch daily report' });
  }
};

const getWeeklyReport = async (req, res) => {
  const startOfWeek = moment().startOf('week').toDate();
  const endOfWeek = moment().endOf('week').toDate();

  console.log(`Fetching weekly report for ${startOfWeek} to ${endOfWeek}`);
  try {
    const report = await aggregateOrders(startOfWeek, endOfWeek);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch weekly report' });
  }
};

const getMonthlyReport = async (req, res) => {
  const startOfMonth = moment().startOf('month').toDate();
  const endOfMonth = moment().endOf('month').toDate();

  console.log(`Fetching monthly report for ${startOfMonth} to ${endOfMonth}`);
  try {
    const report = await aggregateOrders(startOfMonth, endOfMonth);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch monthly report' });
  }
};

const getCustomReport = async (req, res) => {
  const { startDate, endDate } = req.body;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'Please provide both start date and end date' });
  }

  console.log(`Fetching custom report for ${startDate} to ${endDate}`);
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const report = await aggregateOrders(start, end);
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch custom report' });
  }
};

module.exports = {
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  getCustomReport,
};
