# KPI-Canvas & OKR-NSM-KPI Mapping für Verifyr

## Zusammenfassung (Auto-Analogie)

```
🎯 NSM (Destination) = 1.000 MADU/Monat
   "Wo wollen wir hin?"

🗺️ OKRs (Route Plan) = 3 Etappen
   OKR1: Schnelle, vertrauensvolle Kaufempfehlung
   OKR2: Zuverlässige Fragen-Beantwortung
   OKR3: Engagierte Nutzer-Basis

📊 KPIs (Dashboard) = Motor-Instrumente
   Speed: Conversion Rate, Flow Completion
   Fuel: User Satisfaction, Trust Score
   Engine Temp: Retention, First-Contact-Resolution
```

---

## 1. North Star Metric (NSM) - Die Destination

**NSM: Monthly Active Decided Users (MADU)**

**Definition:**
Anzahl Unique Users pro Monat, die alle 3 Kriterien erfüllen:
1. Vollständigen Beratungs-Flow durchlaufen (≥3 Fragen gestellt)
2. Mindestens einen Produktvergleich gesehen
3. Auf Affiliate-Link geklickt

**Ziele:**
- Q2 2026 (6 Monate): 100 MADU/Monat
- Q4 2026 (12 Monate): 500 MADU/Monat
- Q2 2027 (18 Monate): 1.000+ MADU/Monat

**Warum NSM und nicht KPI?**
- NSM = Destination (wohin wir wollen)
- NSM repräsentiert den ultimativen Business-Erfolg
- NSM ist das ERGEBNIS (outcome), KPIs sind die TREIBER (drivers)

---

## 2. KPI-Canvas (Dashboard-Instrumente)

### Prinzip: KPIs ≠ NSM
- **NSM:** Die Destination (1.000 MADU)
- **KPIs:** Dashboard-Instrumente, die sicherstellen, dass wir ankommen
- **Logik:** Gute KPIs → OKRs erreicht → NSM erreicht

---

### KPI 1: Flow Completion Rate (Speed Instrument)

**Was ist das gewünschte Ergebnis?**
70% aller Nutzer schließen den vollständigen Empfehlungs-Flow ab (von Chatstart bis Empfehlung angezeigt).

**Warum ist dieses Ergebnis wichtig?**
- **Motor-Rolle:** Speed (Geschwindigkeit zur Destination)
- **OKR-Alignment:** Direkt zu OKR1 KR2 (Ziel: 70%)
- **NSM-Impact:** Ohne Flow Completion keine MADU (kein Flow = keine Empfehlung = kein Klick)
- **Quality Signal:** Hohe Completion = UX funktioniert, Nutzer finden Value

**Wie wird Fortschritt gemessen?**
- **Definition:** `(Sessions mit vollständiger Empfehlung / Total Sessions) × 100`
- **Datenquelle:** Backend Tracking (Session Start → Empfehlung angezeigt)
- **Tool:** Langfuse Session Events
- **Baseline:** >50% (Monat 1-3)
- **Ziel:** >70% (Q2 2026) ✅ OKR1 KR2

**Wie kannst du das Ergebnis beeinflussen?**
- **Chat UX:** Progress Bar ("Du bist 60% fertig - noch 2 Fragen!")
- **Quick-Reply Buttons:** Relevantere Vorschläge basierend auf Kontext
- **Content Quality:** Antworten kürzer, verständlicher (Layman Terms)
- **Technical:** Response Time <3s (besseres Erlebnis)
- **Gamification:** "3 von 5 Fragen - fast geschafft!"

**Wer ist verantwortlich?**
- **Aktuell:** PM (Du) - UX/Content Optimierung
- **Später:** Product Designer (UX/UI), Backend Engineer (Performance)

**Erfolgs-Indikatoren:**
- ✅ 70% Flow Completion erreicht (Q2 2026)
- ✅ Exit Rate bei Frage 2-3 sinkt auf <10%
- ✅ Average Questions per Session steigt auf 4+

**Review-Frequenz:**
- **Wöchentlich:** Trend + Exit Points identifizieren
- **Monatlich:** Full Funnel Analysis (wo springen Nutzer ab?)
- **Quartalsweise:** UX A/B Tests auswerten

