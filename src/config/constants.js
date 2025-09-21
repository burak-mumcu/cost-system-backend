// HTTP Status Codes
export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    METHOD_NOT_ALLOWED: 405,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
    BAD_GATEWAY: 502,
    SERVICE_UNAVAILABLE: 503
};

// Application Constants
export const APP_CONSTANTS = {
    // Default batch sizes
    DEFAULT_BATCH: {
        '0-50': 25,
        '51-100': 75,
        '101-200': 150
    },

    // Calculation ranges
    BATCH_RANGES: ['0-50', '51-100', '101-200'],

    // Supported currencies
    SUPPORTED_CURRENCIES: ['EUR', 'USD', 'GBP'],

    // Default exchange rates (fallback)
    DEFAULT_EXCHANGE_RATES: {
        EUR: 37.99,
        USD: 33.99,
        GBP: 44.93
    },

    // Cache expiration times (in milliseconds)
    CACHE_EXPIRATION: {
        ODS_DATA: 5 * 60 * 1000, // 5 minutes
        EXCHANGE_RATES: 15 * 60 * 1000, // 15 minutes
        CALCULATION_RESULTS: 2 * 60 * 1000 // 2 minutes
    },

    // Percentage calculation divisor
    PERCENTAGE_DIVISOR: 100,

    // API endpoints
    API_ENDPOINTS: {
        HEALTH: '/api/health',
        TEST: '/api/test',
        CALCULATE: '/api/calculate',
        SCHEMA: '/api/schema',
        DOCS: '/api-docs'
    },

    // Error messages
    ERROR_MESSAGES: {
        VALIDATION_FAILED: 'Validation failed',
        INTERNAL_SERVER_ERROR: 'Internal server error',
        FILE_NOT_FOUND: 'Required file not found',
        CALCULATION_ERROR: 'Calculation error occurred',
        INVALID_CURRENCY: 'Invalid currency provided',
        INVALID_RANGE: 'Invalid batch range provided',
        ODS_PARSE_ERROR: 'ODS file could not be parsed'
    },

    // Success messages
    SUCCESS_MESSAGES: {
        CALCULATION_COMPLETED: 'Calculation completed successfully',
        DEFAULTS_RETRIEVED: 'Default parameters retrieved successfully',
        HEALTH_CHECK_PASSED: 'Health check passed'
    }
};

// ODS file structure constants
export const ODS_STRUCTURE = {
    // Row indices for different data types
    RATES_START_ROW: 2,
    FABRIC_START_ROW: 2,
    GENEL_GIDER_START_ROW: 7,
    KARLILIK_START_ROW: 13,
    KDV_ROW: 18,
    KOMISYON_ROW: 19,
    OPERATIONS_START_ROW: 29,
    OPERATIONS_END_ROW: 35,

    // Column indices
    COLUMNS: {
        RATE_VALUES: 1,
        FABRIC_VALUES: 4,
        RANGE_0_50: 1,
        RANGE_51_100: 2,
        RANGE_101_200: 3,
        OPERATION_NAME: 0
    },

    // Sheet configuration
    DEFAULT_SHEET_INDEX: 0
};

// Validation constants
export const VALIDATION_CONSTANTS = {
    MIN_POSITIVE_NUMBER: 0.001,
    MAX_PERCENTAGE: 100,
    MIN_PERCENTAGE: 0,
    MAX_BATCH_SIZE: 10000,
    MIN_BATCH_SIZE: 1
};