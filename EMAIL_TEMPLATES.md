# Poniente Email Templates

## 1. Welcome Email (HTML)

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: -apple-system, sans-serif; color: #0f172a; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #0d9488; color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
        .content { background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; }
        .btn { display: inline-block; background: #0d9488; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; }
        .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🦞 Welcome to Poniente</h1>
    </div>
    <div class="content">
        <h2>Hi {{name}},</h2>
        <p>Your restaurant account is ready!</p>
        <p><strong>Organization:</strong> {{organization}}</p>
        <p><strong>Plan:</strong> {{plan}}</p>
        <p><strong>Trial Ends:</strong> {{trial_end}}</p>
        
        <p style="margin: 30px 0;">
            <a href="https://login.restocka.app" class="btn">Get Started</a>
        </p>
        
        <p>Your 7-day trial includes full access to all features. No credit card required.</p>
    </div>
    <div class="footer">
        <p>Questions? Reply to this email.</p>
        <p>© 2026 Poniente</p>
    </div>
</body>
</html>
```

## 2. Trial Expiring Soon (HTML)

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: -apple-system, sans-serif; color: #0f172a; max-width: 600px; margin: 0 auto; padding: 20px; }
        .alert { background: #fef3c7; border: 1px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .btn { display: inline-block; background: #0d9488; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; }
    </style>
</head>
<body>
    <h1>⚠️ Trial Ending Soon</h1>
    
    <div class="alert">
        <p><strong>{{days_remaining}} days left</strong> in your free trial.</p>
        <p>Upgrade now to keep accessing all features.</p>
    </div>
    
    <h2>Upgrade to {{plan}}</h2>
    <ul>
        <li>{{feature_1}}</li>
        <li>{{feature_2}}</li>
        <li>{{feature_3}}</li>
    </ul>
    
    <p><a href="https://login.restocka.app/upgrade" class="btn">Upgrade Now</a></p>
    
    <p>Or continue with free plan - you'll keep 1 location and 5 products.</p>
</body>
</html>
```

## 3. Payment Confirmation (HTML)

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: -apple-system, sans-serif; color: #0f172a; max-width: 600px; margin: 0 auto; padding: 20px; }
        .success { background: #dcfce7; border: 1px solid #22c55e; padding: 20px; border-radius: 8px; text-align: center; }
        .receipt { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
    </style>
</head>
<body>
    <h1>✅ Payment Confirmed</h1>
    
    <div class="success">
        <h2>Thank you!</h2>
        <p>Your subscription is now active.</p>
    </div>
    
    <div class="receipt">
        <div class="row">
            <span>Plan</span>
            <strong>{{plan_name}}</strong>
        </div>
        <div class="row">
            <span>Amount</span>
            <strong>{{amount}}</strong>
        </div>
        <div class="row">
            <span>Next Billing</span>
            <strong>{{next_billing}}</strong>
        </div>
    </div>
    
    <p><a href="https://login.restocka.app">Access Dashboard</a></p>
</body>
</html>
```

## 4. Low Stock Alert (HTML)

```html
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: -apple-system, sans-serif; color: #0f172a; max-width: 600px; margin: 0 auto; padding: 20px; }
        .alert { background: #fee2e2; border: 1px solid #ef4444; padding: 20px; border-radius: 8px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
        th { background: #f8fafc; }
    </style>
</head>
<body>
    <h1>🔔 Low Stock Alert</h1>
    
    <div class="alert">
        <p>The following items need attention:</p>
    </div>
    
    <table>
        <tr>
            <th>Product</th>
            <th>Current</th>
            <th>Minimum</th>
            <th>Status</th>
        </tr>
        {{#each items}}
        <tr>
            <td>{{name}}</td>
            <td>{{current_qty}} {{unit}}</td>
            <td>{{min_qty}} {{unit}}</td>
            <td>{{status}}</td>
        </tr>
        {{/each}}
    </table>
    
    <p><a href="https://login.restocka.app/products">View All Products</a></p>
</body>
</html>
```

## Template Variables

| Variable | Description |
|----------|-------------|
| `{{name}}` | User's full name |
| `{{email}}` | User's email |
| `{{organization}}` | Restaurant/organization name |
| `{{plan}}` | Plan name (FREE/PRO/BUSINESS) |
| `{{trial_end}}` | Trial end date |
| `{{amount}}` | Payment amount |
| `{{next_billing}}` | Next billing date |

## Sending Emails

```bash
# Using Supabase (requires email service configured)
POST /api/send-email
{
  "to": "user@example.com",
  "template": "welcome",
  "variables": {...}
}
```

## Email Providers

1. **Supabase Auth** - Built-in email (verify, reset)
2. **Resend** - Production email service
3. **SendGrid** - Alternative email provider

```javascript
// Example: Send with Resend
const resend = require('resend')('re_xxx');
await resend.emails.send({
    from: 'Poniente <onboarding@poniente.app>',
    to: email,
    subject: 'Welcome to Poniente',
    html: welcomeTemplate
});
```

---

*Last updated: 2026-02-03*