---

### KPI 2: Conversion Rate (Visit → MADU) (Speed Instrument)

**Was ist das gewünschte Ergebnis?**
20% aller Website-Besucher werden zu Decided Users (MADU).

**Warum ist dieses Ergebnis wichtig?**
- **Motor-Rolle:** Speed (Effizienz der Journey zur Destination)
- **OKR-Alignment:** Unterstützt alle 3 OKRs (schneller Flow → bessere Conversion)
- **NSM-Impact:** Höhere Conversion Rate = mehr MADU bei gleichem Traffic
- **Efficiency Signal:** Zeigt, wie gut Landing Page + UX + Content zusammenarbeiten

**Wie wird Fortschritt gemessen?**
- **Definition:** `(MADU / Total Visitors) × 100`
- **Datenquelle:** Google Analytics (Visitors) + Backend (MADU Count)
- **Tool:** Google Analytics + Langfuse
- **Baseline:** >5% (Monat 1-3)
- **Ziel:** >20% (Q2 2026)

**Wie kannst du das Ergebnis beeinflussen?**
- **Landing Page:** Klarere Value Proposition, Video-Demo, Social Proof
- **Onboarding:** Bessere Welcome Message, Quick-Reply Buttons prominenter
- **A/B Tests:** Headline, CTA-Button-Text, Layout
- **Trust Building:** Testimonials, "1.000+ Nutzer haben verglichen"
- **Technical:** Landing Page Load Time <2s

**Wer ist verantwortlich?**
- **Aktuell:** PM (Du) - Landing Page, Onboarding
- **Später:** Growth Manager (Traffic, A/B Tests), Product Designer (UX)

**Erfolgs-Indikatoren:**
- ✅ 20% Conversion Rate erreicht (Q2 2026)
- ✅ Landing Page Bounce Rate <40%
- ✅ Activation Rate (Session Started) >70%

**Review-Frequenz:**
- **Wöchentlich:** Conversion Rate Trend + Traffic Sources
- **Monatlich:** Full Funnel (Visitor → Session → Flow → MADU)
- **Quartalsweise:** Cohort Analysis (welche Traffic Sources konvertieren besser?)

---

### KPI 3: User Satisfaction Score (Fuel Instrument)

**Was ist das gewünschte Ergebnis?**
80% der Nutzer geben positives Feedback (Thumbs Up) nach Bot-Antworten.

**Warum ist dieses Ergebnis wichtig?**
- **Motor-Rolle:** Fuel (Treibstoff = glückliche Nutzer)
- **OKR-Alignment:** Direkt zu OKR2 KR1 (Zufriedenheits-Score höher als Wettbewerb)
- **NSM-Impact:** Ohne Satisfaction kein Trust → keine Affiliate-Klicks → keine MADU
- **Quality Signal:** Zeigt, ob Antworten wirklich hilfreich sind

**Wie wird Fortschritt gemessen?**
- **Definition:** `(Thumbs Up / Total Feedback) × 100`
- **Datenquelle:** Frontend Feedback Buttons → Backend /feedback Endpoint → Langfuse
- **Tool:** Langfuse Scores
- **Baseline:** >70% (Monat 1-3)
- **Ziel:** >80% (Q2 2026)

**Wie kannst du das Ergebnis beeinflussen?**
- **Answer Quality:** RAG Pipeline optimieren (besseres Retrieval, bessere Prompts)
- **Citation Quality:** Bessere Quellenangaben, klickbare Links
- **Helpfulness:** Konkretere Handlungsempfehlungen, weniger Tech-Jargon
- **Response Speed:** <5s Antwortzeit
- **Personalization:** Antworten auf User-Kontext anpassen

**Wer ist verantwortlich?**
- **Aktuell:** PM (Du) - Prompt Engineering, Content Quality
- **Später:** Backend Engineer (RAG Optimization), Content Specialist (Produktdaten)

**Erfolgs-Indikatoren:**
- ✅ 80% Satisfaction Score erreicht (Q2 2026)
- ✅ Negatives Feedback <10%
- ✅ Durchschnittlich <5 Thumbs Down pro 100 Antworten

