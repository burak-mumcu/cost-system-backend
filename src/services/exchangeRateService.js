// services/exchangeRateService.js
import axios from 'axios';

export class ExchangeRateService {
    constructor() {
        this.apiKey = process.env.EXCHANGE_API_KEY;
        this.baseUrl = 'https://api.freeconvert.com/v1/currencies/rates';
    }

    async getCurrentRates(baseCurrency = 'TRY') {
        try {
            const response = await axios.get(`${this.baseUrl}`, {
                params: {
                    from: baseCurrency,
                    to: 'EUR,USD,GBP',
                    apikey: this.apiKey
                }
            });
            return response.data;
        } catch (error) {
            console.error('Exchange rate fetch error:', error);
            // Fallback to default rates
            return this.getDefaultRates();
        }
    }

    getDefaultRates() {
        return {
            EUR: 37.99,
            USD: 33.99,
            GBP: 44.93
        };
    }
}