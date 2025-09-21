import express from 'express';
import { parseOdsDefaults } from '../services/odsParser.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { HTTP_STATUS, APP_CONSTANTS } from '../config/constants.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * @swagger
 * /api/schema:
 *   get:
 *     summary: Get default calculation parameters
 *     description: |
 *       Retrieve default parameters from the ODS configuration file.
 *       These parameters include exchange rates, fabric pricing, overhead rates,
 *       profit margins, and operation costs. You can use these values as a reference
 *       or override them in the calculation endpoint.
 *     tags: [Schema]
 *     responses:
 *       200:
 *         description: Default parameters retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SchemaResponse'
 *             examples:
 *               success:
 *                 summary: Successful response
 *                 value:
 *                   success: true
 *                   defaults:
 *                     rates:
 *                       EUR: 37.99
 *                       USD: 33.99
 *                       GBP: 44.93
 *                     fabric:
 *                       unit_eur: 4.74
 *                       price_eur: 3.16
 *                       metre_eur: 1.5
 *                     genel_gider:
 *                       "0-50": 12.5
 *                       "51-100": 10.0
 *                       "101-200": 8.5
 *                     karlilik:
 *                       "0-50": 25.0
 *                       "51-100": 20.0
 *                       "101-200": 15.0
 *                     KDV: 20
 *                     komisyon: 5
 *                     operations:
 *                       cutting:
 *                         "0-50": 50
 *                         "51-100": 100
 *                         "101-200": 200
 *                       sewing:
 *                         "0-50": 150
 *                         "51-100": 300
 *                         "101-200": 600
 *                   note: "You can POST to /api/calculate with overrides to compute results."
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/',
    asyncHandler(async (req, res) => {
        const startTime = Date.now();

        logger.info('Schema request received', {
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        try {
            const defaults = parseOdsDefaults();
            const duration = Date.now() - startTime;

            // Add metadata about the defaults
            const response = {
                success: true,
                defaults,
                note: 'You can POST to /api/calculate with overrides to compute results.',
                metadata: {
                    retrievedAt: new Date().toISOString(),
                    supportedCurrencies: APP_CONSTANTS.SUPPORTED_CURRENCIES,
                    batchRanges: APP_CONSTANTS.BATCH_RANGES,
                    operationTypes: Object.keys(defaults.operations || {}),
                    cacheUsed: false // This would be determined by the parser
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

        } catch (error) {
            // Error is already logged by the error handler middleware
            throw error;
        }
    })
);

export default router;