**Review-Frequenz:**
- **Wöchentlich:** Satisfaction Trend + Negatives Feedback analysieren
- **Monatlich:** Queries mit negativem Feedback zu Test Set hinzufügen
- **Quartalsweise:** Benchmark vs. Wettbewerb (idealo, check24)

---

### KPI 4: Trust Score (Fuel Instrument)

**Was ist das gewünschte Ergebnis?**
75% der Nutzer bewerten die Empfehlung als "verständlich und vertrauenswürdig" (In-App Umfrage).

**Warum ist dieses Ergebnis wichtig?**
- **Motor-Rolle:** Fuel (Trust = essentieller Treibstoff für Conversion)
- **OKR-Alignment:** Direkt zu OKR1 KR3 (Ziel: 75%)
- **NSM-Impact:** Ohne Trust kein Affiliate-Klick → ohne Trust keine MADU
- **Differentiation:** USP "neutrale, transparente Empfehlung" wird messbar

**Wie wird Fortschritt gemessen?**
- **Definition:** `(Ja-Antworten / Total Responses) × 100`
- **Datenquelle:** In-App Umfrage nach Empfehlung (1-Frage Popup)
- **Frage:** "War die Empfehlung verständlich und vertrauenswürdig?" (Ja/Nein/Teilweise)
- **Tool:** Frontend Popup → Backend Tracking → Langfuse
- **Baseline:** - (noch nicht gemessen)
- **Ziel:** 75% (Q2 2026) ✅ OKR1 KR3

**Wie kannst du das Ergebnis beeinflussen?**
- **Quellenangaben:** Mehr Quellen, klickbare Links zu Originaldokumenten
- **Neutral Badge:** "100% unabhängig - keine Provisions-Rankings"
- **Transparenz:** Erklären, wie Empfehlung zustande kam
- **Visual Trust Signals:** Badges, Zertifikate, Review-Logos
- **Personalization:** "85% Match für deine Bedürfnisse" mit Begründung

**Wer ist verantwortlich?**
- **Aktuell:** PM (Du) - Trust Elements, Quellenangaben
- **Später:** Product Designer (UI Trust Signals), Content Specialist (Quellen-Qualität)

**Erfolgs-Indikatoren:**
- ✅ 75% Trust Score erreicht (Q2 2026)
- ✅ "Nein"-Antworten <10%
- ✅ Survey Response Rate >30% (Nutzer füllen Umfrage aus)

**Review-Frequenz:**
- **Monatlich:** Trust Score Trend + Feedback analysieren
- **Quartalsweise:** Trust Elements A/B Tests

---

### KPI 5: 30-Day Retention Rate (Engine Temperature Instrument)

**Was ist das gewünschte Ergebnis?**
15% der Nutzer kehren innerhalb von 30 Tagen nach erstem Besuch zurück.

**Warum ist dieses Ergebnis wichtig?**
- **Motor-Rolle:** Engine Temperature (Überhitzt der Motor? Churnen Nutzer?)
- **OKR-Alignment:** Direkt zu OKR3 KR2 (Ziel: 15%)
- **NSM-Impact:** Retention zeigt, ob Post-Kauf Support funktioniert → wiederkehrende MADU
- **Long-term Signal:** Hohe Retention = nachhaltiges Wachstum (nicht nur One-Time Users)

**Wie wird Fortschritt gemessen?**
- **Definition:** `(Users die innerhalb 30 Tage zurückkehren / New Users im Vormonat) × 100`
- **Datenquelle:** Backend Tracking (User-ID, Timestamps)
- **Tool:** Langfuse Cohort Analysis oder Custom Script
- **Baseline:** 0% (keine Retention-Strategie)
- **Ziel:** 15% (Q2 2026) ✅ OKR3 KR2

**Wie kannst du das Ergebnis beeinflussen?**
- **Email Marketing:** "Du hast vor 3 Tagen Apple Watch verglichen - hier sind Updates"
- **Post-Kauf Content:** Setup-Guides, Troubleshooting, Feature-Tipps im Chat
- **Push Notifications (später):** "Neue Features für dein Garmin verfügbar"
- **Community:** User Forum für Erfahrungsaustausch
- **Value Reminder:** Email nach 7 Tagen mit Post-Kauf Support CTA

