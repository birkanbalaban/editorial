# THE EDITORIAL INDEX — Agent Integration & Deployment Guide
*Autonomous High-Fashion Curation, Rights Management & Meta Graph API Publishing Platform*

---

## 1. Executive Summary & Architecture Overview

**THE EDITORIAL INDEX** is an autonomous, full-stack curation and publishing system built for luxury fashion monographs and editorial photography. The platform operates on a single authoritative principle: **autonomous research and scheduled publishing backed by strict human-in-the-loop oversight and automated copyright safety gates.**

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          THE EDITORIAL INDEX AGENT                          │
│                                                                             │
│  ┌─────────────────────────┐          ┌──────────────────────────────────┐  │
│  │   Gemini 3.8 Flash      │          │     Meta Graph API v21.0         │  │
│  │   Autonomous Research   │          │     Publishing Adapter           │  │
│  │   & 5-Factor Scoring    │          │  (Single / Carousel Publishing)  │  │
│  └────────────┬────────────┘          └──────────────────▲───────────────┘  │
│               │                                          │                  │
│               ▼                                          │                  │
│  ┌─────────────────────────┐          ┌──────────────────┴───────────────┐  │
│  │  Automated Deduplication│          │    Rights Management Firewall    │  │
│  │  & Top-5 Daily Selector │─────────►│  Verified Rights -> Post Package │  │
│  │                         │          │  Unlicensed      -> Reference Card│  │
│  └─────────────────────────┘          └──────────────────▲───────────────┘  │
│                                                          │                  │
│  ┌───────────────────────────────────────────────────────┴───────────────┐  │
│  │                     Operation Mode State Machine                      │  │
│  │   [Mode A: Manual]    [Mode B: Approval]     [Mode C: Autopilot]      │  │
│  │   • Full Review       • Curated Queue        • Autonomous Dispatch    │  │
│  │   • Manual Schedule   • One-Click Approval   • Emergency Stop Switch  │  │
│  │                       • Version Hash Guard   • Max 2 Posts / Day      │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                       ▲                                     │
│                                       │                                     │
│  ┌────────────────────────────────────┴──────────────────────────────────┐  │
│  │           Persistent Automation Engine (Europe/Istanbul)              │  │
│  │   08:00 Research ──► 09:00 Evaluation ──► 10:00 Daily Selection       │  │
│  │   11:00 Post Prep ──► 14:00 First Slot ──► 20:00 Second Slot          │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Gemini-Powered Autonomous Research & Scoring Engine

The intelligence layer lives entirely server-side (`src/server/geminiService.ts`) powered by the `@google/genai` SDK using `gemini-3.8-flash`.

