const express = require('express');
const sql = require('mssql');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Database configuration
const config = {
    user: 'visu2020',
    password: 'Visu@4373295664',
    server: 'inclassa3.database.windows.net',
    database: 'c907381inclass',
    options: {
        encrypt: true,
        enableArithAbort: true
    }
};

let dbConnected = false;

// Connect to Azure SQL Database
async function connectToDatabase() {
    try {
        await sql.connect(config);
        console.log('Connected to Azure SQL Database');
        dbConnected = true;
    } catch (err) {
        console.error('Error connecting to Azure SQL Database:', err);
        setTimeout(connectToDatabase, 5000); // Retry connection after 5 seconds
    }
}

connectToDatabase();

// Middleware to check database connection
function ensureDatabaseConnection(req, res, next) {
    if (dbConnected) {
        next();
    } else {
        res.status(503).send('Service Unavailable: Database connection not established');
    }
}

// Use the middleware for all routes
app.use(ensureDatabaseConnection);

// Routes
app.get('/', async (req, res) => {
    try {
        const result = await sql.query`SELECT * FROM Expenses`;
        res.render('index', { expenses: result.recordset });
    } catch (err) {
        console.error('Error retrieving expenses:', err);
        res.status(500).send('Error retrieving expenses');
    }
});

app.post('/add-expense', async (req, res) => {
    const { category, amount, date, description } = req.body;
    try {
        const query = `
            INSERT INTO Expenses (category, amount, date, description) 
            VALUES (@category, @amount, @date, @description)
        `;
        const request = new sql.Request();
        request.input('category', sql.VarChar, category);
        request.input('amount', sql.Decimal(10, 2), amount);
        request.input('date', sql.Date, date);
        request.input('description', sql.VarChar, description);

        await request.query(query);
        res.redirect('/');
    } catch (err) {
        console.error('Error adding expense:', err);
        res.status(500).send('Error adding expense: ' + err.message);
    }
});

// Endpoint to add a random expense
app.get('/add-random-expense', async (req, res) => {
    try {
        const categories = ['Food', 'Transport', 'Phone', 'Entertainment', 'Other'];
        const randomCategory = categories[Math.floor(Math.random() * categories.length)];
        const randomAmount = (Math.random() * (100 - 1) + 1).toFixed(2);
        const randomDate = new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000));
        const formattedDate = randomDate.toISOString().split('T')[0];
        const description = 'Sample description';

        const query = `
            INSERT INTO Expenses (category, amount, date, description) 
            VALUES (@category, @amount, @date, @description)
        `;
        const request = new sql.Request();
        request.input('category', sql.VarChar, randomCategory);
        request.input('amount', sql.Decimal(10, 2), randomAmount);
        request.input('date', sql.Date, formattedDate);
        request.input('description', sql.VarChar, description);

        await request.query(query);
        res.redirect('/');
    } catch (err) {
        console.error('Error adding random expense:', err);
        res.status(500).send('Error adding random expense: ' + err.message);
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