**Wer ist verantwortlich?**
- **Aktuell:** PM (Du) - Email Campaigns, Post-Kauf Content
- **Später:** Growth Manager (Email Automation), Content Specialist (Post-Kauf Guides)

**Erfolgs-Indikatoren:**
- ✅ 15% Retention erreicht (Q2 2026)
- ✅ Email Open Rate >25%
- ✅ Return Visitors stellen durchschnittlich 2+ Post-Kauf Fragen

**Review-Frequenz:**
- **Monatlich:** Retention Rate + Cohort Analysis
- **Quartalsweise:** Retention Campaigns Effectiveness

---

### KPI 6: First-Contact-Resolution Rate (Engine Temperature Instrument)

**Was ist das gewünschte Ergebnis?**
85% der Nutzer bestätigen, dass ihre Frage im ersten Chat-Kontakt vollständig geklärt wurde.

**Warum ist dieses Ergebnis wichtig?**
- **Motor-Rolle:** Engine Temperature (Funktioniert die Maschine korrekt?)
- **OKR-Alignment:** Direkt zu OKR2 KR3 (Ziel: 85%)
- **NSM-Impact:** Hohe Resolution = zufriedene Nutzer = höhere Conversion → mehr MADU
- **Quality Signal:** Zeigt, ob QA-Chatbot wirklich hilfreich ist

**Wie wird Fortschritt gemessen?**
- **Definition:** `(Ja-Antworten / Total Responses) × 100`
- **Datenquelle:** Post-Chat Umfrage: "Wurde deine Frage vollständig beantwortet?" (Ja/Nein)
- **Alternative:** Nutzer stellen keine Follow-up Frage = Resolution
- **Tool:** Frontend Popup → Backend Tracking
- **Baseline:** - (noch nicht gemessen)
- **Ziel:** 85% (Q2 2026) ✅ OKR2 KR3

**Wie kannst du das Ergebnis beeinflussen?**
- **Answer Quality:** RAGAS Metrics optimieren (Faithfulness, Relevancy)
- **Retrieval Accuracy:** Hybrid Search optimieren (bessere Chunks)
- **Prompt Engineering:**Klarere System Prompts für vollständige Antworten
- **Content Coverage:** Mehr Produktdaten, mehr Review-Quellen
- **Fallback:** "War das hilfreich? Falls nicht, lass mich anders erklären"

**Wer ist verantwortlich?**
- **Aktuell:** PM (Du) - Prompt Engineering, Content Quality
- **Später:** Backend Engineer (RAG Pipeline), Data Analyst (Failed Queries Analysis)

**Erfolgs-Indikatoren:**
- ✅ 85% First-Contact-Resolution (Q2 2026)
- ✅ Follow-up Fragen Rate <20%
- ✅ Survey Response Rate >30%

**Review-Frequenz:**
- **Wöchentlich:** Resolution Rate Trend + Failed Queries analysieren
- **Monatlich:** Failed Queries zu Test Set hinzufügen (Phase 12 Evaluation)
- **Quartalsweise:** RAG Pipeline Optimization basierend auf Patterns

---

### KPI 7: Time to Recommendation (Speed Instrument)

**Was ist das gewünschte Ergebnis?**
Nutzer erhalten ihre finale Produktempfehlung in durchschnittlich <2 Minuten.

**Warum ist dieses Ergebnis wichtig?**
- **Motor-Rolle:** Speed (Effizienz der Reise)
- **OKR-Alignment:** Direkt zu OKR1 KR1 (Ziel: <2 Minuten)
- **NSM-Impact:** Schnellere Empfehlung = weniger Abbrüche = höhere MADU
- **Value Proposition:** USP "schnelle Kaufentscheidung" wird messbar

**Wie wird Fortschritt gemessen?**
- **Definition:** Median Time (first_message_timestamp → recommendation_displayed_timestamp)
- **Datenquelle:** Frontend Timer + Backend Events
- **Tool:** Langfuse Latency Tracking
- **Baseline:** <4 Minuten (Monat 1-3)
- **Ziel:** <2 Minuten (Q2 2026) ✅ OKR1 KR1

