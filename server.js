require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');
const User = require('./User'); // Make sure User.js is in the same folder

const app = express();

// Middlewares
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

// Health check endpoint
app.get('/', (req, res) => {
  res.send('Backend is live!');
});

// Create user endpoint
app.post('/create-user', async (req, res) => {
  const { name, email, phone } = req.body;

  if (!name || !email || !phone) {
    return res.status(400).json({ error: "Name, email, and phone are required" });
  }

  try {
    // Paystack virtual account creation
    const paystackResponse = await axios({
      method: 'post',
      url: 'https://api.paystack.co/virtual-account/numbers',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      data: {
        customer: { name, email },
        preferred_bank: "access",
        currency: "NGN"
      }
    });

    const vaData = paystackResponse.data.data;

    // Save user in MongoDB
    const user = await User.create({
      name,
      email,
      phone,
      virtualAccount: {
        number: vaData.account_number,
        bank: vaData.bank
      },
      balance: 0,
      lastUpdated: new Date()
    });

    res.json({ message: 'User created!', user });
  } catch (err) {
    console.error(err.response?.data || err.message || err);
    res.status(500).json({ error: err.response?.data || 'Server error' });
  }
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
