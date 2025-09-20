import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import path from 'path';
import { fileURLToPath } from 'url';

import calculateRouter from './routes/calculate.js';
import schemaRouter from './routes/schema.js';

// ES modules için __dirname tanımla
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Swagger config
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Maliyet Sistemi API',
            version: '1.0.0',
            description: 'Excel tabanlı hesaplama servisi için API dokümantasyonu',
        },
        servers: [
            {
                url: `http://localhost:${process.env.PORT || 4000}`,
            },
        ],
    },
    // Farklı path'leri dene
    apis: [
        path.join(__dirname, './routes/*.js'),
        './routes/*.js',
        'src/routes/*.js'
    ]
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Debug için log ekle
console.log('Swagger spec paths:', Object.keys(swaggerSpec.paths || {}));
console.log('Current directory:', __dirname);
console.log('APIs paths:', swaggerOptions.apis);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/calculate', calculateRouter);
app.use('/api/schema', schemaRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`✅ Server listening on ${PORT}`);
    console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
});