# Polly — Real-time Polling Platform (Hackathon Submission)

This repository implements a full-stack polling platform built for the hackathon prompt. It includes a React + Vite frontend and a Node.js + Express backend with MongoDB, and uses Socket.IO for real-time updates.

Project goal
 - Build a full-stack platform where users can create polls, share them via public links, collect single-choice responses, and view analytics. Polls support anonymous or authenticated responses, mandatory/optional questions, expiry times, and publishing final results.

How this app meets the hackathon requirements
- Create & manage polls: authenticated users can create polls with multiple questions and options.
- Single-option questions: each question allows one selected option only (enforced in frontend and backend).
- Mandatory/optional questions: questions can be marked required or optional; validation runs on frontend and backend.
- Anonymous vs authenticated responses: creators choose response mode per poll; authenticated users are prevented from duplicate voting.
- Expiry: polls accept responses only until their `expiresAt` timestamp.
- Public poll links: each poll has a public URL for respondents to submit answers without signing in (unless poll requires authentication).
- Analytics dashboard: creators see totals, per-question summaries, option counts, and recent/top polls; a live "Watch" view shows real-time updates.
- Publish results: creators can publish final results; after publishing the poll page shows the final outcome to any visitor.
- Real-time updates: Socket.IO events broadcast `poll-total-updated`, `option-count-updated`, and `poll-published` for live UI updates.

Tech stack
- Backend: Node.js (ESM), Express, Mongoose (MongoDB), Socket.IO
- Frontend: Vite, React, Tailwind CSS, shadcn-style UI primitives

Local development
1. Backend
	```bash
	cd backend
	pnpm install
	# copy .env from .env.example and set MONGODB_URI, JWT secrets, CLIENT_URL
	pnpm dev    # or `node server.js`
	```

2. Frontend
	```bash
	cd frontend
	pnpm install
	pnpm dev
	```

Environment variables (high level)
- Backend: `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CLIENT_URL`, `PING_URL` (optional)
- Frontend (build): `VITE_API_URL`, `VITE_SOCKET_URL` (set in hosting environment)

Deployment notes
- Backend and frontend can be deployed separately (Render example used). Set `CLIENT_URL` to the frontend origin and `VITE_API_URL`/`VITE_SOCKET_URL` in the frontend build environment.
- A `/health` endpoint and optional pinging are included to help prevent idling on some hosts.

Rules & guidelines (implemented)
- Single-option questions enforced.
- Anonymous and authenticated modes supported.
- Expiry time prevents further responses after expiry.
- Required-question validation on both frontend and backend.
- Creator analytics and publish flow implemented with real-time updates.
- Frontend + backend are included in this single GitHub repo.