**Wie kannst du das Ergebnis beeinflussen?**
- **Chat Flow:** Kürzerer Flow (5 Fragen → 3 Fragen)
- **Quick-Reply Buttons:** Schnellere Antwortmöglichkeiten
- **Smart Defaults:** "Basierend auf deiner ersten Antwort, wir empfehlen..."
- **Technical:** Response Time <3s, Caching für häufige Queries
- **UX:** Progress Bar zeigt "Noch 1 Frage bis Empfehlung"

**Wer ist verantwortlich?**
- **Aktuell:** PM (Du) - Flow Optimization, Quick-Reply
- **Später:** Product Designer (UX Flow), Backend Engineer (Performance)

**Erfolgs-Indikatoren:**
- ✅ <2 Minuten Time to Recommendation (Q2 2026)
- ✅ 80% der Nutzer unter 3 Minuten
- ✅ Abbruch-Rate bei Minute 2-3 sinkt auf <5%

**Review-Frequenz:**
- **Monatlich:** Time to Recommendation Trend + Distribution (P50, P75, P90)
- **Quartalsweise:** Flow Optimization A/B Tests

---

### KPI 8: Net Promoter Score (NPS) (Fuel Instrument)

**Was ist das gewünschte Ergebnis?**
NPS von 20% (bei mindestens 100 befragten Nutzern).

**Warum ist dieses Ergebnis wichtig?**
- **Motor-Rolle:** Fuel (Word-of-Mouth = kostenloser Treibstoff für Wachstum)
- **OKR-Alignment:** Direkt zu OKR3 KR3 (Ziel: 20% NPS bei 100 Befragten)
- **NSM-Impact:** Hoher NPS = organisches Wachstum → mehr Traffic → mehr MADU (ohne Marketing-Kosten)
- **Quality Signal:** Ultimate Metric für User Loyalty

**Wie wird Fortschritt gemessen?**
- **Definition:** `% Promoters (9-10) - % Detractors (0-6)`
- **Datenquelle:** Quartalsweise Email-Umfrage: "Wie wahrscheinlich würdest du Verifyr weiterempfehlen?" (0-10)
- **Tool:** Email Survey (Typeform, Google Forms) → Manual Analysis
- **Baseline:** - (noch nicht gemessen)
- **Ziel:** 20% NPS bei 100 Befragten (Q2 2026) ✅ OKR3 KR3

**Wie kannst du das Ergebnis beeinflussen?**
- **Product Excellence:** Alle anderen KPIs optimieren → höherer NPS
- **Delightful UX:** Über Erwartungen hinausgehen (Easter Eggs, Personalisierung)
- **Community:** User Testimonials prominent zeigen
- **Referral Program (später):** "Empfehle Verifyr, erhalte Bonus"
- **Follow-up:** Nach positivem Feedback fragen: "Würdest du uns weiterempfehlen?"

**Wer ist verantwortlich?**
- **Aktuell:** PM (Du) - Product Quality, User Delight
- **Später:** Growth Manager (Referral Program), Customer Success (Follow-up)

**Erfolgs-Indikatoren:**
- ✅ NPS 20% erreicht bei 100 Befragten (Q2 2026)
- ✅ Survey Response Rate >40%
- ✅ Promoters (9-10): >35%, Detractors (0-6): <15%

**Review-Frequenz:**
- **Quartalsweise:** NPS Survey + Detractors Follow-up (Was lief schief?)

---

## 3. OKR-NSM-KPI Mapping (Die Verbindungen)

### Mapping-Logik

```
         NSM (Destination)
              ↑
              │ Erreicht durch
              │
         OKRs (Route)
              ↑
              │ Getrieben von
              │
         KPIs (Dashboard)
```

---

### OKR1 → NSM → KPIs

**OKR1: Schnelle, vertrauensvolle Kaufempfehlung**
- **KR1:** Zeit bis Empfehlung <2 Minuten
- **KR2:** Flow Completion 70%
- **KR3:** Trust Score 75%

