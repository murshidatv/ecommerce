const mongoose = require('mongoose');
const orderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  userName: String,
  payment: {
    type: String,
    default: 'COD',
  },
  address: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  status: {
    type: String,
    enum: ['Pending', 'PendingPayment', 'Submitted', 'Shipped', 'Delivered', 'Cancelled',
      'Cancellation', 'CustomReason', 'Returned'],
    default: 'Pending',
  },
  cancellation: {
    isCancelled: {
      type: Boolean,
      default: false,
    },
    reason: {
      type: String,
      default: '',
    },
    cancelledByAdmin: {
      type: Boolean,
      default: false,
    },
  },

  products: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
      quantity: {
        type: Number,
        default: 1,
      },
      stockAtOrder: {
        type: Number,
        default: 0,
      },
    },
  ],
  totalAmount: {
    type: Number,
    default: 0,
  },
  razorpayOrderId: {
    type: String,
    unique: true,
  },
  discountAmount: {
    type: Number,
    default: 0,
  },
 

 orderDate:{
  type: Date,
  default:Date.now
},
deliveredAt: {
  type: Date,
  // default: Date.now
},
  returned: {
    type: Boolean,
    default: false,
  },
  returnReason: String,
  coupon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon',
  },
});


const Order = mongoose.model('Order', orderSchema);

module.exports = Order;