require('dotenv').config();

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

let SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';

// Ensure SERVER_URL includes a protocol so Swagger builds absolute URLs correctly
if (!/^https?:\/\//i.test(SERVER_URL)) {
  SERVER_URL = `https://${SERVER_URL}`;
}

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SmartMushFarm API',
      version: '1.0.0',
      description: 'API quản lý bán phôi nấm SmartMushFarm',
    },
    servers: [
      {
        url: SERVER_URL,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = { swaggerUi, swaggerSpec };