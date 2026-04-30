# 🎓 SmartClass - Virtual Classroom Platform

A comprehensive full-stack web application for virtual learning with real-time collaboration, interactive teaching tools, and AI-assisted features built with the MERN stack.

---

## ✨ Features

### 👨‍🏫 For Teachers
- **Live Teaching Canvas**: Draw and write in real-time with speech-to-text support
- **Multi-Page Notes**: Create multiple pages with drawing and text content
- **Real-Time Broadcasting**: Stream canvas to all students instantly via Socket.io
- **Assignment Management**: Create, assign, and grade student submissions
- **File Upload Support**: Accept PDF, DOC, DOCX, TXT, ZIP files from students
- **Announcements Board**: Post updates and important notices
- **AI Chat Assistant**: Get help answering student questions
- **Doubt Resolution**: Respond to student questions in dedicated chatrooms
- **Feedback Management**: Receive and manage student feedback
- **Study Materials**: Upload and share class notes (PDFs, documents)

### 👨‍🎓 For Students
- **Live Class Viewer**: Watch teacher's canvas in real-time
- **Practice Canvas**: Personal drawing space with speech-to-text
- **Assignment Submission**: Upload assignments with file support
- **Status Tracking**: See submission status and grades
- **AI Chat Assistant**: Get instant help with homework
- **Text Generators**: Generate essays, notes, and explanations
- **Document Quiz Tool**: Upload documents to create practice quizzes
- **Doubt Chat**: Ask questions and chat with teachers
- **Feedback System**: Send feedback to teachers
- **Announcements**: Stay updated with class notifications

### 🤖 AI Features (Groq Integration)
- **AI Chat Assistant**: Context-aware responses for educational queries
- **Essay Generator**: Auto-generate structured essays on any topic
- **Study Notes Creator**: Generate organized study notes
- **Concept Explainer**: Get simple or detailed explanations
- **Practice Questions**: Auto-generate practice problems
- **Document Processing**: Upload PDFs/DOCX for AI analysis
- **Quiz Generation**: Create quizzes from uploaded documents

> **Note**: AI features use a combination of Groq API (for chat) and local knowledge base/algorithms (for document processing and text generation). Some features may have pre-loaded responses.

---

## 🛠️ Tech Stack

### Frontend
- **React 18** with Vite
- **Tailwind CSS** for styling
- **React Konva** for canvas drawing
- **Socket.io Client** for real-time updates
- **Axios** for API requests
- **Lucide React** for icons
- **jsPDF** for PDF export

### Backend
- **Node.js** + **Express**
- **MongoDB** with Mongoose
- **Socket.io** for WebSockets
- **Multer** for file uploads
- **bcryptjs** for password hashing
- **Groq API** for AI chat
- **Natural NLP** for text processing
- **PDF-Parse** & **Mammoth** for document reading

