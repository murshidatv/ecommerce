const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({

  code: {
    type: String,
    unique: true,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  couponname: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  value: {
    type: Number,
    required: true,
  },

  expirationDate: {
    type: Date,
    required: true,
  },
  usageLimits: {
    totalUses: {
      type: Number,
      default: 1,
    },
    perUser: {
      type: Number,
      default: 1,
    },
  },
  conditions: {
    minOrderAmount: {
      type: Number,
      default: 0,
    },
  },

});

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;