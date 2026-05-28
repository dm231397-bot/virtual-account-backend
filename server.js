require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');
const User = require('./User');

const app = express();

// Middlewares
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

// Health check
app.get('/', (req, res) => res.send('Backend is live!'));

// Create user endpoint
app.post('/create-user', async (req, res) => {
  const { name, email, phone } = req.body;
  if (!name || !email || !phone) return res.status(400).json({ error: "Name, email, and phone are required" });

  try {
    const paystackResponse = await axios.post(
      'https://api.paystack.co/virtual-account/numbers',
      {
        customer: { name, email },
        preferred_bank: "access",
        currency: "NGN"
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const vaData = paystackResponse.data.data;

    const user = await User.create({
      name,
      email,
      phone,
      virtualAccount: { number: vaData.account_number, bank: vaData.bank },
      balance: 0,
      lastUpdated: new Date()
    });

    res.json({ message: 'User created!', user });
  } catch (err) {
    console.error(err.response?.data || err.message || err);
    res.status(500).json({ error: err.response?.data || 'Server error' });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
