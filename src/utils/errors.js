import { HTTP_STATUS } from '../config/constants.js';

// Base application error
export class AppError extends Error {
    constructor(message, statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR, isOperational = true) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.timestamp = new Date().toISOString();

        Error.captureStackTrace(this, this.constructor);
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            statusCode: this.statusCode,
            timestamp: this.timestamp,
            isOperational: this.isOperational
        };
    }
}

// Validation error
export class ValidationError extends AppError {
    constructor(message, details = null) {
        super(message, HTTP_STATUS.BAD_REQUEST);
        this.details = details;
    }
}

// File operation errors
export class FileNotFoundError extends AppError {
    constructor(filePath) {
        super(`File not found: ${filePath}`, HTTP_STATUS.NOT_FOUND);
        this.filePath = filePath;
    }
}

export class FileParseError extends AppError {
    constructor(filePath, originalError) {
        super(`Failed to parse file: ${filePath}`, HTTP_STATUS.UNPROCESSABLE_ENTITY);
        this.filePath = filePath;
        this.originalError = originalError;
    }
}

// Calculation errors
export class CalculationError extends AppError {
    constructor(message, calculationData = null) {
        super(message, HTTP_STATUS.UNPROCESSABLE_ENTITY);
        this.calculationData = calculationData;
    }
}

// External API errors
export class ExternalApiError extends AppError {
    constructor(service, message, statusCode = HTTP_STATUS.BAD_GATEWAY) {
        super(`${service} API error: ${message}`, statusCode);
        this.service = service;
    }
}

// Rate limiting error
export class RateLimitError extends AppError {
    constructor(message = 'Too many requests') {
        super(message, HTTP_STATUS.TOO_MANY_REQUESTS);
    }
}

// Authentication/Authorization errors
export class AuthenticationError extends AppError {
    constructor(message = 'Authentication required') {
        super(message, HTTP_STATUS.UNAUTHORIZED);
    }
}

export class AuthorizationError extends AppError {
    constructor(message = 'Insufficient permissions') {
        super(message, HTTP_STATUS.FORBIDDEN);
    }
}

// Configuration error
export class ConfigurationError extends AppError {
    constructor(message) {
        super(`Configuration error: ${message}`, HTTP_STATUS.INTERNAL_SERVER_ERROR, false);
    }
}

// Timeout error
export class TimeoutError extends AppError {
    constructor(operation, timeout) {
        super(`Operation timed out: ${operation} (${timeout}ms)`, HTTP_STATUS.SERVICE_UNAVAILABLE);
        this.operation = operation;
        this.timeout = timeout;
    }
}

// Helper function to check if error is operational
export function isOperationalError(error) {
    if (error instanceof AppError) {
        return error.isOperational;
    }
    return false;
}

// Helper function to format error for response
export function formatErrorResponse(error, includeStack = false) {
    const response = {
        success: false,
        error: {
            name: error.name || 'Error',
            message: error.message || 'An error occurred',
            timestamp: error.timestamp || new Date().toISOString()
        }
    };

    // Add specific error details
    if (error instanceof ValidationError && error.details) {
        response.error.details = error.details;
    }

    if (error instanceof FileNotFoundError) {
        response.error.filePath = error.filePath;
    }

    if (error instanceof ExternalApiError) {
        response.error.service = error.service;
    }

    // Include stack trace only in development and for non-operational errors
    if (includeStack && error.stack) {
        response.error.stack = error.stack;
    }

    return response;
}