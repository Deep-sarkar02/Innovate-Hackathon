/**
 * 5-day Counsellor Readiness Training (CRT) course.
 *
 * Authored from the real "CRT Schedule.xlsx" (schedule of 2026-08-01):
 * Day 1 Belief & Company · Day 2 CBSE Foundation + Call Flow · Day 3 Test
 * Prep + Demo Conduction · Day 4 LSQ & Post-Sales · Day 5 Live Calling +
 * Certification. Source PPT links from the schedule are kept on each deck.
 *
 * Deck pages carry checkpoint quizzes mid-deck (the "friction" that stops
 * page-flipping without reading) and every day ends with a final quiz.
 * Sales numbers quoted in slides come from the 6,233-call funnel analysis.
 */

const D = (page, title, ...bullets) => ({ page, title, bullets });
const Q = (q, options, answer) => ({ q, options, answer });
// n rendered pages of a real PPT/PDF, streamed via the gated slide endpoint
const IMG = (n) => Array.from({ length: n }, (_, i) => ({ page: i + 1, image: true }));

export const CRT_COURSE = {
  courseId: 'crt',
  title: 'Counsellor Readiness Training (CRT)',
  description:
    '5-day onboarding for Academic Counsellors. Each day unlocks only after the previous day is completed — '
    + 'decks include checkpoint questions and every day ends with a final quiz.',
  days: [
    // ── DAY 1 ─────────────────────────────────────────────────────────
    {
      day: 1,
      title: 'Belief, Company & Target Exams',
      summary: 'Why ed-tech, why Infinity Learn, roles & targets, and the exams we serve.',
      items: [
        {
          itemId: 'd1-belief',
          type: 'deck',
          title: 'Belief: Why Ed-Tech, Why Infinity Learn',
          durationMinutes: 25,
          deck: {
            sourceLink: 'SharePoint: Belief PPT (see CRT schedule)',
            slides: [
              D(1, 'Why this training exists', 'CRT is your launchpad: 4 days of learning, day 5 you take real calls', 'Every day unlocks only after you finish the previous one', 'Checkpoints inside each deck confirm you actually absorbed it'),
              D(2, 'Why ed-tech in India', 'K-12 learning outcomes gap: school alone is not enough for competitive exams', 'Parents across every income band invest in supplemental education', 'Online delivery reaches Tier 2-4 towns that quality teachers never did'),
              D(3, 'Why Infinity Learn', 'Backed by Sri Chaitanya — 40+ years of academic results, lakhs of selections', 'Full stack: content, live classes, tests, mentorship in one subscription', 'Products from Grade 1 foundation to JEE/NEET'),
              D(4, 'Why IL sells', 'We diagnose before we pitch: the child takes a real test first', 'Winning calls anchor on the child\'s own report — not generic marketing', 'Selection framing: "we selected a small group from your school"'),
              D(5, 'The counsellor\'s real job', 'You are an academic counsellor, not a telecaller', 'Diagnose the child\'s gap → show the path → let parents decide with an EMI they can afford', '3 of 4 real purchases are financed — affordability framing is core, not a trick'),
              D(6, 'What good looks like', 'Demos that run 90+ minutes close at 21.5% — under 30 minutes: 6.6%', 'Both parents on the demo beats one parent', 'Your goal on a first call: book the demo, not sell the product'),
            ],
            checkpoints: [
              {
                afterPage: 3,
                questions: [
                  Q('What backs Infinity Learn academically?', ['A VC fund', 'Sri Chaitanya\'s 40+ year academic legacy', 'A government program', 'A US university'], 1),
                  Q('What must happen before day 2 of CRT unlocks?', ['Nothing, all days are open', 'Complete all of day 1 including the final quiz', 'Ask the trainer', 'Watch one video'], 1),
                ],
              },
            ],
          },
        },
        {
          itemId: 'd1-company',
          type: 'deck',
          title: 'Company Introduction (Corporate Deck)',
          durationMinutes: 30,
          deck: {
            sourceLink: 'Corporate_Deck.pdf — embedded, view-only',
            slides: IMG(41),
            checkpoints: [
              {
                afterPage: 14,
                questions: [
                  Q('Infinity Learn is built on the 41-year legacy of…', ['Aakash', 'Sri Chaitanya', 'Allen', 'FIITJEE'], 1),
                  Q('Who is the brand ambassador of Infinity Learn?', ['Virat Kohli', 'Grand Master Gukesh D, World Chess Champion', 'A. R. Rahman', 'P. V. Sindhu'], 1),
                  Q('The only educational group to achieve AIR 1 in…', ['JEE Main only', 'NEET only', 'All three competitive exams', 'CUET'], 2),
                ],
              },
              {
                afterPage: 28,
                questions: [
                  Q('Infinity Learn\'s AI tool for learner progress is called…', ['ASTRA', 'VISTA', 'NOVA', 'PRISM'], 1),
                  Q('The functional model covers which grades?', ['1-5', '6-13', '9-12', '11-13 only'], 1),
                  Q('Revenue trajectory reached what figure by FY 23-24?', ['2.5 Crore', '100 Crore', '200 Crore', '500 Crore'], 2),
                ],
              },
            ],
          },
        },
        {
          itemId: 'd1-roles',
          type: 'deck',
          title: 'Roles & Responsibilities (Expectations in CRT)',
          durationMinutes: 20,
          deck: {
            sourceLink: 'Expectations in CRT.pptx — embedded, view-only',
            slides: IMG(8),
            checkpoints: [
              {
                afterPage: 4,
                questions: [
                  Q('The Call Mock happens between the trainee and…', ['Another trainee', 'The training manager', 'A real customer', 'HR'], 1),
                  Q('Minimum dialed calls expected daily in OJT?', ['50', '100', '200', '500'], 2),
                  Q('Minimum talk time expected in OJT?', ['1 hour', '1.5 hours', '2.5 hours', '4 hours'], 2),
                ],
              },
              {
                afterPage: 8,
                questions: [
                  Q('M1 (Month 1) sales target is…', ['₹60,000', '₹1.20 Lakh', '₹2.40 Lakh', '₹5 Lakh'], 1),
                  Q('The associate incentive cycle is…', ['Weekly', 'Bi-weekly (15 days)', 'Monthly', 'Quarterly'], 1),
                  Q('Incentive payout is based on…', ['Revenue punched', 'Monthly collection', 'Dial count', 'Attendance'], 1),
                ],
              },
            ],
          },
        },
        {
          itemId: 'd1-exams',
          type: 'deck',
          title: 'Target Exams: Foundation, NEET, JEE & CUET',
          durationMinutes: 75,
          deck: {
            sourceLink: 'Target Exams.pdf — embedded, view-only (one deck, three sessions)',
            slides: IMG(71),
            checkpoints: [
              {
                afterPage: 15,
                questions: [
                  Q('NTSE is conducted by…', ['SOF', 'NCERT', 'NTA', 'Unified Council'], 1),
                  Q('NSO and IMO are conducted by…', ['NCERT', 'Science Olympiad Foundation (SOF)', 'NTA', 'CBSE'], 1),
                  Q('NSTSE is conducted by…', ['Unified Council', 'SOF', 'NCERT', 'AIIMS'], 0),
                ],
              },
              {
                afterPage: 31,
                questions: [
                  Q('Total marks in NEET?', ['300', '360', '720', '800'], 2),
                  Q('NEET marking per question is…', ['+4 correct, -1 wrong', '+1 correct, 0 wrong', '+4 correct, 0 wrong', '+2 correct, -0.5 wrong'], 0),
                  Q('NEET question paper is provided in how many languages?', ['10', '13', '15', '29'], 1),
                ],
              },
              {
                afterPage: 53,
                questions: [
                  Q('JEE Main total questions to be answered?', ['60', '75', '90', '100'], 1),
                  Q('JEE Advanced eligibility: top how many JEE Main qualifiers?', ['50,000', '1,00,000', '2,50,000', '5,00,000'], 2),
                  Q('Total seats across the 23 IITs (per the deck)?', ['~10,000', '~14,000', '~18,160', '~25,000'], 2),
                ],
              },
              {
                afterPage: 69,
                questions: [
                  Q('CUET is the entrance for…', ['IITs', 'Medical colleges', 'UG programs in Central Universities', 'Polytechnics'], 2),
                  Q('CUET is conducted as a…', ['Pen & paper test', 'Computer-based test (CBT)', 'Interview', 'Portfolio review'], 1),
                ],
              },
            ],
          },
        },
        {
          itemId: 'd1-final',
          type: 'quiz',
          title: 'Day 1 Final Quiz — Target Exams (official)',
          durationMinutes: 20,
          quiz: {
            passPct: 70,
            // The actual CRT Day-1 Google Form quiz, minus email/employee fields.
            // Answers verified against the Target Exams deck itself.
            questions: [
              Q('What is the time duration for JEE Mains?', ['2 hours 20 mins', '3 hours', '3 hours 20 mins', '4 hours'], 1),
              Q('How many times can a student attempt NEET?', ['Till 18 years of age', 'Can give till 25 years of age', 'No restrictions', 'None of the above'], 2),
              Q('How many questions are there in JEE Mains (to be answered)?', ['80', '60', '90', '75'], 3),
              Q('What is the type & number of questions in Section B of JEE Mains Chemistry?', ['MCQ - 5', 'Numerical - 5', 'MCQ - 10', 'Numerical - 10'], 1),
              Q('NEET is a _______________ test.', ['Mixed', 'CBT', 'Pen & Paper', 'None of the above'], 2),
              Q('Paper 1 in JEE Mains is related to ______________.', ['B.E / B.Tech', 'B.Sc', 'B.Arch', 'B.Planning'], 0),
              Q('JEE Mains is conducted by _________', ['IIT', 'NTA', 'NCERT', 'Zonal IITs'], 1),
              Q('How many seats are available in IITs?', ['21000+', '23000+', '17000+', '10000+'], 2),
              Q('What is the time duration for NEET?', ['2 hours 20 mins', '3 hours', '3 hours 20 mins', '4 hours'], 2),
              Q('Is JEE Advanced qualification necessary for a seat in NIT?', ['True', 'False'], 1),
              Q('JEE Advanced is conducted by __________', ['Zonal IITs', 'NCERT', 'NTA', 'None of the above'], 0),
              Q('What is the aspirant count for JEE & NEET respectively?', ['10 Lakhs & 10 Lakhs', '14 Lakhs & 24 Lakhs', '24 Lakhs & 14 Lakhs', '24 Lakhs & 24 Lakhs'], 1),
              Q('A student can write JEE Mains 6 times consecutively.', ['TRUE', 'FALSE'], 0),
              Q('JEE Advanced is conducted once a year.', ['FALSE', 'TRUE'], 1),
              Q('How many attempts are allowed for JEE Advanced?', ['Only once', '2 Consecutive Years', '3 Consecutive Years', 'Upto 30 years of age'], 1),
              Q('When do the two sessions of JEE Mains take place?', ['January and April', 'May and June', 'July and August', 'November and December'], 0),
              Q('What is the qualifying criteria to write JEE Advanced?', ['12th/equivalent appearing', '12th/equivalent passed', 'Top 250000 JEE Main qualifying rank', 'Not fixed'], 2),
              Q('With a JEE Main score of 290, a student can secure a seat in IIT.', ['FALSE', 'TRUE'], 0),
              Q('In how many languages is the NEET question paper provided?', ['10', '13', '15', '29'], 1),
              Q('12th score required for JEE is?', ['No such criteria', '33% or only passing marks', 'Gen - 50% ; SC/ST/OBC - 40%', 'Gen/OBC - 75% ; SC/ST - 65%'], 3),
            ],
          },
        },
      ],
    },

    // ── DAY 2 ─────────────────────────────────────────────────────────
    {
      day: 2,
      title: 'CBSE Foundation, Math Champ & Call Flow',
      summary: 'The flagship product, the entry product, and the call script that books demos.',
      items: [
        {
          itemId: 'd2-cbse',
          type: 'deck',
          title: 'Product: CBSE Foundation',
          durationMinutes: 45,
          deck: {
            sourceLink: 'SharePoint: CBSE Foundation PPT (see CRT schedule)',
            slides: [
              D(1, 'Why Foundation?', 'School teaches the syllabus; Foundation builds exam-grade depth', 'Feeds Olympiads now and JEE/NEET readiness later', 'Parents buy outcomes: concept clarity visible in school marks first'),
              D(2, 'Methodology: LPDT / 4A\'s', 'Learn → Practice → Doubt → Test cycle every week', 'Aim, Attempt, Analyse, Advance — the 4A loop on every test', 'Every class has pre-work and post-work in the app'),
              D(3, 'Batch structure', 'Grade-wise micro batches; fixed weekly schedule', 'Live classes + recordings + practice sets + doubt sessions', 'Know your batch calendar before pitching timings'),
              D(4, 'USPs that land', 'Sri Chaitanya faculty pedigree', 'Personalised test analytics parents can see', 'Olympiad exposure included — national benchmark for the child'),
              D(5, 'Price structure', 'Quote annual price ONLY next to its monthly EMI', 'Packages ladder: Regular → Ultimate → Multi-Year (+Books variants)', 'Real data: Ultimate is the most-sold package'),
              D(6, 'Ready reckoner', 'Keep the grade × package × EMI table open on every call', 'Never improvise a price — misquotes kill trust and deals', 'Bajaj / credit-card EMI / Fibe are your three financing rails'),
              D(7, 'FAQs parents actually ask', 'Class timings clash with school/tuition? — batch options', 'What if the child misses a class? — recordings + doubt desk', 'Refund/pause policy — answer honestly, escalate if unsure'),
              D(8, 'Objection: "fee is too high"', 'It is the #1 real objection: 52% of all non-closures', 'First move: annual → monthly EMI translation, always', 'Then value-per-day: less than the cost of a tuition auto-ride'),
              D(9, 'Objection: "we need time"', '#2 objection (28%): usually a soft no or a missing decision-maker', 'Ask what specifically they want to think over', 'Book the demo anyway — the demo IS the thinking material'),
              D(10, 'Objection: "already have tuition"', 'Differentiate: tuition repeats school; Foundation builds beyond it', 'Never rubbish the tuition teacher — parents chose them', 'Premium-school parents object on competition 3x more — be ready'),
              D(11, 'Q&A discipline', 'If you do not know, say so and come back within the day', 'Log every new objection you hear — it feeds training', 'Your TM audit checks accuracy, not just enthusiasm'),
              D(12, 'CBSE Foundation: the 60-second pitch', 'Report anchor → gap → weekly LPDT cycle → faculty → EMI → demo slot', 'Practice it aloud until it is muscle memory', 'You will be audited on this exact structure'),
            ],
            checkpoints: [
              {
                afterPage: 6,
                questions: [
                  Q('LPDT stands for…', ['Learn, Practice, Doubt, Test', 'Listen, Pitch, Demo, Transact', 'Learn, Play, Discuss, Teach', 'Lecture, PDF, Doubt, Test'], 0),
                  Q('How should price ALWAYS be quoted?', ['Annual only', 'Annual with monthly EMI next to it', 'Monthly only, hide annual', 'After the demo only'], 1),
                  Q('Which package sells most in real data?', ['Regular', 'Ultimate', 'Multi-Year', '1:1'], 1),
                ],
              },
            ],
          },
        },
        {
          itemId: 'd2-mathchamp',
          type: 'deck',
          title: 'Product: Math Champ',
          durationMinutes: 20,
          deck: {
            sourceLink: 'SharePoint: Math Champ brochure (see CRT schedule)',
            slides: [
              D(1, 'Why Math Champ exists', 'Math anxiety is the #1 parent pain in grades 1-8', 'Entry-price product: lower commitment than full Foundation', 'Perfect for C3 (grade 1-5) parents where budget objection is 51%'),
              D(2, 'Need generation', 'Ask: "how does your child feel about maths homework?"', 'Use the diagnostic test\'s maths section as evidence', 'Position: fix the foundation before it becomes fear'),
              D(3, 'Product USPs', 'Gamified practice + weekly live classes', 'Speed + accuracy training, not just syllabus', 'Clear upgrade path into full CBSE Foundation later'),
              D(4, 'When to pitch Math Champ vs Foundation', 'Tight budget or hesitant parent → Math Champ first', 'Strong intent + multi-subject gap → Foundation directly', 'Never pitch both at once — one clear recommendation'),
            ],
            checkpoints: [
              {
                afterPage: 2,
                questions: [
                  Q('Math Champ is best positioned when…', ['Parent has high budget', 'Budget is tight or intent is hesitant', 'Child is in grade 12', 'Parent asks for JEE'], 1),
                ],
              },
            ],
          },
        },
        {
          itemId: 'd2-callflow',
          type: 'deck',
          title: 'Call Flow & Script',
          durationMinutes: 45,
          deck: {
            sourceLink: 'CRT schedule: Call Flow session + demo recordings repository',
            slides: [
              D(1, 'The call flow skeleton', 'Introduction → Lead verification → Purpose → Counsellor role → Rapport → Objections → Demo booking', 'Every audited call is scored against this structure', 'Winning calls follow it in order — structure beats improvisation'),
              D(2, 'Introduction & verification', 'Salutation + name + Infinity Learn, then verify you have the right parent', '"You did something is the reason I am calling" — tie to the test', 'First 20 seconds decide whether you get 5 minutes'),
              D(3, 'Purpose & role of counsellor', 'Purpose: discuss the child\'s test result, not sell', '"We reach 100 students, counsel only a few" — selection frame', 'You are the academic guide, price comes later'),
              D(4, 'Rapport: academic & non-academic', 'Academic: subjects, school, current marks, tuition status', 'Non-academic: child\'s interests — memory anchors for later calls', 'Log everything in LSQ notes — day 4 covers where'),
              D(5, 'Diagnose before pitch', 'Winners ask 2+ discovery questions before any pitch', 'Read the test report WITH the parent, section by section', 'The gap you surface is the product you sell'),
              D(6, 'Objection handling: LAER', 'Listen → Acknowledge → Explore → Respond', 'Never answer an objection you have not explored', 'Financial (52%) and need-time (28%) own your prep time'),
              D(7, 'Demo booking close', 'Assume the demo: offer two slots, not a yes/no', 'Both parents on the demo — say why: decisions happen together', 'Confirm on WhatsApp immediately; no-shows halve without it'),
              D(8, 'What real winning calls sound like', 'Price appears in only 26% of winning first calls', 'Discount is the LAST lever, never the opener', 'Calls that book demos within an hour convert best — strike while warm'),
            ],
            checkpoints: [
              {
                afterPage: 4,
                questions: [
                  Q('Correct order of the call flow?', ['Pitch → Price → Intro', 'Intro → Verify → Purpose → Rapport → Objections → Booking', 'Rapport → Price → Intro', 'Any order works'], 1),
                  Q('LAER means…', ['Listen, Acknowledge, Explore, Respond', 'Lead, Ask, Explain, Repeat', 'Listen, Answer, End, Record', 'Learn, Apply, Execute, Review'], 0),
                ],
              },
            ],
          },
        },
        {
          itemId: 'd2-final',
          type: 'quiz',
          title: 'Day 2 Final Quiz',
          durationMinutes: 15,
          quiz: {
            passPct: 70,
            questions: [
              Q('The 4A test loop is…', ['Aim, Attempt, Analyse, Advance', 'Ask, Answer, Assess, Award', 'Attend, Absorb, Apply, Achieve', 'Aim, Act, Audit, Adjust'], 0),
              Q('#1 real objection by share?', ['Trust issues', 'Financial constraint (52%)', 'Competitor', 'Need time'], 1),
              Q('"We need time to think" — best first move?', ['Hang up politely', 'Explore what specifically they want to think over, then book the demo anyway', 'Offer discount immediately', 'Call back in a month'], 1),
              Q('Demo slot offer should be…', ['"Do you want a demo?"', 'Two concrete slots to choose from', 'Email them a link', 'After payment'], 1),
              Q('Price appears in what share of winning first calls?', ['26%', '56%', '86%', '100%'], 0),
              Q('Math Champ is the right first pitch when…', ['Budget is tight / parent hesitant', 'Child is a NEET dropper', 'Parent demands IIT coaching', 'Never'], 0),
            ],
          },
        },
      ],
    },

    // ── DAY 3 ─────────────────────────────────────────────────────────
    {
      day: 3,
      title: 'Test Prep Foundation & Demo Conduction',
      summary: 'The second product line, whiteboard illustration, and how a virtual demo is conducted.',
      items: [
        {
          itemId: 'd3-testprep',
          type: 'deck',
          title: 'Product: Test Prep Foundation',
          durationMinutes: 40,
          deck: {
            sourceLink: 'SharePoint: Test Prep Foundation PPT',
            slides: [
              D(1, 'Why Test Prep Foundation?', 'For exam-facing students: boards + JEE/NEET foundation (grades 9-12)', 'Same LPDT methodology, exam-calendar intensity', 'Highest-ticket segment: avg price pitched ₹15k+, 85% financed'),
              D(2, 'Batch details', 'Exam-aligned batches with test series at core', 'Structure: live classes + weekly major/minor tests + analysis sessions', 'USP: rank prediction and All-India benchmark'),
              D(3, 'Price structure & reckoner', 'Higher ticket than Foundation — EMI translation is mandatory', 'Multi-year lock-in discounts for grade 9-10 entries', 'Use the reckoner; never quote from memory'),
              D(4, 'CBSE Foundation vs Test Prep', 'Foundation: depth + Olympiad, grades 1-8, school-plus', 'Test Prep: exam outcome focus, grades 9-12, calendar urgency', 'Wrong pitch to wrong grade = lost trust — check grade FIRST'),
              D(5, 'Objections specific to Test Prep', '"Already in coaching" is 7%+ here (vs 3% in early grades)', 'Displace with test analytics + faculty, never by rubbishing', 'Board-year stress: position as consolidation, not more load'),
              D(6, 'The Test Prep 60-second pitch', 'Exam calendar → current level (test report) → gap to target → weekly test engine → EMI → demo', 'Urgency is REAL here — use dates honestly', 'Both parents + student on the demo for grade 11-12'),
            ],
            checkpoints: [
              {
                afterPage: 3,
                questions: [
                  Q('Test Prep Foundation targets which grades?', ['1-5', '6-8', '9-12', 'Droppers only'], 2),
                  Q('What % of board-year sales are financed?', ['25%', '55%', '85%', '100%'], 2),
                ],
              },
            ],
          },
        },
        {
          itemId: 'd3-conduction',
          type: 'deck',
          title: 'Demo Conduction & Whiteboard Illustration',
          durationMinutes: 45,
          deck: {
            sourceLink: 'CRT schedule: Illustration slides + Conduction training + demo repository',
            slides: [
              D(1, 'Mindset: what a virtual demo is', 'The demo is the product experience — not a sales meeting', 'Real data: 90+ minute demos close at 21.5%; short demos die', 'Your job: keep the family engaged past the 90-minute mark'),
              D(2, 'Conduction structure', 'Introduction → Agenda setting → Credibility (self + IL) → Rapport → Whiteboard teaching → Assessment → Next steps', 'Agenda setting up front doubles completion', 'Parents judge the teacher in the first 10 minutes'),
              D(3, 'Whiteboard basics', 'One concept, taught live, at the child\'s level — from the illustration slides', 'Write big, talk while writing, ask the child to try', 'Hands-on practice today: 30 minutes on the whiteboard'),
              D(4, 'Illustration technique', 'Pick the topic from the child\'s WEAK section in the test report', 'Show the "aha": child solves something they could not before', 'That moment — not your pitch — is what converts'),
              D(5, 'Engaging both parents', '18.6% of demos have both parents — those close above average', 'Address father and mother by name; assign them roles', 'Check-in questions every 10 minutes: "does this match what you see at home?"',),
              D(6, 'Demo → close bridge', 'Recap the gap → show the weekly plan → THEN price with EMI', 'Discount only as the last lever, 2/3 through the close', 'If "need time": book the follow-up call before leaving the meet'),
            ],
            checkpoints: [
              {
                afterPage: 3,
                questions: [
                  Q('What closes at 21.5% in real data?', ['Any demo', 'Demos running 90+ minutes', 'Demos under 30 minutes', 'Calls without demos'], 1),
                  Q('The whiteboard topic should come from…', ['Trainer\'s favourite topic', 'The child\'s weakest test-report section', 'Random NCERT page', 'Parent\'s job field'], 1),
                ],
              },
            ],
          },
        },
        {
          itemId: 'd3-final',
          type: 'quiz',
          title: 'Day 3 Final Quiz',
          durationMinutes: 15,
          quiz: {
            passPct: 70,
            questions: [
              Q('Foundation vs Test Prep — the key difference is…', ['Price only', 'Grades 1-8 school-plus depth vs grades 9-12 exam-outcome focus', 'Faculty', 'App used'], 1),
              Q('"Already enrolled in coaching" is strongest in which segment?', ['Grade 1-5', 'Premium-school / board-year parents', 'All equally', 'None'], 1),
              Q('Correct conduction order?', ['Whiteboard → Intro → Price', 'Intro → Agenda → Credibility → Rapport → Whiteboard → Assessment → Next steps', 'Price → Demo → Rapport', 'Any order'], 1),
              Q('The conversion moment in a demo is…', ['The discount reveal', 'The child\'s "aha" on the whiteboard', 'The company intro', 'The closing pressure'], 1),
              Q('When does discount enter a winning close?', ['First minute', 'Never', 'As the last lever, late in the close', 'Before the demo'], 2),
            ],
          },
        },
      ],
    },

    // ── DAY 4 ─────────────────────────────────────────────────────────
    {
      day: 4,
      title: 'LSQ, Student Portal & Post-Sales',
      summary: 'The systems you live in: LeadSquared discipline, the portal in demos, and what happens after payment.',
      items: [
        {
          itemId: 'd4-lsq',
          type: 'deck',
          title: 'LSQ: Mindset & Hands-On',
          durationMinutes: 45,
          deck: {
            sourceLink: 'SharePoint: LSQ PPT + Next Gen login app-in21.leadsquared.com',
            slides: [
              D(1, 'Why LSQ discipline matters', 'If it is not in LSQ, it did not happen — audits and incentives read LSQ', 'Your future self needs today\'s notes on every follow-up call', 'Analytics that route you leads run entirely on your logging'),
              D(2, 'The lead lifecycle', 'New → Contacted → Demo booked → Demo done → Negotiation → Closed/Won or Not Interested', 'Every disposition MUST carry the correct reason', 'The 5 real non-closure reasons: financial, need-time, trust, family, competitor'),
              D(3, 'Activities you log', 'Outbound call outcomes (auto via dialer) + your notes', 'Demo Booking activity with date/slot', 'Demo Conducted with outcome + product pitched + price pitched'),
              D(4, 'Follow-ups & tasks', 'Every "need time" gets a task with date + context note', 'Call within the promised window — trust dies on missed callbacks', 'Morning ritual: clear today\'s tasks before new dials'),
              D(5, 'Hygiene rules', 'Correct stage, correct reason, same day', 'No fake dispositions — audits sample recordings against LSQ', 'Password: app-in21.leadsquared.com — reset flow covered today'),
              D(6, 'Scenario drill', 'Parent answered, engaged, wants Saturday demo → which activities?', 'Demo done, "will discuss with family" → stage + task + note', 'These exact scenarios are in your quiz'),
            ],
            checkpoints: [
              {
                afterPage: 3,
                questions: [
                  Q('A demo happened but is not in LSQ. In audit terms…', ['It happened', 'It did not happen', 'TM will assume it', 'No impact'], 1),
                  Q('"Will discuss with family" maps to which real reason?', ['financial_constraint', 'family_consultation', 'competitor_locked', 'trust_deficit'], 1),
                ],
              },
            ],
          },
        },
        {
          itemId: 'd4-portal',
          type: 'deck',
          title: 'Student Portal in Counselling',
          durationMinutes: 20,
          deck: {
            sourceLink: 'student.infinitylearn.com',
            slides: [
              D(1, 'Portal in the counselling session', 'Show, don\'t tell: open the portal live in every demo', 'Child\'s own test report → analytics → class schedule', 'A parent who has SEEN the product objects less on trust'),
              D(2, 'Subscription page & price display', 'Know where prices display and how packages render', 'Walk the parent to it — transparency builds the close', 'Never let a parent discover a price you did not mention'),
              D(3, 'Common portal questions', 'Login issues → reset flow, escalate to CS if stuck', 'Where recordings live, where doubts are asked', 'You are the parent\'s first tech support in week 1'),
            ],
            checkpoints: [
              {
                afterPage: 2,
                questions: [
                  Q('Why open the portal live in a demo?', ['To fill time', 'Seeing the product reduces trust objections', 'It is optional decoration', 'To show ads'], 1),
                ],
              },
            ],
          },
        },
        {
          itemId: 'd4-postsales',
          type: 'deck',
          title: 'Post-Sales, Plutus & Escalations',
          durationMinutes: 30,
          deck: {
            sourceLink: 'CRT schedule: CS POC session + OMS/Bajaj process',
            slides: [
              D(1, 'What happens after payment', 'OMS order → onboarding class → batch allocation', 'Your job does not end at payment — first-week experience decides refunds', 'CS owns post-sales, but the parent still calls YOU'),
              D(2, 'The Bajaj process', 'EMI: eligibility check → OTP consent → down payment → activation', '75.6% of deals are financed — know this flow cold', 'Fibe and credit-card EMI as fallbacks; ShopSe exists'),
              D(3, 'Plutus & payment reconciliation', 'Customer number in Plutus must match LSQ — sale punch needs it', 'Wrong/missing Plutus number = incentive disputes', 'Double-check before punching the sale'),
              D(4, 'Escalation paths', 'Refund/class issues → regional CS POC (directory in repository)', 'Payment stuck → sales enablement + CS, same day', 'Never promise timelines CS has not confirmed'),
            ],
            checkpoints: [
              {
                afterPage: 2,
                questions: [
                  Q('EMI consent in the Bajaj flow is captured via…', ['Email', 'OTP', 'Paper form', 'Verbal'], 1),
                  Q('What share of real deals are financed?', ['1 in 10', '1 in 4', '3 in 4', 'All'], 2),
                ],
              },
            ],
          },
        },
        {
          itemId: 'd4-final',
          type: 'quiz',
          title: 'Day 4 Final Quiz',
          durationMinutes: 15,
          quiz: {
            passPct: 70,
            questions: [
              Q('Audits and incentives are read from…', ['Your memory', 'WhatsApp', 'LSQ', 'Email'], 2),
              Q('Every "need time" disposition must also create…', ['Nothing', 'A dated follow-up task with a context note', 'A discount', 'An email'], 1),
              Q('Parent objects on trust during counselling. Best portal move?', ['Avoid the portal', 'Open it live: their child\'s report + analytics', 'Send screenshots later', 'Change topic'], 1),
              Q('Sale punch requires matching customer number in…', ['Plutus', 'WhatsApp', 'Excel', 'Google Forms'], 0),
              Q('Who owns post-sales, and who does the parent still call?', ['CS owns it; parent still calls the AC', 'AC owns it alone', 'Nobody', 'Trainer'], 0),
            ],
          },
        },
      ],
    },

    // ── DAY 5 ─────────────────────────────────────────────────────────
    {
      day: 5,
      title: 'Live Calling & Certification',
      summary: 'Real leads, a live class, and your CRT certification quiz.',
      items: [
        {
          itemId: 'd5-briefing',
          type: 'deck',
          title: 'Go-Live Briefing',
          durationMinutes: 15,
          deck: {
            sourceLink: 'CRT schedule: Day 5',
            slides: [
              D(1, 'Today you go live', 'Leads are distributed — your first real dials happen today', 'TM audits your calls live and gives same-day feedback', 'Target today: connects and demo bookings, not sales'),
              D(2, 'Live class immersion', 'Join a real live class (12:30-1:30) — feel what you sell', 'Note 3 things you will quote to parents from inside the class', 'Etiquette: camera presence, name format, mute discipline'),
              D(3, 'Your safety net', 'Script card + reckoner + LSQ open before every dial', 'Stuck mid-call? Book the demo and note the open question', 'Every uncertainty goes to your TM the same day — no guessing with parents'),
            ],
            checkpoints: [
              {
                afterPage: 2,
                questions: [
                  Q('Today\'s target metric is…', ['Revenue', 'Connects and demo bookings', 'Talk time only', 'Sales'], 1),
                ],
              },
            ],
          },
        },
        {
          itemId: 'd5-cert',
          type: 'quiz',
          title: 'CRT Certification Quiz',
          durationMinutes: 20,
          quiz: {
            passPct: 80,
            questions: [
              Q('The winning call structure is…', ['Pitch → price → demo', 'Report anchor → diagnose → pitch → price late → discount last → demo', 'Discount → demo → price', 'Improvise'], 1),
              Q('86% of your funnel is…', ['NEET droppers', 'Parents of grades 1-8 (Foundation/Aptitude)', 'Grade 12 JEE', 'Teachers'], 1),
              Q('Top two real objections, in order?', ['Trust, competitor', 'Financial (52%), need-time (28%)', 'Need-time, trust', 'Competitor, family'], 1),
              Q('The single strongest conversion lever in the funnel is…', ['Discount size', 'Demo length past 90 minutes', 'Call count', 'Script speed'], 1),
              Q('EMI translation is mandatory because…', ['Policy says so', '3 of 4 real purchases are financed', 'It sounds nice', 'Parents ask'], 1),
              Q('LSQ rule of survival:', ['Log weekly', 'If it is not in LSQ, it did not happen', 'Notes optional', 'Only wins get logged'], 1),
              Q('In a demo, conversion happens at…', ['Company intro', 'The child\'s whiteboard "aha" moment', 'Price reveal', 'Goodbye'], 1),
              Q('After CRT you enter…', ['Vacation', 'OJT with TM audits and live coaching', 'M2 directly', 'Solo work, no audits'], 1),
            ],
          },
        },
      ],
    },
  ],
};
