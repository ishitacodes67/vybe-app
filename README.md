# VYBE — Backend + AI service

Drop these two folders in over your existing empty `Backend/` and `ai-service/`
folders. Nothing in `Frontend/` needs to change yet.

## 1. Backend (Node + Express + MongoDB)

```
cd Backend
cp .env.example .env      # fill in MONGODB_URI and JWT_SECRET at minimum
npm install
npm run seed               # loads sample events + one user per role
npm run dev                 # http://localhost:5000
```

Sample logins after seeding (password for all: `password123`):
- `student@mit.edu` (member)
- `organizer@mit.edu` (organizer)
- `authority@mit.edu` (authority)

## 2. AI service (Python + FastAPI)

```
cd ai-service
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env       # add GROQ_API_KEY once you have one (free, no card)
uvicorn app:app --reload --port 8000
```

Works without a Groq key too — `/chat` falls back to a plain (non-LLM-phrased)
top recommendation so you can build and test the rest of the app first.

## 3. Quick end-to-end test

```
curl http://localhost:5000/health
curl http://localhost:8000/health

curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"student@mit.edu","password":"password123"}'
# copy the returned token, then:

curl http://localhost:5000/api/events/recommended \
  -H "Authorization: Bearer <token>"
```

## What's deliberately not here yet

- `Frontend/js/api.js` still needs to be wired up to call this API instead of
  localStorage — that's the next step once you're happy with the routes.
- Cloudinary media upload endpoints — straightforward to add to `eventRoutes.js`
  once you're ready for photo/video uploads.
- Socket.io — the `Notification` model already has `channel` and `eventName`
  fields ready for it, but the routes just write to Mongo for now (polling).
