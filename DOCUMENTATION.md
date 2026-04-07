# SHEADARE — პროექტის დოკუმენტაცია

**ვერსია:** 1.0 beta
**თარიღი:** 2026-04-07
**სტეკი:** React + Express + SQLite + TypeScript

---

## 1. პროექტის აღწერა

SHEADARE (შეადარე) — ფასების შედარების პლატფორმა საქართველოში. მომხმარებელს შეუძლია შეადაროს პროდუქტების ფასები 5 სასურსათო მაღაზიაში, გააანალიზოს პროდუქტის ჯანმრთელობის მაჩვენებლები, იპოვოს უახლოესი მაღაზია რუკაზე და შეინახოს საყიდლების სია.

### მაღაზიები:
| მაღაზია | პროდუქტი | სტატუსი |
|---------|----------|---------|
| SPAR | ~1,625 | აქტიური |
| 2 Nabiji | ~1,356 | აქტიური |
| Goodwill | ~4,312 | აქტიური |
| Europroduct | ~3,656 | აქტიური |
| Agrohub | ~5,297 | აქტიური |

**სულ:** ~12,900 სასურსათო პროდუქტი, ~16,000 ფასი

---

## 2. არქიტექტურა

```
C:\dev\pasebi\
├── src/                          # Frontend (React + Vite)
│   ├── App-redesign.tsx          # მთავარი აპლიკაცია (~3800 ხაზი)
│   ├── i18n.ts                   # ინტერნაციონალიზაცია (ქართული/ინგლისური)
│   ├── index.css                 # Tailwind CSS + custom styles
│   ├── types.ts                  # TypeScript ტიპები
│   ├── main.tsx                  # Entry point
│   └── components/
│       └── BucketLoader.tsx      # Splash screen ანიმაცია
│
├── server/                       # Backend (Express)
│   ├── index.ts                  # Express server, routes, middleware
│   ├── config.ts                 # PORT, intervals, rate limits
│   ├── db/
│   │   ├── connection.ts         # SQLite connection (better-sqlite3)
│   │   └── schema.ts             # Database schema + migrations
│   ├── routes/
│   │   ├── search.ts             # /api/search — ძიება, top-savings, barcode, category-counts
│   │   ├── compare.ts            # /api/compare/:id — პროდუქტის შედარება
│   │   ├── products.ts           # /api/product — პროდუქტის დეტალები
│   │   ├── basket.ts             # /api/basket — კალათა
│   │   ├── alerts.ts             # /api/alerts — ფასის ალერტები
│   │   ├── stores.ts             # /api/stores — მაღაზიის ფილიალები
│   │   ├── auth.ts               # /api/auth — რეგისტრაცია/ავტორიზაცია
│   │   ├── analysis.ts           # /api/analysis — პროდუქტის ანალიზი (Yuka-სტილი)
│   │   ├── chat.ts               # /api/chat — AI ჩატი (Gemini)
│   │   ├── ai-search.ts          # /api/ai — AI ძიება
│   │   ├── history.ts            # /api/history — ფასების ისტორია
│   │   └── images.ts             # /api/images — სურათების proxy
│   ├── services/
│   │   ├── product-service.ts    # პროდუქტის CRUD, ძიება, sorting
│   │   ├── price-service.ts      # ფასების შედარება, ისტორია
│   │   ├── alert-service.ts      # ალერტების მართვა
│   │   ├── gemini-service.ts     # Google Gemini AI ინტეგრაცია
│   │   └── pharmacy-matcher.ts   # აფთიაქის matching (გამორთული)
│   ├── scrapers/
│   │   ├── base-scraper.ts       # Base class
│   │   ├── spar-scraper.ts       # SPAR API scraper
│   │   ├── nabiji-scraper.ts     # 2 Nabiji scraper
│   │   ├── goodwill-scraper.ts   # Goodwill scraper
│   │   ├── europroduct-scraper.ts # Europroduct scraper
│   │   └── rate-limiter.ts       # Rate limiting
│   └── jobs/
│       ├── scheduler.ts          # Cron scheduler (2h interval)
│       ├── discover-job.ts       # Product discovery scraping
│       ├── refresh-job.ts        # Price refresh + alert check
│       └── pre-analyze.ts        # Product analysis pre-cache script
│
├── public/
│   ├── logos/                    # მაღაზიების ლოგოები (local)
│   │   ├── spar.png
│   │   ├── 2nabiji.png
│   │   ├── goodwill.jpg
│   │   ├── europroduct.jpg
│   │   └── agrohub.jpg
│   └── banners/                  # ბანერის სურათები
│       ├── slide1.png
│       └── slide2.webp
│
├── data/
│   └── pricemap.db               # SQLite მონაცემთა ბაზა (~350MB)
│
├── dist/                         # Production build (Vite output)
├── index.html                    # HTML entry point
├── vite.config.ts                # Vite configuration
├── package.json                  # Dependencies
└── tsconfig.json                 # TypeScript config
```

