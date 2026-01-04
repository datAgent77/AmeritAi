---
description: Yeni özellik geliştirme iş akışı. Super Admin, Müşteri ve Widget perspektiflerini optimize eder; premium cam efekti ve akışkan animasyon standartlarını uygular.
---

# Workflow: Feature Implementation & Perspective Check

## Phase 1: Analysis & Reference
- Check for a reference URL. If missing, trigger the "Reference Protocol" question.
- Perform a "Stakeholder Impact Analysis": List exactly what needs to be built for Super Admin, Customer, and Widget.

## Phase 2: Structural Foundation
- Define Firestore schema updates (ensuring multi-tenant compatibility).
- Define TypeScript types for the new feature in `@/types`.

## Phase 3: Triple-Lense Implementation
- **Step A (Widget):** Build the end-user interface with Glassmorphism and Fluid Motion (Framer Motion).
- **Step B (Customer):** Build the Tenant Admin settings to control the new feature.
- **Step C (Super Admin):** Add global monitoring/metrics to the main dashboard.

## Phase 4: Fluid Experience Polish
- Add entrance animations (staggered) and hover states to all new UI elements.
- Verify mobile-first responsiveness across all three interfaces.

## Phase 5: Verification & Delivery
- Confirm that NO perspective (Admin, Customer, Widget) has been missed.
- Deliver the code with a brief explanation of how the feature serves each stakeholder.