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
        operationsSorter: (a, b) => {
            const order = (operation) => {
                const path = operation.get('path');
                const method = operation.get('method');
                const rank = [
                    { path: '/api/maintenance-requests', method: 'post' },
                    { path: '/api/maintenance-requests/my-requests', method: 'get' },
                    { path: '/api/maintenance-requests/{id}/cancel', method: 'put' },
                    { path: '/api/maintenance-requests/{id}', method: 'get' },
                    { path: '/api/admin/maintenance-requests', method: 'get' },
                    { path: '/api/admin/maintenance-requests/{id}/approve', method: 'put' },
                    { path: '/api/admin/maintenance-requests/{id}/schedule', method: 'put' },
                    { path: '/api/admin/maintenance-requests/{id}/cancel', method: 'put' },
                    { path: '/api/technician/maintenance-tasks', method: 'get' },
                    { path: '/api/technician/maintenance-tasks/{id}', method: 'get' },
                    { path: '/api/technician/maintenance-tasks/{id}/request-completion', method: 'put' },
                    { path: '/api/admin/maintenance-requests/{id}/confirm-completed', method: 'put' },
                ];
                const index = rank.findIndex(item => item.path === path && item.method === method);
                return index === -1 ? rank.length : index;
            };

            return order(a) - order(b);
        },
    },
}));
app.use('/api', rootRouter);

module.exports = app;