**Treibt NSM:**
- Schnelle Empfehlung (KR1) → weniger Abbrüche → mehr MADU
- Hohe Flow Completion (KR2) → mehr Nutzer erreichen Empfehlung → mehr MADU
- Hoher Trust Score (KR3) → mehr Affiliate-Klicks → mehr MADU

**Getrieben von KPIs:**
- **KPI 7 (Time to Recommendation)** → misst KR1 direkt
- **KPI 1 (Flow Completion Rate)** → misst KR2 direkt
- **KPI 4 (Trust Score)** → misst KR3 direkt
- **KPI 2 (Conversion Rate)** → unterstützt (schneller Flow = höhere Conversion)

**Beziehung:**
```
KPI 7 (Time <2min)  ─┐
KPI 1 (Flow 70%)    ─┼→ OKR1 → NSM (MADU)
KPI 4 (Trust 75%)   ─┘
```

---

### OKR2 → NSM → KPIs

**OKR2: Zuverlässige Fragen-Beantwortung**
- **KR1:** Zufriedenheits-Score +1 Punkt vs. Wettbewerb
- **KR2:** Antwortzeit <1 Minute
- **KR3:** First-Contact-Resolution 85%

**Treibt NSM:**
- Hohe Zufriedenheit (KR1) → mehr Nutzer vertrauen Empfehlung → mehr MADU
- Schnelle Antwort (KR2) → bessere UX → weniger Abbrüche → mehr MADU
- Hohe Resolution (KR3) → Nutzer bekommen was sie brauchen → mehr Conversion → mehr MADU

**Getrieben von KPIs:**
- **KPI 3 (User Satisfaction)** → misst KR1 direkt (Proxy für Wettbewerb-Vergleich)
- **KPI 6 (First-Contact-Resolution)** → misst KR3 direkt
- **KR2 (Antwortzeit <1min)** → technische Metrik (aktuell <5s → bereits erreicht!)

**Beziehung:**
```
KPI 3 (Satisfaction 80%)       ─┐
KPI 6 (Resolution 85%)         ─┼→ OKR2 → NSM (MADU)
Technical Metric (Time <1min)  ─┘
```

---

### OKR3 → NSM → KPIs

**OKR3: Engagierte Nutzer-Basis aufbauen**
- **KR1:** 100 aktive Nutzer/Monat (Q2 2026)
- **KR2:** 30-Day Retention 15%
- **KR3:** NPS 20% bei 100 Befragten

**Treibt NSM:**
- 100 MAU (KR1) → größerer Pool für MADU (MADU ist Teilmenge von MAU)
- 15% Retention (KR2) → wiederkehrende Nutzer = wiederkehrende MADU (Post-Kauf Support)
- NPS 20% (KR3) → Word-of-Mouth → organisches Wachstum → mehr MAU → mehr MADU

**Getrieben von KPIs:**
- **KR1 (100 MAU)** → ist self-tracking (nicht KPI, sondern Proxy für NSM)
- **KPI 5 (30-Day Retention)** → misst KR2 direkt
- **KPI 8 (NPS)** → misst KR3 direkt
- **KPI 2 (Conversion Rate)** → unterstützt (höhere Conversion = mehr MAU → MADU)

**Beziehung:**
```
100 MAU (Tracking)         ─┐
KPI 5 (Retention 15%)      ─┼→ OKR3 → NSM (MADU)
KPI 8 (NPS 20%)            ─┘
```

---

### Gesamt-Mapping: KPIs → OKRs → NSM

```
┌─────────────────────────────────────────────────────────┐
│               NSM: 1.000 MADU/Monat (Destination)       │
│          "Nutzer treffen selbstbewusste Kaufentscheidung"│
└───────────────────────┬─────────────────────────────────┘
                        ↑
            ┌───────────┼───────────┐
            │           │           │
    ┌───────┴──┐   ┌────┴────┐  ┌──┴────────┐
    │  OKR1    │   │  OKR2   │  │  OKR3     │
    │ Schnelle │   │ Fragen  │  │ Nutzer-   │
    │ Empfehlung   │ klären  │  │ Basis     │
    └───┬──────┘   └────┬────┘  └──┬────────┘
        ↑               ↑           ↑
        │               │           │
    ┌───┴────┐      ┌───┴────┐  ┌──┴─────┐
    │ KPIs   │      │ KPIs   │  │ KPIs   │
    │ 1,2,4,7│      │ 3,6    │  │ 2,5,8  │
    └────────┘      └────────┘  └────────┘

KPI Legend:
1 = Flow Completion (Speed)
2 = Conversion Rate (Speed)
3 = User Satisfaction (Fuel)
4 = Trust Score (Fuel)
5 = 30-Day Retention (Engine Temp)
6 = First-Contact-Resolution (Engine Temp)
7 = Time to Recommendation (Speed)
8 = NPS (Fuel)
```

