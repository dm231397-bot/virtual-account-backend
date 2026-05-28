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

// ----- DEBUG: Check if env variables are loaded -----
console.log("MONGO_URI:", process.env.MONGO_URI ? "OK" : "MISSING");
console.log("PAYSTACK_SECRET_KEY:", process.env.PAYSTACK_SECRET_KEY ? "OK" : "MISSING");

// ----- Connect to MongoDB -----
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// ----- Health check endpoint -----
app.get('/', (req, res) => res.send('Backend is live!'));

// ----- Create user endpoint -----
app.post('/create-user', async (req, res) => {
  const { name, email, phone } = req.body;

  if (!name || !email || !phone) {
    console.error("Validation error: missing name, email, or phone");
    return res.status(400).json({ error: "Name, email, and phone are required" });
  }

  try {
    // ----- Paystack virtual account creation -----
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

    // ----- Save user in MongoDB -----
    const user = await User.create({
      name,
      email,
      phone,
      virtualAccount: { number: vaData.account_number, bank: vaData.bank },
      balance: 0,
      lastUpdated: new Date()
    });

    console.log("User created successfully:", user);
    res.json({ message: 'User created!', user });

  } catch (err) {
    // ----- FULL ERROR LOGGING -----
    console.error("----- ERROR DETAILS START -----");
    console.error("FULL ERROR OBJECT:", err);
    console.error("err.response:", err.response);
    console.error("err.request:", err.request);
    console.error("err.message:", err.message);
    console.error("----- ERROR DETAILS END -----");

    // Send full error to frontend
    res.status(500).json({
      error: {
        message: err.message || "Server error",
        response: err.response?.data || null,
        request: err.request ? "Request was made but no response received" : null
      }
    });
  }
});

// ----- Start server -----
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
