import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

import calculateRouter from './routes/calculate.js';
import schemaRouter from './routes/schema.js';

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Manual swagger spec - test için
const manualSwaggerSpec = {
    openapi: '3.0.0',
    info: {
        title: 'Maliyet Sistemi API',
        version: '1.0.0',
        description: 'Excel tabanlı hesaplama servisi için API dokümantasyonu'
    },
    servers: [
        {
            url: `http://localhost:${process.env.PORT || 4000}`,
        }
    ],
    paths: {
        '/api/calculate': {
            post: {
                summary: 'Maliyet hesaplaması yapar',
                tags: ['Calculate'],
                requestBody: {
                    required: false,
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    rates: {
                                        type: 'object',
                                        properties: {
                                            EUR: { type: 'number', example: 37.99 },
                                            USD: { type: 'number', example: 33.99 },
                                            GBP: { type: 'number', example: 44.93 }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                responses: {
                    '200': {
                        description: 'Hesaplama başarılı',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        data: { type: 'object' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        '/api/schema': {
            get: {
                summary: 'Varsayılan parametreleri getirir',
                tags: ['Schema'],
                responses: {
                    '200': {
                        description: 'Başarılı',
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    properties: {
                                        success: { type: 'boolean' },
                                        defaults: { type: 'object' }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(manualSwaggerSpec));

// Routes
app.use('/api/calculate', calculateRouter);
app.use('/api/schema', schemaRouter);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({
        message: 'API working!',
        availableRoutes: [
            '/api/health',
            '/api/test',
            '/api/calculate',
            '/api/schema',
            '/api-docs'
        ]
    });
});

// Simple error handler
app.use((error, req, res, next) => {
    console.error('Error:', error);
    res.status(500).json({
        success: false,
        error: error.message
    });
});

// 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.path
    });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`✅ Server listening on ${PORT}`);
    console.log(`🌍 Test URL: http://localhost:${PORT}/api/test`);
    console.log(`📚 Docs URL: http://localhost:${PORT}/api-docs`);
    console.log(`💚 Health: http://localhost:${PORT}/api/health`);
});