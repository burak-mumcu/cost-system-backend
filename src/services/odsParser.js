import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { config } from '../config/environment.js';
import { ODS_STRUCTURE, APP_CONSTANTS } from '../config/constants.js';
import { FileNotFoundError, FileParseError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { cacheHelpers } from '../utils/cache.js';

class OdsParser {
    constructor() {
        this.odsPath = config.odsPath;
        this.lastModified = null;
    }

    /**
     * Parse ODS file and return default values
     * @returns {object} - Default calculation parameters
     */
    parseOdsDefaults() {
        const startTime = Date.now();

        try {
            // Check cache first
            const cached = cacheHelpers.getOdsDefaults();
            if (cached && this.isFileUnchanged()) {
                logger.debug('Using cached ODS defaults', {
                    filePath: this.odsPath
                });
                return cached;
            }

            // Validate file exists
            if (!fs.existsSync(this.odsPath)) {
                throw new FileNotFoundError(this.odsPath);
            }

            // Check file permissions
            try {
                fs.accessSync(this.odsPath, fs.constants.R_OK);
            } catch (error) {
                throw new FileParseError(this.odsPath, 'File is not readable');
            }

            // Read and parse file
            const workbook = this.readWorkbook();
            const defaults = this.extractDefaults(workbook);

            // Validate extracted data
            this.validateDefaults(defaults);

            // Cache the results
            cacheHelpers.setOdsDefaults(defaults);
            this.updateLastModified();

            const duration = Date.now() - startTime;
            logger.logFileOperation('parse', this.odsPath, true);
            logger.logPerformance('ODS parsing', duration, {
                filePath: this.odsPath,
                cacheUsed: false
            });

            return defaults;

        } catch (error) {
            const duration = Date.now() - startTime;
            logger.logFileOperation('parse', this.odsPath, false, error);
            logger.error('ODS parsing failed', error, {
                filePath: this.odsPath,
                duration
            });

            if (error instanceof FileNotFoundError || error instanceof FileParseError) {
                throw error;
            }

            throw new FileParseError(this.odsPath, error.message);
        }
    }

    /**
     * Read workbook from file
     * @returns {object} - XLSX workbook object
     */
    readWorkbook() {
        try {
            const workbook = XLSX.readFile(this.odsPath);

            if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                throw new Error('No sheets found in workbook');
            }

            return workbook;
        } catch (error) {
            throw new FileParseError(this.odsPath, `Failed to read workbook: ${error.message}`);
        }
    }

    /**
     * Extract default values from workbook
     * @param {object} workbook - XLSX workbook object
     * @returns {object} - Extracted defaults
     */
    extractDefaults(workbook) {
        const sheetName = workbook.SheetNames[ODS_STRUCTURE.DEFAULT_SHEET_INDEX];
        const sheet = workbook.Sheets[sheetName];

        if (!sheet) {
            throw new Error(`Sheet "${sheetName}" not found`);
        }

        // Convert sheet to rows
        const rows = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            defval: null,
            raw: false // Ensure numbers are converted properly
        });

        logger.debug('Sheet converted to rows', {
            sheetName,
            rowCount: rows.length
        });

        return {
            rates: this.extractRates(rows),
            fabric: this.extractFabric(rows),
            genel_gider: this.extractGenelGider(rows),
            karlilik: this.extractKarlilik(rows),
            KDV: this.extractKDV(rows),
            komisyon: this.extractKomisyon(rows),
            operations: this.extractOperations(rows)
        };
    }

    /**
     * Safely extract value from rows
     * @param {array} rows - Sheet rows
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @returns {*} - Cell value or null
     */
    safeValue(rows, row, col) {
        if (!rows[row] || rows[row][col] === undefined || rows[row][col] === null) {
            return null;
        }

        const value = rows[row][col];

        // Convert string numbers to actual numbers
        if (typeof value === 'string' && !isNaN(value) && value.trim() !== '') {
            return parseFloat(value);
        }

        return value;
    }

    /**
     * Extract exchange rates
     */
    extractRates(rows) {
        const rates = {
            EUR: this.safeValue(rows, ODS_STRUCTURE.RATES_START_ROW, ODS_STRUCTURE.COLUMNS.RATE_VALUES),
            USD: this.safeValue(rows, ODS_STRUCTURE.RATES_START_ROW + 1, ODS_STRUCTURE.COLUMNS.RATE_VALUES),
            GBP: this.safeValue(rows, ODS_STRUCTURE.RATES_START_ROW + 2, ODS_STRUCTURE.COLUMNS.RATE_VALUES)
        };

        // Use defaults if any rate is missing
        Object.keys(rates).forEach(currency => {
            if (!rates[currency] || rates[currency] <= 0) {
                rates[currency] = APP_CONSTANTS.DEFAULT_EXCHANGE_RATES[currency];
                logger.warn('Using default exchange rate', {
                    currency,
                    defaultRate: rates[currency]
                });
            }
        });

        return rates;
    }

    /**
     * Extract fabric pricing
     */
    extractFabric(rows) {
        return {
            price_eur: this.safeValue(rows, ODS_STRUCTURE.FABRIC_START_ROW, ODS_STRUCTURE.COLUMNS.FABRIC_VALUES) || 0,
            metre_eur: this.safeValue(rows, ODS_STRUCTURE.FABRIC_START_ROW + 1, ODS_STRUCTURE.COLUMNS.FABRIC_VALUES) || 0,
            unit_eur: this.safeValue(rows, ODS_STRUCTURE.FABRIC_START_ROW + 2, ODS_STRUCTURE.COLUMNS.FABRIC_VALUES) || 0
        };
    }

    /**
     * Extract genel gider rates
     */
    extractGenelGider(rows) {
        return {
            '0-50': this.safeValue(rows, ODS_STRUCTURE.GENEL_GIDER_START_ROW, ODS_STRUCTURE.COLUMNS.RANGE_0_50) || 0,
            '51-100': this.safeValue(rows, ODS_STRUCTURE.GENEL_GIDER_START_ROW + 1, ODS_STRUCTURE.COLUMNS.RANGE_51_100) || 0,
            '101-200': this.safeValue(rows, ODS_STRUCTURE.GENEL_GIDER_START_ROW + 2, ODS_STRUCTURE.COLUMNS.RANGE_101_200) || 0
        };
    }

    /**
     * Extract karlilik rates
     */
    extractKarlilik(rows) {
        return {
            '0-50': this.safeValue(rows, ODS_STRUCTURE.KARLILIK_START_ROW, ODS_STRUCTURE.COLUMNS.RANGE_0_50) || 0,
            '51-100': this.safeValue(rows, ODS_STRUCTURE.KARLILIK_START_ROW + 1, ODS_STRUCTURE.COLUMNS.RANGE_51_100) || 0,
            '101-200': this.safeValue(rows, ODS_STRUCTURE.KARLILIK_START_ROW + 2, ODS_STRUCTURE.COLUMNS.RANGE_101_200) || 0
        };
    }

    /**
     * Extract KDV rate
     */
    extractKDV(rows) {
        return this.safeValue(rows, ODS_STRUCTURE.KDV_ROW, ODS_STRUCTURE.COLUMNS.RATE_VALUES) || 20;
    }

    /**
     * Extract komisyon rate
     */
    extractKomisyon(rows) {
        return this.safeValue(rows, ODS_STRUCTURE.KOMISYON_ROW, ODS_STRUCTURE.COLUMNS.RATE_VALUES) || 5;
    }

    /**
     * Extract operations data
     */
    extractOperations(rows) {
        const operations = {};

        for (let i = ODS_STRUCTURE.OPERATIONS_START_ROW; i <= ODS_STRUCTURE.OPERATIONS_END_ROW; i++) {
            const name = this.safeValue(rows, i, ODS_STRUCTURE.COLUMNS.OPERATION_NAME);

            if (!name || typeof name !== 'string') {
                continue;
            }

            operations[name.trim()] = {
                '0-50': this.safeValue(rows, i, ODS_STRUCTURE.COLUMNS.RANGE_0_50) || 0,
                '51-100': this.safeValue(rows, i, ODS_STRUCTURE.COLUMNS.RANGE_51_100) || 0,
                '101-200': this.safeValue(rows, i, ODS_STRUCTURE.COLUMNS.RANGE_101_200) || 0
            };
        }

        return operations;
    }

    /**
     * Validate extracted defaults
     * @param {object} defaults - Extracted defaults
     */
    validateDefaults(defaults) {
        const errors = [];

        // Validate rates
        if (!defaults.rates || typeof defaults.rates !== 'object') {
            errors.push('Invalid rates data structure');
        } else {
            APP_CONSTANTS.SUPPORTED_CURRENCIES.forEach(currency => {
                if (!defaults.rates[currency] || defaults.rates[currency] <= 0) {
                    errors.push(`Invalid exchange rate for ${currency}`);
                }
            });
        }

        // Validate fabric
        if (!defaults.fabric || typeof defaults.fabric !== 'object') {
            errors.push('Invalid fabric data structure');
        }

        // Validate ranges
        APP_CONSTANTS.BATCH_RANGES.forEach(range => {
            if (!defaults.genel_gider[range] && defaults.genel_gider[range] !== 0) {
                errors.push(`Missing genel_gider for range ${range}`);
            }
            if (!defaults.karlilik[range] && defaults.karlilik[range] !== 0) {
                errors.push(`Missing karlilik for range ${range}`);
            }
        });

        // Validate percentages
        if (typeof defaults.KDV !== 'number' || defaults.KDV < 0) {
            errors.push('Invalid KDV value');
        }
        if (typeof defaults.komisyon !== 'number' || defaults.komisyon < 0) {
            errors.push('Invalid komisyon value');
        }

        if (errors.length > 0) {
            throw new Error(`Validation failed: ${errors.join(', ')}`);
        }
    }

    /**
     * Check if file has been modified since last read
     * @returns {boolean} - True if file is unchanged
     */
    isFileUnchanged() {
        try {
            const stats = fs.statSync(this.odsPath);
            return this.lastModified && stats.mtime.getTime() === this.lastModified;
        } catch (error) {
            return false;
        }
    }

    /**
     * Update last modified timestamp
     */
    updateLastModified() {
        try {
            const stats = fs.statSync(this.odsPath);
            this.lastModified = stats.mtime.getTime();
        } catch (error) {
            logger.warn('Could not update last modified time', { error: error.message });
        }
    }

    /**
     * Get file information
     * @returns {object} - File information
     */
    getFileInfo() {
        try {
            const stats = fs.statSync(this.odsPath);
            return {
                path: this.odsPath,
                exists: true,
                size: stats.size,
                modified: stats.mtime.toISOString(),
                readable: true
            };
        } catch (error) {
            return {
                path: this.odsPath,
                exists: false,
                error: error.message
            };
        }
    }
}

// Create singleton instance
const odsParser = new OdsParser();

// Export main function for backward compatibility
export function parseOdsDefaults() {
    return odsParser.parseOdsDefaults();
}

// Export parser instance for advanced usage
export { odsParser };
export default odsParser;