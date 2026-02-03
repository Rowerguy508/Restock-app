# Poniente Contributing Guide

## Quick Start

```bash
# Clone
git clone https://github.com/Rowerguy508/Restock-app.git
cd Restock-app

# Install dependencies
cd api && npm install

# Run locally
npm run dev
```

## Project Structure

```
Restock-app/
├── api/                    # Backend (Express)
│   ├── index.js           # Main entry point
│   ├── tests.js           # Test suite
│   └── package.json
├── restocka-manager/       # Frontend (Vite + React)
├── autonomy-loop/          # Self-funding logic
├── bin/                    # CLI tools
│   ├── monitor           # Health checks
│   ├── generate          # Content generator
│   └── poniente          # Main CLI
├── docs/                  # Documentation
├── templates/            # Email templates
└── scripts/              # Utility scripts
```

## Development

### Running the API

```bash
cd api
npm run dev        # Development with hot reload
npm start         # Production
npm test          # Run tests
```

### Running Tests

```bash
# All tests
npm test

# With custom API URL
API_URL=http://localhost:3000 npm test
```

### Adding New Endpoints

```javascript
// In api/index.js

app.get('/api/my-endpoint', async (req, res) => {
    try {
        const result = await doSomething();
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

### Database Migrations

1. Create migration in `supabase/migrations/`
2. Test locally first
3. Apply via Supabase Dashboard

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes
# ...

# Commit
git add .
git commit -m "Add my feature"

# Push
git push origin feature/my-feature

# Create PR on GitHub
```

## Code Style

- Use ESLint for JavaScript
- Use Prettier for formatting
- Write tests for new features
- Update documentation

## Deployment

### Vercel (Recommended)

```bash
cd api
vercel --prod
```

### Docker

```bash
docker-compose up -d
```

## Environment Variables

Create `.env` in api/:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
SUPABASE_ANON_KEY=your-anon-key

# Stripe
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRO_PRICE_ID=price_xxx
STRIPE_BUSINESS_PRICE_ID=price_xxx

# URLs
STRIPE_SUCCESS_URL=https://login.restocka.app/success
STRIPE_CANCEL_URL=https://login.restocka.app/pricing
```

## Getting Help

- Check [API.md](API.md) for endpoint docs
- Check [README.md](README.md) for overview
- Open an issue on GitHub

## License

MIT
