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
        db.query(query,[userID], (err, results) => {
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
    if ( contact_no === undefined|| address=== undefined) {
        return res.status(400).json({ 
            message: 'Missing required field: "data" in request body.'
        });
    }

    try {
        // SQL query to update the 'data' column in the 'le_project' table
        // We use placeholders (?) for security to prevent SQL Injection.
        const query = 'UPDATE le_user SET contact_no =?, address=?  WHERE ID = ?';
        
        // The first placeholder takes newData, the second takes the Id
        db.query(query, [ contact_no, address, Id], (err, results) => {
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


app.get('/getProjectByUser/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        // Step 1: Retrieve the main invoice details
        const query = 'SELECT ID, name, status, year_end, created_on, updated_on FROM le_project where userID = ?';
        db.query(query, [userId],(err, results) => {
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
        db.query(query, [Id],(err, results) => {
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
    //    We assume the client sends the new 'data' value in the request body.
    const newData = req.body.data;

    // Check if the data is present
    if (newData === undefined) {
        return res.status(400).json({ 
            message: 'Missing required field: "data" in request body.'
        });
    }

    try {
        // SQL query to update the 'data' column in the 'le_project' table
        // We use placeholders (?) for security to prevent SQL Injection.
        const query = 'UPDATE le_project SET data = ?, updated_on = NOW() WHERE ID = ?';
        
        // The first placeholder takes newData, the second takes the Id
        db.query(query, [JSON.stringify(newData), Id], (err, results) => {
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
                message: `Project ID ${Id} updated successfully.`,
                affectedRows: results.affectedRows
            });
        });
    } catch (err) {
        // Catch any non-database errors (e.g., JSON parsing failure, internal server issues)
        console.error('General error during project update:', err);
        res.status(500).send('An internal error occurred while updating the project data');
    }
});

app.post('/createProject', async (req, res) => {
    // Destructure required fields from the request body
    const { userId, name, status, year_end, data } = req.body;

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