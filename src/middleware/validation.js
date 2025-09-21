import Joi from 'joi';
import { ValidationError } from '../utils/errors.js';
import { VALIDATION_CONSTANTS, APP_CONSTANTS } from '../config/constants.js';
import { logger } from '../utils/logger.js';

// Common validation schemas
const currencySchema = Joi.object({
    EUR: Joi.number().positive().min(VALIDATION_CONSTANTS.MIN_POSITIVE_NUMBER).optional(),
    USD: Joi.number().positive().min(VALIDATION_CONSTANTS.MIN_POSITIVE_NUMBER).optional(),
    GBP: Joi.number().positive().min(VALIDATION_CONSTANTS.MIN_POSITIVE_NUMBER).optional()
});

const fabricSchema = Joi.object({
    unit_eur: Joi.number().positive().min(VALIDATION_CONSTANTS.MIN_POSITIVE_NUMBER).optional(),
    price_eur: Joi.number().positive().min(VALIDATION_CONSTANTS.MIN_POSITIVE_NUMBER).optional(),
    metre_eur: Joi.number().positive().min(VALIDATION_CONSTANTS.MIN_POSITIVE_NUMBER).optional()
});

const rangeSchema = Joi.object({
    '0-50': Joi.number().min(0).optional(),
    '51-100': Joi.number().min(0).optional(),
    '101-200': Joi.number().min(0).optional()
}).min(1);

const percentageSchema = Joi.number()
    .min(VALIDATION_CONSTANTS.MIN_PERCENTAGE)
    .max(VALIDATION_CONSTANTS.MAX_PERCENTAGE);

const operationsSchema = Joi.object().pattern(
    Joi.string(),
    rangeSchema
);

// Main calculation validation schema
export const calculateSchema = Joi.object({
    rates: currencySchema.optional(),
    fabric: fabricSchema.optional(),
    genel_gider: rangeSchema.optional(),
    karlilik: rangeSchema.optional(),
    KDV: percentageSchema.optional(),
    komisyon: percentageSchema.optional(),
    operations: operationsSchema.optional(),
    batch: Joi.object({
        '0-50': Joi.number().min(VALIDATION_CONSTANTS.MIN_BATCH_SIZE).max(VALIDATION_CONSTANTS.MAX_BATCH_SIZE).optional(),
        '51-100': Joi.number().min(VALIDATION_CONSTANTS.MIN_BATCH_SIZE).max(VALIDATION_CONSTANTS.MAX_BATCH_SIZE).optional(),
        '101-200': Joi.number().min(VALIDATION_CONSTANTS.MIN_BATCH_SIZE).max(VALIDATION_CONSTANTS.MAX_BATCH_SIZE).optional()
    }).optional()
});

// Query parameter schemas
export const healthCheckSchema = Joi.object({
    detailed: Joi.boolean().default(false)
});

// Validation middleware factory
export function validateBody(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true,
            convert: true
        });

        if (error) {
            const details = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value
            }));

            logger.warn('Request validation failed', {
                url: req.url,
                method: req.method,
                errors: details
            });

            throw new ValidationError('Request validation failed', details);
        }

        req.validatedBody = value;
        next();
    };
}

export function validateQuery(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.query, {
            abortEarly: false,
            stripUnknown: true,
            convert: true
        });

        if (error) {
            const details = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value
            }));

            logger.warn('Query validation failed', {
                url: req.url,
                method: req.method,
                errors: details
            });

            throw new ValidationError('Query validation failed', details);
        }

        req.validatedQuery = value;
        next();
    };
}

export function validateParams(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.params, {
            abortEarly: false,
            stripUnknown: true,
            convert: true
        });

        if (error) {
            const details = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value
            }));

            logger.warn('Params validation failed', {
                url: req.url,
                method: req.method,
                errors: details
            });

            throw new ValidationError('Params validation failed', details);
        }

        req.validatedParams = value;
        next();
    };
}

// Custom validation helpers
export const customValidators = {
    validateCurrencyCode: (code) => {
        return APP_CONSTANTS.SUPPORTED_CURRENCIES.includes(code.toUpperCase());
    },

    validateBatchRange: (range) => {
        return APP_CONSTANTS.BATCH_RANGES.includes(range);
    },

    validatePositiveNumber: (value) => {
        return typeof value === 'number' && value > 0 && !isNaN(value);
    },

    validatePercentage: (value) => {
        return typeof value === 'number' &&
            value >= VALIDATION_CONSTANTS.MIN_PERCENTAGE &&
            value <= VALIDATION_CONSTANTS.MAX_PERCENTAGE;
    }
};