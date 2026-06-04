const express = require('express');
const cors = require('cors');
const rootRouter = require('./routes/rootRouter');
const { swaggerUi, swaggerSpec } = require('./utils/swagger');

const app = express();

// Middleware 
app.use(cors());
app.use(express.json());

app.use((error, req, res, next) => {
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
        return res.status(400).json({
            success: false,
            message: 'Invalid JSON body. Please check missing quotes, commas, or braces.',
        });
    }

    return next(error);
});

// Routes
app.get('/', (req, res) => {
    res.json({ message: 'SmartMushFarm API is running' });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    swaggerOptions: {
        persistAuthorization: true,
    },
}));
app.use('/api', rootRouter);

module.exports = app;
