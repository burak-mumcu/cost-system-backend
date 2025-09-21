import { config } from '../config/environment.js';
import { HTTP_STATUS } from '../config/constants.js';
import { AppError, formatErrorResponse, isOperationalError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Global error handler middleware
 */
export function errorHandler(error, req, res, next) {
    // If response already sent, delegate to default Express error handler
    if (res.headersSent) {
        return next(error);
    }

    let appError = error;

    // Convert non-AppError instances to AppError
    if (!(error instanceof AppError)) {
        // Handle specific error types
        if (error.name === 'ValidationError') {
            appError = new AppError(
                error.message,
                HTTP_STATUS.BAD_REQUEST,
                true
            );
        } else if (error.name === 'CastError') {
            appError = new AppError(
                'Invalid data format',
                HTTP_STATUS.BAD_REQUEST,
                true
            );
        } else if (error.name === 'JsonWebTokenError') {
            appError = new AppError(
                'Invalid token',
                HTTP_STATUS.UNAUTHORIZED,
                true
            );
        } else if (error.name === 'TokenExpiredError') {
            appError = new AppError(
                'Token expired',
                HTTP_STATUS.UNAUTHORIZED,
                true
            );
        } else if (error.code === 'ENOENT') {
            appError = new AppError(
                'File not found',
                HTTP_STATUS.NOT_FOUND,
                true
            );
        } else if (error.code === 'ECONNREFUSED') {
            appError = new AppError(
                'Service unavailable',
                HTTP_STATUS.SERVICE_UNAVAILABLE,
                true
            );
        } else if (error.type === 'entity.parse.failed') {
            appError = new AppError(
                'Invalid JSON format',
                HTTP_STATUS.BAD_REQUEST,
                true
            );
        } else if (error.type === 'entity.too.large') {
            appError = new AppError(
                'Request payload too large',
                HTTP_STATUS.BAD_REQUEST,
                true
            );
        } else {
            // Unknown error - treat as internal server error
            appError = new AppError(
                config.isProduction ? 'Internal server error' : error.message,
                HTTP_STATUS.INTERNAL_SERVER_ERROR,
                false
            );
        }
    }

    // Log the error
    const errorContext = {
        url: req.originalUrl,
        method: req.method,
        statusCode: appError.statusCode,
        userAgent: req.get('User-Agent'),
        ip: req.ip || req.connection.remoteAddress,
        body: req.body,
        query: req.query,
        params: req.params
    };

    if (appError.statusCode >= 500) {
        logger.error('Server error occurred', appError, errorContext);
    } else if (appError.statusCode >= 400) {
        logger.warn('Client error occurred', errorContext);
    }

    // Format and send error response
    const shouldIncludeStack = config.isDevelopment && !isOperationalError(appError);
    const errorResponse = formatErrorResponse(appError, shouldIncludeStack);

    res.status(appError.statusCode).json(errorResponse);
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors and pass to error handler
 */
export function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req, res, next) {
    const error = new AppError(
        `Route ${req.originalUrl} not found`,
        HTTP_STATUS.NOT_FOUND
    );
    next(error);
}

/**
 * Unhandled rejection handler
 */
export function handleUnhandledRejection() {
    process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled Rejection', reason, {
            promise: promise.toString()
        });

        // In production, you might want to gracefully shutdown
        if (config.isProduction) {
            process.exit(1);
        }
    });
}

/**
 * Uncaught exception handler
 */
export function handleUncaughtException() {
    process.on('uncaughtException', (error) => {
        logger.error('Uncaught Exception', error);

        // Always exit on uncaught exceptions
        process.exit(1);
    });
}

/**
 * Graceful shutdown handler
 */
export function setupGracefulShutdown(server) {
    const shutdown = (signal) => {
        logger.info(`${signal} received, shutting down gracefully`);

        server.close((err) => {
            if (err) {
                logger.error('Error during server shutdown', err);
                process.exit(1);
            }

            logger.info('Server closed successfully');
            process.exit(0);
        });

        // Force shutdown after 30 seconds
        setTimeout(() => {
            logger.error('Forced shutdown due to timeout');
            process.exit(1);
        }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}