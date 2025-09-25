/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
require('dotenv').config();
const {setGlobalOptions} = require("firebase-functions/v2");
const {onRequest} = require("firebase-functions/https");
const firebase = require("firebase-admin");
const express = require('express');
const app = express();
const jwt = require('jsonwebtoken');
const mysql = require('mysql2');
const logger = require("firebase-functions/logger");

const JWT_SECRET = process.env.JWT_SECRET;

const db = mysql.createConnection({
    host: 'db-mysql-sgp1-44557-do-user-17663198-0.k.db.ondigitalocean.com',  // DigitalOcean's public hostname
    user: 'doadmin',               // MySQL user
    password:  process.env.DB_PASSWORD,              // MySQL password
    database: 'altomate_LE', // The database you're connecting to
    port: 25060,             // Replace with your MySQL port (e.g., 25060)
    keepAliveInitialDelay: 10000, // keepalive
    enableKeepAlive: true // keepalive
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

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Step 1: Query the database for the user by username
        // NOTE: In a production app, you would also select the stored password hash and salt.
        const query = 'SELECT * FROM le_user WHERE email = ?';
        db.query(query, [email], (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).send('An internal server error occurred.');
            }

            // Step 2: Check if a user was found
            if (results.length === 0) {
                return res.status(401).send('Invalid username or password.');
            }

            const user = results[0];

            // Step 3: Compare the provided password with the stored password
            // NOTE: This is NOT secure. In a real application, you would
            // hash the incoming password and compare it against the stored hash.
            // For example, using a library like `bcrypt`.
            if (password !== user.password) {
                return res.status(401).send('Invalid username or password.');
            }

            // Step 4: If login is successful, generate JWTs and return them
            const accessToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1h' });
            const refreshToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });

            res.json({ accessToken, refreshToken });
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred during the login process.');
    }
});

app.post('/register', async (req, res) => {
    try {
        const { name, email, contact, password } = req.body;

        // Step 1: Validate required fields
        if (!name || !email || !contact || !password) {
            return res.status(400).send('All fields are required: Name, email, contact_no, password.');
        }

        // Step 2: Check if user already exists
        const checkUserQuery = 'SELECT * FROM le_user WHERE email = ?';
        db.query(checkUserQuery, [email], (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).send('An internal server error occurred.');
            }

            if (results.length > 0) {
                return res.status(409).send('User with this email already exists.');
            }

            // Step 3: Insert the new user into the database
            // NOTE: For a real application, you must hash the password before saving it.
            // For example, using bcrypt.
            // const hashedPassword = await bcrypt.hash(password, 10);
            
            const insertQuery = 'INSERT INTO le_user (Name, email, contact_no, password) VALUES (?, ?, ?, ?)';
            db.query(insertQuery, [name, email, contact, password], (insertErr, insertResult) => {
                if (insertErr) {
                    console.error(insertErr);
                    return res.status(500).send('An error occurred during user registration.');
                }

                // Step 4: Respond with success message
                res.status(201).json({ message: 'User registered successfully!' });
            });
        });

    } catch (err) {
        console.error(err);
        res.status(500).send('An error occurred during the registration process.');
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
setGlobalOptions({ maxInstances: 10 });

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
exports.altomateLE = onRequest(app);