# Security Policy

This repository contains production application code. Follow this checklist to keep credentials and customer data safe when collaborating.

## Collaboration Security Checklist

- Use individual GitHub accounts. Never share a single account.
- Enable 2FA on every collaborator account.
- Give minimum required GitHub role (`Write` only if needed, otherwise `Read`/`Triage`).
- Protect `main` branch:
  - Require pull requests before merge.
  - Require at least 1 approval.
  - Dismiss stale approvals when new commits are pushed.
  - Require status checks to pass.
  - Block force-push and branch deletion.
- Keep all secrets in environment managers (GitHub/Vercel/Firebase), never in tracked files.
- Rotate secrets immediately if exposure is suspected.

## Secret Management Rules

- Do not commit `.env.local`, service-account files, API tokens, private keys, or credentials.
- Use `.env.example` only for placeholders and variable names.
- Treat logs as sensitive; avoid printing tokens or keys.

## Pre-Commit Secret Scanning

This repo uses `gitleaks` in a pre-commit hook.

### One-time setup

```bash
git config core.hooksPath .githooks
brew install gitleaks
```

### Manual scan (optional)

```bash
npm run security:scan:repo
```

## Incident Response (If a Secret Leaks)

1. Revoke and rotate the leaked secret immediately.
2. Remove secret from code and configuration.
3. Purge from git history if it was committed.
4. Review access logs and suspicious activity.
5. Document what happened and preventive action.

## Reporting

If you discover a security issue, report it privately to the repository owner before public disclosure.
