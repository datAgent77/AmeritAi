# Vion AI Evrim Backlogu (30-60-90)

## Hedef
Vion AI'yi "chatbot"tan "AI calisani + otomasyon platformu" seviyesine cikarmak.

## Kuzey Yildizi Metrikleri
- Sohbetten lead'e donusum orani
- Otomatik tamamlanan is oranı (human handoff olmadan)
- AI kaynakli gelir etkisi (attributed revenue)
- Ortalama cozum suresi (first resolution time)

## 0-30 Gun (Temel Saglamlastirma)
### P0
- [x] Trial/premium policy uyumunu teklestir (`lib/entitlements.ts`)
- [x] Onboarding plan seciminde entitlement modelini duzelt (`app/api/onboarding/plan/route.ts`)
- [x] Dashboard'da gercek `hasData` kontrolu ekle (`app/console/chatbot/page.tsx`)
- [x] Analytics'de gercek `hasData` kontrolu ekle (`app/console/chatbot/analytics/page.tsx`)
- [x] Eksik autopilot runs endpointini ekle + token dogrulama (`app/api/autopilot/runs/route.ts`)

### P1
- [x] `/api/analytics` endpointine yetkilendirme ekle
- [ ] Event log standardi tanimla: `event_type`, `actor`, `source_module`, `result`
- [ ] Tenant bazli outcome dashboard taslagi (lead, appointment, conversion)

## 31-60 Gun (Workflow Engine v1)
### P0
- [ ] Trigger-Action motoru: `trigger -> condition -> action`
- [ ] Ilk trigger seti: `page_view`, `inactivity`, `intent_detected`, `cart_abandon`
- [ ] Ilk action seti: `send_bubble`, `show_offer`, `create_lead`, `handoff_agent`

### P1
- [ ] Workflow run kayitlari + hata ayiklama ekrani
- [ ] Workflow taslak/aktif/pasif surumleme

## 61-90 Gun (Agentik Is Akislari)
### P0
- [ ] Tool-calling katmani: takvim, CRM, email, ecommerce islemleri
- [ ] Approval queue: yuksek riskli aksiyonlarda insan onayi
- [ ] "Autonomous scorecard": AI'nin tamamladigi is adimlari raporu

### P1
- [ ] Sektor bazli playbook paketleri (Ecommerce, Restaurant, SaaS)
- [ ] A/B optimizasyonu: proactive message + campaign varyantlari

## Onceliklendirme Modeli (Pratik)
- Skor = (Etki x Guven) / Efor
- Etki: 1-5
- Guven: 1-5
- Efor: 1-5

Ilk sprintte sadece skoru 3.0+ olan backloglar alinmali.
