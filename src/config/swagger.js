import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './environment.js';
import { APP_CONSTANTS } from './constants.js';

// Swagger definition
const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'Maliyet Sistemi API',
        version: '2.0.0',
        description: 'Excel tabanlı hesaplama servisi için gelişmiş API dokümantasyonu',
        contact: {
            name: 'API Support',
            email: 'support@example.com'
        },
        license: {
            name: 'MIT',
            url: 'https://opensource.org/licenses/MIT'
        }
    },
    servers: [
        {
            url: `http://localhost:${config.port}`,
            description: 'Development server'
        },
        {
            url: 'https://api.example.com',
            description: 'Production server'
        }
    ],
    components: {
        schemas: {
            SuccessResponse: {
                type: 'object',
                properties: {
                    success: {
                        type: 'boolean',
                        example: true
                    }
                }
            },
            ErrorResponse: {
                type: 'object',
                properties: {
                    success: {
                        type: 'boolean',
                        example: false
                    },
                    error: {
                        type: 'object',
                        properties: {
                            name: {
                                type: 'string',
                                example: 'ValidationError'
                            },
                            message: {
                                type: 'string',
                                example: 'Request validation failed'
                            },
                            timestamp: {
                                type: 'string',
                                format: 'date-time',
                                example: '2025-01-20T10:30:00.000Z'
                            },
                            details: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        field: {
                                            type: 'string',
                                            example: 'rates.EUR'
                                        },
                                        message: {
                                            type: 'string',
                                            example: '"rates.EUR" must be a positive number'
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            ExchangeRates: {
                type: 'object',
                properties: {
                    EUR: {
                        type: 'number',
                        minimum: 0.001,
                        example: 37.99,
                        description: 'EUR to TRY exchange rate'
                    },
                    USD: {
                        type: 'number',
                        minimum: 0.001,
                        example: 33.99,
                        description: 'USD to TRY exchange rate'
                    },
                    GBP: {
                        type: 'number',
                        minimum: 0.001,
                        example: 44.93,
                        description: 'GBP to TRY exchange rate'
                    }
                }
            },
            FabricPricing: {
                type: 'object',
                properties: {
                    unit_eur: {
                        type: 'number',
                        minimum: 0,
                        example: 4.74,
                        description: 'Unit price in EUR'
                    },
                    price_eur: {
                        type: 'number',
                        minimum: 0,
                        example: 3.16,
                        description: 'Base price in EUR'
                    },
                    metre_eur: {
                        type: 'number',
                        minimum: 0,
                        example: 1.5,
                        description: 'Price per metre in EUR'
                    }
                }
            },
            BatchRangeData: {
                type: 'object',
                properties: {
                    '0-50': {
                        type: 'number',
                        minimum: 0,
                        example: 12.5
                    },
                    '51-100': {
                        type: 'number',
                        minimum: 0,
                        example: 10.0
                    },
                    '101-200': {
                        type: 'number',
                        minimum: 0,
                        example: 8.5
                    }
                },
                description: 'Data organized by batch size ranges'
            },
            OperationCosts: {
                type: 'object',
                additionalProperties: {
                    $ref: '#/components/schemas/BatchRangeData'
                },
                example: {
                    cutting: {
                        '0-50': 50,
                        '51-100': 100,
                        '101-200': 200
                    },
                    sewing: {
                        '0-50': 150,
                        '51-100': 300,
                        '101-200': 600
                    }
                }
            },
            CalculationInput: {
                type: 'object',
                properties: {
                    rates: {
                        $ref: '#/components/schemas/ExchangeRates',
                        description: 'Override default exchange rates'
                    },
                    fabric: {
                        $ref: '#/components/schemas/FabricPricing',
                        description: 'Override default fabric pricing'
                    },
                    genel_gider: {
                        $ref: '#/components/schemas/BatchRangeData',
                        description: 'General overhead percentages by batch range'
                    },
                    karlilik: {
                        $ref: '#/components/schemas/BatchRangeData',
                        description: 'Profit margin percentages by batch range'
                    },
                    KDV: {
                        type: 'number',
                        minimum: 0,
                        maximum: 100,
                        example: 20,
                        description: 'VAT percentage'
                    },
                    komisyon: {
                        type: 'number',
                        minimum: 0,
                        maximum: 100,
                        example: 5,
                        description: 'Commission percentage'
                    },
                    operations: {
                        $ref: '#/components/schemas/OperationCosts',
                        description: 'Operation costs by type and batch range'
                    },
                    batch: {
                        type: 'object',
                        properties: {
                            '0-50': {
                                type: 'integer',
                                minimum: 1,
                                maximum: 50,
                                example: 25
                            },
                            '51-100': {
                                type: 'integer',
                                minimum: 51,
                                maximum: 100,
                                example: 75
                            },
                            '101-200': {
                                type: 'integer',
                                minimum: 101,
                                maximum: 200,
                                example: 150
                            }
                        },
                        description: 'Batch sizes for each range'
                    }
                },
                example: {
                    rates: {
                        EUR: 38.50,
                        USD: 34.20,
                        GBP: 45.10
                    },
                    fabric: {
                        unit_eur: 5.00
                    },
                    KDV: 18,
                    komisyon: 3
                }
            },
            CalculationResult: {
                type: 'object',
                properties: {
                    batchSize: {
                        type: 'integer',
                        example: 25,
                        description: 'Batch size for this calculation'
                    },
                    fabricCostEur: {
                        type: 'number',
                        example: 4.74,
                        description: 'Fabric cost per unit in EUR'
                    },
                    perUnitOpsTry: {
                        type: 'number',
                        example: 8.0,
                        description: 'Operations cost per unit in TRY'
                    },
                    perUnitOpsEur: {
                        type: 'number',
                        example: 0.21,
                        description: 'Operations cost per unit in EUR'
                    },
                    perUnitEur: {
                        type: 'number',
                        example: 4.95,
                        description: 'Total per unit cost in EUR'
                    },
                    hamMaliyetEur: {
                        type: 'number',
                        example: 123.75,
                        description: 'Raw material cost in EUR'
                    },
                    genelGiderEur: {
                        type: 'number',
                        example: 15.47,
                        description: 'General overhead cost in EUR'
                    },
                    karEur: {
                        type: 'number',
                        example: 30.94,
                        description: 'Profit amount in EUR'
                    },
                    taxableEur: {
                        type: 'number',
                        example: 170.16,
                        description: 'Taxable amount in EUR'
                    },
                    kdvEur: {
                        type: 'number',
                        example: 34.03,
                        description: 'VAT amount in EUR'
                    },
                    commissionEur: {
                        type: 'number',
                        example: 8.51,
                        description: 'Commission amount in EUR'
                    },
                    finalEur: {
                        type: 'number',
                        example: 212.70,
                        description: 'Final total in EUR'
                    },
                    finalTry: {
                        type: 'number',
                        example: 8082.53,
                        description: 'Final total in TRY'
                    },
                    finalUsd: {
                        type: 'number',
                        example: 237.77,
                        description: 'Final total in USD'
                    },
                    finalGbp: {
                        type: 'number',
                        example: 179.94,
                        description: 'Final total in GBP'
                    },
                    perUnitFinalEur: {
                        type: 'number',
                        example: 8.51,
                        description: 'Final per unit price in EUR'
                    },
                    perUnitFinalTry: {
                        type: 'number',
                        example: 323.30,
                        description: 'Final per unit price in TRY'
                    },
                    perUnitFinalUsd: {
                        type: 'number',
                        example: 9.51,
                        description: 'Final per unit price in USD'
                    },
                    perUnitFinalGbp: {
                        type: 'number',
                        example: 7.20,
                        description: 'Final per unit price in GBP'
                    },
                    calculationDate: {
                        type: 'string',
                        format: 'date-time',
                        example: '2025-01-20T10:30:00.000Z'
                    },
                    range: {
                        type: 'string',
                        example: '0-50',
                        description: 'Batch range for this calculation'
                    }
                }
            },
            CalculationResponse: {
                allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                        type: 'object',
                        properties: {
                            data: {
                                type: 'object',
                                properties: {
                                    rates: {
                                        $ref: '#/components/schemas/ExchangeRates',
                                        description: 'Exchange rates used in calculation'
                                    },
                                    fabric: {
                                        $ref: '#/components/schemas/FabricPricing',
                                        description: 'Fabric pricing used in calculation'
                                    },
                                    result: {
                                        type: 'object',
                                        properties: {
                                            '0-50': { $ref: '#/components/schemas/CalculationResult' },
                                            '51-100': { $ref: '#/components/schemas/CalculationResult' },
                                            '101-200': { $ref: '#/components/schemas/CalculationResult' }
                                        },
                                        description: 'Calculation results for each batch range'
                                    },
                                    metadata: {
                                        type: 'object',
                                        properties: {
                                            calculatedAt: {
                                                type: 'string',
                                                format: 'date-time'
                                            },
                                            inputHash: {
                                                type: 'string'
                                            },
                                            version: {
                                                type: 'string'
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                ]
            },
            SchemaResponse: {
                allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                        type: 'object',
                        properties: {
                            defaults: {
                                $ref: '#/components/schemas/CalculationInput',
                                description: 'Default parameters from ODS file'
                            },
                            note: {
                                type: 'string',
                                example: 'You can POST to /api/calculate with overrides to compute results.'
                            }
                        }
                    }
                ]
            },
            HealthResponse: {
                allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                        type: 'object',
                        properties: {
                            status: {
                                type: 'string',
                                example: 'ok'
                            },
                            timestamp: {
                                type: 'string',
                                format: 'date-time'
                            },
                            uptime: {
                                type: 'string',
                                example: '2h 30m 45s'
                            },
                            version: {
                                type: 'string',
                                example: '2.0.0'
                            },
                            environment: {
                                type: 'string',
                                example: 'development'
                            },
                            dependencies: {
                                type: 'object',
                                properties: {
                                    odsFile: {
                                        type: 'object',
                                        properties: {
                                            status: { type: 'string' },
                                            path: { type: 'string' },
                                            lastModified: { type: 'string' }
                                        }
                                    },
                                    exchangeRateService: {
                                        type: 'object',
                                        properties: {
                                            status: { type: 'string' },
                                            responseTime: { type: 'string' }
                                        }
                                    }
                                }
                            },
                            cache: {
                                type: 'object',
                                properties: {
                                    hitRate: { type: 'string' },
                                    totalRequests: { type: 'number' },
                                    currentSize: { type: 'number' }
                                }
                            }
                        }
                    }
                ]
            }
        },
        responses: {
            BadRequest: {
                description: 'Bad request - validation error',
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/ErrorResponse' }
                    }
                }
            },
            NotFound: {
                description: 'Resource not found',
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/ErrorResponse' }
                    }
                }
            },
            TooManyRequests: {
                description: 'Rate limit exceeded',
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/ErrorResponse' }
                    }
                }
            },
            InternalServerError: {
                description: 'Internal server error',
                content: {
                    'application/json': {
                        schema: { $ref: '#/components/schemas/ErrorResponse' }
                    }
                }
            }
        }
    },
    tags: [
        {
            name: 'Calculate',
            description: 'Cost calculation operations'
        },
        {
            name: 'Schema',
            description: 'Default parameters and configuration'
        },
        {
            name: 'Health',
            description: 'System health and monitoring'
        }
    ]
};

// Swagger options
const swaggerOptions = {
    definition: swaggerDefinition,
    apis: [
        './src/routes/*.js',
        './src/controllers/*.js'
    ]
};

// Create swagger specification
export const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI options
export const swaggerUiOptions = {
    explorer: true,
    swaggerOptions: {
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
        tryItOutEnabled: true,
        requestInterceptor: (req) => {
            req.headers['Content-Type'] = 'application/json';
            return req;
        }
    },
    customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info hgroup.main h2 { color: #3b82f6 }
        .swagger-ui .scheme-container { background: #f8fafc; padding: 10px; border-radius: 5px; }
    `,
    customSiteTitle: 'Maliyet Sistemi API Docs',
    customfavIcon: '/favicon.ico'
};

export default { swaggerSpec, swaggerUiOptions };