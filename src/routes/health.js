import express from 'express';
import fs from 'fs/promises';
import { odsParser } from '../services/odsParser.js';
import { exchangeRateService } from '../services/exchangeRateService.js';
import { cacheManager } from '../utils/cache.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { validateQuery, healthCheckSchema } from '../middleware/validation.js';
import { HTTP_STATUS, APP_CONSTANTS } from '../config/constants.js';
import { config } from '../config/environment.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Store startup time
const startupTime = Date.now();

/**
 * Format uptime in human-readable form
 */
function formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
}

/**
 * Check ODS file health
 */
async function checkOdsFileHealth() {
    const filePath = './data/final_maliyet_sistemi.ods';
    try {
        const stats = await fs.stat(filePath);
        return {
            status: 'healthy',
            path: filePath,
            lastModified: stats.mtime.toISOString()
        };
    } catch (err) {
        return {
            status: 'unhealthy',
            path: filePath,
            error: err.message
        };
    }
}

/**
 * Check exchange rate service health
 */
async function checkExchangeRateServiceHealth() {
    const start = Date.now();
    try {
        await exchangeRateService.getRate('USD', 'TRY'); // örnek çağrı
        return {
            status: 'healthy',
            responseTime: `${Date.now() - start}ms`
        };
    } catch (err) {
        return {
            status: 'unhealthy',
            error: err.message
        };
    }
}

/**
 * Get cache health
 */
function getCacheHealth() {
    try {
        const stats = cacheManager.getStats();
        return {
            status: 'healthy',
            hitRate: `${stats.hitRate.toFixed(2)}%`,
            totalRequests: stats.totalRequests,
            currentSize: stats.size
        };
    } catch (err) {
        return {
            status: 'unhealthy',
            error: err.message
        };
    }
}

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: System health check
 *     description: |
 *       Check the health status of the API and its dependencies.
 *       Use the 'detailed' query parameter to get comprehensive health information.
 *     tags: [Health]
 */
router.get('/',
    asyncHandler(async (req, res) => {
        const startTime = Date.now();

        logger.info('Schema request received', {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        const defaults = parseOdsDefaults(); // DÜZELTME: await kaldırıldı çünkü sync fonksiyon
        const duration = Date.now() - startTime;

        const response = {
            success: true,
            defaults,
            note: 'You can POST to /api/calculate with overrides to compute results.',
            metadata: {
                retrievedAt: new Date().toISOString(),
                supportedCurrencies: APP_CONSTANTS.SUPPORTED_CURRENCIES,
                batchRanges: APP_CONSTANTS.BATCH_RANGES,
                operationTypes: Object.keys(defaults.operations || {}),
                cacheUsed: false
            },
            info: {
                description: 'Default calculation parameters from ODS configuration',
                version: '2.0.0',
                lastUpdated: new Date().toISOString()
            }
        };

        logger.info('Schema retrieved successfully', {
            duration: `${duration}ms`,
            operationCount: Object.keys(defaults.operations || {}).length,
            cacheUsed: false
        });

        res.status(HTTP_STATUS.OK).json(response);
    })
);

export default router;