---

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **MongoDB** (local or Atlas) - [Download](https://www.mongodb.com/try/download/community)
- **Groq API Key** (optional for AI chat) - [Get Key](https://console.groq.com/keys)

---

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/smartclass.git
cd smartclass
```

### 2. Install Backend Dependencies

```bash
cd server
npm install
```

### 3. Install Frontend Dependencies

```bash
cd ../client
npm install
```

### 4. Environment Setup

Create a `.env` file in the **backend** folder:

```env
# MongoDB Connection
MONGO_URI=mongodb://localhost:27017/smartclass

# Server Port
PORT=5000

# Groq API Key (Optional - for AI chat)
GROQ_API_KEY=your_groq_api_key_here
```

**Getting MongoDB URI:**
- **Local MongoDB**: `mongodb://localhost:27017/smartclass`
- **MongoDB Atlas**: Get connection string from Atlas dashboard

**Getting Groq API Key:**
1. Visit [Groq Console](https://console.groq.com/keys)
2. Sign in with Google account
3. Click "Create API Key"
4. Copy and paste into `.env`

---

## 🎮 Running the Application

### Start Backend Server

```bash
cd server
npm start
```

Server runs on: `http://localhost:5000`

### Start Frontend Development Server

```bash
cd client
npm run dev
```

Frontend runs on: `http://localhost:5174`

---

## 📂 Project Structure

```
smartclass/
├── server/
│   ├── server.js              # Main server file
│   ├── uploads/               # Uploaded files storage
│   ├── package.json
│   └── .env                   # Environment variables
│
├── client/
│   ├── src/
│   │   ├── components/        # React components
│   │   │   ├── AIChatAssistant.jsx
│   │   │   ├── DrawingCanvas.jsx
│   │   │   ├── PracticeCanvas.jsx
│   │   │   ├── AssignmentsManager.jsx
│   │   │   ├── Announcements.jsx
│   │   │   ├── Chatroom.jsx
│   │   │   ├── Feedback.jsx
│   │   │   ├── ClassNotesViewer.jsx
│   │   │   ├── TextGenerator.jsx
│   │   │   ├── DocumentQuizGenerator.jsx
│   │   │   └── Sidebar.jsx
│   │   ├── Dashboards/
│   │   │   ├── StudentDashboard.jsx
│   │   │   └── TeacherDashboard.jsx
│   │   ├── Auth/
│   │   │   ├── Login.jsx
│   │   │   └── Signup.jsx
│   │   ├── services/
│   │   │   ├── api.js         # API calls
│   │   │   └── socket.js      # Socket.io config
│   │   ├── MainApp.jsx
│   │   └── main.jsx
│   └── package.json
│
└── README.md
```

---

## 🎯 Usage Guide

### First Time Setup

1. **Sign Up**
   - Open `http://localhost:5174`
   - Click "Sign Up"
   - Choose role: **Student** or **Teacher**
   - Enter name, email, password
   - Click "Sign Up"

2. **Login**
   - Use registered email and password
   - Access role-specific dashboard

---

### 👨‍🏫 Teacher Workflow

#### 1. Start Live Class
- Navigate to "Teaching Canvas"
- Click **"Go Live"** button (turns red)
- Use drawing tools:
  - **Brush**: Draw freehand
  - **Eraser**: Remove drawings
  - **Text**: Add text annotations
  - **Speech-to-Text**: Click mic icon to dictate
- Students see your canvas in real-time

#### 2. Create Assignment
- Go to "Assignments" tab
- Click "Create New Assignment"
- Fill in:
  - Title
  - Description
  - Start Date
  - Due Date
- Click "Create Assignment"

#### 3. Grade Submissions
- Click "View Submissions" on any assignment
- Review student uploads
- Enter grade and feedback
- Click "Save Grade"

#### 4. Post Announcements
- Go to "Announcements"
- Type message
- Press Ctrl+Enter or click "Send"

---

### 👨‍🎓 Student Workflow

#### 1. Join Live Class
- Click "Live Class" in sidebar
- Watch teacher's canvas in real-time
- Take notes on "Practice Canvas"

#### 2. Submit Assignment
- Go to "Assignments"
- Find pending assignment
- Click "Upload Assignment"
- Select file (PDF, DOC, DOCX, TXT, ZIP - max 10MB)
- Click "Submit"
- See submission status and grade

#### 3. Use AI Chat Assistant
- Click "AI Assistant"
- Type question: *"What is photosynthesis?"*
- Get instant AI response
- Chat history is saved

#### 4. Ask Doubts
- Go to "Doubt Chat"
- Fill in subject and question
- Click "Post Doubt"
- Teacher responds in dedicated chatroom

#### 5. Generate Study Materials
- **Text Generator**:
  - Select: Essay / Notes / Explanation / Questions
  - Enter topic
  - Click "Generate"
  - Download or copy result

- **Document Quiz**:
  - Upload PDF/DOCX
  - Get auto-generated summary and quiz
  - Take quiz and see results

---

## 🤖 AI Features Details

### AI Chat Assistant
```
Example Prompts:
- "Explain photosynthesis"
- "What is a quadratic equation?"
- "How do variables work in JavaScript?"
```

**Current Implementation**: Uses Groq API for conversational responses.

### Text Generator
- **Essay**: Generates 400-600 word essays
- **Study Notes**: Creates organized notes with key points
- **Explain**: Simple or detailed explanations
- **Practice Questions**: Generates 5-10 practice problems

**Current Implementation**: Uses pre-loaded knowledge base with pattern matching.

### Document Quiz Generator
- Upload: PDF, DOCX, TXT
- Output: Summary, key points, and quiz questions

**Current Implementation**: Uses text extraction and rule-based quiz generation.

---

## 🔧 API Endpoints

### Authentication
- `POST /auth/signup` - Register new user
- `POST /auth/login` - User login
- `PUT /auth/profile/:userId` - Update profile

### Assignments
- `GET /assignments` - Get all assignments
- `POST /assignments` - Create assignment (teacher)
- `DELETE /assignments/:id` - Delete assignment (teacher)
- `GET /assignments/:id/submissions` - Get submissions (teacher)
- `POST /assignments/:id/submit` - Submit assignment (student)
- `PUT /submissions/:id/grade` - Grade submission (teacher)

### AI Features
- `POST /ai/chat` - AI chat assistant
- `GET /ai/chat/history/:userId` - Get chat history
- `POST /ai/process-document` - Process PDF/DOCX
- `GET /ai/quizzes` - Get all quizzes
- `POST /ai/essay` - Generate essay
- `POST /ai/notes` - Generate notes
- `POST /ai/explain` - Explain concept
- `POST /ai/practice-questions` - Generate questions

### Announcements
- `GET /announcements` - Get all announcements
- `POST /announcements` - Create announcement
- `DELETE /announcements/:id` - Delete announcement

### Notes
- `GET /notes` - Get all class notes
- `POST /notes` - Upload note (teacher)
- `DELETE /notes/:id` - Delete note (teacher)

### Real-time Events (Socket.io)
- `canvas-live-update` - Broadcast canvas changes
- `new-message` - Chatroom messages
- `new-assignment` - Assignment notifications
- `new-feedback` - Feedback alerts
- `new-announcement` - Announcement broadcast

---

## 🐛 Troubleshooting

### MongoDB Connection Error
```bash
# Check if MongoDB is running
mongod --version

# Start MongoDB
# Windows: net start MongoDB
# Mac: brew services start mongodb-community
# Linux: sudo systemctl start mongod
```

### Port Already in Use
```bash
# Change PORT in backend/.env
PORT=3000
```

### File Upload Fails
- Check `backend/uploads/` folder exists
- Verify file size < 10MB
- Allowed formats: PDF, DOC, DOCX, TXT, ZIP, RAR

### AI Chat Not Working
- Verify `GROQ_API_KEY` in `.env`
- Check API quota at [Groq Console](https://console.groq.com)
- AI chat requires valid Groq API key

### Frontend Can't Connect
- Check backend is running on port 5000
- Check CORS settings allow `http://localhost:5174`
- Verify Socket.io connection in browser console

---

## 🚀 Deployment

### Backend (Railway/Render/Heroku)
1. Create new project
2. Connect GitHub repository
3. Add environment variables:
   - `MONGO_URI`
   - `GROQ_API_KEY`
   - `PORT`
4. Deploy from main branch

### Frontend (Vercel/Netlify)
1. Connect GitHub repository
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Update API URLs in `frontend/src/services/api.js`:
```javascript
const BASE_URL = "https://your-backend-url.com";
```

---

## 📊 Features Status

| Feature | Status | Notes |
|---------|--------|-------|
| Live Canvas | ✅ Working | Real-time via Socket.io |
| Assignments | ✅ Working | Full CRUD + grading |
| File Upload | ✅ Working | 10MB limit |
| AI Chat | ❌ Not Working | Requires Groq API key(Not connected) |
| Text Generator | ⚠️ Partial | Uses local knowledge base |
| Document Quiz | ⚠️ Partial | Rule-based generation |
| Announcements | ✅ Working | Real-time updates |
| Doubt Chat | ✅ Working | Real-time messaging |
| Feedback | ✅ Working | Teacher notifications |

---

## 🔮 Future Enhancements

- [ ] Video conferencing integration (Zoom/Meet API)
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Attendance tracking
- [ ] Grade book and report cards
- [ ] Parent portal
- [ ] Calendar integration
- [ ] Push notifications
- [ ] Multi-language support

---

## 👨‍💻 Author

**Kiran T**
- GitHub: [@kiran162005](https://github.com/kiran162005)
- LinkedIn: [Kiran T](linkedin.com/in/kiran-t-30159135a/)

---

## 🙏 Acknowledgments

- [Groq AI](https://groq.com/) for AI capabilities
- [MongoDB](https://www.mongodb.com/) for database
- [Socket.io](https://socket.io/) for real-time features
- [React](https://react.dev/) and [Vite](https://vitejs.dev/) communities
- [Tailwind CSS](https://tailwindcss.com/) for styling

---



⭐ **If you found this project helpful, please star the repository!**
