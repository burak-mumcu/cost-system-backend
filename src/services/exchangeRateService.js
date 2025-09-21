import axios from 'axios';
import { config } from '../config/environment.js';
import { APP_CONSTANTS } from '../config/constants.js';
import { ExternalApiError, TimeoutError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import { cacheHelpers } from '../utils/cache.js';

class ExchangeRateService {
    constructor() {
        this.apiKey = config.exchangeApiKey;
        this.baseUrl = `https://v6.exchangerate-api.com/v6/${this.apiKey}/latest/`;
        this.timeout = 10000; // 10 seconds
        this.maxRetries = 3;
        this.retryDelay = 1000; // 1 second

        // Configure axios instance
        this.axiosInstance = axios.create({
            timeout: this.timeout,
            headers: {
                'User-Agent': 'Cost-System-Backend/1.0.0',
                'Accept': 'application/json'
            }
        });

        // Add request interceptor for logging
        this.axiosInstance.interceptors.request.use(
            (config) => {
                logger.debug('Exchange rate API request', {
                    url: config.url,
                    params: config.params
                });
                return config;
            },
            (error) => {
                logger.error('Exchange rate API request error', error);
                return Promise.reject(error);
            }
        );

        // Add response interceptor for logging
        this.axiosInstance.interceptors.response.use(
            (response) => {
                logger.debug('Exchange rate API response received', {
                    status: response.status,
                    dataKeys: Object.keys(response.data || {})
                });
                return response;
            },
            (error) => {
                logger.error('Exchange rate API response error', error, {
                    status: error.response?.status,
                    message: error.response?.data?.message || error.message
                });
                return Promise.reject(error);
            }
        );
    }

    /**
     * Get current exchange rates
     * @param {string} baseCurrency - Base currency (default: TRY)
     * @returns {object} - Exchange rates
     */
    async getCurrentRates(baseCurrency = 'TRY') {
        const startTime = Date.now();

        try {
            // Check cache first
            const cached = cacheHelpers.getExchangeRates();
            if (cached) {
                logger.debug('Using cached exchange rates', {
                    baseCurrency,
                    rates: cached
                });
                return cached;
            }

            // Validate API key
            if (!this.apiKey) {
                logger.warn('Exchange API key not configured, using default rates');
                return this.getDefaultRates();
            }

            // Fetch from API with retry logic
            const rates = await this.fetchRatesWithRetry(baseCurrency);

            // Cache the results
            cacheHelpers.setExchangeRates(rates);

            const duration = Date.now() - startTime;
            logger.info('Exchange rates fetched successfully', {
                baseCurrency,
                rates,
                duration: `${duration}ms`,
                source: 'api'
            });

            return rates;

        } catch (error) {
            const duration = Date.now() - startTime;
            logger.error('Failed to fetch exchange rates, using defaults', error, {
                baseCurrency,
                duration: `${duration}ms`
            });

            // Return default rates as fallback
            return this.getDefaultRates();
        }
    }

    /**
     * Fetch rates with retry logic
     * @param {string} baseCurrency - Base currency
     * @returns {object} - Exchange rates
     */
    async fetchRatesWithRetry(baseCurrency) {
        let lastError;

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                logger.debug(`Exchange rate API attempt ${attempt}/${this.maxRetries}`, {
                    baseCurrency
                });

                const response = await this.axiosInstance.get(this.baseUrl, {
                    params: {
                        from: baseCurrency,
                        to: APP_CONSTANTS.SUPPORTED_CURRENCIES.join(','),
                        apikey: this.apiKey
                    }
                });

                return this.parseApiResponse(response.data, baseCurrency);

            } catch (error) {
                lastError = error;

                if (attempt < this.maxRetries) {
                    const delay = this.retryDelay * attempt;
                    logger.warn(`Exchange rate API attempt ${attempt} failed, retrying in ${delay}ms`, {
                        error: error.message,
                        baseCurrency
                    });

                    await this.sleep(delay);
                } else {
                    logger.error(`All ${this.maxRetries} attempts failed for exchange rate API`, error);
                }
            }
        }

        // Handle specific error types
        if (lastError.code === 'ECONNABORTED') {
            throw new TimeoutError('exchange_rate_fetch', this.timeout);
        } else if (lastError.response?.status >= 400) {
            throw new ExternalApiError(
                'Exchange Rate API',
                `HTTP ${lastError.response.status}: ${lastError.response.data?.message || lastError.message}`,
                lastError.response.status
            );
        } else {
            throw new ExternalApiError('Exchange Rate API', lastError.message);
        }
    }

    /**
     * Parse API response and extract rates
     * @param {object} data - API response data
     * @param {string} baseCurrency - Base currency
     * @returns {object} - Parsed exchange rates
     */
    parseApiResponse(data, baseCurrency) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid API response format');
        }

        const rates = {};

        // Different APIs have different response formats
        if (data.rates) {
            // Format: { rates: { EUR: 37.99, USD: 33.99, ... } }
            APP_CONSTANTS.SUPPORTED_CURRENCIES.forEach(currency => {
                if (data.rates[currency] && typeof data.rates[currency] === 'number') {
                    rates[currency] = data.rates[currency];
                }
            });
        } else if (data.data) {
            // Format: { data: [{ currency: 'EUR', rate: 37.99 }, ...] }
            if (Array.isArray(data.data)) {
                data.data.forEach(item => {
                    if (item.currency && typeof item.rate === 'number') {
                        rates[item.currency] = item.rate;
                    }
                });
            }
        } else {
            // Direct format: { EUR: 37.99, USD: 33.99, ... }
            APP_CONSTANTS.SUPPORTED_CURRENCIES.forEach(currency => {
                if (data[currency] && typeof data[currency] === 'number') {
                    rates[currency] = data[currency];
                }
            });
        }

        // Validate that we have all required currencies
        const missingCurrencies = APP_CONSTANTS.SUPPORTED_CURRENCIES.filter(
            currency => !rates[currency] || rates[currency] <= 0
        );

        if (missingCurrencies.length > 0) {
            logger.warn('Some exchange rates missing from API response, using defaults', {
                missingCurrencies,
                receivedRates: rates
            });

            // Fill missing currencies with defaults
            const defaults = this.getDefaultRates();
            missingCurrencies.forEach(currency => {
                rates[currency] = defaults[currency];
            });
        }

        return rates;
    }

    /**
     * Get default exchange rates
     * @returns {object} - Default rates
     */
    getDefaultRates() {
        return { ...APP_CONSTANTS.DEFAULT_EXCHANGE_RATES };
    }

    /**
     * Validate exchange rates
     * @param {object} rates - Exchange rates to validate
     * @returns {boolean} - True if valid
     */
    validateRates(rates) {
        if (!rates || typeof rates !== 'object') {
            return false;
        }

        return APP_CONSTANTS.SUPPORTED_CURRENCIES.every(currency => {
            const rate = rates[currency];
            return typeof rate === 'number' && rate > 0 && !isNaN(rate);
        });
    }

    /**
     * Get historical rates (placeholder - would need different API)
     * @param {string} date - Date in YYYY-MM-DD format
     * @param {string} baseCurrency - Base currency
     * @returns {object} - Historical rates
     */
    async getHistoricalRates(date, baseCurrency = 'TRY') {
        // This would require a different API endpoint or service
        logger.warn('Historical rates not implemented, returning current rates', {
            requestedDate: date,
            baseCurrency
        });

        return await this.getCurrentRates(baseCurrency);
    }

    /**
     * Convert amount between currencies
     * @param {number} amount - Amount to convert
     * @param {string} from - From currency
     * @param {string} to - To currency
     * @returns {number} - Converted amount
     */
    async convertCurrency(amount, from, to) {
        if (from === to) {
            return amount;
        }

        const rates = await this.getCurrentRates(from);

        if (!rates[to]) {
            throw new Error(`Exchange rate not available for ${to}`);
        }

        const convertedAmount = amount * rates[to];

        logger.debug('Currency conversion performed', {
            amount,
            from,
            to,
            rate: rates[to],
            result: convertedAmount
        });

        return Math.round((convertedAmount + Number.EPSILON) * 100) / 100;
    }

    /**
     * Get service health information
     * @returns {object} - Service health data
     */
    async getServiceHealth() {
        try {
            const startTime = Date.now();

            // Try to fetch rates to test service
            const rates = await this.getCurrentRates();
            const responseTime = Date.now() - startTime;

            return {
                status: 'healthy',
                responseTime: `${responseTime}ms`,
                ratesAvailable: Object.keys(rates).length,
                apiKeyConfigured: !!this.apiKey,
                lastUpdate: new Date().toISOString()
            };

        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message,
                apiKeyConfigured: !!this.apiKey,
                lastCheck: new Date().toISOString()
            };
        }
    }

    /**
     * Sleep utility for retry delays
     * @param {number} ms - Milliseconds to sleep
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Create singleton instance
const exchangeRateService = new ExchangeRateService();

export { ExchangeRateService, exchangeRateService };
export default exchangeRateService;