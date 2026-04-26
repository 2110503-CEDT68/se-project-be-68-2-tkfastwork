const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const path = require('path');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

dotenv.config({path:'./config/config.env'});
const auth = require('./routes/auth');

connectDB();

const app = express();
app.set('query parser', 'extended');

app.use(express.json());

app.use(cookieParser());

const coworkingSpaces = require('./routes/coworkingSpaces');
const reservations = require('./routes/reservations');
const rooms = require('./routes/rooms');
const coworkingSpaceRequests = require('./routes/coworkingSpaceRequests');
const stats = require('./routes/stats');
const reports = require('./routes/reports');
const { startReportScheduler } = require('./services/reportScheduler');

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Swagger docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
});

app.use('/api/v1/coworkingSpaces', coworkingSpaces);
app.use('/api/v1/coworkingSpaces', stats);
app.use('/api/v1/reservations', reservations);
app.use('/api/v1/rooms', rooms);
app.use('/api/v1/coworkingSpaceRequests', coworkingSpaceRequests);
app.use('/api/v1/auth', auth);
app.use('/api/v1/reports', reports);

const PORT = process.env.PORT || 5000;
startReportScheduler();
const server = app.listen(PORT, () => console.log('Server running in ', process.env.NODE_ENV, ' mode on port ', PORT));

process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    server.close(() => process.exit(1));
});

