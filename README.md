# TruthLens AI — AI-Powered News & Misinformation Verification Platform

TruthLens AI is an evidence-first, automated claim and misinformation verification platform. It allows users to submit news headlines, factual assertions, WhatsApp forwards, viral rumors, and direct article URLs to evaluate corroborating and contradicting evidence from authoritative publications.

---

## 1. Core Architecture & Workflow

TruthLens AI operates via a strict multi-stage verification pipeline:

```
[ User Input (Text, URL, WhatsApp Forward) ]
                     │
                     ▼
       [ 1. Input Validation & SSRF Guard ]
   (Blocks Private IPs, Localhost, Loopback, Limits 5k chars)
                     │
                     ▼
       [ 2. Cheerio Article Extractor ]
   (Extracts Title, Publisher, Clean Body, Meta Dates)
                     │
                     ▼
        [ 3. KIE.ai Claim Extraction ]
   (Model: gemini-3-8-flash-openai; isolates central claim)
                     │
                     ▼
    [ 4. Multi-Source Web Research Engine ]
   (Tavily Search API + Google Fact Check + Live Indexes)
                     │
                     ▼
      [ 5. KIE.ai Evidentiary Evaluation ]
   (Cross-references evidence against claim; untrusted data sandbox)
                     │
                     ▼
       [ 6. 4-State Verdict Generation ]
  (SUPPORTED | MISLEADING | FALSE | UNVERIFIED with citations)
                     │
                     ▼
     [ 7. Zod Schema Validation & Storage ]
   (Supabase PostgreSQL or Local Memory Persistence)
```

---

## 2. Technology Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide React.
- **Backend**: Node.js, Express.js, TypeScript, Zod, Cheerio, Helmet, express-rate-limit.
- **AI Intelligence**: **KIE.ai** (Sole LLM Provider; default model `gemini-3-8-flash-openai`).
- **Web Research**: Tavily Search API, Google Fact Check Tools API, open indexed search fallbacks.
- **Database**: Supabase PostgreSQL with local memory/storage persistence fallback.

---

## 3. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Description | Required |
|---|---|---|
| `KIE_API_KEY` | Your secret API key from KIE.ai | Yes for AI inference |
| `KIE_BASE_URL` | Base URL for KIE.ai (default: `https://api.kie.ai/v1`) | No (has default) |
| `KIE_MODEL` | KIE model name (default: `gemini-3-8-flash-openai`) | No (has default) |
| `TAVILY_API_KEY` | Tavily Search API key for web research | Recommended |
| `GOOGLE_FACT_CHECK_API_KEY` | Google Fact Check Tools API key | Optional |
| `SUPABASE_URL` | Supabase Project REST URL | Optional |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | Optional |
| `PORT` | Server listening port (default: 3000) | No |

---

## 4. Local Development

### Prerequisites
- Node.js >= 20.x
- npm >= 10.x

### Install Dependencies
```bash
npm install
```

### Run Full-Stack Dev Server (Express + Vite on Port 3000)
```bash
npm run dev
```

### Run Automated Tests
```bash
npx tsx tests/run_tests.ts
```

### Production Build
```bash
npm run build
npm start
```

---

## 5. Security & SSRF Safeguards

1. **SSRF Mitigation**: URLs entered for verification are checked against loopback (`127.0.0.1`, `::1`), private ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), and cloud metadata (`169.254.169.254`).
2. **Untrusted Data Isolation**: External search snippets and web articles are marked as untrusted data in KIE.ai prompts to prevent prompt injection overrides.
3. **Key Privacy**: All provider keys (`KIE_API_KEY`, `TAVILY_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are kept strictly on the backend. No secrets are exposed to the client bundle.
4. **Rate Limiting**: Configured at 60 verification requests per 15 minutes per IP address.

---

## 6. Deployment Guides

### Frontend Deployment (Vercel)
1. Import repository on Vercel.
2. Framework Preset: **Vite**.
3. Build Command: `npm run build`.
4. Output Directory: `dist`.

### Backend Deployment (Render)
1. Create a new **Web Service** on Render pointing to your repository.
2. Runtime: **Node**.
3. Build Command: `npm install && npm run build`.
4. Start Command: `npm start`.
5. In Render Dashboard, add your environment variables (`KIE_API_KEY`, `KIE_BASE_URL`, `TAVILY_API_KEY`, etc.).
