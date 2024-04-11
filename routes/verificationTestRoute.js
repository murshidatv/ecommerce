const express = require('express');
const router = express.Router();
const { verify } = require('./verification');

// Route for simulating correct OTP entry
router.post('/test/correct-otp', async (req, res) => {
    const { userId, enteredOTP } = req.body;
    const result = await verify(userId, enteredOTP);
    res.json(result);
});

// Route for simulating incorrect OTP entry
router.post('/test/incorrect-otp', async (req, res) => {
    const { userId, enteredOTP } = req.body;
    // Use an incorrect OTP for testing
    const incorrectOTP = '654321';
    const result = await verify(userId, incorrectOTP);
    res.json(result);
});

// Route for simulating expired OTP
router.post('/test/expired-otp', async (req, res) => {
    const { userId, enteredOTP } = req.body;
    // Set expiry time to a past time (e.g., 1 minute ago) for testing
    // Assume OTP expiry time is stored in the user's data
    const expiredOTPExpiryTime = Math.floor(new Date().getTime() / 1000) - 60;
    const result = await verify(userId, enteredOTP, expiredOTPExpiryTime);
    res.json(result);
});

// Route for simulating no OTP entered
router.post('/test/no-otp', async (req, res) => {
    const { userId } = req.body;
    // Simulate no OTP entered by passing an empty string
    const enteredOTP = '';
    const result = await verify(userId, enteredOTP);
    res.json(result);
});

module.exports = router;