---

## 3. მონაცემთა ბაზა (SQLite)

### ცხრილები:

**products** — პროდუქტები
```sql
id, external_id, name, name_normalized, barcode, size, category,
image_url, brand, source, store_type, canonical_key, manufacturer,
created_at, updated_at
```

**store_offers** — ფასები მაღაზიებში
```sql
id, product_id, store, price, in_stock, url, last_seen_at
```

**price_history** — ფასების ისტორია
```sql
id, product_id, store, price, recorded_at
```

**users** — მომხმარებლები
```sql
id, device_id, email, password_hash, name, email_verified,
verification_code, verification_expires, auth_provider, created_at
```

**alerts** — ფასის ალერტები
```sql
id, user_id, product_id, target_price, store, active, triggered_at, created_at
```

**favorites** — ფავორიტები
```sql
user_id, product_id
```

**analysis_cache** — პროდუქტის ანალიზის cache (სამუდამო)
```sql
id, lookup_key, result_json, created_at
```

**scraper_runs** — scraper-ის ლოგები
```sql
id, job_type, store, status, products_found, prices_updated,
error_message, started_at, finished_at
```

### ინდექსები:
- `idx_products_category` — კატეგორიის ძიება
- `idx_products_name_normalized` — სახელით ძიება
- `idx_products_barcode` — ბარკოდით ძიება
- `idx_products_store_type` — მაღაზიის ტიპი
- `idx_products_canonical_key` — canonical matching
- `idx_store_offers_product` — ფასების lookup
- `idx_offers_product_instock` — in-stock ფასები (sort optimization)
- `idx_price_history_product` — ფასების ისტორია

---

## 4. API Endpoints

### ძიება
| Method | Endpoint | აღწერა |
|--------|----------|--------|
| GET | `/api/search?q=&category=&storeType=&sort=&limit=&page=` | პროდუქტების ძიება |
| GET | `/api/search/top-savings` | დღის დანაზოგი |
| GET | `/api/search/barcode/:code` | ბარკოდით ძიება |
| GET | `/api/search/category-counts` | კატეგორიების რაოდენობები |

### შედარება
| Method | Endpoint | აღწერა |
|--------|----------|--------|
| GET | `/api/compare/:id` | პროდუქტის შედარება მაღაზიებში |

### ავტორიზაცია
| Method | Endpoint | აღწერა |
|--------|----------|--------|
| POST | `/api/auth/register` | რეგისტრაცია (email, password, name) |
| POST | `/api/auth/verify` | Email ვერიფიკაცია (code) |
| POST | `/api/auth/login` | შესვლა |
| GET | `/api/auth/me` | მიმდინარე მომხმარებელი (Bearer token) |
| POST | `/api/auth/logout` | გასვლა |
| DELETE | `/api/auth/me` | ანგარიშის წაშლა |

### ალერტები
| Method | Endpoint | აღწერა |
|--------|----------|--------|
| GET | `/api/alerts?device_id=` | ალერტების სია |
| POST | `/api/alerts` | ალერტის შექმნა |
| DELETE | `/api/alerts/:id?device_id=` | ალერტის წაშლა |