### A. Autonomous Candidate Discovery Pipeline
1. **Source Harvester**: Simulates and scans high-fashion publications, archival repositories, and contemporary monographs (*Vogue Italia*, *Self Service*, *Purple*, *Harper's Bazaar*, *Dazed*, *The Gentlewoman*).
2. **Duplicate Detection**: Filters existing titles and source URLs against `.data/editorial_db.json`.
3. **Structured Entity Extraction**: Parses photographer, stylist, model, publication, brand, and publication date into standardized schema.

### B. 5-Factor Curatorial Scoring Algorithm (`src/lib/scoring.ts`)
Each candidate editorial is evaluated against five weighted curatorial criteria on a 0–100 scale:

$$\text{Overall Score} = (0.25 \times \text{Comp}) + (0.20 \times \text{Light}) + (0.20 \times \text{Style}) + (0.15 \times \text{Culture}) + (0.20 \times \text{Narrative})$$

*   **Composition (25%)**: Structural symmetry, brutalist framing, negative space, geometric discipline.
*   **Lighting (20%)**: Directional tungsten, chiaroscuro contrast, natural raking daylight, analog grain fidelity.
*   **Styling & Silhouette (20%)**: Haute couture drapery, tailoring precision, textile materiality.
*   **Cultural Relevance (15%)**: Timelessness, avoidance of fast-fashion trends, alignment with high-art monographs.
*   **Narrative Resonance (20%)**: Emotional intimacy, cinematic atmosphere, and character depth.

### C. Daily Selection Curation
*   The top 5 scoring candidates are tagged as `isDailyTop5: true`.
*   Up to 2 rights-cleared works receive pre-formatted Instagram post drafts with 4:5 / 1:1 crop geometry, verified tags, and photographer credits.

---

## 3. Rights Management & Legal Firewall

The platform strictly prohibits unauthorized publishing of creative photography:

| Rights Status | Reproduction Authorization | Content Delivery Output |
| :--- | :--- | :--- |
| `verified` | Cleared via syndication/license contract | **Feed-Ready Instagram Post Package** (Media, credits, schedule) |
| `pending` | Rights clearance currently under negotiation | **Editorial Reference Card** (Watermark-free archival card only) |
| `unlicensed` | Reproduction rights not granted | **Editorial Reference Card** (Direct social media broadcast blocked) |
| `editorial_reference_only` | Fair use educational review only | **Editorial Reference Card** (Publishing disabled) |

### Non-Negotiable Compliance Invariants:
1. **Zero Watermarking**: The platform never watermarks or alters third-party photography.
2. **Attribution Guarantee**: Credits for photographer, stylist, publication, and brand are immutable and cannot be deleted by automated reformatting.
3. **SHA-256 Material Change Gate**: If an approved post's caption, image URL, or rights record is modified after approval, its SHA-256 hash changes, forcing the post back to `needs_approval`.

---

## 4. Connecting Professional Meta Credentials

The Instagram adapter (`src/server/instagramAdapter.ts`) connects to the official **Meta Graph API v21.0**.

### Required Credentials:
*   `INSTAGRAM_ACCOUNT_ID`: The numeric Instagram Professional Account ID (linked to a Facebook Page).
*   `INSTAGRAM_ACCESS_TOKEN`: A Long-Lived System User Access Token or Page Access Token with `instagram_basic` and `instagram_content_publish` permissions.

### Setup Instructions:
1. Create a Meta App at [developers.facebook.com](https://developers.facebook.com) of type **Business**.
2. Add **Instagram Graph API** product.
3. In Meta Business Manager, create a System User and assign permissions:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_read_engagement`
   - `pages_show_list`
4. Generate a **Never-Expiring System User Token**.
5. Set environment variables in your server environment:
   ```bash
   INSTAGRAM_ACCOUNT_ID="17841400000000000"
   INSTAGRAM_ACCESS_TOKEN="EAAxxxxxx..."
   ```

### API Publishing Endpoints Used:
*   **Single Media Container**: `POST https://graph.facebook.com/v21.0/{ig-user-id}/media`
    ```json
    {
      "image_url": "https://your-domain.com/assets/editorial.jpg",
      "caption": "Monolith in Motion. Photo: @solvesundsbo",
      "access_token": "EAA..."
    }
    ```
*   **Carousel Container**: `POST https://graph.facebook.com/v21.0/{ig-user-id}/media` with `media_type: "CAROUSEL"` and `children: ["{container-1}", "{container-2}"]`.
*   **Publish Execution**: `POST https://graph.facebook.com/v21.0/{ig-user-id}/media_publish?creation_id={container_id}`.

*Note: In development without active tokens, the platform runs in a deterministic Sandbox Simulation mode, recording all calls to `auditTrail` with zero production failure.*

---

## 5. Autopilot Engine & Scheduling Mechanics

The background engine runs persistently on the server (`src/server/automationEngine.ts`) configured for `Europe/Istanbul` (UTC+3):

```
08:00  Autonomous Research (Harvest candidates)
09:00  Editorial Evaluation (Run 5-factor scoring algorithm)
10:00  Daily Selection Generation (Rank candidates, select Top 5)
11:00  Post Preparation (Generate captions, credits & crops for cleared items)
14:00  First Publishing Slot (Publish Slot 1 if Autopilot is active)
20:00  Second Publishing Slot (Publish Slot 2 if Autopilot is active)
```

### Autopilot Safety Invariants:
*   **Explicit Confirmation**: Cannot be activated without user clicking "I Accept Full Responsibility" in the Autopilot Confirmation Modal.
*   **Emergency Stop Kill-Switch**: One click in the top bar halts all publishing immediately.
*   **Daily Post Cap**: Hard ceiling enforced at 2 posts per day (configurable in Settings).
*   **Zero Silent Mode Transitions**: System never switches modes without recording a security audit log.

---

## 6. Ready-to-Deploy Production Checklist

Use this audit checklist to distinguish functional codebase features from production cloud setup:

### A. Fully Functional in Current Codebase (100% Operational)
- [x] **5-Factor Curatorial Scoring Engine**: Deterministic weighted evaluation (`src/lib/scoring.ts`).
- [x] **Autonomous Research Workflow**: Server-side candidate generation (`src/server/geminiService.ts`).
- [x] **Legal Rights Firewall**: Editorial Reference Card gating and reproduction restrictions (`src/lib/publishingRules.ts`).
- [x] **Content Hash Integrity**: SHA-256 change detection forcing re-approval on edits (`src/lib/publishingRules.ts`).
- [x] **Persistent Automation Scheduler**: 6 daily cron stages for Europe/Istanbul (`src/server/automationEngine.ts`).
- [x] **Meta Graph API v21.0 Publishing Adapter**: Container lifecycle, single & carousel handlers, sandbox simulation (`src/server/instagramAdapter.ts`).
- [x] **Recharts Analytics Engine**: Time-series reach, likes, shares, moving average trendlines (3D/5D SMA), and side-by-side comparison matrix (`src/components/EditorialEngagementChart.tsx`).
- [x] **Editorial Preference Learning**: Aesthetic tag telemetry tracking approval and rejection signals (`src/components/EditorialLearningView.tsx`).
- [x] **Persistent Storage**: Atomic JSON database with backup locking (`.data/editorial_db.json`).

### B. Production Deployment Prerequisites (Cloud & Meta Console)
- [ ] **Meta App Review Submission**: Submit Facebook App for App Review to request public access for `instagram_content_publish`.
- [ ] **Long-Lived System User Access Token**: Generate permanent token from Meta Business Manager and set `INSTAGRAM_ACCESS_TOKEN`.
- [ ] **Public HTTPS Asset Hosting**: Ensure image assets are served over publicly reachable HTTPS URLs (required by Meta Graph API media containers).
- [ ] **Cloud Scheduler Cron Trigger**: Point Google Cloud Scheduler or Cloud Run cron to `POST /api/workflow/run` for hermetic serverless environments.
- [ ] **Environment Secrets**: Verify `GEMINI_API_KEY` and `APP_URL` are set in production environment variables.

---

*THE EDITORIAL INDEX · Private Research Studio · Monograph Architecture Vol. 01*
