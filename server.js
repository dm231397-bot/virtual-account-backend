require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const bodyParser = require('body-parser');
const User = require('./models/User'); // Make sure this matches your folder structure exactly

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log('MongoDB connection error:', err));

// Create a virtual account for a new user
app.post('/create-user', async (req, res) => {
    const { name, email, phone } = req.body;
    try {
        // Create Paystack Virtual Account
        const response = await axios.post(
            'https://api.paystack.co/virtual-account/numbers',
            {
                customer: {
                    name,
                    email
                },
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

        const vaData = response.data.data;

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

        res.json({
            message: "User created with virtual account!",
            user
        });
    } catch (error) {
        console.error(error.response?.data || error);
        res.status(500).json({ error: error.response?.data || "Something went wrong" });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
