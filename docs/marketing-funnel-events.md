# Marketing Funnel Event Contract

This document describes the event contract used for signup conversion tracking.

## Shared payload fields

All marketing events emitted via `trackMarketingEvent` are auto-enriched with:

- `traffic_segment`: `ads_google` | `ads_other` | `organic_or_direct`
- `landing_page`: first page path in session (first-touch)
- `plan_id`: plan context when available
- `billing_cycle`: billing context when available
- `language`: `en`/`tr` (or available language code)

## Attribution persistence

- Attribution storage key: `sessionStorage["vion_attribution_v1"]`
- First-touch UTM/click IDs are persisted and reused across routes.
- Captured query inputs:
  - `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`
  - `gclid`, `fbclid`, `msclkid`

## Traffic segmentation rules

- `ads_google`
  - if `gclid` exists, or
  - `utm_source=google` and `utm_medium in (cpc, ppc, paid)`
- `ads_other`
  - if `fbclid` or `msclkid` exists, or
  - `utm_medium=paid`
- `organic_or_direct`
  - everything else

## Funnel events

### Signup

- `signup_page_view`
- `signup_step_view`
  - `step`: `initial` | `form`
- `signup_step_continue`
  - `from_step`, `to_step`
- `signup_submit_attempt`
  - `method`, `has_phone`
- `signup_submit_failed`
  - `reason_code`
- `signup_submit_success`
  - `method`, `requires_email_verification`, `used_email_verification_bypass`

### Login

- `login_submit_failed`
  - `reason_code`

### Pricing CTA metadata

- `pricing_card_variant`
  - currently: `benefit_subtext_v1`

