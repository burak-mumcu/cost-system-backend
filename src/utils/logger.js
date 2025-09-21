import { config } from '../config/environment.js';

// Log levels
const LOG_LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};

class Logger {
    constructor() {
        this.logLevel = LOG_LEVELS[config.logLevel] || LOG_LEVELS.info;
    }

    formatMessage(level, message, meta = {}) {
        const timestamp = new Date().toISOString();
        const baseLog = {
            timestamp,
            level,
            message,
            env: config.env,
            pid: process.pid
        };

        if (Object.keys(meta).length > 0) {
            baseLog.meta = meta;
        }

        return JSON.stringify(baseLog);
    }

    shouldLog(level) {
        return LOG_LEVELS[level] <= this.logLevel;
    }

    error(message, error = null, meta = {}) {
        if (!this.shouldLog('error')) return;

        const errorMeta = { ...meta };
        if (error) {
            errorMeta.error = {
                name: error.name,
                message: error.message,
                stack: config.isDevelopment ? error.stack : undefined
            };
        }

        console.error(this.formatMessage('error', message, errorMeta));
    }

    warn(message, meta = {}) {
        if (!this.shouldLog('warn')) return;
        console.warn(this.formatMessage('warn', message, meta));
    }

    info(message, meta = {}) {
        if (!this.shouldLog('info')) return;
        console.log(this.formatMessage('info', message, meta));
    }

    debug(message, meta = {}) {
        if (!this.shouldLog('debug')) return;
        console.log(this.formatMessage('debug', message, meta));
    }

    // Request logging helper
    logRequest(req, res, responseTime) {
        const meta = {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            responseTime: `${responseTime}ms`,
            userAgent: req.get('User-Agent'),
            ip: req.ip || req.connection.remoteAddress
        };

        if (res.statusCode >= 400) {
            this.error('HTTP request failed', null, meta);
        } else {
            this.info('HTTP request completed', meta);
        }
    }

    // Performance logging
    logPerformance(operation, duration, meta = {}) {
        this.info(`Performance: ${operation}`, {
            ...meta,
            duration: `${duration}ms`,
            operation
        });
    }

    // Business logic logging
    logCalculation(calculationType, inputData, resultCount, duration) {
        this.info('Calculation completed', {
            calculationType,
            inputKeys: Object.keys(inputData),
            resultCount,
            duration: `${duration}ms`
        });
    }

    logFileOperation(operation, filePath, success, error = null) {
        const meta = {
            operation,
            filePath,
            success
        };

        if (success) {
            this.info(`File operation: ${operation}`, meta);
        } else {
            this.error(`File operation failed: ${operation}`, error, meta);
        }
    }
}

// Create singleton instance
export const logger = new Logger();
export default logger;