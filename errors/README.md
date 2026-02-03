# Poniente Assets

Generated assets for the Poniente platform.

## Contents

| File | Description |
|------|-------------|
| `errors/404.html` | 404 Not Found page |
| `errors/500.html` | 500 Server Error page |

## Usage

Upload error pages to your hosting provider:

### Vercel

Add to `vercel.json`:

```json
{
  "routes": [
    { "src": "/404", "dest": "/errors/404.html" },
    { "src": "/500", "dest": "/errors/500.html" }
  ],
  "errorPages": {
    "404": "/errors/404.html",
    "500": "/errors/500.html"
  }
}
```

### Netlify

Create `_redirects` file:

```
/404 /errors/404.html 404!
/500 /errors/500.html 500!
```

Or use netlify.toml:

```toml
[[redirects]]
  from = "/404"
  to = "/errors/404.html"
  status = 404

[[redirects]]
  from = "/500"
  to = "/errors/500.html"
  status = 500
```

## Customization

Edit the HTML files to customize:
- Colors
- Logos
- Error messages
- Links

## Favicon

Generate favicon at: https://favicon.io/
