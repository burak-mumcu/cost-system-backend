import { parseOdsDefaults } from './odsParser.js';
import { APP_CONSTANTS, VALIDATION_CONSTANTS } from '../config/constants.js';
import { CalculationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { cacheHelpers } from '../utils/cache.js';
import crypto from 'crypto';

class Calculator {
    constructor() {
        this.defaultBatch = APP_CONSTANTS.DEFAULT_BATCH;
        this.batchRanges = APP_CONSTANTS.BATCH_RANGES;
        this.percentageDivisor = APP_CONSTANTS.PERCENTAGE_DIVISOR;
    }

    /**
     * Main calculation function
     * @param {object} input - User input parameters
     * @param {object} overrides - System overrides
     * @returns {object} - Calculation results
     */
    async calculateFromInput(input = {}, overrides = {}) {
        const startTime = Date.now();

        try {
            // Generate cache key
            const inputHash = this.generateInputHash(input, overrides);

            // Check cache first
            const cached = cacheHelpers.getCalculationResult(inputHash);
            if (cached) {
                logger.debug('Using cached calculation result', { inputHash });
                return cached;
            }

            // Get defaults from ODS
            const defaults = parseOdsDefaults();

            // Merge parameters
            const params = this.mergeParameters(defaults, input, overrides);

            // Validate merged parameters
            this.validateCalculationParameters(params);

            // Perform calculations for each range
            const results = this.performCalculations(params);

            // Prepare final output
            const output = {
                ...params,
                result: results,
                metadata: {
                    calculatedAt: new Date().toISOString(),
                    inputHash,
                    version: '1.0.0'
                }
            };

            // Cache the result
            cacheHelpers.setCalculationResult(inputHash, output);

            const duration = Date.now() - startTime;
            logger.logCalculation('cost_calculation', input, Object.keys(results).length, duration);

            return output;

        } catch (error) {
            const duration = Date.now() - startTime;
            logger.error('Calculation failed', error, {
                input,
                overrides,
                duration
            });

            if (error instanceof CalculationError) {
                throw error;
            }

            throw new CalculationError('Calculation failed: ' + error.message, { input, overrides });
        }
    }

    /**
     * Generate cache key from input parameters
     * @param {object} input - User input
     * @param {object} overrides - System overrides
     * @returns {string} - Hash key
     */
    generateInputHash(input, overrides) {
        const combined = { ...input, ...overrides };
        const sortedKeys = JSON.stringify(combined, Object.keys(combined).sort());
        return crypto.createHash('md5').update(sortedKeys).digest('hex');
    }

    /**
     * Merge parameters from defaults, input, and overrides
     * @param {object} defaults - Default values from ODS
     * @param {object} input - User input
     * @param {object} overrides - System overrides
     * @returns {object} - Merged parameters
     */
    mergeParameters(defaults, input, overrides) {
        return {
            rates: {
                ...defaults.rates,
                ...(input.rates || {}),
                ...(overrides.rates || {})
            },
            fabric: {
                ...defaults.fabric,
                ...(input.fabric || {}),
                ...(overrides.fabric || {})
            },
            genel_gider: {
                ...defaults.genel_gider,
                ...(input.genel_gider || {}),
                ...(overrides.genel_gider || {})
            },
            karlilik: {
                ...defaults.karlilik,
                ...(input.karlilik || {}),
                ...(overrides.karlilik || {})
            },
            KDV: this.getValidNumber(input.KDV ?? overrides.KDV ?? defaults.KDV),
            komisyon: this.getValidNumber(input.komisyon ?? overrides.komisyon ?? defaults.komisyon),
            operations: {
                ...defaults.operations,
                ...(input.operations || {}),
                ...(overrides.operations || {})
            },
            batch: {
                ...this.defaultBatch,
                ...(input.batch || {})
            }
        };
    }

    /**
     * Validate calculation parameters
     * @param {object} params - Merged parameters
     */
    validateCalculationParameters(params) {
        const errors = [];

        // Validate exchange rates
        APP_CONSTANTS.SUPPORTED_CURRENCIES.forEach(currency => {
            const rate = params.rates[currency];
            if (!this.isValidPositiveNumber(rate)) {
                errors.push(`Invalid exchange rate for ${currency}: ${rate}`);
            }
        });

        // Validate fabric prices
        Object.entries(params.fabric).forEach(([key, value]) => {
            if (value !== null && value !== undefined && !this.isValidPositiveNumber(value)) {
                errors.push(`Invalid fabric price for ${key}: ${value}`);
            }
        });

        // Validate percentages
        if (!this.isValidPercentage(params.KDV)) {
            errors.push(`Invalid KDV percentage: ${params.KDV}`);
        }
        if (!this.isValidPercentage(params.komisyon)) {
            errors.push(`Invalid komisyon percentage: ${params.komisyon}`);
        }

        // Validate batch ranges
        this.batchRanges.forEach(range => {
            if (!this.isValidBatchSize(params.batch[range])) {
                errors.push(`Invalid batch size for range ${range}: ${params.batch[range]}`);
            }
        });

        if (errors.length > 0) {
            throw new CalculationError(`Parameter validation failed: ${errors.join(', ')}`);
        }
    }

    /**
     * Perform calculations for all batch ranges
     * @param {object} params - Calculation parameters
     * @returns {object} - Results for each range
     */
    performCalculations(params) {
        const results = {};

        this.batchRanges.forEach(range => {
            try {
                results[range] = this.calculateForRange(range, params);
            } catch (error) {
                logger.error(`Calculation failed for range ${range}`, error, { range, params });
                throw new CalculationError(`Calculation failed for range ${range}: ${error.message}`);
            }
        });

        return results;
    }

    /**
     * Calculate costs for a specific batch range
     * @param {string} range - Batch range (e.g., '0-50')
     * @param {object} params - Calculation parameters
     * @returns {object} - Calculation results for the range
     */
    calculateForRange(range, params) {
        const batchSize = params.batch[range];

        // Calculate total operations cost in TRY
        const totalOpsTry = this.calculateOperationsCost(range, params.operations);

        // Convert to per-unit operations cost in EUR
        const perUnitOpsTry = this.safeDivision(totalOpsTry, batchSize);
        const perUnitOpsEur = this.safeDivision(perUnitOpsTry, params.rates.EUR);

        // Calculate base per-unit cost in EUR
        const fabricCostEur = this.getFabricCost(params.fabric);
        const perUnitEur = fabricCostEur + perUnitOpsEur;

        // Calculate total raw cost
        const hamMaliyetEur = perUnitEur * batchSize;

        // Apply overhead percentages
        const genelGiderEur = this.applyPercentage(hamMaliyetEur, params.genel_gider[range]);
        const karEur = this.applyPercentage(hamMaliyetEur, params.karlilik[range]);

        // Calculate taxable amount
        const taxableEur = hamMaliyetEur + genelGiderEur + karEur;

        // Apply KDV and commission
        const kdvEur = this.applyPercentage(taxableEur, params.KDV);
        const commissionEur = this.applyPercentage(taxableEur, params.komisyon);

        // Calculate final amounts
        const finalEur = taxableEur + kdvEur + commissionEur;
        const finalTry = finalEur * params.rates.EUR;
        const finalUsd = this.safeDivision(finalTry, params.rates.USD);
        const finalGbp = this.safeDivision(finalTry, params.rates.GBP);

        // Calculate per-unit finals
        const perUnitFinalEur = this.safeDivision(finalEur, batchSize);
        const perUnitFinalTry = this.safeDivision(finalTry, batchSize);
        const perUnitFinalUsd = this.safeDivision(finalUsd, batchSize);
        const perUnitFinalGbp = this.safeDivision(finalGbp, batchSize);

        return {
            batchSize,

            // Costs breakdown
            fabricCostEur: this.roundTo2Decimals(fabricCostEur),
            perUnitOpsTry: this.roundTo2Decimals(perUnitOpsTry),
            perUnitOpsEur: this.roundTo2Decimals(perUnitOpsEur),
            perUnitEur: this.roundTo2Decimals(perUnitEur),

            // Total costs
            hamMaliyetEur: this.roundTo2Decimals(hamMaliyetEur),
            genelGiderEur: this.roundTo2Decimals(genelGiderEur),
            karEur: this.roundTo2Decimals(karEur),
            taxableEur: this.roundTo2Decimals(taxableEur),
            kdvEur: this.roundTo2Decimals(kdvEur),
            commissionEur: this.roundTo2Decimals(commissionEur),

            // Final totals
            finalEur: this.roundTo2Decimals(finalEur),
            finalTry: this.roundTo2Decimals(finalTry),
            finalUsd: this.roundTo2Decimals(finalUsd),
            finalGbp: this.roundTo2Decimals(finalGbp),

            // Per-unit finals
            perUnitFinalEur: this.roundTo2Decimals(perUnitFinalEur),
            perUnitFinalTry: this.roundTo2Decimals(perUnitFinalTry),
            perUnitFinalUsd: this.roundTo2Decimals(perUnitFinalUsd),
            perUnitFinalGbp: this.roundTo2Decimals(perUnitFinalGbp),

            // Metadata
            calculationDate: new Date().toISOString(),
            range
        };
    }

    /**
     * Calculate total operations cost for a range
     * @param {string} range - Batch range
     * @param {object} operations - Operations data
     * @returns {number} - Total operations cost in TRY
     */
    calculateOperationsCost(range, operations) {
        let total = 0;

        Object.entries(operations).forEach(([operationName, ranges]) => {
            const cost = this.getValidNumber(ranges[range]);
            total += cost;
        });

        return total;
    }

    /**
     * Get fabric cost from fabric parameters
     * @param {object} fabric - Fabric parameters
     * @returns {number} - Fabric cost in EUR
     */
    getFabricCost(fabric) {
        // Priority: unit_eur > price_eur > 0
        return this.getValidNumber(fabric.unit_eur) ||
            this.getValidNumber(fabric.price_eur) ||
            0;
    }

    /**
     * Apply percentage to base amount
     * @param {number} base - Base amount
     * @param {number} percentage - Percentage to apply
     * @returns {number} - Calculated amount
     */
    applyPercentage(base, percentage) {
        const validBase = this.getValidNumber(base);
        const validPercentage = this.getValidNumber(percentage);
        return (validBase * validPercentage) / this.percentageDivisor;
    }

    /**
     * Safe division with zero check
     * @param {number} numerator - Numerator
     * @param {number} denominator - Denominator
     * @returns {number} - Division result or 0 if denominator is 0
     */
    safeDivision(numerator, denominator) {
        const validNumerator = this.getValidNumber(numerator);
        const validDenominator = this.getValidNumber(denominator);

        if (validDenominator === 0) {
            logger.warn('Division by zero avoided', { numerator: validNumerator, denominator: validDenominator });
            return 0;
        }

        return validNumerator / validDenominator;
    }

    /**
     * Get valid number or return 0
     * @param {*} value - Value to validate
     * @returns {number} - Valid number or 0
     */
    getValidNumber(value) {
        if (value === null || value === undefined || value === '') {
            return 0;
        }

        const num = Number(value);
        return isNaN(num) ? 0 : num;
    }

    /**
     * Check if value is a valid positive number
     * @param {*} value - Value to check
     * @returns {boolean} - True if valid positive number
     */
    isValidPositiveNumber(value) {
        const num = this.getValidNumber(value);
        return num >= VALIDATION_CONSTANTS.MIN_POSITIVE_NUMBER;
    }

    /**
     * Check if value is a valid percentage
     * @param {*} value - Value to check
     * @returns {boolean} - True if valid percentage
     */
    isValidPercentage(value) {
        const num = this.getValidNumber(value);
        return num >= VALIDATION_CONSTANTS.MIN_PERCENTAGE &&
            num <= VALIDATION_CONSTANTS.MAX_PERCENTAGE;
    }

    /**
     * Check if value is a valid batch size
     * @param {*} value - Value to check
     * @returns {boolean} - True if valid batch size
     */
    isValidBatchSize(value) {
        const num = this.getValidNumber(value);
        return num >= VALIDATION_CONSTANTS.MIN_BATCH_SIZE &&
            num <= VALIDATION_CONSTANTS.MAX_BATCH_SIZE;
    }

    /**
     * Round number to 2 decimal places
     * @param {number} value - Number to round
     * @returns {number} - Rounded number
     */
    roundTo2Decimals(value) {
        return Math.round((this.getValidNumber(value) + Number.EPSILON) * 100) / 100;
    }
}

// Create singleton instance
const calculator = new Calculator();

// Export main function for backward compatibility
export function calculateFromInput(input = {}, overrides = {}) {
    return calculator.calculateFromInput(input, overrides);
}

// Export calculator instance
export { calculator };
export default calculator;