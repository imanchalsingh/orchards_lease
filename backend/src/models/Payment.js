import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
    },
    payerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    paymentGateway: {
      type: String,
      enum: ['Razorpay', 'Stripe', 'UPI', 'MockGateway'],
      default: 'MockGateway',
    },
    paymentMethod: {
      type: String,
      enum: ['CARD', 'UPI', 'NET_BANKING', 'WALLET', 'OTHER'],
      default: 'UPI',
    },
    transactionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    gatewayOrderId: {
      type: String,
    },
    status: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'],
      default: 'PENDING',
      index: true,
    },
    failureReason: {
      type: String,
      default: '',
    },
    paidAt: {
      type: Date,
    },
    receiptNumber: {
      type: String,
      unique: true,
    },
  },
  { timestamps: true }
);

const Payment = mongoose.model('Payment', paymentSchema);
export default Payment;
