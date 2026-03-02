# Clarity Main-Site Reporting Note

`/chatbot-view` is the embedded widget runtime page (iframe).  
It can appear as separate page visits in Microsoft Clarity recordings even when users stay on the main site.

## Recommended filter for product/marketing analysis

Create a Clarity filtered view named `main-site-only`:

- Include: site pages (`/`, `/pricing`, `/signup`, `/login`, ...)
- Exclude path: `/chatbot-view`

## Interpretation standard

- `/chatbot-view` events are categorized as **widget runtime view**.
- Do not interpret `/chatbot-view` appearance as broken navigation by default.
- Treat as navigation issue only if the visitor visibly leaves the main page UI and lands on full-page widget runtime unexpectedly.

