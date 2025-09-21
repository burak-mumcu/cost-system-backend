# Cost System Backend

**Gelişmiş Excel tabanlı hesaplama servisi** - Maliyet hesaplama ve analiz için kapsamlı backend API.

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![API Version](https://img.shields.io/badge/API-v2.0.0-blue.svg)](http://localhost:4000/api-docs)

## 🚀 Özellikler

- **📊 Excel/ODS Entegrasyonu**: ODS dosyalarından dinamik parametre okuma
- **💱 Döviz Kuru Desteği**: Gerçek zamanlı EUR, USD, GBP kurları
- **🔄 Akıllı Önbellekleme**: Performans optimizasyonu için gelişmiş cache sistemi
- **🛡️ Güvenlik**: Rate limiting, CORS, Helmet güvenlik başlıkları
- **📈 İzleme**: Kapsamlı logging ve health check sistemi
- **📚 API Dokümantasyonu**: Swagger UI ile interaktif dokümantasyon
- **✅ Validation**: Joi ile güçlü input validation
- **🏗️ Modüler Mimari**: Temiz, ölçeklenebilir kod yapısı

## 🏛️ Mimari

```
src/
├── config/          # Konfigürasyon dosyaları
│   ├── environment.js    # Ortam değişkenleri
│   ├── constants.js      # Sabitler
│   └── swagger.js        # API dokümantasyon
├── middleware/      # Middleware'ler
│   ├── validation.js     # Input validation
│   ├── errorHandler.js   # Hata yönetimi
│   └── security.js       # Güvenlik middleware
├── routes/          # Route tanımları
│   ├── calculate.js      # Hesaplama endpoint'i
│   ├── schema.js         # Şema endpoint'i
│   └── health.js         # Health check
├── services/        # İş mantığı servisleri
│   ├── calculator.js     # Hesaplama motoru
│   ├── odsParser.js      # ODS dosya parser'ı
│   └── exchangeRateService.js # Döviz kuru servisi
├── utils/           # Yardımcı araçlar
│   ├── logger.js         # Logging sistemi
│   ├── cache.js          # Cache manager
│   └── errors.js         # Custom error classes
└── app.js           # Ana uygulama
```

## 📦 Kurulum

### Gereksinimler

- **Node.js**: ≥16.0.0
- **npm**: ≥8.0.0
- **ODS Dosyası**: `data/final_maliyet_sistemi.ods`

### Adım Adım Kurulum

```bash
# 1. Repository'yi klonlayın
git clone https://github.com/burak-mumcu/cost-system-backend.git
cd cost-system-backend

# 2. Bağımlılıkları yükleyin
npm install

# 3. Ortam değişkenlerini ayarlayın
cp .env.example .env
# .env dosyasını düzenleyin

# 4. ODS dosyasını yerleştirin
mkdir -p data
# data/final_maliyet_sistemi.ods dosyasını yerleştirin

# 5. Uygulamayı başlatın
npm run dev
```

## ⚙️ Konfigürasyon

### Ortam Değişkenleri (.env)

```bash
# Sunucu ayarları
NODE_ENV=development
PORT=4000

# Dosya yolları
ODS_PATH=./data/final_maliyet_sistemi.ods

# Dış API'ler
EXCHANGE_API_KEY=your_api_key_here

# Logging
LOG_LEVEL=info

# Güvenlik
CORS_ORIGIN=*
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# Request ayarları
REQUEST_TIMEOUT=30000
```

### ODS Dosya Yapısı

ODS dosyası şu parametreleri içermelidir:

- **Döviz kurları**: EUR, USD, GBP (satır 2-4, sütun 1)
- **Kumaş fiyatları**: price_eur, metre_eur, unit_eur (satır 2-4, sütun 4)
- **Genel gider oranları**: Batch aralıklarına göre (satır 7-9)
- **Karlılık oranları**: Batch aralıklarına göre (satır 13-15)
- **KDV ve Komisyon**: Yüzde değerleri (satır 18-19)
- **Operasyon maliyetleri**: İşlem türlerine göre (satır 29-35)

## 🚀 Kullanım

### API Endpoint'leri

#### 1. Health Check
```bash
GET /api/health
GET /api/health?detailed=true
```

#### 2. Varsayılan Parametreler
```bash
GET /api/schema
```

#### 3. Maliyet Hesaplama
```bash
POST /api/calculate
Content-Type: application/json

{
  "rates": {
    "EUR": 38.50,
    "USD": 34.20,
    "GBP": 45.10
  },
  "fabric": {
    "unit_eur": 5.00
  },
  "KDV": 18,
  "komisyon": 3
}
```

### Response Formatı

```json
{
  "success": true,
  "data": {
    "rates": { "EUR": 38.50, "USD": 34.20, "GBP": 45.10 },
    "result": {
      "0-50": {
        "batchSize": 25,
        "finalEur": 212.70,
        "finalTry": 8082.53,
        "finalUsd": 237.77,
        "finalGbp": 179.94,
        "perUnitFinalEur": 8.51
      }
    },
    "metadata": {
      "calculatedAt": "2025-01-20T10:30:00.000Z",
      "inputHash": "abc123",
      "version": "2.0.0"
    }
  },
  "processingTime": "45ms"
}
```

## 🛠️ Geliştirme

### Komutlar

```bash
# Geliştirme modunda çalıştır
npm run dev

# Testleri çalıştır
npm test
npm run test:watch
npm run test:coverage

# Kod kalitesi
npm run lint
npm run lint:fix
npm run format

# Doğrulama
npm run validate

# Üretim modunda başlat
npm start
```

### Loglama

Uygulama JSON formatında yapılandırılmış loglar üretir:

```json
{
  "timestamp": "2025-01-20T10:30:00.000Z",
  "level": "info",
  "message": "Calculation completed",
  "env": "development",
  "meta": {
    "duration": "45ms",
    "rangesCalculated": 3
  }
}
```

### Cache Sistemi

- **ODS Defaults**: 5 dakika
- **Exchange Rates**: 15 dakika
- **Calculation Results**: 2 dakika

Cache istatistikleri için: `GET /api/dev/cache/stats` (development only)

## 🔒 Güvenlik

- **Rate Limiting**: IP başına 100 request/15dk
- **CORS**: Konfigüre edilebilir origin kontrolü
- **Helmet**: Güvenlik başlıkları
- **Input Validation**: Joi ile kapsamlı doğrulama
- **Error Handling**: Güvenli hata mesajları

## 📊 İzleme

### Health Check Endpoint'i

```bash
# Temel health check
curl http://localhost:4000/api/health

# Detaylı sistem bilgisi
curl http://localhost:4000/api/health?detailed=true
```

### Metrikler

- Uptime ve sistem bilgileri
- Cache hit/miss oranları
- Dependency durumları (ODS file, Exchange API)
- Memory ve CPU kullanımı

## 🧪 Testing

```bash
# Tüm testleri çalıştır
npm test

# Coverage raporu
npm run test:coverage

# Watch mode
npm run test:watch
```

Test coverage hedefi: %80+

## 📚 API Dokümantasyonu

Swagger UI dokümantasyonuna erişim:
- **Development**: http://localhost:4000/api-docs
- **Production**: https://your-domain.com/api-docs

## 🚀 Deployment

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 4000
CMD ["npm", "start"]
```

### PM2

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'cost-system-backend',
    script: 'src/app.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 4000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log'
  }]
};
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | development | Çalışma ortamı |
| `PORT` | 4000 | Sunucu portu |
| `ODS_PATH` | ./data/final_maliyet_sistemi.ods | ODS dosya yolu |
| `EXCHANGE_API_KEY` | - | Döviz kuru API anahtarı |
| `LOG_LEVEL` | info | Log seviyesi (error, warn, info, debug) |
| `CORS_ORIGIN` | * | İzin verilen origin'ler |
| `RATE_LIMIT_WINDOW` | 15 | Rate limit penceresi (dakika) |
| `RATE_LIMIT_MAX_REQUESTS` | 100 | Maksimum request sayısı |
| `REQUEST_TIMEOUT` | 30000 | Request timeout (ms) |

## 🔧 Troubleshooting

### Yaygın Sorunlar

#### 1. ODS Dosyası Bulunamadı
```
Error: ODS file not found at ./data/final_maliyet_sistemi.ods
```
**Çözüm**: ODS dosyasını doğru konuma yerleştirin ve dosya izinlerini kontrol edin.

#### 2. Döviz Kuru API Hatası
```
Exchange Rate API error: HTTP 401: Unauthorized
```
**Çözüm**: `EXCHANGE_API_KEY` ortam değişkenini ayarlayın veya varsayılan kurları kullanın.

#### 3. Rate Limit Aşımı
```
Too many requests from this IP, please try again later.
```
**Çözüm**: İstekleri azaltın veya rate limit ayarlarını güncelleyin.

### Debug Modu

```bash
# Debug loglarını aktifleştir
LOG_LEVEL=debug npm run dev

# Detaylı hata mesajları için
NODE_ENV=development npm start
```

### Performance İpuçları

1. **Cache Kullanımı**: Cache hit rate'i %80+ olmalı
2. **Memory Monitoring**: Heap kullanımı %70'in altında tutulmalı
3. **Response Times**: <200ms hedeflenmeli

## 🤝 Contributing

### Katkıda Bulunma Adımları

1. **Fork** edin
2. **Feature branch** oluşturun: `git checkout -b feature/amazing-feature`
3. **Commit** edin: `git commit -m 'Add amazing feature'`
4. **Push** edin: `git push origin feature/amazing-feature`
5. **Pull Request** açın

### Code Style

```bash
# ESLint ve Prettier ile kod formatı
npm run lint:fix
npm run format

# Pre-commit hook'ları
npx husky install
```

### Commit Message Format

```
type(scope): description

feat(calculator): add batch size validation
fix(ods-parser): handle missing cells gracefully
docs(readme): update installation instructions
```

## 📜 Changelog

### v2.0.0 (2025-01-20)
- ✨ **NEW**: Modüler mimari refaktörü
- ✨ **NEW**: Gelişmiş cache sistemi
- ✨ **NEW**: Kapsamlı hata yönetimi
- ✨ **NEW**: Rate limiting ve güvenlik
- ✨ **NEW**: Swagger dokümantasyonu
- ✨ **NEW**: Health check endpoint'i
- 🔧 **IMPROVED**: Performance optimizasyonları
- 🔧 **IMPROVED**: Logging sistemi
- 🐛 **FIXED**: Memory leak sorunları

### v1.0.0 (2024-12-01)
- 🎉 İlk stable release
- ⚡ Temel hesaplama motoru
- 📊 ODS dosya entegrasyonu
- 💱 Döviz kuru desteği

## 📋 Roadmap

### v2.1.0 (Planned)
- [ ] GraphQL API desteği
- [ ] Real-time hesaplama (WebSocket)
- [ ] Advanced analytics dashboard
- [ ] Multi-tenant support

### v2.2.0 (Future)
- [ ] Machine learning cost predictions
- [ ] Automated report generation
- [ ] Mobile app integration
- [ ] Cloud deployment templates

## 🛡️ Security

### Güvenlik Politikası

- Güvenlik açıkları için: [security@example.com](mailto:security@example.com)
- **Private disclosure** tercih edilir
- 90 gün içinde fix hedeflenir

### Known Security Considerations

- Rate limiting aktif
- Input validation zorunlu
- Error information minimal (production)
- No sensitive data in logs

## 📄 License

Bu proje [MIT License](LICENSE) altında lisanslanmıştır.

```
MIT License

Copyright (c) 2025 Burak Mumcu

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 👥 Team

- **Burak Mumcu** - *Lead Developer* - [@burak-mumcu](https://github.com/burak-mumcu)

## 🙏 Acknowledgments

- Express.js topluluğu
- Node.js ekosistemi katkıcıları
- XLSX library geliştiricileri
- Swagger UI ekibi

## 📞 Support

- **Documentation**: [API Docs](http://localhost:4000/api-docs)
- **Issues**: [GitHub Issues](https://github.com/burak-mumcu/cost-system-backend/issues)
- **Email**: support@example.com
- **Discord**: [Community Server](#)

---

**⭐ Bu projeyi beğendiyseniz star vermeyi unutmayın!**

## 🔗 Links

- [Live Demo](https://cost-system-api.example.com)
- [API Documentation](https://cost-system-api.example.com/api-docs)
- [Postman Collection](https://www.postman.com/collections/cost-system-api)
- [Docker Hub](https://hub.docker.com/r/example/cost-system-backend)