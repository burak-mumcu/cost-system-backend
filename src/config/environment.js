import dotenv from 'dotenv';
import Joi from 'joi';

dotenv.config();

// Environment validation schema
const envSchema = Joi.object({
    NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
    PORT: Joi.number().default(4000),
    ODS_PATH: Joi.string().default('./data/final_maliyet_sistemi.ods'),
    EXCHANGE_API_KEY: Joi.string().optional(),
    LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').default('info'),
    CORS_ORIGIN: Joi.string().default('*'),
    RATE_LIMIT_WINDOW: Joi.number().default(15), // minutes
    RATE_LIMIT_MAX_REQUESTS: Joi.number().default(100),
    REQUEST_TIMEOUT: Joi.number().default(30000), // milliseconds
}).unknown();

const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
    throw new Error(`Config validation error: ${error.message}`);
}

export const config = {
    env: envVars.NODE_ENV,
    port: envVars.PORT,
    isDevelopment: envVars.NODE_ENV === 'development',
    isProduction: envVars.NODE_ENV === 'production',
    isTest: envVars.NODE_ENV === 'test',

    // File paths
    odsPath: envVars.ODS_PATH,

    // External APIs
    exchangeApiKey: envVars.EXCHANGE_API_KEY,

    // Logging
    logLevel: envVars.LOG_LEVEL,

    // Security
    cors: {
        origin: envVars.CORS_ORIGIN === '*' ? true : envVars.CORS_ORIGIN.split(','),
        credentials: true,
        optionsSuccessStatus: 200
    },

    // Rate limiting
    rateLimit: {
        windowMs: envVars.RATE_LIMIT_WINDOW * 60 * 1000,
        max: envVars.RATE_LIMIT_MAX_REQUESTS,
        message: 'Too many requests from this IP, please try again later.'
    },

    // Request handling
    requestTimeout: envVars.REQUEST_TIMEOUT
};

export default config;