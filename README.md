# VYBE — College Event Platform

A full-stack college event platform with AI-powered recommendations and a chatbot assistant (Vix).

## Live URLs

- **Frontend:** https://vybe-app-lemon-beta.vercel.app
- **Backend API:** https://vybe-backend-0qa7.onrender.com
- **AI Service:** https://vybe-ai-jybe.onrender.com
- **API Docs (Swagger UI):** https://vybe-backend-0qa7.onrender.com/api-docs

## Features

### Roles
- **Member** — browse events, register, track registrations, leave feedback, chat with Vix
- **Organizer** — create/manage events, view registration lists, approve/reject registration requests
- **Authority** — approve/reject events, manage users, view institution-wide analytics

### Core
- JWT authentication with password reset (email via Resend, console fallback for dev)
- Event CRUD with filters, search, tags, categories
- Registration flows (first-come and approval-based) with atomic seat reservation
- Post-event feedback with ratings and distribution stats
- In-app notifications (polling-based, socket.io-ready)
- Cloudinary media uploads (posters + promo videos)
- AI recommendations using sentence-transformers embeddings + cosine similarity
- Vix chatbot grounded in real event data (never hallucinates events)
- Rate limiting on auth and chat endpoints
- Role-based access control across all modules

## Tech Stack

| Layer | Tech |
|:--|:--|
| Frontend | Vanilla HTML/CSS/JS |
| Backend | Node.js + Express + Mongoose |
| Database | MongoDB Atlas (free tier) |
| AI Service | Python + FastAPI + sentence-transformers |
| LLM | Groq (free tier, optional) |
| Media | Cloudinary (free tier) |
| Auth | JWT (access tokens, 7-day expiry) |
| Deployment | Render (backend + AI) + Vercel (frontend) |
| Email | Resend (free tier, optional) |

## Repo Structure
vybe-app/
├── Frontend/ Static site — HTML, CSS, JS
├── Backend/ Node.js + Express API
├── ai-service/ Python FastAPI recommendation + chat service
└── README.md

## Backend API Reference

Base URL: `https://vybe-backend-0qa7.onrender.com`

All authenticated endpoints expect `Authorization: Bearer <token>`.

### Auth (`/api/auth`)
| Method | Endpoint | Auth | Description |
|:--|:--|:--|:--|
| POST | `/register` | — | Create account (member/organizer/authority) |
| POST | `/login` | — | Login with email + password |
| GET | `/me` | JWT | Current user profile |
| POST | `/forgot-password` | — | Request password reset link (rate-limited 3/hr) |
| POST | `/reset-password/:token` | — | Reset password with token from email |

### Users (`/api/users`)
| Method | Endpoint | Auth | Description |
|:--|:--|:--|:--|
| GET | `/me` | JWT | Get full profile |
| PATCH | `/me` | JWT | Update name/phone/course/year |
| PATCH | `/me/interests` | JWT | Update interests + goals |
| PATCH | `/me/onboarding` | JWT | Mark onboarding complete |
| PATCH | `/me/password` | JWT | Change password (requires current) |
| GET | `/:id` | — | Public profile (hides email/phone) |
| DELETE | `/me` | JWT | Delete own account |

### Events (`/api/events`)
| Method | Endpoint | Auth | Description |
|:--|:--|:--|:--|
| GET | `/` | — | List approved events (`?category=&tags=&search=&when=&mode=&limit=&skip=`) |
| GET | `/recommended` | JWT | Personalized feed with real similarity scores |
| GET | `/:id` | — | Event detail |
| POST | `/` | Organizer/Authority | Create event (starts as pending) |
| PATCH | `/:id` | Owner/Authority | Edit event |
| DELETE | `/:id` | Owner/Authority | Delete event |
| POST | `/:id/media` | Organizer/Authority | Upload image/video to Cloudinary |
| DELETE | `/:id/media/:mediaId` | Organizer/Authority | Delete media item |

### Registrations (`/api/registrations`)
| Method | Endpoint | Auth | Description |
|:--|:--|:--|:--|
| POST | `/:eventId` | JWT | Register for event |
| DELETE | `/:eventId` | JWT | Cancel own registration |
| GET | `/me` | JWT | My registrations (`?status=`) |
| GET | `/me/:eventId` | JWT | Am I registered for this event? |
| GET | `/event/:eventId` | Organizer/Authority | List registrations for an event |
| PATCH | `/:id/status` | Organizer/Authority | Approve/reject pending registration |

### Organizer (`/api/organizer`)
| Method | Endpoint | Auth | Description |
|:--|:--|:--|:--|
| GET | `/stats` | Organizer | Dashboard counts (events + registrations) |
| GET | `/events` | Organizer | My events (`?status=&when=&category=`) |
| GET | `/upcoming` | Organizer | Next N upcoming (`?limit=`) |
| GET | `/events/:id` | Organizer | Event + registration summary |
| GET | `/events/:id/registrations` | Organizer | Full registrations list |
| PATCH | `/events/:id/cancel` | Organizer | Soft-cancel event with reason |

### Authority (`/api/authority`)
| Method | Endpoint | Auth | Description |
|:--|:--|:--|:--|
| GET | `/stats` | Authority | Institution-wide stats |
| GET | `/pending` | Authority | Events awaiting review |
| GET | `/events` | Authority | All institution events |
| GET | `/events/:id` | Authority | Event + review + registration summary |
| PATCH | `/events/:id/approve` | Authority | One-click approve |
| PATCH | `/events/:id/reject` | Authority | Reject with required reason |
| POST | `/events/:id/review` | Authority | Detailed checklist review |
| GET | `/reviews` | Authority | Review audit log |
| GET | `/users` | Authority | Institution users |
| PATCH | `/users/:id/role` | Authority | Change user role (with lockout guards) |

