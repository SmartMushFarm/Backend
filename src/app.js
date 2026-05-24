const express = require('express');
const cors = require('cors');
const rootRouter = require('./routes/rootRouter');
const { swaggerUi, swaggerSpec } = require('./utils/swagger');

const app = express();

// Middleware 
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
    res.json({ message: 'Backend API is running' });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/api', rootRouter);

module.exports = app;
