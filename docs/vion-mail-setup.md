# AmeritAI Mail Setup

## Outbound mail

Transactional emails are sent through SMTP with the verified `ameritai.com`
sender domain.

Required production environment variables:

```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=resend
SMTP_PASS=<resend-api-key>
SMTP_FROM_EMAIL=no-reply@ameritai.com
SMTP_FROM_NAME=AmeritAI
VION_ADMIN_EMAIL=info@ameritai.com
VION_CONTACT_EMAIL=info@ameritai.com
NEXT_PUBLIC_APP_URL=https://www.ameritai.com
```

Current DNS records for sending:

```txt
resend._domainkey.ameritai.com TXT <Resend DKIM public key>
send.ameritai.com MX 10 feedback-smtp.us-east-1.amazonses.com
send.ameritai.com TXT v=spf1 include:amazonses.com ~all
_dmarc.ameritai.com TXT v=DMARC1; p=none;
```

Verify locally:

```bash
npm run check:mail -- --dns
```

Use strict mode in CI or before release when all environment variables are
available:

```bash
npm run check:mail -- --dns --strict
```

## Inbound mail

Resend domain verification only enables sending. Receiving mail at
`info@ameritai.com` requires a root `ameritai.com` MX record from an inbox or
forwarding provider.

Recommended options:

- ForwardEmail or ImprovMX for low-cost forwarding to an existing inbox.
- Zoho Mail for a low-cost mailbox.
- Google Workspace for paid business inboxes.
- Cloudflare Email Routing only if DNS is moved to Cloudflare nameservers.

Until root MX is configured, contact form notifications can still be sent to
`info@ameritai.com`, but that inbox will not receive mail.