---

### Cross-OKR KPI-Wirkung

Manche KPIs wirken auf **mehrere OKRs** gleichzeitig:

**KPI 2 (Conversion Rate):**
- Unterstützt **OKR1** (schneller Flow → höhere Conversion)
- Unterstützt **OKR2** (bessere Antworten → höhere Conversion)
- Unterstützt **OKR3** (mehr Conversions → mehr MAU)

**KPI 3 (User Satisfaction):**
- Treibt **OKR2** direkt (KR1: Zufriedenheits-Score)
- Unterstützt **OKR1** (zufriedene Nutzer vertrauen Empfehlung)
- Unterstützt **OKR3** (zufriedene Nutzer bleiben, empfehlen weiter)

**KPI 5 (Retention):**
- Treibt **OKR3** direkt (KR2: 15% Retention)
- Unterstützt **NSM** (wiederkehrende MADU für Post-Kauf Support)

---

## 4. KPI-Dashboard Übersicht (Schnellansicht)

| KPI | Kategorie | OKR | Baseline | Q2 2026 Ziel | Frequenz |
|-----|-----------|-----|----------|--------------|----------|
| **1. Flow Completion Rate** | Speed | OKR1 KR2 | 50% | 70% ✅ | Wöchentlich |
| **2. Conversion Rate** | Speed | Cross-OKR | 5% | 20% | Wöchentlich |
| **3. User Satisfaction Score** | Fuel | OKR2 KR1 | 70% | 80% | Wöchentlich |
| **4. Trust Score** | Fuel | OKR1 KR3 | - | 75% ✅ | Monatlich |
| **5. 30-Day Retention Rate** | Engine Temp | OKR3 KR2 | 0% | 15% ✅ | Monatlich |
| **6. First-Contact-Resolution** | Engine Temp | OKR2 KR3 | - | 85% ✅ | Monatlich |
| **7. Time to Recommendation** | Speed | OKR1 KR1 | 4min | <2min ✅ | Monatlich |
| **8. Net Promoter Score** | Fuel | OKR3 KR3 | - | 20% ✅ | Quartalsweise |

**Legende:**
- ✅ = Direkt aus OKR KR übernommen (exaktes Ziel)
- Cross-OKR = Unterstützt mehrere OKRs gleichzeitig

---

## 5. Review-Rhythmus (Wie oft?)

### Wöchentlich (Montag, 30 Min)
**KPIs:** 1, 2, 3
- Flow Completion Rate Trend
- Conversion Rate Trend
- User Satisfaction Trend
- Funnel Exit Points identifizieren

**Tool:** Langfuse Dashboard

**Output:** Top 3 Quick Wins für die Woche

---

### Monatlich (erste Woche, 2 Stunden)
**KPIs:** Alle (1-8)
- Full KPI Review
- OKR-Progress Check
- Cohort Analysis (MADU by Source)
- A/B Test Results

**Tool:** Langfuse + Google Analytics + Review Doc

**Output:**
- Top 3 Hebel für nächsten Monat
- A/B Test Roadmap
- Content Plan

---

### Quartalsweise (erste Woche, 4 Stunden)
**KPIs:** Alle + NSM
- 3-Monats-Trend-Analyse
- OKR Achievement Review (✅/⚠️/❌)
- NPS Survey durchführen
- Competitive Analysis
- Unit Economics (CAC, LTV)

**Tool:** Strategic Review Doc + Updated Roadmap

**Output:**
- OKR Update für nächstes Quartal
- Roadmap Pivot (falls nötig)
- Budget Allocation
- Hiring Decisions