### ანალიზი
| Method | Endpoint | აღწერა |
|--------|----------|--------|
| GET | `/api/analysis/product/:barcode` | ბარკოდით ანალიზი |
| GET | `/api/analysis/by-name/:name` | სახელით ანალიზი |

### მაღაზიები
| Method | Endpoint | აღწერა |
|--------|----------|--------|
| GET | `/api/stores/branches?lat=&lng=&store=` | ფილიალების ძიება |

### სხვა
| Method | Endpoint | აღწერა |
|--------|----------|--------|
| GET | `/api/health` | Health check |
| GET | `/api/history/:id` | ფასების ისტორია |
| POST | `/api/chat` | AI ჩატი |
| GET | `/api/ai/smart?q=` | AI ძიება |

---

## 5. Frontend ეკრანები

| ეკრანი | აღწერა |
|--------|--------|
| **Home** | მთავარი — კატეგორიები, ბანერი, პროდუქტების grid, სორტირება |
| **Compare** | პროდუქტის შედარება — ფასები მაღაზიებში, ისტორია, ანალიზი |
| **Basket** | კალათა — მაღაზიების შედარება, summary, გაზიარება, QR |
| **Map** | რუკა — უახლოესი ფილიალი, ნავიგაცია, მარშრუტი |
| **Profile** | პროფილი — ავტორიზაცია, ენა, privacy, terms |
| **Scanner** | ბარკოდის სკანერი (Quagga2) |
| **Chat** | AI ასისტენტი (Gemini) |
| **Alerts** | შეტყობინებები (dropdown) |

---

## 6. ფუნქციონალი

### 6.1 ძიება და სორტირება
- ტექსტური ძიება (stemming, fuzzy)
- AI smart search (3+ სიტყვა)
- კატეგორიების ფილტრი (11 კატეგორია)
- სორტირება: პოპულარული, ფასდაკლება %, იაფი→ძვირი, ძვირი→იაფი
- Grid view switcher (3, 4, 5 სვეტი)

### 6.2 პროდუქტის ანალიზი (Yuka-სტილი)
- Open Food Facts API — კვებითი ღირებულება
- Yuka score 0-100
- Nutriscore (A-E), Nova group (1-4)
- ინგრედიენტების რისკის შეფასება
- ალერგენები, badges (BIO, ვეგანური, etc.)
- Gemini AI ანალიზი ქართულად
- Cache — სამუდამო, ბაზაში
- Pre-analysis script (background)

### 6.3 ფასის ალერტები
- Target ფასის დაყენება
- ყოველ 2 საათში ამოწმებს
- Dropdown notification (desktop)
- პროდუქტის სურათი + სახელი

### 6.4 კალათა
- მაღაზიების შედარება
- საუკეთესო არჩევანი
- გაზიარება (Telegram, WhatsApp, Viber, Email, Messenger, QR)
- Summary sticky sidebar (desktop)

### 6.5 რუკა
- Leaflet + OpenStreetMap
- OSRM routing (ფეხით / მანქანით)
- Google Maps ნავიგაცია
- უახლოესი ფილიალის ძიება

### 6.6 ავტორიზაცია
- Email + პაროლი (pbkdf2 hash)
- Verification code
- Bearer token sessions
- Auth gates: ანალიზი, ალერტი, კალათა 3+, ფოტო ძიება
- 16+ ასაკის დადასტურება
- ანგარიშის წაშლა

### 6.7 ინტერნაციონალიზაცია (i18n)
- ქართული (default)
- ინგლისური
- 150+ translation key

---

## 7. Deployment

### სერვერი
- **Provider:** Digital Ocean Droplet
- **IP:** 161.35.213.172
- **OS:** Ubuntu 24.04
- **Specs:** 2 vCPU, 4GB RAM, 120GB SSD
- **Node.js:** v22.22.0

