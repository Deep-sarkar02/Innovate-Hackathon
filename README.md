# AI Sales Copilot — Adaptive Sales Training Platform

An AI-powered sales training platform for Infinity Learn. Sales reps practice live customer conversations in realistic simulations, receive real-time coaching, and get post-session debriefs with skill insights. The stack combines a React frontend, Node.js API, MongoDB, Amazon Bedrock for LLM responses, Amazon Polly for voice output, and optional LiveKit for real-time meeting rooms.

## Features

- **Training simulations** — Configure persona, difficulty, product context, and language (English / Hindi), then run a live role-play session against an AI customer.
- **Multi-agent AI** — Customer, coach, and observer agents powered by a unified LLM client (Bedrock first, OpenAI fallback).
- **Speech I/O** — Browser Speech Recognition for input; Amazon Polly TTS via the backend with browser `speechSynthesis` fallback.
- **Post-session debrief** — Session insights, skill scoring, and LMS recommendations.
- **Rep profiles & skill graph** — Track progress across sales competencies.
- **Admin analytics & cohorts** — Manage training cohorts and view aggregate performance.
- **LiveKit integration** — Optional real-time audio rooms for legacy copilot / meeting mode.

## Architecture

```
Browser (React)
  ├── Speech Recognition (STT)
  ├── Polly TTS or browser speech (TTS)
  └── REST API ──► Express backend
                       ├── MongoDB
                       ├── Bedrock Ministral (LLM)
                       ├── Amazon Polly (TTS)
                       ├── OpenAI (LLM fallback)
                       └── LiveKit (optional rooms)
```

LiveKit handles optional audio rooms only. The AI brain runs through the backend REST API and Bedrock.

## Tech Stack

| Layer    | Technologies |
|----------|--------------|
| Frontend | React 19, Vite, Tailwind CSS, React Router, LiveKit Components |
| Backend  | Node.js, Express, Mongoose, JWT |
| Database | MongoDB |
| AI       | Amazon Bedrock (Ministral 3 8B), OpenAI (fallback) |
| Voice    | Amazon Polly (TTS), Web Speech API (STT + TTS fallback) |
| Realtime | LiveKit Cloud (optional) |

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Amazon Bedrock API key (for LLM)
- AWS IAM credentials with Polly access (optional, for server-side TTS)
- OpenAI API key (optional fallback)
- LiveKit Cloud project (optional, for meeting rooms)

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/Deep-sarkar02/Innovate-Hackathon.git
cd Innovate-Hackathon
npm run install:all
```

### 2. Configure environment

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

See [Environment variables](#environment-variables) below for details.

### 3. Start MongoDB

Ensure MongoDB is running locally, or set `MONGODB_URI` to your Atlas connection string.

### 4. Run the app

```bash
npm run dev
```

This starts both services concurrently:

- **Backend API** — `http://localhost:4000`
- **Frontend** — `http://localhost:5173`

### 5. Log in

Use the seeded demo account:

| Field    | Value |
|----------|-------|
| Email    | `sales@infinitylearn.com` |
| Password | `demo1234` |

## Environment Variables

All configuration lives in a root `.env` file (never commit this file).

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret for signing JWT tokens (32+ chars in production) |
| `BEDROCK_API_KEY` | For AI | Short-lived Bedrock console key (`bedrock-api-key-...`) |
| `AWS_REGION` | For AI | Bedrock region (default: `us-west-2`) |
| `BEDROCK_MODEL` | For AI | Model ID (default: `mistral.ministral-3-8b-instruct`) |
| `AWS_ACCESS_KEY_ID` | For Polly | IAM access key (or temporary STS key) |
| `AWS_SECRET_ACCESS_KEY` | For Polly | IAM secret key |
| `AWS_SESSION_TOKEN` | For Polly | STS session token (if using temporary creds) |
| `OPENAI_API_KEY` | Optional | Fallback LLM when Bedrock is unavailable |
| `LIVEKIT_URL` | Optional | LiveKit WebSocket URL |
| `LIVEKIT_API_KEY` | Optional | LiveKit API key |
| `LIVEKIT_API_SECRET` | Optional | LiveKit API secret |
| `VITE_API_URL` | Yes | Frontend API base URL (default: `http://localhost:4000/api/v1`) |
| `VITE_LIVEKIT_URL` | Optional | LiveKit URL exposed to the frontend |
| `CORS_ORIGIN` | Yes | Allowed frontend origin (default: `http://localhost:5173`) |

### AI provider priority

1. **Amazon Bedrock** — Used when `BEDROCK_API_KEY` is set. Calls the OpenAI-compatible Bedrock Mantle endpoint.
2. **OpenAI** — Used when Bedrock is not configured or returns no result.
3. **Mock responses** — Agents fall back to canned replies when no LLM is configured.

### TTS provider priority

1. **Amazon Polly** — Used when IAM credentials (`AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY`) are set.
2. **Browser speech** — Falls back to the Web Speech API when Polly is unavailable.

> **Note:** The Bedrock API key and IAM credentials are separate. The Bedrock console key works for chat completions only; Polly requires standard AWS IAM credentials.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start backend + frontend |
| `npm run dev:backend` | Backend only |
| `npm run dev:frontend` | Frontend only |
| `npm run build` | Build frontend for production |
| `npm run install:all` | Install root, backend, and frontend dependencies |

### Test Bedrock connection

```bash
python scripts/test_bedrock_haiku.py
```

Lists available models:

```bash
python scripts/test_bedrock_openai.py
```

## API Overview

Base URL: `http://localhost:4000/api/v1`

| Route prefix | Purpose |
|--------------|---------|
| `/auth` | Login, registration, JWT |
| `/training` | Session planner and simulation |
| `/rep` | Rep profiles |
| `/skills` | Skill graph |
| `/cohorts` | Cohort knowledge base |
| `/analytics` | Admin analytics |
| `/lms` | LMS module recommendations |
| `/tts` | Text-to-speech (`POST /speak`, `GET /status`) |
| `/livekit` | LiveKit token generation |
| `/ai` | Meeting copilot endpoints |

## Project Structure

```
├── backend/
│   └── src/
│       ├── config/          # Env, DB, demo user
│       ├── models/          # Mongoose schemas
│       ├── modules/
│       │   ├── agents/      # Customer, coach, observer + LLM clients
│       │   ├── ai/          # Meeting copilot
│       │   ├── simulation/  # Training session logic
│       │   ├── tts/         # Amazon Polly TTS
│       │   └── ...
│       ├── routes/          # Route aggregator
│       └── seed/            # Demo data
├── frontend/
│   └── src/
│       ├── pages/           # Dashboard, training, admin, meeting
│       ├── components/      # UI, LiveKit, voice
│       ├── hooks/           # Speech recognition, TTS, session
│       └── services/        # API client
├── scripts/                 # Bedrock test utilities
├── .env.example             # Environment template
└── package.json             # Root workspace scripts
```

## App Routes

| Path | Description |
|------|-------------|
| `/login` | Authentication |
| `/dashboard` | Rep home |
| `/train` | Configure a training session |
| `/train/:sessionId` | Live simulation |
| `/train/:sessionId/debrief` | Post-session review |
| `/profile` | Rep skill profile |
| `/admin/analytics` | Admin dashboard |
| `/admin/cohorts` | Cohort management |
| `/copilot` | Legacy meeting setup |
| `/meeting/:meetingId` | LiveKit meeting room |

## Branch

Active development: **`dev/deep`** — Bedrock Ministral LLM + Amazon Polly TTS integration.

## License

Private — Infinity Learn Deep Innovate Hackathon project.
