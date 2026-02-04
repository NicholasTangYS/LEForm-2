/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
require('dotenv').config();
const axios = require('axios');
const { setGlobalOptions } = require("firebase-functions/v2");
const { onRequest } = require("firebase-functions/v2/https");
const firebase = require("firebase-admin");
const express = require('express');
const os = require("os");
const app = express();
//const puppeteer = require('puppeteer');
const fs = require("fs");
const path = require("path");
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const jwt = require('jsonwebtoken');
const mysql = require('mysql2');
const logger = require("firebase-functions/logger");
const cors = require('cors');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Important: Stripe webhooks require the raw body to verify the signature.
// We'll use a specific route for the webhook that handles raw body.
const crypto = require('crypto');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { OAuth2Client } = require('google-auth-library');
const JWT_SECRET = process.env.JWT_SECRET;
// const chromium = require('chromium');
const bcrypt = require('bcrypt');
const saltRounds = 10; // The cost factor for hashing
// puppeteer.use(StealthPlugin());
puppeteer.use(StealthPlugin());
const db = mysql.createConnection({
  host: 'db-mysql-sgp1-44557-do-user-17663198-0.k.db.ondigitalocean.com',  // DigitalOcean's public hostname
  user: 'doadmin',               // MySQL user
  password: process.env.DB_PASSWORD,              // MySQL password
  database: 'altomate_LE', // The database you're connecting to
  port: 25060,             // Replace with your MySQL port (e.g., 25060)
  keepAliveInitialDelay: 10000, // keepalive
  enableKeepAlive: true // keepalive
});

const allowedOrigins = [
  'https://le1-form.web.app', // Production Angular app
  'http://localhost:4200',    // Your typical Angular local dev server
  'http://127.0.0.1:4200',     // Alternative localhost address
  'https://altomate.io',
  'http://localhost:5001',
  'https://www.altomate.io',
  'https://altomate.io/my/free-company-name-check',
  'https://crm.eta-co.com.my',
  'https://le-form.softon.io'
];
const corsOptions = {
  origin: allowedOrigins, // ⬅️ ONLY allow your deployed Angular app
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true, // If you need to send cookies/auth headers
};

const cookiesDir = path.join(__dirname, "cookies");
const profilesBaseDir = path.join(__dirname, "puppeteer_profiles");
if (!fs.existsSync(cookiesDir)) fs.mkdirSync(cookiesDir);
if (!fs.existsSync(profilesBaseDir)) fs.mkdirSync(profilesBaseDir);

app.use(cors(corsOptions)); // 3. Use the middleware

// 1. Stripe Webhook - MUST be before express.json() for raw body
app.post('/api/payment/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    logger.error(`Webhook Signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const { userId, tokens, discountCode } = paymentIntent.metadata;

    logger.info(`✨ Payment succeeded for user ${userId}: ${paymentIntent.id}`);

    try {
      await processCreditPurchase(
        userId,
        paymentIntent.amount / 100, // Stripe amount is in cents
        tokens,
        'STRIPE',
        paymentIntent.id,
        discountCode
      );
      logger.info(`✅ Credits added successfully for user ${userId}`);
    } catch (purchaseErr) {
      logger.error(`❌ Failed to add credits for user ${userId}: ${purchaseErr.message}`);
      // Note: We return 200 to Stripe because we received the event, 
      // but we should log the error for manual intervention.
    }
  }

  res.json({ received: true });
});

app.use(express.json());

// 2. Create Stripe Payment Intent
app.post('/api/payment/stripe/create-payment-intent', async (req, res) => {
  const { userId, tokens, discountCode, amount } = req.body;

  if (!userId || !tokens || !amount) {
    return res.status(400).json({ message: 'Missing required payment details' });
  }

  try {
    // Fetch user email for description and receipt
    const userEmail = await new Promise((resolve, reject) => {
      db.query('SELECT email FROM le_user WHERE ID = ?', [userId], (err, results) => {
        if (err) {
          logger.error(`Database error fetching user email: ${err.message}`);
          resolve('unknown@example.com'); // Fallback
        } else {
          resolve(results[0]?.email || 'unknown@example.com');
        }
      });
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe expects cents
      currency: 'usd', // Adjust as needed
      description: `LE Token Topup - ${userEmail}`,
      receipt_email: userEmail !== 'unknown@example.com' ? userEmail : undefined,
      automatic_payment_methods: { enabled: true },
      metadata: {
        userId: userId.toString(),
        userEmail: userEmail,
        tokens: tokens.toString(),
        discountCode: discountCode || ''
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret
    });
  } catch (err) {
    logger.error(`Error creating payment intent: ${err.message}`);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// 3. Confirm payment and fulfill (Explicit confirmation from frontend)
app.post('/api/payment/stripe/confirm-payment', async (req, res) => {
  const { paymentIntentId } = req.body;

  if (!paymentIntentId) {
    return res.status(400).json({ success: false, message: 'Missing payment intent ID' });
  }

  try {
    // Retrieve the payment intent from Stripe to verify status
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: `Payment status is ${paymentIntent.status}. Expected 'succeeded'.`
      });
    }

    const { userId, tokens, discountCode } = paymentIntent.metadata;

    if (!userId || !tokens) {
      return res.status(500).json({
        success: false,
        message: 'Payment metadata missing. Manual verification required.'
      });
    }

    // Call processCreditPurchase (idempotent)
    const result = await processCreditPurchase(
      userId,
      paymentIntent.amount / 100,
      tokens,
      'STRIPE',
      paymentIntent.id,
      discountCode
    );

    res.json(result);
  } catch (err) {
    logger.error(`Error confirm-payment: ${err.message}`);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/getUser', async (req, res) => {
  // const { invoiceId } = req.params;

  try {
    // Step 1: Retrieve the main invoice details
    const query = 'SELECT * FROM le_user';
    db.query(query, (err, results) => {
      if (err) throw err;
      res.json(results);
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('An error occurred while retrieving the invoice');
  }
});

app.post('/register', async (req, res) => {
  try {
    const { name, email, contact, password } = req.body;

    // Step 1: Validate required fields
    if (!name || !email || !contact || !password) {
      return res.status(400).send('All fields are required.');
    }

    // Optional: Add more robust validation (e.g., password length)
    if (password.length < 8) {
      return res.status(400).send('Password must be at least 8 characters long.');
    }

    // Step 2: Check if user already exists
    const checkUserQuery = 'SELECT ID FROM le_user WHERE email = ?';
    db.query(checkUserQuery, [email], async (err, results) => {
      if (err) {
        console.error('Database error during user check:', err);
        return res.status(500).send('An internal server error occurred.');
      }

      if (results.length > 0) {
        return res.status(409).send('User with this email already exists.');
      }

      // Step 3: Hash the password before saving
      // This is the crucial security step.
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Step 4: Insert the new user into the database with the hashed password
      const insertQuery = 'INSERT INTO le_user (Name, email, contact_no, password) VALUES (?, ?, ?, ?)';
      db.query(insertQuery, [name, email, contact, hashedPassword], async (insertErr, insertResult) => {
        if (insertErr) {
          console.error('Database error during registration:', insertErr);
          return res.status(500).send('An error occurred during user registration.');
        }

        const userId = insertResult.insertId;
        try {
          await grantFreeCredits(userId, 5, 'Welcome Bonus');
        } catch (creditErr) {
          console.error('Failed to grant welcome credits:', creditErr);
        }

        // Generate JWTs for auto-login
        const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1d' });
        const refreshToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

        // Step 5: Respond with success message and tokens
        res.status(201).json({
          message: 'User registered successfully!',
          isNewUser: true,
          accessToken,
          refreshToken,
          userID: userId
        });
      });
    });

  } catch (err) {
    console.error('General error during registration:', err);
    res.status(500).send('An error occurred during the registration process.');
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).send('Email and password are required.');
    }

    // Step 1: Query the database for the user by email
    const query = 'SELECT * FROM le_user WHERE email = ?';
    db.query(query, [email], async (err, results) => {
      if (err) {
        console.error('Database error during login:', err);
        return res.status(500).send('An internal server error occurred.');
      }

      // Step 2: Check if a user was found
      if (results.length === 0) {
        // Use a generic error message to prevent user enumeration attacks
        return res.status(401).send('Invalid email or password.');
      }

      const user = results[0];
      const hashedPasswordInDb = user.password;

      // Step 3: Securely compare the provided password with the stored hash
      const isMatch = await bcrypt.compare(password, hashedPasswordInDb);

      if (!isMatch) {
        // Passwords do not match
        return res.status(401).send('Invalid email or password.');
      }

      // Step 4: If login is successful, generate JWTs and return them
      // The password is correct, proceed with token generation
      const accessToken = jwt.sign({ id: user.ID }, process.env.JWT_SECRET, { expiresIn: '1d' });
      const refreshToken = jwt.sign({ id: user.ID }, process.env.JWT_SECRET, { expiresIn: '7d' });
      const userID = user.ID;

      res.json({ accessToken, refreshToken, userID });
    });
  } catch (err) {
    console.error('General error during login:', err);
    res.status(500).send('An error occurred during the login process.');
  }
});

app.post('/google-login', async (req, res) => {
  const { idToken } = req.body;
  const client = new OAuth2Client('167207020456-fpm4bkh744rak7jto3h7689m84ees3mk.apps.googleusercontent.com');

  if (!idToken) {
    return res.status(400).json({ message: 'Google ID Token is required.' });
  }

  try {
    // 1. Verify the Google ID Token
    const ticket = await client.verifyIdToken({
      idToken: idToken,
      audience: '167207020456-fpm4bkh744rak7jto3h7689m84ees3mk.apps.googleusercontent.com',
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ message: 'Google account must have an email.' });
    }

    // 2. Check if user exists in DB
    const query = 'SELECT * FROM le_user WHERE email = ?';
    db.query(query, [email], async (err, results) => {
      if (err) {
        console.error('Database error during Google login:', err);
        return res.status(500).json({ message: 'Internal server error.' });
      }

      let user = results[0];
      let userId;
      let isNewUser = false;

      if (!user) {
        // 3. New User: Create account
        // Password and contact are nullable now, so we can skip them
        const insertPromise = new Promise((resolve, reject) => {
          db.query('INSERT INTO le_user (Name, email, google_id) VALUES (?, ?, ?)',
            [name, email, googleId],
            (err, result) => {
              if (err) reject(err);
              else resolve(result);
            }
          );
        });

        try {
          const result = await insertPromise;
          userId = result.insertId;
          isNewUser = true;
          // Grant welcome credits
          await grantFreeCredits(userId, 5, 'Welcome Bonus');
        } catch (insertErr) {
          console.error('Error creating Google user:', insertErr);
          return res.status(500).json({ message: 'Failed to create user.' });
        }

      } else {
        // 4. Existing User
        userId = user.ID;
        isNewUser = false;
        // Optionally update google_id if it wasn't there
        if (!user.google_id) {
          db.query('UPDATE le_user SET google_id = ? WHERE ID = ?', [googleId, userId], (err) => {
            if (err) console.error('Failed to link google_id', err);
          });
        }
      }

      // 5. Generate JWTs (Same as normal login)
      const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '1d' });
      const refreshToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '7d' });

      res.json({ accessToken, refreshToken, userID: userId, isNewUser });
    });

  } catch (error) {
    console.error('Google login error:', error);
    res.status(401).json({ message: 'Invalid Google Token.' });
  }
});

