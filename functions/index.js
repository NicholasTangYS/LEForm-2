/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
require('dotenv').config();
const { setGlobalOptions } = require("firebase-functions/v2");
const { onRequest } = require("firebase-functions/https");
const firebase = require("firebase-admin");
const express = require('express');
const app = express();
const puppeteer = require('puppeteer');
const fs = require("fs");
const path = require("path");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const jwt = require('jsonwebtoken');
const mysql = require('mysql2');
const logger = require("firebase-functions/logger");
const cors = require('cors');
const crypto = require('crypto');
const JWT_SECRET = process.env.JWT_SECRET;
// const chromium = require('chromium');
const bcrypt = require('bcrypt');
const saltRounds = 10; // The cost factor for hashing
// puppeteer.use(StealthPlugin());
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
  'https://www.altomate.io',
  'https://altomate.io/my/free-company-name-check'
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

app.use(express.json());

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
      db.query(insertQuery, [name, email, contact, hashedPassword], (insertErr, insertResult) => {
        if (insertErr) {
          console.error('Database error during registration:', insertErr);
          return res.status(500).send('An error occurred during user registration.');
        }

        // Step 5: Respond with success message
        res.status(201).json({ message: 'User registered successfully!' });
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
  //    We assume the client sends the new 'data' value in the request body.

  const contact_no = req.body.contact_no;
  const address = req.body.address;

  // Check if the data is present
  if (contact_no === undefined || address === undefined) {
    return res.status(400).json({
      message: 'Missing required field: "data" in request body.'
    });
  }

  try {
    // SQL query to update the 'data' column in the 'le_project' table
    // We use placeholders (?) for security to prevent SQL Injection.
    const query = 'UPDATE le_user SET contact_no =?, address=?  WHERE ID = ?';

    // The first placeholder takes newData, the second takes the Id
    db.query(query, [contact_no, address, Id], (err, results) => {
      if (err) {
        console.error('Database error during update:', err);
        // Return a specific error status code for database issues
        return res.status(500).json({
          message: 'Database error occurred during project update.',
          error: err.message
        });
      }

      // Check if any rows were actually updated
      if (results.affectedRows === 0) {
        return res.status(404).json({
          message: `Project with ID ${Id} not found or no changes were made.`
        });
      }

      // Successful update response
      res.json({
        message: `User ID ${Id} updated successfully.`,
        affectedRows: results.affectedRows
      });
    });
  } catch (err) {
    // Catch any non-database errors (e.g., JSON parsing failure, internal server issues)
    console.error('General error during project update:', err);
    res.status(500).send('An internal error occurred while updating the project data');
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
    db.query(updateTokenQuery, [resetCode, expiry, email], (updateErr, updateResult) => {
      if (updateErr) {
        console.error('DB error storing reset token:', updateErr);
        return res.status(500).json({ message: 'An internal error occurred.' });
      }

      // 4. Send the email (In a real app, you'd use a service like Nodemailer/SendGrid)
      // For now, we just log it and send it in the response for testing.
      logger.info(`Password reset code for ${email}: ${resetCode}`);

      res.status(200).json({
        message: 'A password reset code has been sent to your email.',
        resetCode: resetCode // NOTE: Only for development/testing. Remove in production.
      });
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
    const query = 'SELECT data FROM le_project where ID = ?';
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

// Simple session tracker (no cookies needed anymore)
class SessionManager {
  constructor(name) {
    this.name = name;
    this.createdAt = Date.now();
  }
}

// Session pool for concurrent requests
class SessionPool {
  constructor(maxSessions = 5) {
    this.maxSessions = maxSessions;
    this.sessions = new Map();
    this.queue = [];
  }

  async acquireSession() {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const profileDir = path.join(profilesBaseDir, sessionId);

    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true });
    }

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

      // Clean up old sessions after 5 minutes
      setTimeout(() => {
        this.cleanupSession(sessionId);
      }, 5 * 60 * 1000);
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
  
  // ===== NEW: User Session Manager for Lead Accumulation =====
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
    addResult(userData, companyNameResults) {
      const sessionKey = this.generateSessionKey(userData);
      const now = Date.now();
      
      if (this.sessions.has(sessionKey)) {
        // Existing session - append results
        const session = this.sessions.get(sessionKey);
        session.results = session.results.concat(companyNameResults);
        session.lastUpdated = now;
        session.expiresAt = now + this.SESSION_TIMEOUT;
        
        console.log(`📝 Updated session ${sessionKey}: Total ${session.results.length} names`);
        
        return {
          isNew: false,
          totalNames: session.results.length,
          sessionKey: sessionKey
        };
      } else {
        // New session
        const session = {
          sessionKey: sessionKey,
          userData: userData,
          results: companyNameResults,
          createdAt: now,
          lastUpdated: now,
          expiresAt: now + this.SESSION_TIMEOUT,
          pushed: false
        };
        
        this.sessions.set(sessionKey, session);
        console.log(`🆕 Created new session ${sessionKey}: ${companyNameResults.length} names`);
        
        return {
          isNew: true,
          totalNames: session.results.length,
          sessionKey: sessionKey
        };
      }
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
        submittedAt: new Date(session.createdAt).toISOString(),
        lastUpdatedAt: new Date(session.lastUpdated).toISOString(),
        source: 'company-name-checker',
        totalNamesChecked: session.results.length
      };
    }
  
    // Start background cleanup job
    startCleanupJob() {
      setInterval(async () => {
        await this.cleanupExpiredSessions();
      }, 30 * 1000); // Check every 30 seconds
      
      console.log('🔄 Lead session cleanup job started');
    }
  }
  
  const leadSessionManager = new LeadSessionManager();
  
  // --- Bitrix24 CRM Integration ---
  async function pushLeadToBitrix24(leadData) {
    const BITRIX24_WEBHOOK = process.env.BITRIX24_WEBHOOK;
    
    if (!BITRIX24_WEBHOOK) {
      console.warn("⚠️ BITRIX24_WEBHOOK not configured in .env");
      return { success: false, error: "Bitrix24 webhook not configured" };
    }
  
    try {
      const companyNamesText = leadData.companyNames
        .map(c => `${c.name}: ${c.available ? '✅ Available' : '❌ Taken'} (${c.details.results?.length || 0} matches)`)
        .join('\n');
  
      let firstName = '', lastName = '';
      
      if (leadData.name) {
        const nameParts = leadData.name.trim().split(' ');
        if (nameParts.length === 1) {
          firstName = nameParts[0];
          lastName = '';
        } else if (nameParts.length >= 2) {
          lastName = nameParts[0];
          firstName = nameParts.slice(1).join(' ');
        }
      }
  
      const availableCount = leadData.companyNames.filter(c => c.available).length;
      const companyName1 = leadData.companyNames[0] ? leadData.companyNames[0].name : '';
      const companyName2 = leadData.companyNames[1] ? leadData.companyNames[1].name : '';
      const companyName3 = leadData.companyNames[2] ? leadData.companyNames[2].name : '';
  
      const bitrixFields = {
        TITLE: `[Altomate Website Form] Company Name Check - ${leadData.name || 'Unknown'}`,
        ASSIGNED_BY_ID: 3807,
        NAME: firstName,
        LAST_NAME: lastName,
        UF_CRM_LEAD_1714097932490: leadData.email || '',
        UF_CRM_1714540318506: leadData.phone,
        UF_CRM_1634365929857: companyName1,
        UF_CRM_LEAD_1650374555137: companyName2,
        UF_CRM_LEAD_1650374569570: companyName3,
        COMMENTS: `Company Names Checked (Total: ${leadData.companyNames.length}):\n${companyNamesText}`
      };
  
      console.log("📤 Sending lead to Bitrix24...");
      
      const response = await fetch(`${BITRIX24_WEBHOOK}/crm.lead.add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          fields: bitrixFields,
          params: { REGISTER_SONET_EVENT: "Y" }
        })
      });
  
      const result = await response.json();
  
      if (result.result) {
        console.log(`✅ Lead created in Bitrix24 with ID: ${result.result}`);
        return { success: true, leadId: result.result, bitrixResponse: result };
      } else {
        console.error("❌ Bitrix24 error:", result.error_description || result.error);
        return { success: false, error: result.error_description || result.error, bitrixResponse: result };
      }
    } catch (error) {
      console.error("❌ Bitrix24 API error:", error.message);
      return { success: false, error: error.message };
    }
  }
  
  // Check if login is required (Sign In prompt appears)
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
  
  // Main scraping function with retry logic
  async function checkMyDataMultiSession(companyNames, userData) {
    const session = await sessionPool.acquireSession();
    let browser, page;
  
    try {
      console.log(`[${session.id}] 🚀 Starting browser...`);
      
      browser = await puppeteer.launch({
        headless: true,
        userDataDir: session.profileDir,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
      });
  
      const pages = await browser.pages();
      page = pages[0] || (await browser.newPage());
      await page.setViewport({ width: 1280, height: 800 });
  
      // Navigate to home
      await page.goto("https://www.mydata-ssm.com.my/home", { 
        waitUntil: "domcontentloaded", 
        timeout: 60000 
      });
      await delay(3000);
  
      // Set Company filter once
      console.log(`[${session.id}] 🔽 Setting Company filter...`);
      try {
        const dropdownClicked = await page.evaluate(() => {
          const button = document.getElementById('dropdownMenu1');
          if (button) {
            button.click();
            return true;
          }
          return false;
        });
        
        if (dropdownClicked) {
          await delay(1500);
          
          const optionClicked = await page.evaluate(() => {
            const menuItems = Array.from(document.querySelectorAll('a.dropdown-item, li a, .dropdown-menu a, button'));
            const companyOption = menuItems.find(el => el.textContent.trim() === 'Company');
            
            if (companyOption) {
              companyOption.click();
              return true;
            }
            return false;
          });
          
          if (optionClicked) {
            console.log(`[${session.id}] ✅ 'Company' filter selected`);
            await delay(2000);
          }
        }
      } catch (error) {
        console.log(`[${session.id}] ⚠️ Filter selection error:`, error.message);
      }
  
      // Find search box
      const searchSelectors = [
        'input[placeholder*="search" i]',
        'input[name*="search"]',
        'input[type="text"]'
      ];
      
      let searchBox = null;
      for (const sel of searchSelectors) {
        try {
          await page.waitForSelector(sel, { visible: true, timeout: 5000 });
          searchBox = sel;
          break;
        } catch {}
      }
      
      if (!searchBox) throw new Error("Search box not found");
  
      const results = [];
  
      // Search each company name
      for (let idx = 0; idx < companyNames.length; idx++) {
        // Force Uppercase immediately
        let companyName = companyNames[idx] ? companyNames[idx].toUpperCase() : "";
        if (!companyName || !companyName.trim()) continue;
  
        // Auto-append SDN BHD if not present
        const upperName = companyName.toUpperCase().trim();
        if (!upperName.endsWith('SDN BHD') && !upperName.endsWith('SDN. BHD.')) {
          companyName = `${companyName} SDN BHD`;
          console.log(`[${session.id}] 📝 Auto-appended: "${companyName}"`);
        }
  
        console.log(`[${session.id}] [${idx + 1}/${companyNames.length}] 🔍 Searching: ${companyName}`);
        
        // Clear and search
        await page.click(searchBox, { clickCount: 3 });
        await page.keyboard.press('Backspace');
        await delay(500);
        await page.type(searchBox, companyName, { delay: 100 });
        await page.keyboard.press("Enter");
  
        console.log(`[${session.id}] ⏳ Waiting for results...`);
        await delay(3000);
        
        // Check if "Sign In" prompt appears - if so, name is NOT available
        if (await isLoginRequired(page)) {
          console.log(`[${session.id}] ❌ Name "${companyName}" is NOT available (login required)`);
          results.push({
            name: companyName,
            available: false,
            details: {
              exists: true,
              results: [{ message: "Name already registered - Sign In required to view details" }],
              totalPages: 0,
              reason: "signin_required"
            }
          });
          continue;
        }
        
        // Wait for results to load
        for (let i = 0; i < 20; i++) {
          const hasResults = await page.evaluate(() => 
            document.body.innerText.includes('entities found') || 
            document.body.innerText.includes('entity found')
          );
          
          if (hasResults) {
            console.log(`[${session.id}] ✅ Results loaded`);
            break;
          }
          await delay(1000);
        }
        
        await delay(2000);
  
        // Extract results with pagination
        console.log(`[${session.id}] 📋 Extracting data...`);
        let allCompanies = [];
        let currentPage = 1;
        
        while (true) {
          const pageResults = await page.evaluate(() => {
            const bodyText = document.body.innerText;
            const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l);
            const typeIndex = lines.findIndex(l => l === 'Type');
            const companies = [];
            
            if (typeIndex > 0) {
              let i = typeIndex + 1;
              let attempts = 0;
              
              while (i < lines.length && attempts < 300) {
                const number = lines[i];
                const name = lines[i + 1];
                const type = lines[i + 2];
                
                if (number && name && type && 
                    number.match(/^\d{12,}/) &&
                    name.length > 3 && 
                    !name.includes('entities found') &&
                    !name.includes('Number') &&
                    !name.includes('Name') &&
                    type.length > 2 &&
                    type !== 'Type') {
                  companies.push({ number, name, type });
                  i += 3;
                } else {
                  if (companies.length > 0 && attempts > 10) break;
                  i++;
                }
                attempts++;
              }
            }
            
            return companies;
          });
          
          allCompanies = allCompanies.concat(pageResults);
          
          const paginationInfo = await page.evaluate(() => {
            const el = document.querySelector(".mat-paginator-range-label");
            if (!el) return null;
            const text = el.textContent.trim();
            const match = text.match(/(\d+)\s*-\s*(\d+)\s*of\s*(\d+)/i);
            if (!match) return null;
            return { 
              start: parseInt(match[1]), 
              end: parseInt(match[2]), 
              total: parseInt(match[3]) 
            };
          });
  
          if (paginationInfo && paginationInfo.end >= paginationInfo.total) {
            break;
          }
          
          const currentState = paginationInfo ? `${paginationInfo.start}-${paginationInfo.end}` : null;
          
          const nextClicked = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const nextButton = buttons.find(btn => {
              if (btn.disabled) return false;
              const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
              return ariaLabel.includes('next page');
            });
            
            if (nextButton) {
              nextButton.click();
              return true;
            }
            return false;
          });
          
          if (!nextClicked) break;
          
          await delay(4000);
          
          let pageChanged = false;
          for (let i = 0; i < 15; i++) {
            const newState = await page.evaluate(() => {
              const el = document.querySelector(".mat-paginator-range-label");
              if (!el) return null;
              const text = el.textContent.trim();
              const match = text.match(/(\d+)\s*-\s*(\d+)/);
              return match ? `${match[1]}-${match[2]}` : null;
            });
            
            if (newState && newState !== currentState) {
              pageChanged = true;
              break;
            }
            await delay(500);
          }
          
          if (!pageChanged) break;
          
          currentPage++;
          if (currentPage > 100) break;
        }
  
        console.log(`[${session.id}] ✅ Found ${allCompanies.length} companies for "${companyName}"`);
        
        results.push({
          name: companyName,
          available: allCompanies.length === 0,
          details: {
            exists: allCompanies.length > 0,
            results: allCompanies.length > 0 ? allCompanies : [{ message: "No companies found" }],
            totalPages: currentPage
          }
        });
      }
  
      await browser.close();
      console.log(`[${session.id}] 🔒 Browser closed`);
  
      return results;
  
    } catch (error) {
      console.error(`[${session.id}] ❌ Error:`, error.message);
      if (browser) await browser.close();
      throw error;
    } finally {
      await sessionPool.releaseSession(session.id);
    }
  }
  
  // ===== API ROUTES =====
  
  // Updated endpoint with session-based lead accumulation
  app.post("/myData/check-names", async (req, res) => {
    const { companyNames, userData } = req.body;
    
    if (!companyNames || companyNames.length === 0) {
      return res.status(400).json({ error: "At least one company name is required" });
    }
  
    console.log(`\n🚀 Checking ${companyNames.length} company name(s)...`);
    
    try {
      // Check the names
      const results = await checkMyDataMultiSession(companyNames, userData);
  
      // Add to session
      const sessionInfo = leadSessionManager.addResult(userData, results);
      const sessionKey = sessionInfo.sessionKey;
      
      // Check if we should push to Bitrix24 now
      let bitrixResult = null;
      if (leadSessionManager.shouldPushSession(sessionKey)) {
        console.log(`🚀 Session ready, pushing to Bitrix24...`);
        const session = leadSessionManager.getSession(sessionKey);
        const leadData = leadSessionManager.prepareLead(session);
        bitrixResult = await pushLeadToBitrix24(leadData);
        leadSessionManager.markAsPushed(sessionKey, bitrixResult);
      } else {
        console.log(`⏳ Session ${sessionKey} not ready yet (${sessionInfo.totalNames}/3 names). Waiting...`);
      }
  
      res.json({
        success: true,
        results: results,
        session: {
          key: sessionKey,
          totalNamesChecked: sessionInfo.totalNames,
          isNew: sessionInfo.isNew,
          pushedToCRM: bitrixResult !== null
        },
        crm: bitrixResult
      });
  
    } catch (error) {
      console.error("❌ Error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  });

async function callBitrixApi(method, params = {}) {
  const BITRIX_WEBHOOK_URL = process.env.BITRIX24_WEBHOOK || 'YOUR_BITRIX_WEBHOOK_URL_HERE';
  if (BITRIX_WEBHOOK_URL === 'YOUR_BITRIX_WEBHOOK_URL_HERE') {
    throw new Error("Bitrix Webhook URL is not configured. Please update BITRIX_WEBHOOK_URL.");
  }

  const queryUrl = `${BITRIX_WEBHOOK_URL}${method}`;

  // Equivalent of PHP's http_build_query: converts JS object to URL-encoded string.
  // This format is required by Bitrix for POST data.
  const body = new URLSearchParams(params).toString();

  try {
    const response = await fetch(queryUrl, {
      method: 'POST',
      // Set headers to match what cURL would typically use for POST data
      headers: {
        'Content-Type': 'application/json'
      },
      body: body,
    });

    if (!response.ok) {
      // Throw an error if the HTTP status is not 2xx
      const errorText = await response.text();
      throw new Error(`Bitrix API returned HTTP error ${response.status}: ${errorText}`);
    }

    return response.json();
  } catch (error) {
    console.error('Error during Bitrix API call:', error.message);
    throw error;
  }
}

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


// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
exports.altomateLE = onRequest(app);

// const PORT = process.env.PORT || 8080; 

// // Start the Express server
// app.listen(PORT, () => {
//   console.log(`Server listening on port ${PORT}`);
// });