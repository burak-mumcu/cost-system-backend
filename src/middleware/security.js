import rateLimit from 'express-rate-limit';
import cors from 'cors';
import helmet from 'helmet';
import { config } from '../config/environment.js';
import { HTTP_STATUS } from '../config/constants.js';
import { logger } from '../utils/logger.js';
import { RateLimitError } from '../utils/errors.js';

/**
 * CORS configuration
 */
export function configureCors() {
    const corsOptions = {
        origin: (origin, callback) => {
            // Allow requests with no origin (mobile apps, Postman, etc.)
            if (!origin) return callback(null, true);

            if (config.cors.origin === true) {
                return callback(null, true);
            }

            if (Array.isArray(config.cors.origin)) {
                if (config.cors.origin.includes(origin)) {
                    return callback(null, true);
                } else {
                    logger.warn('CORS blocked origin', { origin });
                    return callback(new Error('Not allowed by CORS'), false);
                }
            }

            callback(null, false);
        },
        credentials: config.cors.credentials,
        optionsSuccessStatus: config.cors.optionsSuccessStatus,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Origin',
            'X-Requested-With',
            'Content-Type',
            'Accept',
            'Authorization',
            'Cache-Control',
            'X-API-Key'
        ],
        exposedHeaders: [
            'X-RateLimit-Limit',
            'X-RateLimit-Remaining',
            'X-RateLimit-Reset'
        ]
    };

    return cors(corsOptions);
}

/**
 * Basic rate limiting
 */
export function createRateLimit() {
    return rateLimit({
        windowMs: config.rateLimit.windowMs,
        max: config.rateLimit.max,
        message: {
            success: false,
            error: config.rateLimit.message,
            retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            logger.warn('Rate limit exceeded', {
                ip: req.ip,
                url: req.originalUrl,
                userAgent: req.get('User-Agent')
            });

            const error = new RateLimitError(config.rateLimit.message);
            res.status(error.statusCode).json({
                success: false,
                error: error.message,
                retryAfter: Math.ceil(config.rateLimit.windowMs / 1000)
            });
        },
        skip: (req) => {
            // Skip rate limiting for health checks
            return req.path === '/api/health';
        }
    });
}

/**
 * Stricter rate limiting for calculation endpoint
 */
export function createCalculationRateLimit() {
    return rateLimit({
        windowMs: 5 * 60 * 1000, // 5 minutes
        max: 20, // Limit each IP to 20 calculation requests per windowMs
        message: {
            success: false,
            error: 'Too many calculation requests. Please try again later.',
            retryAfter: 300
        },
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, res) => {
            logger.warn('Calculation rate limit exceeded', {
                ip: req.ip,
                url: req.originalUrl,
                userAgent: req.get('User-Agent')
            });

            res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
                success: false,
                error: 'Too many calculation requests. Please try again later.',
                retryAfter: 300
            });
        }
    });
}

/**
 * Request timeout middleware
 */
export function requestTimeout(timeout = config.requestTimeout) {
    return (req, res, next) => {
        const timer = setTimeout(() => {
            if (!res.headersSent) {
                logger.warn('Request timeout', {
                    url: req.originalUrl,
                    method: req.method,
                    timeout
                });

                res.status(HTTP_STATUS.SERVICE_UNAVAILABLE).json({
                    success: false,
                    error: 'Request timeout',
                    timeout: `${timeout}ms`
                });
            }
        }, timeout);

        res.on('finish', () => {
            clearTimeout(timer);
        });

        res.on('close', () => {
            clearTimeout(timer);
        });

        next();
    };
}

/**
 * Security headers with Helmet
 */
export function configureHelmet() {
    return helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"]
            }
        },
        crossOriginEmbedderPolicy: false // Allow Swagger UI to work
    });
}

/**
 * Request logging middleware
 */
export function requestLogger() {
    return (req, res, next) => {
        const startTime = Date.now();

        // Log request
        logger.info('Incoming request', {
            method: req.method,
            url: req.originalUrl,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent'),
            contentType: req.get('Content-Type'),
            contentLength: req.get('Content-Length')
        });

        // Override res.json to log response
        const originalJson = res.json;
        res.json = function(data) {
            const responseTime = Date.now() - startTime;

            logger.logRequest(req, res, responseTime);

            return originalJson.call(this, data);
        };

        next();
    };
}

/**
 * IP validation middleware (basic)
 */
export function validateIP() {
    const blockedIPs = process.env.BLOCKED_IPS?.split(',') || [];

    return (req, res, next) => {
        const clientIP = req.ip || req.connection.remoteAddress;

        if (blockedIPs.includes(clientIP)) {
            logger.warn('Blocked IP attempted access', { ip: clientIP });
            return res.status(HTTP_STATUS.FORBIDDEN).json({
                success: false,
                error: 'Access denied'
            });
        }

        next();
    };
}

/**
 * Content type validation
 */
export function validateContentType(expectedTypes = ['application/json']) {
    return (req, res, next) => {
        if (req.method === 'GET' || req.method === 'DELETE') {
            return next();
        }

        const contentType = req.get('Content-Type');

        if (!contentType) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                error: 'Content-Type header is required'
            });
        }

        const isValidType = expectedTypes.some(type =>
            contentType.toLowerCase().includes(type.toLowerCase())
        );

        if (!isValidType) {
            logger.warn('Invalid content type', {
                contentType,
                expectedTypes,
                url: req.originalUrl
            });

            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                error: `Invalid Content-Type. Expected: ${expectedTypes.join(', ')}`
            });
        }

        next();
    };
}