app.get('/getUserDetails/:userID', async (req, res) => {
  const { userID } = req.params;

  try {
    // Step 1: Retrieve the main invoice details
    const query = 'SELECT * FROM le_user where ID =?';
    db.query(query, [userID], (err, results) => {
      if (err) throw err;
      res.json(results);
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('An error occurred while retrieving the invoice');
  }
});

app.put('/updateUserDetails/:Id', async (req, res) => {
  // 1. Extract the project ID from the URL parameters
  const { Id } = req.params;

  // 2. Extract the new data payload from the request body
  const { contact_no, address, legal_entity_name, co_reg_no, tin_no } = req.body;

  // Check if the required data is present (optional: decide which fields are mandatory)
  if (contact_no === undefined || address === undefined) {
    return res.status(400).json({
      message: 'Missing required field: "contact_no" or "address" in request body.'
    });
  }

  try {
    // SQL query to update the user details in the 'le_user' table
    const query = 'UPDATE le_user SET contact_no =?, address=?, legal_entity_name=?, co_reg_no=?, tin_no=? WHERE ID = ?';

    db.query(query, [contact_no, address, legal_entity_name, co_reg_no, tin_no, Id], (err, results) => {
      if (err) {
        console.error('Database error during update:', err);
        return res.status(500).json({
          message: 'Database error occurred during user update.',
          error: err.message
        });
      }

      // Check if any rows were actually updated
      if (results.affectedRows === 0) {
        return res.status(404).json({
          message: `User with ID ${Id} not found or no changes were made.`
        });
      }

      // Successful update response
      res.json({
        message: `User ID ${Id} updated successfully.`,
        affectedRows: results.affectedRows
      });
    });
  } catch (err) {
    console.error('General error during user update:', err);
    res.status(500).send('An internal error occurred while updating the user data');
  }
});


app.post('/changePassword/:Id', (req, res) => {
  // 1. Extract ID from URL and passwords from the request body
  const { Id } = req.params;
  const { currentPassword, newPassword } = req.body;

  // 2. Validate that the required data was provided
  if (!currentPassword || !newPassword) {
    return res.status(400).json({
      message: 'Both "currentPassword" and "newPassword" are required in the request body.'
    });
  }

  // Optional: Add backend validation for password length
  if (newPassword.length < 8) {
    return res.status(400).json({
      message: 'New password must be at least 8 characters long.'
    });
  }

  try {
    // 3. Find the user in the database to get their current hashed password
    const selectQuery = 'SELECT password FROM le_user WHERE ID = ?';

    db.query(selectQuery, [Id], async (err, results) => {
      if (err) {
        console.error('Database error during user lookup:', err);
        return res.status(500).json({ message: 'A database error occurred.' });
      }

      // 4. Handle the case where the user is not found
      if (results.length === 0) {
        return res.status(404).json({ message: `User with ID ${Id} not found.` });
      }

      const hashedPasswordFromDB = results[0].password;

      // 5. Securely compare the provided current password with the one from the database
      const isMatch = await bcrypt.compare(currentPassword, hashedPasswordFromDB);

      if (!isMatch) {
        // If passwords do not match, send a clear but secure error
        return res.status(401).json({ message: 'Incorrect current password.' });
      }

      // 6. If the current password is correct, hash the new password
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // 7. Update the database with the new hashed password
      const updateQuery = 'UPDATE le_user SET password = ? WHERE ID = ?';
      db.query(updateQuery, [hashedNewPassword, Id], (updateErr, updateResults) => {
        if (updateErr) {
          console.error('Database error during password update:', updateErr);
          return res.status(500).json({ message: 'A database error occurred during the update.' });
        }

        // 8. Send a success response
        res.status(200).json({
          message: `Password for user ID ${Id} has been updated successfully.`
        });
      });
    });
  } catch (err) {
    // Catch any other server errors
    console.error('A general error occurred during password change:', err);
    res.status(500).send('An internal server error occurred.');
  }
});

app.post('/request-password-reset', (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  // 1. Check if user exists
  const findUserQuery = 'SELECT ID FROM le_user WHERE email = ?';
  db.query(findUserQuery, [email], (err, results) => {
    if (err) {
      console.error('DB error finding user for password reset:', err);
      return res.status(500).json({ message: 'An internal error occurred.' });
    }

    if (results.length === 0) {
      // IMPORTANT: Do not reveal if an email exists or not.
      // Send a generic success message to prevent user enumeration.
      return res.status(200).json({ message: 'If an account with that email exists, a password reset code has been sent.' });
    }

    // 2. Generate a secure random token
    const resetCode = crypto.randomInt(100000, 999999).toString(); // 6-digit code
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + 1); // Token is valid for 1 hour

    // 3. Store the token and expiry in the database
    const updateTokenQuery = 'UPDATE le_user SET reset_token = ?, reset_token_expiry = ? WHERE email = ?';
    db.query(updateTokenQuery, [resetCode, expiry, email], async (updateErr, updateResult) => {
      if (updateErr) {
        console.error('DB error storing reset token:', updateErr);
        return res.status(500).json({ message: 'An internal error occurred.' });
      }

      // 4. Send the email using EngineMailer
      try {
        const subject = "Password Reset Code - Softon Support";
        const body = `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2>Password Reset Request</h2>
            <p>You requested a password reset for your Softon account.</p>
            <p>Your 6-digit reset code is:</p>
            <div style="font-size: 32px; font-weight: bold; color: #7a5af8; padding: 10px; background: #f4f4f4; border-radius: 8px; display: inline-block;">
              ${resetCode}
            </div>
            <p>This code is valid for 1 hour. If you did not request this, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #777;">Softon Support Team</p>
          </div>
        `;

        const sendMailData = JSON.stringify({
          "ToEmail": email,
          "Subject": subject,
          "SenderEmail": "info@softon.io",
          "SubmittedContent": body,
          "SenderName": "Softon Support"
        });

        const config = {
          method: 'post',
          url: 'https://api.enginemailer.com/RESTAPI/V2/Submission/SendEmail',
          headers: {
            'APIKey': process.env.ENGINE_MAILER_KEY,
            'Content-Type': 'application/json',
          },
          data: sendMailData
        };

        if (process.env.ENGINE_MAILER_KEY) {
          await axios.request(config);
          logger.info(`Password reset code sent to ${email} via EngineMailer.`);
        } else {
          logger.warn(`ENGINE_MAILER_KEY missing. Reset code for ${email} is ${resetCode}`);
        }

        res.status(200).json({
          message: 'A password reset code has been sent to your email.'
        });

      } catch (mailErr) {
        console.error('Error sending reset email:', mailErr.response?.data || mailErr.message);
        // Even if mail fails, we don't want to necessarily fail the whole request, 
        // but since we haven't provided the code in the response anymore, we should inform the user.
        res.status(500).json({ message: 'Failed to send reset email. Please try again later.' });
      }
    });
  });
});

app.post('/reset-password', async (req, res) => {
  const { email, resetCode, newPassword } = req.body;

  if (!email || !resetCode || !newPassword) {
    return res.status(400).json({ message: 'Email, reset code, and new password are required.' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
  }

  // 1. Find user by email, token, and check expiry
  const findUserQuery = 'SELECT ID FROM le_user WHERE email = ? AND reset_token = ? AND reset_token_expiry > NOW()';
  db.query(findUserQuery, [email, resetCode], async (err, results) => {
    if (err) {
      console.error('DB error verifying reset token:', err);
      return res.status(500).json({ message: 'An internal error occurred.' });
    }

    if (results.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired reset code.' });
    }

    const userId = results[0].ID;

    try {
      // 2. Hash the new password
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // 3. Update the password and clear the reset token
      const updatePasswordQuery = 'UPDATE le_user SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE ID = ?';
      db.query(updatePasswordQuery, [hashedPassword, userId], (updateErr, updateResult) => {
        if (updateErr) {
          console.error('DB error updating password:', updateErr);
          return res.status(500).json({ message: 'An internal error occurred.' });
        }

        logger.info(`Password successfully reset for user ID: ${userId}`);
        res.status(200).json({ message: 'Your password has been reset successfully. You can now log in.' });
      });
    } catch (hashError) {
      console.error('Error hashing new password:', hashError);
      res.status(500).json({ message: 'An internal error occurred.' });
    }
  });
});

app.get('/getProjectByUser/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    // Step 1: Retrieve the main invoice details
    const query = 'SELECT ID, name, status, year_end, created_on, updated_on FROM le_project where userID = ? order by updated_on desc';
    db.query(query, [userId], (err, results) => {
      if (err) throw err;
      res.json(results);
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('An error occurred while retrieving the project');
  }
});

app.get('/getProjectDetails/:Id', async (req, res) => {
  const { Id } = req.params;

  try {
    // Step 1: Retrieve the main invoice details
    const query = 'SELECT data, status FROM le_project where ID = ?';
    db.query(query, [Id], (err, results) => {
      if (err) throw err;
      res.json(results);
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('An error occurred while retrieving the project data');
  }
});

app.put('/updateProjectDetails/:Id', async (req, res) => {
  // 1. Extract the project ID from the URL parameters
  const { Id } = req.params;

  // 2. Extract the new data payload from the request body
  const newData = req.body.data;

  // Check if the data is present
  if (newData === undefined) {
    return res.status(400).json({
      message: 'Missing required field: "data" in request body.'
    });
  }

  // --- Dynamic SQL Setup ---
  // Array to hold the parts of the SQL SET clause (e.g., 'name = ?')
  const setClauses = [];
  // Array to hold the values corresponding to the placeholders (?)
  const values = [];

  // All updates will include the latest full JSON payload for the 'data' column
  setClauses.push('data = ?');
  values.push(JSON.stringify(newData));

  // Also include updated_on timestamp
  setClauses.push('updated_on = NOW()');

  // --- 3. Conditional Updates for Mapped Columns ---

  // A. Map Company Name to 'name' column
  if (newData.Company_Name) {
    setClauses.push('name = ?');
    values.push(newData.Company_Name);
  }

  // B. Map Accounting Period components to 'year_end' column (DATE format YYYY-MM-DD)
  const combinedData = newData; // Use newData directly if the date fields are at the top level

  const day = combinedData.Accounting_Period_To_Day;
  const month = combinedData.Accounting_Period_To_Month;
  const year = combinedData.Accounting_Period_To_Year;

  if (day && month && year) {
    // Construct the date string in 'YYYY-MM-DD' format
    const yearEndString = `${year}-${month}-${day}`;

    setClauses.push('year_end = ?');
    values.push(yearEndString);
  }

  // --- 4. Final Query Construction ---
  // Join the set clauses (e.g., "data = ?, name = ?, year_end = ?")
  const updateSet = setClauses.join(', ');

  // The final value needed for the WHERE clause (the ID) is appended last
  values.push(Id);

  // SQL query to update the 'le_project' table
  const query = `UPDATE le_project SET ${updateSet} WHERE ID = ?`;

  // Log the constructed query and values for debugging (optional)
  // console.log('SQL Query:', query);
  // console.log('SQL Values:', values);

  try {
    db.query(query, values, (err, results) => {
      if (err) {
        console.error('Database error during update:', err);
        return res.status(500).json({
          message: 'Database error occurred during project update.',
          error: err.message
        });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({
          message: `Project with ID ${Id} not found or no changes were made.`
        });
      }

      res.json({
        message: `Project ID ${Id} updated successfully.`,
        affectedRows: results.affectedRows
      });
    });
  } catch (err) {
    console.error('General error during project update:', err);
    res.status(500).send('An internal error occurred while updating the project data');
  }
});

app.patch('/api/projects/status/:Id', async (req, res) => {
  const { Id } = req.params;
  const { status } = req.body;

  if (status === undefined) {
    return res.status(400).json({ message: 'Status is required' });
  }

  const query = 'UPDATE le_project SET status = ?, updated_on = NOW() WHERE ID = ?';
  db.query(query, [status, Id], (err, results) => {
    if (err) {
      console.error('Error updating status:', err);
      return res.status(500).json({ message: 'Error updating project status' });
    }
    res.json({ success: true, message: 'Project status updated' });
  });
});

app.post('/createProject', async (req, res) => {
  // Destructure required fields from the request body
  let { userId, name, status, year_end, data } = req.body;

  // Helper to parse "DD/MM/YYYY" -> "YYYY-MM-DD"
  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      // parts[0] = Day, parts[1] = Month, parts[2] = Year
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return null;
  };

  // If name is missing, try to extract from data
  if (!name && data && data.Company_Name) {
    name = data.Company_Name;
  }

  // If year_end is missing, try to extract from data
  if (!year_end && data) {
    if (data.Accounting_Period_To) {
      const parsed = parseDate(data.Accounting_Period_To);
      if (parsed) year_end = parsed;
    } else if (data.Accounting_Period_To_Day && data.Accounting_Period_To_Month && data.Accounting_Period_To_Year) {
      year_end = `${data.Accounting_Period_To_Year}-${data.Accounting_Period_To_Month}-${data.Accounting_Period_To_Day}`;
    }
  }

  // Basic validation
  if (!userId || !name || !status || !year_end) {
    return res.status(400).json({ message: 'Missing required fields: userId, name, status, or year_end.' });
  }

  // Convert the 'data' object (or null/undefined) into a JSON string
  // This is crucial for storing complex structures into a single column (JSON or TEXT type).
  let dataJsonString;
  try {
    dataJsonString = data ? JSON.stringify(data) : null;
  } catch (e) {
    console.error('Failed to stringify project data:', e);
    return res.status(400).json({ message: 'Invalid JSON format provided for the "data" column.' });
  }

  // SQL query to insert a new project.
  // We use NOW() for created_on and updated_on to record the current timestamp.
  const query = `
        INSERT INTO le_project 
        (userID, name, status, year_end, data, created_on, updated_on) 
        VALUES (?, ?, ?, ?, ?, NOW(), NOW())
    `;

  // The parameters array: Note that dataJsonString is passed here.
  const params = [userId, name, status, year_end, dataJsonString];

  try {
    db.query(query, params, (err, results) => {
      if (err) {
        console.error('Database insertion error:', err);
        // Throwing the error here lets the outer catch block handle the 500 response
        return res.status(500).json({ message: 'Database error occurred during project creation.' });
      }

      // Send back the success status and the ID of the newly created project
      res.status(201).json({
        message: 'Project created successfully',
        projectId: results.insertId // Assuming your DB driver returns insertId for new rows
      });
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('An unexpected error occurred while creating the project');
  }
});


////////////// MYdata /////////////

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- HELPER: CHECK ONE COMPANY ---
async function checkSingleCompany(page, companyName) {
  try {
    let searchName = companyName.toUpperCase().trim();
    // Ensure standard formatting
    if (!searchName.endsWith('SDN BHD') && !searchName.endsWith('SDN. BHD.')) {
      searchName = `${searchName} SDN BHD`;
    }

    console.log(`   👉 Checking: ${searchName}`);

    const searchBox = 'input[type="text"][placeholder*="search" i]';

    // 1. ROBUST CLEAR (Fixes the issue where old text remains)
    await page.click(searchBox, { clickCount: 3 });
    await page.keyboard.press('Backspace');
    await page.evaluate((sel) => document.querySelector(sel).value = '', searchBox);
    await delay(200);

    // 2. TYPE & ENTER
    await page.type(searchBox, searchName, { delay: 50 });
    await page.keyboard.press('Enter');

    // 3. WAIT FOR RESULT
    try {
      await page.waitForFunction(
        () => {
          const txt = document.body.innerText;
          return txt.includes('entities found') ||
            txt.includes('entity found') ||
            txt.includes('No record found');
        },
        { timeout: 20000 } // 20s timeout per company (Increased for Cloud)
      );
    } catch (e) {
      console.log("      ⚠️ Timeout (Page slow/blocked)");
    }
    await delay(1000);

    // 4. STRICT VALIDATION LOGIC
    const result = await page.evaluate(() => {
      const bodyText = document.body.innerText;

      // Login Wall / Blocked
      if (bodyText.includes('Sign In') && bodyText.includes('for the full results')) {
        return { available: false, reason: "Login Wall" };
      }

      // Explicit Success (The only time we say TRUE)
      if (bodyText.includes('No record found') || bodyText.includes('No entity found')) {
        return { available: true, reason: "No Record Found" };
      }

      // Check Rows
      const rows = document.querySelectorAll('tbody tr');
      if (rows.length > 0) {
        if (rows.length === 1 && rows[0].innerText.includes('No matching')) {
          return { available: true, reason: "No Matching Rows" };
        }
        return { available: false, reason: "Taken (Rows Exist)" };
      }

      // Fallback: Empty table but no "No Record" text -> Assume Failed/Blocked
      return { available: false, reason: "Page Load Error" };
    });

    console.log(`      -> Result: ${result.available ? "✅ AVAILABLE" : "❌ TAKEN"} (${result.reason})`);

    return {
      name: searchName,
      available: result.available,
      reason: result.reason
    };

  } catch (error) {
    console.error(`      Error checking ${companyName}:`, error.message);
    // If script fails, mark as taken to be safe
    return { name: companyName, available: false, reason: "Script Error" };
  }
}
// ---------------------------------------------------------
// MODIFIED: Removed SessionPool (Stateless for Cloud)
// But KEPT your exact scraping steps/logic
// ---------------------------------------------------------
async function checkMyData(companyNames) {
  let browser;
  try {
    console.log(`[Scraper] Starting check for: ${companyNames.join(", ")}`);

    // Launch options optimized for Cloud Functions
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-gpu",
        "--window-size=1920,1080", // Force Desktop Size
        "--disable-blink-features=AutomationControlled" // Hide automation flag
      ],
      timeout: 60000,
      protocolTimeout: 120000,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    await page.goto("https://www.mydata-ssm.com.my/home", { waitUntil: "domcontentloaded", timeout: 60000 });
    await delay(3000);

    // --- DROPDOWN LOGIC ---
    try {
      const dropdownClicked = await page.evaluate(() => {
        const button = document.getElementById('dropdownMenu1');
        if (button) { button.click(); return true; }
        return false;
      });
      if (dropdownClicked) {
        await delay(1500);
        await page.evaluate(() => {
          const menuItems = Array.from(document.querySelectorAll('a.dropdown-item, li a, .dropdown-menu a, button'));
          const companyOption = menuItems.find(el => el.textContent.trim() === 'Company');
          if (companyOption) companyOption.click();
        });
        await delay(2000);
      }
    } catch (error) { }

    const searchSelectors = ['input[placeholder*="search" i]', 'input[name*="search"]', 'input[type="text"]'];
    let searchBox = null;
    for (const sel of searchSelectors) {
      try { await page.waitForSelector(sel, { visible: true, timeout: 5000 }); searchBox = sel; break; } catch { }
    }

    if (!searchBox) throw new Error("Search box not found");

    const results = [];

    // --- LOOP LOGIC ---
    for (let idx = 0; idx < companyNames.length; idx++) {
      let companyName = companyNames[idx] ? companyNames[idx].toUpperCase() : "";
      if (!companyName || !companyName.trim()) continue;

      const upperName = companyName.toUpperCase().trim();
      if (!upperName.endsWith('SDN BHD') && !upperName.endsWith('SDN. BHD.')) {
        companyName = `${companyName} SDN BHD`;
      }

      console.log(`🔍 Searching: ${companyName}`);

      await page.click(searchBox, { clickCount: 3 });
      await page.keyboard.press('Backspace');
      await delay(500);
      await page.type(searchBox, companyName, { delay: 100 });
      await page.keyboard.press("Enter");

      await delay(3000);

      // Check Login
      const needsLogin = await page.evaluate(() => {
        const bodyText = document.body.innerText;
        return bodyText.includes('Sign In') && bodyText.includes('for the full results');
      });

      if (needsLogin) {
        results.push({
          name: companyName,
          available: false,
          details: { exists: true, reason: "signin_required" }
        });
        continue;
      }

      // Wait for results
      for (let i = 0; i < 20; i++) {
        const hasResults = await page.evaluate(() =>
          document.body.innerText.includes('entities found') ||
          document.body.innerText.includes('entity found')
        );
        if (hasResults) break;
        await delay(1000);
      }
      await delay(2000);

      // Extract
      const companyCount = await page.evaluate(() => {
        if (document.body.innerText.includes('No record found') || document.body.innerText.includes('No entity found')) return 0;
        const rows = document.querySelectorAll('tbody tr');
        return rows.length;
      });

      results.push({
        name: companyName,
        available: companyCount === 0,
        details: { exists: companyCount > 0, totalMatches: companyCount }
      });
    }

    return results;

  } catch (error) {
    console.error("Puppeteer Error:", error);
    // CRITICAL CHANGE: Throw the error so the main loop detects the crash
    throw error;
  } finally {
    if (browser) await browser.close();
  }
}

// ---------------------------------------------------------
// BITRIX HELPER (Unchanged)
// ---------------------------------------------------------
async function pushLeadToBitrix24(leadData) {
  const BITRIX24_WEBHOOK = process.env.BITRIX24_WEBHOOK;

  if (!BITRIX24_WEBHOOK) {
    console.warn("⚠️ BITRIX24_WEBHOOK not configured");
    return { success: false };
  }

  try {
    let formattedPhone = '';
    if (leadData.phone) {
      let clean = leadData.phone.toString().replace(/\D/g, '');
      if (clean.length > 0) {
        if (clean.startsWith('60')) formattedPhone = '+' + clean;
        else if (clean.startsWith('0')) formattedPhone = '+60' + clean.substring(1);
        else formattedPhone = '+60' + clean;
      }
    }

    const companyNamesText = (leadData.companyNames || [])
      .map(c => {
        const matchCount = c.details?.totalMatches || 0;
        return `${c.name}: ${c.available ? '✅ Available' : '❌ Taken'} (${matchCount} matches)`;
      })
      .join('\n');

    let aiSuggestedNamesBlock = '';

    if (Array.isArray(leadData.aiFinalSuggestions) && leadData.aiFinalSuggestions.length > 0) {
      aiSuggestedNamesBlock = leadData.aiFinalSuggestions
        .map(s => s.name)
        .join(', ');

    }
    let firstName = '', lastName = '';
    if (leadData.name) {
      const nameParts = leadData.name.trim().split(' ');
      if (nameParts.length === 1) {
        firstName = nameParts[0];
      } else if (nameParts.length >= 2) {
        lastName = nameParts[0];
        firstName = nameParts.slice(1).join(' ');
      }
    }

    const companyName1 = leadData.companyNames[0] ? leadData.companyNames[0].name : '';
    const companyName2 = leadData.companyNames[1] ? leadData.companyNames[1].name : '';
    const companyName3 = leadData.companyNames[2] ? leadData.companyNames[2].name : '';

    const bitrixFields = {
      TITLE: `[Altomate Website Form] Company Name Check - ${leadData.name || 'Unknown'}`,
      ASSIGNED_BY_ID: 3807,
      SOURCE_ID: 36,
      NAME: firstName,
      LAST_NAME: lastName,
      UF_CRM_LEAD_1714097932490: leadData.email || '',
      UF_CRM_1714540318506: formattedPhone,
      PHONE: [{ VALUE: formattedPhone, VALUE_TYPE: "WORK" }],
      UF_CRM_1634365929857: companyName1,
      UF_CRM_LEAD_1650374555137: companyName2,
      UF_CRM_LEAD_1650374569570: companyName3,
      UTM_SOURCE: leadData.utm_source || null,
      UTM_CONTENT: leadData.utm_content || null,
      UTM_MEDIUM: leadData.utm_medium || null,
      UTM_CAMPAIGN: leadData.utm_campaign || null,
      UTM_TERM: leadData.utm_term || null,
      UF_CRM_1764817428: aiSuggestedNamesBlock,
      COMMENTS: `Company Names Checked:\n${companyNamesText}`
    };

    console.log(`📤 Sending lead to Bitrix24...`);

    await fetch(`${BITRIX24_WEBHOOK}/crm.lead.add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: bitrixFields, params: { REGISTER_SONET_EVENT: "Y" } })
    });

    console.log(`✅ Lead sent.`);
    return { success: true };

  } catch (error) {
    console.error("❌ Bitrix24 API error:", error.message);
    return { success: false, error: error.message };
  }
}

// ---------------------------------------------------------
// AI HELPER (Unchanged)
// ---------------------------------------------------------
async function generateAiCandidates(userIntents, excludeNames = []) {
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      console.error("⚠️ GEMINI_API_KEY missing");
      return [];
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    const userContext = userIntents.join(", ");

    const excludeContext = excludeNames.length > 0
      ? `CRITICAL INSTRUCTION: Do NOT generate these names again (they are taken): ${excludeNames.join(", ")}`
      : "";

    const prompt = `
      The user wants to register a company in Malaysia.
      User's original preferences (all taken): [ ${userContext} ]
      YOUR TASK: Generate exactly 8 NEW, DISTINCT candidate names.
      GUIDELINES:
      1. Names must end with "SDN BHD".
      2. Keep the "vibe" or keywords of the user's original preferences.
      3. ${excludeContext}
      Return ONLY a JSON array: [ { "name": "NAME SDN BHD", "reason": "Reasoning here" } ]
    `;

    console.log(`[AI] Generating batch... Excluded count: ${excludeNames.length}`);

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const suggestions = JSON.parse(text);

    return suggestions.map(s => ({
      name: s.name.toUpperCase().replace(/\s+SDN\.?\s*BHD\.?$/i, "").trim() + " SDN BHD",
      reason: s.reason
    }));

  } catch (error) {
    console.error("❌ AI Error:", error.message);
    return [];
  }
}

// ==========================================
// 2. API ENDPOINTS
// ==========================================
////////////// MYdata /////////////

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ==========================================
// SESSION MANAGERS
// ==========================================
class SessionManager {
  constructor(name) {
    this.name = name;
    this.createdAt = Date.now();
  }
}

class SessionPool {
  constructor(maxSessions = 5) {
    this.maxSessions = maxSessions;
    this.sessions = new Map();
  }

  async acquireSession() {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const profileDir = path.join(profilesBaseDir, sessionId);
    if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

    const session = {
      id: sessionId,
      profileDir: profileDir,
      manager: new SessionManager(sessionId),
      inUse: true,
      createdAt: Date.now()
    };

    this.sessions.set(sessionId, session);
    console.log(`🔓 Session acquired: ${sessionId}`);
    return session;
  }

  async releaseSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.inUse = false;
      console.log(`🔒 Session released: ${sessionId}`);
      setTimeout(() => { this.cleanupSession(sessionId); }, 5 * 60 * 1000);
    }
  }

  cleanupSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session && !session.inUse) {
      try {
        if (fs.existsSync(session.profileDir)) {
          fs.rmSync(session.profileDir, { recursive: true, force: true });
        }
        this.sessions.delete(sessionId);
        console.log(`🗑️ Session cleaned up: ${sessionId}`);
      } catch (error) {
        console.error(`⚠️ Error cleaning session ${sessionId}:`, error.message);
      }
    }
  }
}

const sessionPool = new SessionPool();

// ==========================================
// USER SESSION MANAGER (Updated to include AI Data)
// ==========================================
class LeadSessionManager {
  constructor() {
    this.sessions = new Map();
    this.SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes
    this.startCleanupJob();
  }

  // Generate unique key from contact info
  generateSessionKey(userData) {
    const email = (userData.email || '').toLowerCase().trim();
    const phone = (userData.phone || '').replace(/\D/g, ''); // Remove non-digits
    const name = (userData.name || '').toLowerCase().trim();

    // Use email+phone as primary key, fallback to name if missing
    const keyString = `${email}|${phone}|${name}`;
    return crypto.createHash('md5').update(keyString).digest('hex');
  }

  // Add or update session
  // ... inside LeadSessionManager class ...

  addResult(userData, companyNameResults) {
    const sessionKey = this.generateSessionKey(userData);
    const now = Date.now();
    const existing = this.sessions.get(sessionKey);

    // Combine existing results with new ones
    const previousResults = existing ? existing.results : [];
    const allResults = [...previousResults, ...companyNameResults];

    // Create session object
    const session = {
      sessionKey: sessionKey,
      userData: userData,
      results: allResults,
      aiFinalSuggestions: existing ? existing.aiFinalSuggestions : [],
      createdAt: existing ? existing.createdAt : now,
      lastUpdated: now,
      expiresAt: now + this.SESSION_TIMEOUT,

      // ✅ FIX: Preserve the pushed status and data from the existing session
      pushed: existing ? existing.pushed : false,
      bitrixResult: existing ? existing.bitrixResult : null,
      pushedAt: existing ? existing.pushedAt : null
    };

    this.sessions.set(sessionKey, session);
    console.log(`📝 Session ${sessionKey}: Total ${session.results.length} names. Pushed status: ${session.pushed}`);

    return {
      isNew: !existing,
      totalNames: session.results.length,
      sessionKey: sessionKey,
      // Return pushed status so the controller knows immediately
      alreadyPushed: session.pushed
    };
  }

  // Get session data
  getSession(sessionKey) {
    return this.sessions.get(sessionKey);
  }

  // Mark session as pushed to CRM
  markAsPushed(sessionKey, bitrixResult) {
    const session = this.sessions.get(sessionKey);
    if (session) {
      session.pushed = true;
      session.bitrixResult = bitrixResult;
      session.pushedAt = Date.now();
      console.log(`✅ Session ${sessionKey} marked as pushed to Bitrix24`);
    }
  }

  // Check if session should be pushed (3+ names OR expired)
  shouldPushSession(sessionKey) {
    const session = this.sessions.get(sessionKey);
    if (!session || session.pushed) return false;

    const hasThreeNames = session.results.length >= 3;
    const isExpired = Date.now() >= session.expiresAt;

    return hasThreeNames || isExpired;
  }

  // Cleanup expired sessions and push to Bitrix24
  async cleanupExpiredSessions() {
    const now = Date.now();

    for (const [sessionKey, session] of this.sessions.entries()) {
      // Push expired unpushed sessions
      if (!session.pushed && now >= session.expiresAt) {
        console.log(`⏰ Session ${sessionKey} expired, pushing to Bitrix24...`);
        const bitrixResult = await pushLeadToBitrix24(this.prepareLead(session));
        this.markAsPushed(sessionKey, bitrixResult);
      }

      // Delete old pushed sessions (after 10 minutes)
      if (session.pushed && now - session.pushedAt > 10 * 60 * 1000) {
        this.sessions.delete(sessionKey);
        console.log(`🗑️ Removed old session ${sessionKey}`);
      }
    }
  }

  // Prepare lead data for Bitrix24
  prepareLead(session) {
    return {
      ...session.userData,
      companyNames: session.results,
      // IMPORTANT: Pass the AI suggestions to the lead data
      aiFinalSuggestions: session.aiFinalSuggestions || [],
      submittedAt: new Date(session.createdAt).toISOString(),
      lastUpdatedAt: new Date(session.lastUpdated).toISOString(),
      source: 'company-name-checker',
      totalNamesChecked: session.results.length
    };
  }

  startCleanupJob() {
    setInterval(async () => {
      await this.cleanupExpiredSessions();
    }, 30 * 1000);
    console.log('🔄 Lead session cleanup job started');
  }
}

const leadSessionManager = new LeadSessionManager();

// ==========================================
// 🛠️ BITRIX24 INTEGRATION (Updated with AI Comments)
// ==========================================

async function performAiBackgroundJob(sessionKey, userData, allFailedNames) {
  try {
    console.log(`\n🤖 [BG] Starting AI Loop. Context: ${allFailedNames.join(", ")}`);

    const validSuggestions = [];

    // 'triedNamesHistory' prevents AI from suggesting names we already checked (and found taken)
    const triedNamesHistory = [...allFailedNames];

    let loopCount = 0;
    const MAX_LOOPS = 5; // Allow up to 5 attempts (5 * 8 = 40 names checked)

    // LOOP: Keep going until we have 3 names OR hit max attempts
    while (validSuggestions.length < 3 && loopCount < MAX_LOOPS) {
      loopCount++;
      const needed = 3 - validSuggestions.length;
      console.log(`\n[BG] 🔄 Loop ${loopCount}/${MAX_LOOPS}: Found ${validSuggestions.length}/3. Need ${needed} more.`);

      // 1. Generate Batch
      // We pass 'triedNamesHistory' so AI knows what NOT to give us
      const candidates = await generateAiCandidates(allFailedNames, triedNamesHistory);

      if (!candidates || candidates.length === 0) {
        console.log(`[BG] ⚠️ AI returned no names. Waiting before retry...`);
        await delay(2000);
        continue;
      }

      // 2. Filter out duplicates (in case AI ignored instructions)
      const newCandidates = candidates.filter(c => !triedNamesHistory.includes(c.name));
      const candidateNamesList = newCandidates.map(c => c.name);

      if (candidateNamesList.length === 0) {
        console.log(`[BG] ⚠️ AI returned only duplicates. Retrying...`);
        continue;
      }

      console.log(`[BG] 🔍 Checking batch of ${candidateNamesList.length}:`, candidateNamesList);

      // 3. Check Availability
      const checkResults = await checkMyDataMultiSession(candidateNamesList, userData);

      // 4. Process Results
      for (const res of checkResults) {
        // Stop immediately if we hit our target of 3
        if (validSuggestions.length >= 3) break;

        // Add to history (Taken OR Available) so we don't check again
        if (!triedNamesHistory.includes(res.name)) {
          triedNamesHistory.push(res.name);
        }

        if (res.available === true) {
          const originalInfo = candidates.find(c => c.name === res.name);
          validSuggestions.push({
            name: res.name,
            available: true,
            reason: originalInfo ? originalInfo.reason : "AI Suggestion"
          });
          console.log(`[BG] ✅ Found Available: ${res.name}`);
        }
      }

      // Small delay to prevent rate limiting
      if (validSuggestions.length < 3) await delay(2000);
    }

    console.log(`\n[BG] 🏁 Process finished. Total Available Found: ${validSuggestions.length}`);

    // 5. Push to Bitrix
    const leadSession = leadSessionManager.getSession(sessionKey);
    if (leadSession) {
      leadSession.aiFinalSuggestions = validSuggestions;

      console.log(`[BG] 📤 Pushing results to Bitrix24...`);
      const leadData = leadSessionManager.prepareLead(leadSession);

      // Using your corrected push function
      const bitrixResult = await pushLeadToBitrix24(leadData);
      leadSessionManager.markAsPushed(sessionKey, bitrixResult);
    }

  } catch (error) {
    console.error(`[BG] ❌ Critical Error in AI Job:`, error);
  }
}

// ==========================================
// 🛠️ BITRIX PUSH
// ==========================================

async function isLoginRequired(page) {
  const needsLogin = await page.evaluate(() => {
    const bodyText = document.body.innerText;
    return bodyText.includes('Sign In') && bodyText.includes('for the full results');
  });
  if (needsLogin) {
    console.log(`🔴 Detected "Sign In" prompt - company name is NOT available`);
    return true;
  }
  return false;
}

async function checkMyDataMultiSession(companyNames, userData) {
  const session = await sessionPool.acquireSession();
  let browser, page;

  try {
    console.log(`[${session.id}] 🚀 Starting browser...`);

    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage", // Vital for Cloud memory stability
        "--window-size=1280,800"
      ],
    });

    const pages = await browser.pages();
    page = pages[0] || (await browser.newPage());
    await page.setViewport({ width: 1280, height: 800 });

    await page.goto("https://www.mydata-ssm.com.my/home", { waitUntil: "domcontentloaded", timeout: 60000 });
    await delay(3000);

    // Filter Logic
    try {
      const dropdownClicked = await page.evaluate(() => {
        const button = document.getElementById('dropdownMenu1');
        if (button) { button.click(); return true; }
        return false;
      });
      if (dropdownClicked) {
        await delay(1500);
        await page.evaluate(() => {
          const menuItems = Array.from(document.querySelectorAll('a.dropdown-item, li a, .dropdown-menu a, button'));
          const companyOption = menuItems.find(el => el.textContent.trim() === 'Company');
          if (companyOption) companyOption.click();
        });
        await delay(2000);
      }
    } catch (error) { }

    const searchSelectors = ['input[placeholder*="search" i]', 'input[name*="search"]', 'input[type="text"]'];
    let searchBox = null;
    for (const sel of searchSelectors) {
      try { await page.waitForSelector(sel, { visible: true, timeout: 5000 }); searchBox = sel; break; } catch { }
    }

    if (!searchBox) throw new Error("Search box not found");

    const results = [];

    for (let idx = 0; idx < companyNames.length; idx++) {
      let companyName = companyNames[idx] ? companyNames[idx].toUpperCase() : "";
      if (!companyName || !companyName.trim()) continue;

      const upperName = companyName.toUpperCase().trim();
      if (!upperName.endsWith('SDN BHD') && !upperName.endsWith('SDN. BHD.')) {
        companyName = `${companyName} SDN BHD`;
      }

      console.log(`[${session.id}] 🔍 Searching: ${companyName}`);

      await page.click(searchBox, { clickCount: 3 });
      await page.keyboard.press('Backspace');
      await delay(500);
      await page.type(searchBox, companyName, { delay: 100 });
      await page.keyboard.press("Enter");

      await delay(3000);

      if (await isLoginRequired(page)) {
        results.push({
          name: companyName,
          available: false,
          details: { exists: true, reason: "signin_required" }
        });
        continue;
      }

      // Wait for results
      for (let i = 0; i < 20; i++) {
        const hasResults = await page.evaluate(() =>
          document.body.innerText.includes('entities found') ||
          document.body.innerText.includes('entity found')
        );
        if (hasResults) break;
        await delay(1000);
      }

      await delay(2000);

      // Extract
      const companyCount = await page.evaluate(() => {
        if (document.body.innerText.includes('No record found') || document.body.innerText.includes('No entity found')) return 0;
        const rows = document.querySelectorAll('tbody tr');
        return rows.length;
      });

      results.push({
        name: companyName,
        available: companyCount === 0, // 0 means available
        details: { exists: companyCount > 0, totalMatches: companyCount }
      });
    }

    await browser.close();
    console.log(`[${session.id}] 🔒 Browser closed`);
    return results;

  } catch (error) {
    if (browser) await browser.close();
    throw error;
  } finally {
    await sessionPool.releaseSession(session.id);
  }
}


// --- STEP 1: FETCH DATA (Smart Parser) ---
async function getBitrixLeadCandidates(leadId) {
  const BITRIX24_WEBHOOK = process.env.BITRIX24_WEBHOOK;
  try {
    const url = `${BITRIX24_WEBHOOK}/crm.lead.get?id=${leadId}`;
    const response = await axios.get(url);

    if (response.data.error || !response.data.result) {
      throw new Error("Lead not found");
    }
    const rawText = response.data.result["UF_CRM_1764817428"];
    if (!rawText) return [];

    console.log(`[Bitrix] Raw data: "${rawText}"`);

    let candidates = [];

    // Check format: Comma separated OR Numbered list
    if (rawText.includes(',') && !rawText.includes('1.')) {
      // Case: "NAME A, NAME B"
      candidates = rawText.split(',');
    } else {
      // Case: "1. NAME A 2. NAME B"
      candidates = rawText.split(/\d+\.\s+/);
    }

    return candidates
      .map(n => n.replace(/^\d+\.\s*/, '').trim()) // Clean formatting
      .filter(n => n.length > 0);

  } catch (error) {
    console.error(`[Bitrix] Fetch Error: ${error.message}`);
    throw error;
  }
}

// --- STEP 2: UPDATE BITRIX ---
async function updateBitrixLead(leadId, content) {
  const BITRIX24_WEBHOOK = process.env.BITRIX24_WEBHOOK;
  try {
    const finalContent = content && content.length > 0 ? content : "No valid candidates found (All Taken).";

    await axios.post(`${BITRIX24_WEBHOOK}/crm.lead.update`, {
      id: leadId,
      fields: { ["UF_CRM_1764817428"]: finalContent }
    });
    console.log(`[Bitrix] Updated Lead ${leadId} successfully.`);
  } catch (error) {
    console.error(`[Bitrix] Update Error: ${error.message}`);
  }
}


// --- MAIN PROCESSOR ---
app.post('/lead/validate', async (req, res) => {
  // Critical for Cloud Functions: Set 5 minute timeout
  req.setTimeout(300000);

  const leadId = req.query.id;
  if (!leadId) return res.status(400).send("Missing Lead ID");

  let browser = null;

  try {
    console.log(`\n[Job] Processing Lead ${leadId}...`);

    // 1. Get Candidates
    const candidates = await getBitrixLeadCandidates(leadId);
    if (candidates.length === 0) return res.json({ message: "No candidates to check." });

    console.log(`[Job] Found ${candidates.length} candidates. Launching Browser...`);

    // 2. LAUNCH BROWSER ONCE (Stealth Mode)
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
        "--window-size=1920,1080",
        "--disable-blink-features=AutomationControlled",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
      ]
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setViewport({ width: 1280, height: 800 });

    // 3. Navigate ONCE
    await page.goto("https://www.mydata-ssm.com.my/home", { waitUntil: "domcontentloaded", timeout: 60000 });
    await delay(3000);

    // Ensure Search Box exists before starting loop
    const searchBox = 'input[type="text"][placeholder*="search" i]';
    await page.waitForSelector(searchBox, { visible: true, timeout: 10000 });

    // 4. THE LOOP (Running inside API now)
    const results = [];

    for (const name of candidates) {
      // Call the isolated check function
      const result = await checkSingleCompany(page, name);

      // Store result immediately
      results.push(result);

      // Small delay to prevent rate limiting
      await delay(1000);
    }

    console.log(`[Job] Finished checking all names.`);

    // 5. FILTER & FORMAT
    const validCandidates = results.filter(r => r.available === true);
    const removedCandidates = results.filter(r => r.available === false);

    // Format: "1. Name \n\n 2. Name"
    const validNamesList = validCandidates.map(r => r.name);
    const resultString = validNamesList
      .map((name, index) => `${index + 1}. ${name}`)
      .join('\n\n');

    const updateValue = resultString.length > 0 ? resultString : "All candidates were unavailable.";

    // 6. UPDATE BITRIX
    console.log(`[Bitrix] Updating with:\n${updateValue}`);
    await updateBitrixLead(leadId, updateValue);

    // 7. RETURN RESPONSE
    res.json({
      status: "success",
      summary: {
        total: results.length,
        valid: validCandidates.length,
        removed: removedCandidates.length
      },
      valid_names: validNamesList,
      bitrix_update: updateValue,
      removed_details: removedCandidates // Useful for debugging
    });

  } catch (error) {
    console.error("[Job] Fatal Error:", error);
    res.status(500).json({ error: error.message });
  } finally {
    // Always close browser at the end
    if (browser) await browser.close();
  }
});


// Updated endpoint with session-based lead accumulation
app.post("/myData/check-names", async (req, res) => {
  const { companyNames, userData } = req.body;

  // ... logs ...
  if (!companyNames || companyNames.length === 0) {
    return res.status(400).json({ error: "At least one company name is required" });
  }

  try {
    // 1. Instant Search
    const currentResults = await checkMyDataMultiSession(companyNames, userData);

    // 2. Add to Session & Get Accumulated History
    const sessionInfo = leadSessionManager.addResult(userData, currentResults);
    const sessionKey = sessionInfo.sessionKey;

    // ✅ Check current state immediately after update
    const leadSession = leadSessionManager.getSession(sessionKey);
    const allCheckedNames = leadSession.results;
    const totalChecked = allCheckedNames.length;
    const anyNameAvailable = allCheckedNames.some(r => r.available === true);

    res.json({
      success: true,
      results: currentResults,
      session: {
        key: sessionKey,
        totalChecked: totalChecked,
        status: anyNameAvailable ? "completed" : "analyzing_alternatives"
      }
    });

    // 3. Background Logic
    setTimeout(async () => {
      // ✅ FIX: Re-fetch session to ensure we have the latest state (in case of race conditions)
      const currentSession = leadSessionManager.getSession(sessionKey);

      // ✅ FIX: Stop immediately if this user/session was already pushed to Bitrix
      if (currentSession && currentSession.pushed) {
        console.log(`🛑 [Flow] Session ${sessionKey} already pushed. Skipping duplicate.`);
        return;
      }

      // CASE A: User found a name! 
      if (anyNameAvailable) {
        console.log(`\n✨ [Flow] Valid name found (Total checked: ${totalChecked}). Pushing to CRM.`);

        // Prepare lead data
        const leadData = leadSessionManager.prepareLead(currentSession);

        // Push
        const bitrixResult = await pushLeadToBitrix24(leadData);

        // Mark as pushed so subsequent requests don't trigger this again
        leadSessionManager.markAsPushed(sessionKey, bitrixResult);
      }
      // CASE B: All names checked so far are TAKEN.
      else {
        const allFailedNames = allCheckedNames.map(r => r.name);
        console.log(`\n🤖 [Flow] All ${totalChecked} names taken. Triggering AI...`);

        // Pass to AI job
        await performAiBackgroundJob(sessionKey, userData, allFailedNames);
      }
    }, 100);

  } catch (error) {
    console.error("❌ API Error:", error.message);
    if (!res.headersSent) res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * API 1: INSTANT CHECK
 * Scrapes SSM and returns "Available/Taken" immediately to Frontend.
 */
app.post("/api/check-names", async (req, res) => {
  const { companyNames, userData } = req.body;

  if (!companyNames || companyNames.length === 0) {
    return res.status(400).json({ error: "No names provided" });
  }

  try {
    console.log(`📥 API 1: Request for ${userData.name}`);

    // Run scraper
    const results = await checkMyData(companyNames);

    // Send results back to frontend
    res.json({
      success: true,
      results: results
    });

  } catch (error) {
    console.error("API 1 Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * API 2: PROCESS LEAD (Background Logic)
 * Frontend calls this immediately after API 1 returns.
 * Handles: Bitrix Push AND AI Loop (if needed).
 */
app.post("/api/process-lead", async (req, res) => {
  // The Frontend sends us the FULL history (userData + all checked results)
  const { userData, checkedResults, originalIntents } = req.body;

  if (!userData || !checkedResults) {
    return res.status(400).json({ error: "Missing data" });
  }

  console.log(`📥 API 2: Processing lead for ${userData.name}`);

  // Send success to frontend immediately so UI doesn't freeze
  res.json({ success: true, message: "Processing started" });

  try {
    // 1. CHECK HISTORY: Did the user find any available name?
    const anyAvailable = checkedResults.some(r => r.available);

    // CASE A: User found a name. Push to CRM directly.
    if (anyAvailable) {
      console.log("✅ Valid name found by user. Pushing to Bitrix.");
      await pushLeadToBitrix24({
        ...userData,
        companyNames: checkedResults,
        aiFinalSuggestions: []
      });
      return;
    }

    // CASE B: All names taken. Generate AI Candidates (No Validation).
    console.log("❌ All names taken. Generating AI Candidates...");

    // Use history to try and avoid duplicates, though less critical now
    let history = checkedResults.map(r => r.name);

    // 2. Generate Candidates (Calls OpenAI once)
    // This typically returns ~8 names
    const candidates = await generateAiCandidates(originalIntents, history);

    console.log(`🤖 AI Generated ${candidates.length} candidates. Pushing raw list to Bitrix.`);

    // 3. Format for Bitrix
    // We pass the raw candidates. The pushLeadToBitrix24 function will join them with commas.
    const rawSuggestions = candidates.map(c => ({
      name: c.name,
      reason: "AI Generated (Unchecked)"
    }));

    // 4. Push Final Results
    await pushLeadToBitrix24({
      ...userData,
      companyNames: checkedResults, // The failed names from frontend
      aiFinalSuggestions: rawSuggestions, // The 8 raw AI names
      isFallback: true // Flag to ensure pushLeadToBitrix doesn't slice them
    });

  } catch (error) {
    console.error("API 2 Background Error:", error);
  }
});

app.post('/api/deals/:pipelineId', async (req, res) => {
  // 1. Extract the pipelineId from the URL parameters
  // We use parseInt with radix 10 to ensure it's treated as an integer.
  const pipelineId = parseInt(req.params.pipelineId, 10);

  // 2. Validate the input
  if (isNaN(pipelineId) || pipelineId < 1) {
    return res.status(400).json({ error: 'Invalid pipeline ID provided.' });
  }

  try {
    console.log(`Fetching deals for pipeline ID: ${pipelineId}...`);

    // 3. Call the core function
    const deals = await getDealsFromPipeline(pipelineId);

    // 4. Return the results
    res.status(200).json({
      pipelineId: pipelineId,
      totalDeals: deals.length,
      deals: deals
    });

  } catch (err) {
    console.error('API Error:', err);
    // Return a 500 status on internal server errors
    res.status(500).json({ error: 'An error occurred while retrieving the deals.' });
  }
});
// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10, timeoutSeconds: 540, memory: '2GiB', cpu: 1 });
// setGlobalOptions({  });

// ============================================
// CREDIT SYSTEM ENDPOINTS
// ============================================

// Helper function to calculate user balance from ledger
async function getUserBalance(userId) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT COALESCE(SUM(
        CASE 
          WHEN transaction_type IN ('PURCHASE', 'REFUND', 'ADJUSTMENT', 'BONUS') THEN amount
          WHEN transaction_type = 'DEDUCTION' THEN -amount
          ELSE 0
        END
      ), 0) as balance
      FROM le_credit_ledger
      WHERE user_id = ?
    `;

    db.query(query, [userId], (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results[0].balance);
      }
    });
  });
}

/**
 * Grants free credits to a user (e.g., for new registration).
 * @param {number} userId 
 * @param {number} amount 
 * @param {string} description 
 */
async function grantFreeCredits(userId, amount, description) {
  try {
    const currentBalance = await getUserBalance(userId);
    const newBalance = parseFloat(currentBalance || 0) + amount;

    return new Promise((resolve, reject) => {
      const query = `
        INSERT INTO le_credit_ledger 
        (user_id, transaction_type, amount, balance_after, description, payment_method)
        VALUES (?, 'BONUS', ?, ?, ?, 'SYSTEM')
      `;
      db.query(query, [userId, amount, newBalance, description], (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  } catch (error) {
    console.error(`Failed to grant free credits to user ${userId}:`, error);
    throw error;
  }
}

// 1. Get User Credit Balance
app.get('/api/credits/balance/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const balance = await getUserBalance(userId);
    res.json({
      balance: parseFloat(balance).toFixed(2),
      currency: 'MYR'
    });
  } catch (err) {
    console.error('Error fetching balance:', err);
    res.status(500).json({ message: 'Error fetching credit balance' });
  }
});

// 2. Mock Payment Gateway
app.post('/api/payment/mock-process', (req, res) => {
  const { amount, paymentMethod } = req.body;
  if (amount < 0 || amount === undefined || amount === null || amount === '') {
    return res.status(400).json({
      success: false,
      message: 'Invalid amount'
    });
  }

  // Simulate payment processing delay
  setTimeout(() => {
    // Mock successful payment (90% success rate for testing)
    const isSuccess = Math.random() > 0.1;

    if (isSuccess) {
      const transactionId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      res.json({
        success: true,
        transactionId: transactionId,
        amount: amount,
        paymentMethod: paymentMethod || 'MOCK',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Payment failed (mock failure for testing)'
      });
    }
  }, 1000); // 1 second delay to simulate processing
});

// 3. Validate Discount Code
app.post('/api/discount-codes/validate', (req, res) => {
  const { code, userId, purchaseAmount } = req.body;

  if (!code || !userId || !purchaseAmount) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const query = `
    SELECT * FROM le_discount_codes 
    WHERE code = ? 
    AND is_active = 1 
    AND (valid_from IS NULL OR valid_from <= NOW())
    AND (valid_until IS NULL OR valid_until >= NOW())
  `;

  db.query(query, [code.toUpperCase()], (err, results) => {
    if (err) {
      console.error('Error validating discount code:', err);
      return res.status(500).json({ message: 'Error validating discount code' });
    }

    if (results.length === 0) {
      return res.status(404).json({
        valid: false,
        message: 'Invalid or expired discount code'
      });
    }

    const discountCode = results[0];

    // Check usage limits
    if (discountCode.usage_limit && discountCode.usage_count >= discountCode.usage_limit) {
      return res.status(400).json({
        valid: false,
        message: 'Discount code usage limit reached'
      });
    }

    // Check minimum purchase amount
    if (purchaseAmount < discountCode.min_purchase_amount) {
      return res.status(400).json({
        valid: false,
        message: `Minimum purchase amount is ${discountCode.min_purchase_amount}`
      });
    }

    // Check per-user usage limit
    const usageQuery = `
      SELECT COUNT(*) as count 
      FROM le_discount_code_usage 
      WHERE discount_code_id = ? AND user_id = ?
    `;

    db.query(usageQuery, [discountCode.id, userId], (usageErr, usageResults) => {
      if (usageErr) {
        console.error('Error checking usage:', usageErr);
        return res.status(500).json({ message: 'Error checking discount code usage' });
      }

      if (usageResults[0].count >= discountCode.usage_per_user) {
        return res.status(400).json({
          valid: false,
          message: 'You have already used this discount code'
        });
      }

      // Calculate discount
      let discountAmount = 0;
      let finalAmount = purchaseAmount;

      if (discountCode.discount_type === 'PERCENTAGE') {
        discountAmount = (purchaseAmount * discountCode.discount_value) / 100;
        if (discountCode.max_discount_amount && discountAmount > discountCode.max_discount_amount) {
          discountAmount = discountCode.max_discount_amount;
        }
        finalAmount = purchaseAmount - discountAmount;
      } else if (discountCode.discount_type === 'FIXED_AMOUNT') {
        discountAmount = discountCode.discount_value;
        finalAmount = Math.max(0, purchaseAmount - discountAmount);
      } else if (discountCode.discount_type === 'BONUS_CREDITS') {
        discountAmount = 0; // No discount on payment
        finalAmount = purchaseAmount;
      }

      res.json({
        valid: true,
        discount: {
          id: discountCode.id,
          code: discountCode.code,
          type: discountCode.discount_type,
          value: discountCode.discount_value,
          discountAmount: parseFloat(discountAmount).toFixed(2),
          bonusCredits: discountCode.discount_type === 'BONUS_CREDITS' ? discountCode.discount_value : 0,
          finalAmount: parseFloat(finalAmount).toFixed(2)
        }
      });
    });
  });
});

const processCreditPurchase = async (userId, amount, tokens, paymentMethod, paymentTransactionId, discountCode) => {
  // 1. Idempotency Check: Check if this transaction has already been processed
  if (paymentTransactionId) {
    const existingTx = await new Promise((resolve, reject) => {
      db.query(
        'SELECT * FROM le_credit_ledger WHERE payment_transaction_id = ? AND payment_method = ?',
        [paymentTransactionId, paymentMethod],
        (err, results) => {
          if (err) reject(err);
          else resolve(results);
        }
      );
    });

    if (existingTx.length > 0) {
      logger.info(`♻️ Transaction ${paymentTransactionId} already processed. Skipping.`);
      return {
        success: true,
        alreadyProcessed: true,
        newBalance: existingTx[0].balance_after,
        creditsAdded: existingTx[0].amount,
        transactionId: existingTx[0].id
      };
    }
  }

  return new Promise((resolve, reject) => {
    db.beginTransaction(async (err) => {
      if (err) return reject(new Error('Transaction error'));

      try {
        const currentBalance = await getUserBalance(userId);

        // Fetch user email for receipt
        const userEmail = await new Promise((resolve) => {
          db.query('SELECT email FROM le_user WHERE ID = ?', [userId], (err, results) => {
            if (err || !results || results.length === 0) resolve(null);
            else resolve(results[0].email);
          });
        });

        let creditsToAdd = parseFloat(tokens || amount);
        let discountCodeId = null;
        let discountApplied = null;

        if (discountCode) {
          const validateQuery = `
            SELECT * FROM le_discount_codes 
            WHERE code = ? AND is_active = 1 
            AND (valid_from IS NULL OR valid_from <= NOW())
            AND (valid_until IS NULL OR valid_until >= NOW())
          `;

          const discountResults = await new Promise((resQ, rejQ) => {
            db.query(validateQuery, [discountCode.toUpperCase()], (err, results) => {
              if (err) rejQ(err);
              else resQ(results);
            });
          });

          if (discountResults.length > 0) {
            const dc = discountResults[0];
            discountCodeId = dc.id;

            if (dc.discount_type === 'BONUS_CREDITS') {
              creditsToAdd += parseFloat(dc.discount_value);
              discountApplied = {
                code: dc.code,
                bonusCredits: parseFloat(dc.discount_value)
              };
            }

            await new Promise((resU, rejU) => {
              db.query(
                'UPDATE le_discount_codes SET usage_count = usage_count + 1 WHERE id = ?',
                [dc.id],
                (err) => {
                  if (err) rejU(err);
                  else resU();
                }
              );
            });
          }
        }

        const newBalance = parseFloat(currentBalance) + creditsToAdd;
        const insertQuery = `
          INSERT INTO le_credit_ledger 
          (user_id, transaction_type, amount, balance_after, description, payment_method, payment_transaction_id, discount_code_id)
          VALUES (?, 'PURCHASE', ?, ?, ?, ?, ?, ?)
        `;

        const description = discountApplied
          ? `Credit Purchase with ${discountApplied.bonusCredits} bonus credits`
          : 'Credit Purchase';

        const insertResult = await new Promise((resI, rejI) => {
          db.query(
            insertQuery,
            [userId, creditsToAdd, newBalance, description, paymentMethod, paymentTransactionId, discountCodeId],
            (err, result) => {
              if (err) rejI(err);
              else resI(result);
            }
          );
        });

        if (discountCodeId) {
          await new Promise((resUsage, rejUsage) => {
            db.query(
              'INSERT INTO le_discount_code_usage (discount_code_id, user_id, credit_ledger_id) VALUES (?, ?, ?)',
              [discountCodeId, userId, insertResult.insertId],
              (err) => {
                if (err) rejUsage(err);
                else resUsage();
              }
            );
          });
        }

        db.commit(async (commitErr) => {
          if (commitErr) {
            return db.rollback(() => {
              reject(commitErr);
            });
          }

          // Send Receipt Email (Fire and Forget)
          if (userEmail) {
            try {
              const subject = "Receipt: Softon Token Top-up";
              const date = new Date().toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" });
              const body = `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                  <h2 style="color: #6366f1;">Thank you for your purchase!</h2>
                  <p>Your tokens have been successfully added to your account.</p>
                  
                  <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                    <tr style="border-bottom: 1px solid #eee;">
                      <td style="padding: 10px 0; color: #666;">Transaction ID</td>
                      <td style="padding: 10px 0; font-weight: bold; text-align: right;">${paymentTransactionId || insertResult.insertId}</td>
                    </tr>
                     <tr style="border-bottom: 1px solid #eee;">
                      <td style="padding: 10px 0; color: #666;">Date</td>
                      <td style="padding: 10px 0; font-weight: bold; text-align: right;">${date}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #eee;">
                      <td style="padding: 10px 0; color: #666;">Payment Method</td>
                      <td style="padding: 10px 0; font-weight: bold; text-align: right;">${paymentMethod}</td>
                    </tr>
                    <tr style="border-bottom: 1px solid #eee;">
                      <td style="padding: 10px 0; color: #666;">Tokens Purchased</td>
                      <td style="padding: 10px 0; font-weight: bold; text-align: right;">${parseFloat(tokens || amount)}</td>
                    </tr>
                    ${discountApplied ? `
                    <tr style="border-bottom: 1px solid #eee;">
                      <td style="padding: 10px 0; color: #666;">Bonus Credits (Code: ${discountApplied.code})</td>
                      <td style="padding: 10px 0; font-weight: bold; text-align: right;">+${discountApplied.bonusCredits}</td>
                    </tr>
                    ` : ''}
                    <tr style="border-bottom: 1px solid #eee;">
                      <td style="padding: 10px 0; color: #666;">Total Credits Added</td>
                      <td style="padding: 10px 0; font-weight: bold; text-align: right; color: #10b981;">${parseFloat(creditsToAdd).toFixed(2)}</td>
                    </tr>
                  </table>

                  <p style="margin-top: 30px; font-size: 12px; color: #999;">
                    If you have any questions, please contact support at <a href="mailto:info@softon.io">info@softon.io</a>.
                  </p>
                </div>
              `;

              const sendMailData = JSON.stringify({
                "ToEmail": userEmail,
                "Subject": subject,
                "SenderEmail": "info@softon.io",
                "SubmittedContent": body,
                "SenderName": "Softon Support"
              });

              const config = {
                method: 'post',
                url: 'https://api.enginemailer.com/RESTAPI/V2/Submission/SendEmail',
                headers: {
                  'APIKey': process.env.ENGINE_MAILER_KEY,
                  'Content-Type': 'application/json',
                },
                data: sendMailData
              };

              // Don't await this to keep response fast, but handle errors
              axios.request(config)
                .then(() => logger.info(`Receipt email sent to ${userEmail}`))
                .catch(e => logger.error(`Failed to send receipt email: ${e.message}`));

            } catch (emailErr) {
              logger.error(`Error constructing receipt email: ${emailErr.message}`);
            }
          }

          resolve({
            success: true,
            newBalance: parseFloat(newBalance).toFixed(2),
            creditsAdded: parseFloat(creditsToAdd).toFixed(2),
            transactionId: insertResult.insertId,
            discountApplied: discountApplied
          });
        });

      } catch (error) {
        db.rollback(() => {
          reject(error);
        });
      }
    });
  });
};

// 4. Purchase Credits
app.post('/api/credits/purchase', async (req, res) => {
  const { userId, amount, paymentMethod, paymentTransactionId, discountCode } = req.body;

  if (!userId || !amount || !paymentTransactionId) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const result = await processCreditPurchase(userId, amount, amount, paymentMethod || 'MOCK', paymentTransactionId, discountCode);
    res.json(result);
  } catch (err) {
    console.error('Purchase error:', err);
    res.status(500).json({ message: err.message || 'Error processing purchase' });
  }
});

// 5. Deduct Credits
app.post('/api/credits/deduct', async (req, res) => {
  const { userId, amount, description, referenceType, referenceId } = req.body;

  if (!userId || !amount) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    db.beginTransaction(async (err) => {
      if (err) {
        console.error('Transaction error:', err);
        return res.status(500).json({ message: 'Transaction error' });
      }

      try {
        // Lock and get current balance
        const currentBalance = await getUserBalance(userId);

        if (parseFloat(currentBalance) < parseFloat(amount)) {
          return db.rollback(() => {
            res.status(400).json({
              success: false,
              message: 'Insufficient credits',
              currentBalance: parseFloat(currentBalance).toFixed(2),
              required: parseFloat(amount).toFixed(2)
            });
          });
        }

        const newBalance = parseFloat(currentBalance) - parseFloat(amount);

        // Insert deduction record
        const insertQuery = `
          INSERT INTO le_credit_ledger 
          (user_id, transaction_type, amount, balance_after, description, reference_type, reference_id)
          VALUES (?, 'DEDUCTION', ?, ?, ?, ?, ?)
        `;

        const insertResult = await new Promise((resolve, reject) => {
          db.query(
            insertQuery,
            [userId, amount, newBalance, description || 'Credit Deduction', referenceType, referenceId],
            (err, result) => {
              if (err) reject(err);
              else resolve(result);
            }
          );
        });

        db.commit((commitErr) => {
          if (commitErr) {
            return db.rollback(() => {
              console.error('Commit error:', commitErr);
              res.status(500).json({ message: 'Error completing deduction' });
            });
          }

          res.json({
            success: true,
            newBalance: parseFloat(newBalance).toFixed(2),
            transactionId: insertResult.insertId
          });
        });

      } catch (error) {
        db.rollback(() => {
          console.error('Deduction error:', error);
          res.status(500).json({ message: 'Error processing deduction' });
        });
      }
    });

  } catch (err) {
    console.error('Error deducting credits:', err);
    res.status(500).json({ message: 'Error deducting credits' });
  }
});

// 6. Get Transaction History
app.get('/api/credits/transactions/:userId', async (req, res) => {
  const { userId } = req.params;
  const limit = parseInt(req.query.limit) || 50;
  const offset = parseInt(req.query.offset) || 0;

  try {
    const currentBalance = await getUserBalance(userId);

    const query = `
      SELECT 
        cl.id,
        cl.transaction_type,
        cl.amount,
        cl.balance_after,
        cl.description,
        cl.reference_type,
        cl.reference_id,
        cl.payment_method,
        cl.created_at,
        dc.code as discount_code,
        p.name as project_name,
        p.year_end as project_year_end
      FROM le_credit_ledger cl
      LEFT JOIN le_discount_codes dc ON cl.discount_code_id = dc.id
      LEFT JOIN le_project p ON cl.reference_id = p.ID AND cl.reference_type = 'PROJECT'
      WHERE cl.user_id = ?
      ORDER BY cl.created_at DESC
      LIMIT ? OFFSET ?
    `;

    db.query(query, [userId, limit, offset], (err, results) => {
      if (err) {
        console.error('Error fetching transactions:', err);
        return res.status(500).json({ message: 'Error fetching transactions' });
      }

      res.json({
        currentBalance: parseFloat(currentBalance).toFixed(2),
        transactions: results.map(t => ({
          id: t.id,
          type: t.transaction_type,
          amount: parseFloat(t.amount).toFixed(2),
          balanceAfter: parseFloat(t.balance_after).toFixed(2),
          description: (t.reference_type === 'PROJECT' && t.project_name)
            ? `Report Generation - ${t.project_name} ${t.project_year_end ? new Date(t.project_year_end).getFullYear() : ''}`
            : t.description,
          referenceType: t.reference_type,
          referenceId: t.reference_id,
          paymentMethod: t.payment_method,
          discountCode: t.discount_code,
          createdAt: t.created_at
        }))
      });
    });

  } catch (err) {
    console.error('Error fetching transaction history:', err);
    res.status(500).json({ message: 'Error fetching transaction history' });
  }
});

// 7. Create Discount Code (Admin)
app.post('/api/discount-codes', (req, res) => {
  const {
    code,
    description,
    discountType,
    discountValue,
    minPurchaseAmount,
    maxDiscountAmount,
    usageLimit,
    usagePerUser,
    validUntil
  } = req.body;

  if (!code || !discountType || !discountValue) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const query = `
    INSERT INTO le_discount_codes 
    (code, description, discount_type, discount_value, min_purchase_amount, max_discount_amount, usage_limit, usage_per_user, valid_until)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    query,
    [
      code.toUpperCase(),
      description,
      discountType,
      discountValue,
      minPurchaseAmount || 0,
      maxDiscountAmount,
      usageLimit,
      usagePerUser || 1,
      validUntil
    ],
    (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ message: 'Discount code already exists' });
        }
        console.error('Error creating discount code:', err);
        return res.status(500).json({ message: 'Error creating discount code' });
      }

      res.status(201).json({
        success: true,
        id: result.insertId,
        code: code.toUpperCase()
      });
    }
  );
});

// 8. List Discount Codes
app.get('/api/discount-codes', (req, res) => {
  const activeOnly = req.query.active === 'true';

  let query = 'SELECT * FROM le_discount_codes';
  if (activeOnly) {
    query += ` WHERE is_active = 1 
      AND (valid_from IS NULL OR valid_from <= NOW())
      AND (valid_until IS NULL OR valid_until >= NOW())`;
  }
  query += ' ORDER BY created_at DESC';

  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching discount codes:', err);
      return res.status(500).json({ message: 'Error fetching discount codes' });
    }

    res.json(results);
  });
});

// 9. Get Single Discount Code
app.get('/api/discount-codes/:id', (req, res) => {
  const { id } = req.params;
  const query = 'SELECT * FROM le_discount_codes WHERE id = ?';

  db.query(query, [id], (err, results) => {
    if (err) {
      console.error('Error fetching discount code:', err);
      return res.status(500).json({ message: 'Error fetching discount code' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Discount code not found' });
    }

    res.json(results[0]);
  });
});

// 10. Update Discount Code
app.put('/api/discount-codes/:id', (req, res) => {
  const { id } = req.params;
  const {
    code,
    description,
    discountType,
    discountValue,
    minPurchaseAmount,
    maxDiscountAmount,
    usageLimit,
    usagePerUser,
    validUntil,
    is_active
  } = req.body;

  if (!code || !discountType || !discountValue) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const query = `
    UPDATE le_discount_codes 
    SET code = ?, description = ?, discount_type = ?, discount_value = ?, 
        min_purchase_amount = ?, max_discount_amount = ?, usage_limit = ?, 
        usage_per_user = ?, valid_until = ?, is_active = ?
    WHERE id = ?
  `;

  db.query(
    query,
    [
      code.toUpperCase(),
      description,
      discountType,
      discountValue,
      minPurchaseAmount || 0,
      maxDiscountAmount,
      usageLimit,
      usagePerUser || 1,
      validUntil,
      is_active !== undefined ? is_active : 1,
      id
    ],
    (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ message: 'Discount code with this name already exists' });
        }
        console.error('Error updating discount code:', err);
        return res.status(500).json({ message: 'Error updating discount code' });
      }

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Discount code not found' });
      }

      res.json({ success: true, message: 'Discount code updated successfully' });
    }
  );
});

// 11. Toggle Discount Code Active Status
app.patch('/api/discount-codes/:id/toggle-active', (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;

  if (is_active === undefined) {
    return res.status(400).json({ message: 'is_active field is required' });
  }

  const query = 'UPDATE le_discount_codes SET is_active = ? WHERE id = ?';

  db.query(query, [is_active ? 1 : 0, id], (err, result) => {
    if (err) {
      console.error('Error toggling discount code status:', err);
      return res.status(500).json({ message: 'Error toggling discount code status' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Discount code not found' });
    }

    res.json({
      success: true,
      message: `Discount code ${is_active ? 'activated' : 'archived'} successfully`,
      is_active: !!is_active
    });
  });
});


// 12. Get Dashboard Statistics (Usage Rate, Distribution, Trends)
app.get('/api/credits/stats/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    // 1. Distribution (Group by description for DEDUCTION)
    const distributionQuery = `
      SELECT description as name, SUM(amount) as value, transaction_type as type 
      FROM le_credit_ledger 
      WHERE user_id = ? 
      GROUP BY description, transaction_type
    `;

    // 2. Weekly Usage Trends (Last 7 days)
    const trendsQuery = `
      SELECT DATE_FORMAT(created_at, '%Y-%m-%d') as date, SUM(amount) as value , transaction_type as type 
      FROM le_credit_ledger 
      WHERE user_id = ?  and transaction_type = 'DEDUCTION'
      AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) 
      GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d'), transaction_type 
      ORDER BY date ASC
    `;

    // 3. Overall Totals for Usage Rate
    const totalsQuery = `
      SELECT 
        SUM(CASE WHEN transaction_type = 'DEDUCTION' THEN amount ELSE 0 END) as total_spent,
        SUM(CASE WHEN transaction_type IN ('PURCHASE', 'BONUS') THEN amount ELSE 0 END) as total_earned
      FROM le_credit_ledger 
      WHERE user_id = ?
    `;

    const [distribution, trends, totals] = await Promise.all([
      new Promise((resolve, reject) => {
        db.query(distributionQuery, [userId], (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      }),
      new Promise((resolve, reject) => {
        db.query(trendsQuery, [userId], (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      }),
      new Promise((resolve, reject) => {
        db.query(totalsQuery, [userId], (err, results) => {
          if (err) reject(err);
          else resolve(results[0]);
        });
      })
    ]);

    // Calculate Usage Rate
    const totalSpent = parseFloat(totals.total_spent || 0);
    const totalEarned = parseFloat(totals.total_earned || 0);
    const usageRate = totalEarned > 0 ? ((totalSpent / totalEarned) * 100) : 0;

    res.json({
      distribution: distribution.map(d => ({ name: d.name || 'Other', value: parseFloat(d.value) })),
      trends: trends.map(t => ({ date: t.date, value: parseFloat(t.value) })),
      usageRate: parseFloat(usageRate.toFixed(1))
    });

  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ message: 'Error fetching dashboard statistics' });
  }
});


// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
exports.altomateLE = onRequest({ invoker: 'public' }, app);

// const PORT = process.env.PORT || 8080;

// // Start the Express server
// app.listen(PORT, () => {
//   console.log(`Server listening on port ${PORT}`);
// });
