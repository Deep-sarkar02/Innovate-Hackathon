# Adaptive Sales Training Platform (Innovate Hackathon)

An adaptive on-job-training simulator for edtech sales reps. A simulated
customer (LLM) takes calls from a rep; an Observer scores the conversation
against evidence; a Coach updates a per-rep skill graph; a Planner uses that
graph to pick the next scenario. The loop is the product:

```
LMS → Skill Graph → Training Planner → Customer Simulation → Observer → Coach → Skill Graph …
```

## What makes this one different

**Everything is calibrated against real funnel data** — 6,233 real demo-booked
calls, 761 closed sales, 57 transcribed winning calls:

- **Cohorts are real segments** (`backend/src/seed/cohorts.seed.js`), each with
  its true volume, sale rate, objection mix and EMI share. The difficulty
  ladder is the empirical sale-rate ordering, not a guess.
- **The Observer scores only 12 "grounded" skills** — ones with observable
  evidence and enough labelled outcomes to mean something. A skill without
  evidence in the transcript is *omitted*, never invented. Every LLM score
  must carry a verbatim quote.
- **Objections use the real taxonomy**: financial_constraint (52%),
  need_time (28%), trust_deficit (8%), family_consultation (7%),
  competitor_locked (5%).
- **Degradation is loud**: if OpenAI is unreachable, replies/scoring fall back
  to a deterministic heuristic, every response carries `mode: 'mock'`, the UI
  shows a SIMULATION MODE banner, and `/health` reports the last AI error.

## Quick start

```bash
npm run install:all
docker compose up -d          # MongoDB on 27017
cp .env.example .env          # add real keys for LLM + voice (optional to boot)
npm run dev                   # backend :4000, frontend :5173
# demo login: sales@infinitylearn.com / demo1234  (override: DEMO_USER_PASSWORD)
```

Backend tests (no DB needed): `cd backend && npm test`

## Environment

| Var | Required | Notes |
| --- | --- | --- |
| `MONGODB_URI` | yes (defaults to localhost) | |
| `JWT_SECRET` | yes | 32+ chars |
| `OPENAI_API_KEY` | for real AI | without it the app runs in loud mock mode |
| `LIVEKIT_URL/API_KEY/API_SECRET` | for live voice | text training works without |
| `DEEPGRAM_API_KEY` | for STT | |
| `DEMO_USER_PASSWORD` | prod | seeding demo users with the default pw is refused in production |
| `SEED_DEMO_USERS` | optional | `false` disables demo accounts |

## Architecture / agent contracts (frozen — coordinate before changing)

Three agents, three jobs — they never overlap:

| Agent | Does | Never |
| --- | --- | --- |
| Customer (`agents/customer.agent.js`) | talks in persona | evaluates or coaches |
| Observer (`agents/observer.agent.js`) | scores with evidence | talks |
| Coach (`agents/coach.agent.js`) | updates skill graph, feedback, LMS recs | joins the conversation |

**SessionBrief** (Planner → Customer/Observer):
```json
{
  "objective": "pricing", "difficulty": {"knowledge":1-5, "...":"..."},
  "persona": "father|mother|both_parents|student", "mood": "skeptical|neutral|interested|frustrated",
  "primaryObjection": "financial_constraint|need_time|trust_deficit|family_consultation|competitor_locked",
  "goal": "…", "cohortId": "east_belt_middle", "cohortVersion": 1,
  "customerName": "…", "language": "en|hi", "city": "…", "region": "…"
}
```

**Observer output** (Observer → Coach):
```json
{
  "mode": "llm|mock", "scores": {"<groundedSkillId>": 0-100},
  "evidenceQuotes": {"<skillId>": "verbatim quote"},
  "scoredSkills": [], "unscoredSkills": [],
  "mistakes": [], "highlights": [], "keyQuotes": [],
  "confidence": 0-100, "overallScore": "0-100 or null"
}
```

**Turn response** (`POST /training/:id/transcript`) additionally carries
`aiMode: 'llm'|'mock'`.

Guard-rails in the loop (don't remove):
- Per-session skill delta cap: ±8 (one session = one data point)
- Deltas scale with observer confidence (mock ≈ quarter weight)
- Unscored skills never move
- Diminishing returns on repeated keywords in customer state (anti-gaming)

## CRT Course (drip-gated learning)

`/course/crt` is a 5-day Counsellor Readiness Training course seeded from the
real CRT schedule. Gating is SERVER-side (`modules/courses/course.service.js`):
slides advance one page at a time, checkpoint quizzes mid-deck block later
pages until passed, each day ends with a final quiz, and day N+1 stays locked
until day N is fully complete. Content lives in `seed/crt-course.seed.js`.

## Team split (suggested)

| Owner | Area | Files |
| --- | --- | --- |
| A | Simulation & voice | `agent/`, `modules/livekit,simulation`, `components/voice,livekit` |
| B | Evaluation | `modules/agents/observer,coach`, `modules/coaching` |
| C | Planner & data | `modules/training-planner,cohort-kb`, `seed/`, `modules/lms-recommend` |
| D | Frontend & analytics | `frontend/src/pages`, `components/training`, `modules/analytics` |

Branch per person, PR into `main`. Conflict magnets with one owner each:
`routes/index.js` (A), `seed/index.js` (C), `.env.example` (C).

## Data provenance

Seeds cite the analysis they came from (see header of `cohorts.seed.js`).
If you change a cohort, bump its `version` — session insights reference
`cohortId+cohortVersion`, and old evaluations must stay interpretable.
