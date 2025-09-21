import express from 'express';
import swaggerUi from 'swagger-ui-express';

// Configuration and constants
import { config } from './config/environment.js';
import { HTTP_STATUS, APP_CONSTANTS } from './config/constants.js';
import { swaggerSpec, swaggerUiOptions } from './config/swagger.js';

// Middleware
import {
    configureCors,
    createRateLimit,
    requestTimeout,
    configureHelmet,
    requestLogger,
    validateIP,
    validateContentType
} from './middleware/security.js';
import {
    errorHandler,
    notFoundHandler,
    handleUnhandledRejection,
    handleUncaughtException,
    setupGracefulShutdown
} from './middleware/errorHandler.js';

// Routes
import calculateRouter from './routes/calculate.js';
import schemaRouter from './routes/schema.js';
import healthRouter from './routes/health.js';

// Utilities
import { logger } from './utils/logger.js';
import { cacheManager } from './utils/cache.js';

// Handle unhandled rejections and exceptions
handleUnhandledRejection();
handleUncaughtException();

class Application {
    constructor() {
        this.app = express();
        this.server = null;
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    /**
     * Setup middleware
     */
    setupMiddleware() {
        // Security headers
        this.app.use(configureHelmet());

        // CORS configuration
        this.app.use(configureCors());

        // Request logging
        if (!config.isTest) {
            this.app.use(requestLogger());
        }

        // Rate limiting
        this.app.use(createRateLimit());

        // Request timeout
        this.app.use(requestTimeout());

        // IP validation (if needed)
        this.app.use(validateIP());

        // Body parsing
        this.app.use(express.json({
            limit: '10mb',
            strict: true
        }));

        this.app.use(express.urlencoded({
            extended: true,
            limit: '10mb'
        }));

        // Content type validation for POST/PUT requests
        this.app.use(validateContentType(['application/json']));

        logger.info('Middleware configured successfully', {
            environment: config.env,
            cors: config.cors.origin,
            rateLimit: config.rateLimit
        });
    }

    /**
     * Setup API routes
     */
    setupRoutes() {
        // API Documentation
        this.app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

        // API Routes
        this.app.use('/api/calculate', calculateRouter);
        this.app.use('/api/schema', schemaRouter);
        this.app.use('/api/health', healthRouter);

        // Root endpoint - API information
        this.app.get('/', (req, res) => {
            res.json({
                name: 'Maliyet Sistemi API',
                version: '2.0.0',
                description: 'Excel tabanlı hesaplama servisi',
                environment: config.env,
                status: 'running',
                timestamp: new Date().toISOString(),
                endpoints: {
                    documentation: '/api-docs',
                    health: '/api/health',
                    calculate: '/api/calculate',
                    schema: '/api/schema'
                },
                contact: {
                    support: 'support@example.com'
                }
            });
        });

        // Legacy endpoints for backward compatibility
        this.app.get('/api/test', (req, res) => {
            logger.info('Legacy test endpoint accessed', {
                ip: req.ip,
                userAgent: req.get('User-Agent')
            });

            res.json({
                message: 'API working!',
                version: '2.0.0',
                timestamp: new Date().toISOString(),
                availableRoutes: Object.values(APP_CONSTANTS.API_ENDPOINTS),
                note: 'This is a legacy endpoint. Please use /api/health for health checks.'
            });
        });

        // Cache management endpoints (development only)
        if (config.isDevelopment) {
            this.setupDevelopmentRoutes();
        }

        logger.info('Routes configured successfully', {
            routeCount: this.app._router.stack.length
        });
    }

    /**
     * Setup development-only routes
     */
    setupDevelopmentRoutes() {
        // Cache statistics
        this.app.get('/api/dev/cache/stats', (req, res) => {
            res.json({
                success: true,
                cache: cacheManager.getStats(),
                entries: cacheManager.getEntries()
            });
        });

        // Clear cache
        this.app.delete('/api/dev/cache', (req, res) => {
            cacheManager.clear();
            res.json({
                success: true,
                message: 'Cache cleared successfully'
            });
        });

        // System information
        this.app.get('/api/dev/system', (req, res) => {
            res.json({
                success: true,
                system: {
                    nodeVersion: process.version,
                    platform: process.platform,
                    architecture: process.arch,
                    uptime: process.uptime(),
                    memory: process.memoryUsage(),
                    cpu: process.cpuUsage(),
                    environment: process.env.NODE_ENV,
                    pid: process.pid
                }
            });
        });

        logger.info('Development routes configured');
    }

    /**
     * Setup error handling
     */
    setupErrorHandling() {
        // 404 handler (must be before error handler)
        this.app.use(notFoundHandler);

        // Global error handler (must be last)
        this.app.use(errorHandler);

        logger.info('Error handling configured');
    }

    /**
     * Start the server
     * @param {number} port - Port to listen on
     * @returns {Promise} - Server instance
     */
    async start(port = config.port) {
        return new Promise((resolve, reject) => {
            try {
                this.server = this.app.listen(port, () => {
                    logger.info('🚀 Server started successfully', {
                        port,
                        environment: config.env,
                        nodeVersion: process.version,
                        pid: process.pid,
                        timestamp: new Date().toISOString()
                    });

                    logger.info('📚 API Documentation available at:', {
                        docs: `http://localhost:${port}/api-docs`
                    });

                    logger.info('🔗 Available endpoints:', {
                        root: `http://localhost:${port}/`,
                        health: `http://localhost:${port}/api/health`,
                        calculate: `http://localhost:${port}/api/calculate`,
                        schema: `http://localhost:${port}/api/schema`
                    });

                    // Setup graceful shutdown
                    setupGracefulShutdown(this.server);

                    resolve(this.server);
                });

                this.server.on('error', (error) => {
                    if (error.code === 'EADDRINUSE') {
                        logger.error(`Port ${port} is already in use`, error);
                        reject(new Error(`Port ${port} is already in use`));
                    } else {
                        logger.error('Server error', error);
                        reject(error);
                    }
                });

            } catch (error) {
                logger.error('Failed to start server', error);
                reject(error);
            }
        });
    }

    /**
     * Stop the server gracefully
     * @returns {Promise}
     */
    async stop() {
        return new Promise((resolve, reject) => {
            if (!this.server) {
                resolve();
                return;
            }

            logger.info('Stopping server...');

            this.server.close((error) => {
                if (error) {
                    logger.error('Error stopping server', error);
                    reject(error);
                } else {
                    logger.info('Server stopped successfully');
                    resolve();
                }
            });
        });
    }

    /**
     * Get Express app instance
     * @returns {Express} - Express application
     */
    getApp() {
        return this.app;
    }

    /**
     * Get server instance
     * @returns {Server} - HTTP server instance
     */
    getServer() {
        return this.server;
    }
}

// Create application instance
const application = new Application();

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    application.start().catch((error) => {
        logger.error('Failed to start application', error);
        process.exit(1);
    });
}

// Export for testing and external use
export default application;
export { application };