---

## 6. Erfolgs-Definition (Woran erkennst du Erfolg?)

### Stufe 1: Early Traction (Monat 3)
**NSM:** 20 MADU/Monat
**KPIs:**
- ✅ Flow Completion >60%
- ✅ Conversion Rate >10%
- ✅ User Satisfaction >70%

**Bedeutung:** Product funktioniert end-to-end, erste Nutzer vertrauen

---

### Stufe 2: Product-Market Fit (Q2 2026)
**NSM:** 100 MADU/Monat ← **OKR3 KR1 erreicht!**
**KPIs:**
- ✅ Flow Completion >70% (OKR1 KR2)
- ✅ Conversion Rate >20%
- ✅ Trust Score >75% (OKR1 KR3)
- ✅ User Satisfaction >80% (OKR2 KR1)
- ✅ First-Contact-Resolution >85% (OKR2 KR3)
- ✅ 30-Day Retention >15% (OKR3 KR2)
- ✅ Time to Recommendation <2min (OKR1 KR1)
- ✅ NPS >20% (OKR3 KR3)

**Bedeutung:** Alle OKRs erreicht, organisches Wachstum, messbare Affiliate Revenue

---

### Stufe 3: Scalable Business (Q4 2026)
**NSM:** 500 MADU/Monat
**KPIs:** Alle Targets konstant gehalten bei 20% Conversion
**Zusätzlich:**
- ✅ Affiliate Revenue messbar
- ✅ CAC <€5 (bei Paid Ads)
- ✅ LTV:CAC >3:1
- ✅ NPS >30%

**Bedeutung:** Business skalierbar, Unit Economics funktionieren, ready for Investment

---

## 7. Zusammenfassung: Auto-Analogie Final

```
🎯 DESTINATION (NSM)
   Berlin = 1.000 MADU/Monat
   "Wo wollen wir hin?"

🗺️ ROUTE (OKRs)
   Etappe 1: München → Nürnberg (OKR1: Schnelle Empfehlung)
   Etappe 2: Nürnberg → Leipzig (OKR2: Fragen klären)
   Etappe 3: Leipzig → Berlin (OKR3: Nutzer-Basis)
   "Wie kommen wir dahin?"

📊 DASHBOARD (KPIs)
   Speed:
     - Conversion Rate (Wie schnell kommen wir voran?)
     - Flow Completion (Bleiben wir auf der Autobahn?)
     - Time to Recommendation (Fahren wir 130 oder 50?)

   Fuel:
     - User Satisfaction (Haben wir genug Benzin?)
     - Trust Score (Ist der Tank voll?)
     - NPS (Bekommen wir kostenlosen Treibstoff?)

   Engine Temperature:
     - 30-Day Retention (Überhitzt der Motor?)
     - First-Contact-Resolution (Läuft die Maschine rund?)

   "Funktioniert der Motor? Kommen wir an?"
```

**Logik:**
- **Gute KPIs** (Motor läuft) → **OKRs erreicht** (Etappen geschafft) → **NSM erreicht** (Berlin erreicht!)
- **Schlechte KPIs** (Motor überhitzt) → **OKRs scheitern** (stecken fest) → **NSM nicht erreicht** (kommen nie an)

---

## Nächste Schritte (Empfehlung)

1. **KPI-Tracking implementieren:**
   - Backend Events für alle 8 KPIs loggen
   - Langfuse Dashboard aufsetzen
   - Google Sheets Template für wöchentliche Reviews

2. **Umfragen implementieren:**
   - In-App Popup für Trust Score (nach Empfehlung)
   - Post-Chat Popup für First-Contact-Resolution
   - Quartalsweise Email für NPS

3. **Review-Prozess etablieren:**
   - Wöchentlicher Review (Montag, 30min)
   - Monatlicher Review (erste Woche, 2h)
   - Quartalsweiser Strategic Review (4h)

4. **Baselines messen:**
   - Monat 1: Baselines für alle KPIs etablieren
   - Monat 2-3: Erste Optimierungen basierend auf Daten
   - Q2 2026: OKR-Targets erreichen!
