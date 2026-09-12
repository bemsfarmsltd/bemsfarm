const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'Bems Farms API',
    description: 'Complete API Documentation for Bems Farms (Client & Admin)',
    version: '1.0.0',
  },
  schemes: ['https', 'http'],
  host: 'api.bemsfarms.com',
  securityDefinitions: {
    bearerAuth: {
      type: 'apiKey',
      in: 'header',
      name: 'Authorization',
      description: 'Enter your bearer token in the format **Bearer &lt;token>**'
    }
  },
  security: [{ bearerAuth: [] }]
};

const outputFile = './swagger-output.json';
// Pointing directly to index.js to trace routes
const endpointsFiles = ['./src/index.js'];

// Generate swagger.json
swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
    console.log("Swagger documentation generated successfully.");
});
