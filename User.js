const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type: String, // 'credit' or 'debit'
  amount: Number,
  date: { type: Date, default: Date.now }
});

const complaintSchema = new mongoose.Schema({
  complaintId: String,
  message: String,
  status: { type: String, default: 'open' },
  date: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  virtualAccount: {
    number: String,
    bank: String
  },
  balance: { type: Number, default: 0 },
  transactions: [transactionSchema],
  complaints: [complaintSchema],
  status: { type: String, default: 'active' },
  lastUpdated: Date
});

module.exports = mongoose.model('User', userSchema);
