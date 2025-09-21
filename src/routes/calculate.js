import express from 'express';
import { calculateFromInput } from '../services/calculator.js';
import { validateBody, calculateSchema } from '../middleware/validation.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { createCalculationRateLimit } from '../middleware/security.js';
import { HTTP_STATUS, APP_CONSTANTS } from '../config/constants.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * @swagger
 * /api/calculate:
 *   post:
 *     summary: Perform cost calculation
 *     description: |
 *       Calculate production costs based on provided parameters.
 *       Any parameter not provided will use default values from the ODS file.
 *       Returns detailed cost breakdown for all batch ranges.
 *     tags: [Calculate]
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CalculationInput'
 *           examples:
 *             basic:
 *               summary: Basic calculation with exchange rates
 *               value:
 *                 rates:
 *                   EUR: 38.50
 *                   USD: 34.20
 *                   GBP: 45.10
 *             advanced:
 *               summary: Advanced calculation with multiple parameters
 *               value:
 *                 rates:
 *                   EUR: 38.50
 *                   USD: 34.20
 *                   GBP: 45.10
 *                 fabric:
 *                   unit_eur: 5.00
 *                   price_eur: 4.50
 *                 KDV: 18
 *                 komisyon: 3
 *                 genel_gider:
 *                   "0-50": 15
 *                   "51-100": 12
 *                   "101-200": 10
 *     responses:
 *       200:
 *         description: Calculation completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CalculationResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/',
    createCalculationRateLimit(),
    validateBody(calculateSchema),
    asyncHandler(async (req, res) => {
        const startTime = Date.now();

        logger.info('Calculation request received', {
            inputKeys: Object.keys(req.validatedBody || {}),
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });

        try {
            const result = await calculateFromInput(req.validatedBody || {});
            const duration = Date.now() - startTime;

            logger.info('Calculation completed successfully', {
                duration: `${duration}ms`,
                rangesCalculated: Object.keys(result.result || {}).length,
                cacheUsed: result.metadata?.fromCache || false
            });

            res.status(HTTP_STATUS.OK).json({
                success: true,
                data: result,
                message: APP_CONSTANTS.SUCCESS_MESSAGES.CALCULATION_COMPLETED,
                processingTime: `${duration}ms`
            });

        } catch (error) {
            // Error is already logged by the error handler middleware
            throw error;
        }
    })
);

export default router;