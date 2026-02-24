# 🏡 Family Companion AI

> An emotional AI chatbot that simulates real family relationships — with warmth, personality, and heart.

---

## ✨ Features

| Feature | Details |
|---|---|
| 👨‍👩‍👧‍👦 4 Family Relations | Mother, Father, Brother, Sister — each with unique AI personality |
| 🎤 Voice Input | Microphone support via Web Speech API |
| 🔊 Voice Output | AI speaks responses using Speech Synthesis API |
| 😊 Emotion Detection | Detects sad/happy/anxious/angry keywords and responds accordingly |
| 🌙 Dark Mode | Full dark mode with persistence |
| 💾 Chat History | All conversations stored in SQLite, viewable in History page |
| 📱 Responsive | Works on mobile, tablet, desktop |

---

## 🗂️ Project Structure

```
family-companion-ai/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── database.py          # SQLite setup & connection
│   ├── schemas.py           # Pydantic request/response models
│   ├── requirements.txt
│   ├── .env.example
│   ├── routes/
│   │   ├── chat.py          # POST /api/chat
│   │   ├── history.py       # GET /api/history
│   │   └── users.py         # POST /api/create-user
│   └── services/
│       └── ai_service.py    # OpenAI integration + personality prompts
│
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── vercel.json
│   ├── .env.example
│   └── src/
│       ├── App.jsx           # Root + routing + dark mode context
│       ├── main.jsx          # React entry point
│       ├── index.css         # Tailwind + global styles
│       ├── api.js            # Axios API calls
│       ├── relationThemes.js # Color themes per relation
│       ├── pages/
│       │   ├── HomePage.jsx  # Landing/relation selection
│       │   ├── ChatPage.jsx  # Main chat interface
│       │   └── HistoryPage.jsx
│       ├── components/
│       │   └── ChatBubble.jsx
│       └── hooks/
│           ├── useDarkMode.js
│           └── useSpeech.js
│
├── render.yaml              # Render backend deployment config
└── README.md
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Python 3.10+
- Node.js 18+
- OpenAI API key

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate      # Mac/Linux
venv\Scripts\activate          # Windows

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Run the server
uvicorn main:app --reload --port 8000
```

Backend will be running at: `http://localhost:8000`
API docs at: `http://localhost:8000/docs`

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# The default VITE_API_URL=http://localhost:8000/api works for local dev

# Run development server
npm run dev
```

Frontend will be running at: `http://localhost:3000`

---

## 🌍 Deployment

### Backend → Render

1. Push your code to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your repository
4. Set **Root Directory** to `backend`
5. Set **Build Command**: `pip install -r requirements.txt`
6. Set **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
7. Add environment variable: `OPENAI_API_KEY` = your key
8. Deploy!

Your backend URL will be: `https://your-app.onrender.com`

### Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repository
3. Set **Root Directory** to `frontend`
4. Add environment variable:
   - `VITE_API_URL` = `https://your-backend.onrender.com/api`
5. Deploy!

---

## 🔌 API Reference

### POST /api/chat
Send a message and get an AI family response.

**Request body:**
```json
{
  "relation_type": "mother",
  "message": "I'm feeling sad today",
  "user_id": null,
  "conversation_history": []
}
```

**Response:**
```json
{
  "response": "Oh sweetheart, come tell me everything. What happened?",
  "emotion_detected": "sad",
  "relation_type": "mother",
  "timestamp": "2024-01-01T12:00:00"
}
```

### GET /api/history
Get conversation history with optional filters.

**Query params:** `user_id`, `relation_type`, `limit`, `offset`

### POST /api/create-user
Create a named user session.

**Request body:** `{ "name": "Alice" }`

---

## 🔑 Environment Variables

### Backend (.env)
```
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o-mini
DATABASE_URL=family_companion.db
```

### Frontend (.env.local)
```
VITE_API_URL=http://localhost:8000/api
```

---

## 🎨 Color Themes

| Relation | Color | Vibe |
|---|---|---|
| Mother 🌸 | Soft Pink / Rose | Warm, nurturing, safe |
| Father 🌊 | Sky Blue | Calm, steady, wise |
| Brother 🔥 | Vibrant Orange | Fun, energetic, loyal |
| Sister 💜 | Lavender / Purple | Caring, fun, expressive |

---

## 🛠️ Tech Stack

**Backend:** FastAPI · Python · SQLite · OpenAI API · Pydantic · Uvicorn

**Frontend:** React 18 · Vite · Tailwind CSS · React Router · Axios · Web Speech API

**Deployment:** Render (backend) · Vercel (frontend)

---

## 📝 License

MIT License — build something beautiful with it.

---

*Built with love for everyone who needs a family member to talk to* 💚