### Feedback (`/api/feedback`)
| Method | Endpoint | Auth | Description |
|:--|:--|:--|:--|
| POST | `/:eventId` | JWT (attended) | Submit feedback (1 per event, past events only) |
| GET | `/event/:eventId` | — | Public feedback + summary + distribution |
| GET | `/me` | JWT | My submitted feedback |
| GET | `/me/:eventId` | JWT | Did I already review this? |
| GET | `/organizer/summary` | Organizer | Aggregate ratings across events |
| DELETE | `/:id` | Owner/Authority | Delete feedback |

### Notifications (`/api/notifications`)
| Method | Endpoint | Auth | Description |
|:--|:--|:--|:--|
| GET | `/` | JWT | List notifications (`?read=&type=`) |
| GET | `/unread-count` | JWT | Badge count |
| PATCH | `/read-all` | JWT | Mark all as read |
| PATCH | `/:id/read` | JWT | Mark one as read |
| DELETE | `/read` | JWT | Clear all read notifications |
| DELETE | `/:id` | JWT | Delete one |

### Chat (`/api/chat`)
| Method | Endpoint | Auth | Description |
|:--|:--|:--|:--|
| POST | `/` | JWT | Chat with Vix — grounded in real events |

## AI Service Reference

Base URL: `https://vybe-ai-jybe.onrender.com`

| Method | Endpoint | Description |
|:--|:--|:--|
| GET | `/health` | Health check |
| POST | `/recommend` | Rank events by cosine similarity to user interests |
| POST | `/chat` | Generate a grounded reply with recommended events |

**Model:** `sentence-transformers/all-MiniLM-L6-v2` (~80 MB, CPU-only torch).
Falls back gracefully if the LLM API key isn't set — still returns grounded recommendations.

## Deployment

| Service | Provider | Free tier |
|:--|:--|:--|
| Frontend | Vercel | Yes (auto-deploy on push to `main`) |
| Backend | Render | Yes (spins down after 15 min idle) |
| AI Service | Render | Yes (spins down, ~90 sec cold start) |
| Database | MongoDB Atlas | M0, 512 MB, no card |
| Media | Cloudinary | 25 GB storage + 25 GB bandwidth/month |

**Cold start note:** Free Render services sleep after 15 minutes of inactivity. First request takes 30–60 seconds. Hit `/health` two minutes before a demo to warm it up.

## Local Setup

### Prerequisites
- Node.js 18+
- Python 3.11
- MongoDB Atlas account (free tier)
- Cloudinary account (free tier, optional for media uploads)

### 1. Backend

```bash
cd Backend
cp .env.example .env       # fill in MONGODB_URI, JWT_SECRET, and CLOUDINARY_*
npm install
npm run seed               # loads sample data + 3 test users
npm run dev                # http://localhost:5000

2. AI Service
cd ai-service
python -m venv venv

# Activate:
#   Windows: .\venv\Scripts\Activate.ps1
#   Mac/Linux: source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env       # GROQ_API_KEY is optional
uvicorn app:app --reload --port 8000

3. Frontend
Open Frontend/index.html in a browser, or use VS Code Live Server.

Make sure Frontend/js/api.js points at the correct backend URL:
const API_BASE_URL = "https://vybe-backend-0qa7.onrender.com/api";
Sample Logins (after seeding)
Password for all: password123

Role	Email
Member	student@mit.edu
Organizer	organizer@mit.edu
Authority	authority@mit.edu
Environment Variables
Backend/.env
env
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb+srv://...

# Auth
JWT_SECRET=your_long_random_string
JWT_EXPIRES_IN=7d

# CORS (comma-separated)
CLIENT_ORIGINS=http://localhost:5500,https://vybe-app-lemon-beta.vercel.app

# AI Service
AI_SERVICE_URL=http://localhost:8000

# Cloudinary (optional — media upload)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Password Reset
FRONTEND_URL=http://localhost:5500
RESET_TOKEN_EXPIRES_MINUTES=60

# Email via Resend (optional — falls back to console log)
RESEND_API_KEY=
RESEND_FROM_EMAIL=onboarding@resend.dev
ai-service/.env
env
PORT=8000
GROQ_API_KEY=              # optional — service works without it
Quick End-to-End Test
bash
# Health checks
curl https://vybe-backend-0qa7.onrender.com/health
curl https://vybe-ai-jybe.onrender.com/health

# Login
curl -X POST https://vybe-backend-0qa7.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@mit.edu","password":"password123"}'

# Use the returned token to fetch recommendations
curl https://vybe-backend-0qa7.onrender.com/api/events/recommended \
  -H "Authorization: Bearer <token>"

# Chat with Vix
curl -X POST https://vybe-backend-0qa7.onrender.com/api/chat \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"message":"what should I do this weekend?"}'
Team
Ishta — Backend + AI service

Radhika — Frontend

Maitrayee — Frontend

License
Educational project. Not licensed for commercial use.

text

### Step 2: Save

**Ctrl+S** in VS Code.

### Step 3: Verify the file was saved

```powershell
cd C:\Users\nisha\Downloads\vybe-backend-and-ai-service\12_Vybe
Get-Content README.md -TotalCount 5
Expected first 5 lines:

text
# VYBE — College Event Platform

A full-stack college event platform with AI-powered recommendations and a chatbot assistant (Vix).




