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

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Health check endpoint
app.get('/', (req, res) => res.send('Backend is live!'));

// Create user endpoint
app.post('/create-user', async (req, res) => {
  const { name, email, phone } = req.body;

  if (!name || !email || !phone) {
    console.error("Validation error: missing name, email, or phone");
    return res.status(400).json({ error: "Name, email, and phone are required" });
  }

  try {
    // Create Paystack virtual account
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

    console.log("User created:", user);
    res.json({ message: 'User created!', user });

  } catch (err) {
    // ----- FULL ERROR LOGGING -----
    if (err.response) {
      // Paystack or Axios returned an error response
      console.error("Paystack / Axios Error Response:", err.response.data);
      res.status(err.response.status || 500).json({ error: err.response.data });
    } else if (err.request) {
      // No response received
      console.error("No response received from Paystack:", err.request);
      res.status(500).json({ error: "No response from Paystack" });
    } else {
      // Other errors
      console.error("Server error:", err.message);
      res.status(500).json({ error: err.message });
    }
  }
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