### სერვისები
- **PM2** — Process manager (auto-restart)
- **Nginx** — Reverse proxy (HTTP→HTTPS, port 80/443 → 3002)
- **SSL:** Self-signed certificate (Let's Encrypt მოგვიანებით დომეინით)

### Deploy პროცესი
```bash
# Local
npx vite build
tar -czf deploy.tar.gz . (excluding node_modules, data, etc.)
scp deploy.tar.gz server:/opt/pasebi/

# Server
tar -xzf deploy.tar.gz
cp public/logos/* dist/logos/
cp public/banners/* dist/banners/
pm2 restart pasebi
```

### PM2 კონფიგურაცია
```bash
pm2 start 'npx tsx server/index.ts' --name pasebi
pm2 startup  # auto-start on reboot
pm2 save
```

---

## 8. Scraping

### Scheduler
- **Discover interval:** 2 საათი — ახალი პროდუქტების აღმოჩენა
- **Refresh interval:** 2 საათი — ფასების განახლება + alert check

### Active Scrapers
| Scraper | მეთოდი | Rate Limit |
|---------|--------|------------|
| SPAR | API (access token) | 1 req/sec |
| 2 Nabiji | HTML scraping | 1 req/sec |
| Goodwill | HTML scraping | 1 req/sec |
| Europroduct | HTML scraping | 1 req/sec |
| Agrohub | HTML scraping | 1 req/sec |

### გამორთული (მომავალი)
- Zoomer, Alta, Kontakt, Megatechnica (ელექტრონიკა)
- PSP, GPC, Aversi (აფთიაქი)
- Gorgia, Goodbuild, iMart (სამშენებლო)

---

## 9. გარე სერვისები

| სერვისი | გამოყენება | ღირებულება |
|---------|-----------|-----------|
| Google Gemini AI | ჩატი, smart search, ანალიზი | უფასო (15 req/min) |
| Open Food Facts | კვებითი ღირებულება | უფასო |
| OpenStreetMap | რუკის tiles | უფასო |
| OSRM | მარშრუტის გაანგარიშება | უფასო |
| Digital Ocean | სერვერი | $24/თვე |

---

## 10. უსაფრთხოება

- პაროლი: pbkdf2 (salt + 10,000 iterations + SHA-512)
- Session: random 32-byte hex token
- CORS: ყველა origin (* — development)
- Rate limiting: scraper-ებზე
- Input sanitization: barcode, search query
- SQL injection: prepared statements (better-sqlite3)

---

## 11. სამართლებრივი

- **Privacy Policy** — პროფილში modal
- **Terms of Service** — პროფილში modal
- **Cookie Consent** — banner ქვემოთ
- **16+ ასაკი** — რეგისტრაციის checkbox
- **ანგარიშის წაშლა** — DELETE /api/auth/me
- **Disclaimer** — ფასები ინფორმაციულია

---

## 12. Known Issues

1. **Email verification** — SMTP არ არის კონფიგურირებული, კოდი server log-ში იწერება
2. **SSL** — Self-signed, "Not Secure" warning ბრაუზერში
3. **Barcode scanner** — Quagga2, ზოგ ტელეფონზე არასტაბილური
4. **ფასების სიზუსტე** — scraping-ის შუალედი 2 საათი, ფასი შეიძლება შეცვლილი იყოს

---

## 13. გეგმები (Roadmap)

### მოკლევადიანი
- [ ] დომეინის შეძენა + Let's Encrypt SSL
- [ ] PWA (Progressive Web App)
- [ ] Email ვერიფიკაცია (SendGrid/Mailgun)
- [ ] Google OAuth login
- [ ] Push notifications

### საშუალოვადიანი
- [ ] ელექტრონიკის მაღაზიები (Zoomer, Alta, Kontakt)
- [ ] აფთიაქი (PSP, Aversi, GPC)
- [ ] "იაფი ალტერნატივა" ფუნქცია
- [ ] საყიდლების სიის შაბლონები
- [ ] Telegram bot ალერტებისთვის

### გრძელვადიანი
- [ ] აზერბაიჯანი, სომხეთი (საერთაშორისო)
- [ ] PostgreSQL მიგრაცია (scaling)
- [ ] Admin panel
- [ ] მობილური აპლიკაცია (React Native)
- [ ] პარტნიორობა მაღაზიებთან
