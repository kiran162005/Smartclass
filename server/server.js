import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { createServer } from "http";
import { Server } from "socket.io";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { GoogleGenerativeAI } from "@google/generative-ai";
import natural from 'natural';
import compromise from 'compromise';
import Sentiment from 'sentiment';
import * as pdf from 'pdf-parse';
import mammoth from 'mammoth';

// ========== AI INITIALIZATION ==========
const sentiment = new Sentiment();

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!process.env.GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY missing in .env");
  process.exit(1);
}
const GEMINI_API_KEY = process.env.GEMINI_API_KEY.trim();
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const app = express();
const PORT = process.env.PORT || 5000;
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5174",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

app.use(cors({ origin: "http://localhost:5174", credentials: true }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

if (!fs.existsSync("uploads")) fs.mkdirSync("uploads");

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, "uploads/"),
  filename: (_, file, cb) =>
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${file.originalname}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const allowed = /pdf|doc|docx|txt|zip|rar/;
    const valid = allowed.test(path.extname(file.originalname).toLowerCase());
    if (valid) cb(null, true);
    else cb(new Error("Only PDF, DOC, DOCX, TXT, ZIP, RAR allowed"));
  },
});

mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err.message));

// ================== MODELS ==================
const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  role: { type: String, default: "student" },
});

const announcementSchema = new mongoose.Schema({
  text: String,
  sender: String,
  date: { type: Date, default: Date.now },
  pinned: { type: Boolean, default: false },
});

const assignmentSchema = new mongoose.Schema({
  title: String,
  description: String,
  startDate: Date,
  endDate: Date,
  createdBy: String,
  createdByName: String,
  createdAt: { type: Date, default: Date.now },
});

const submissionSchema = new mongoose.Schema({
  assignmentId: String,
  studentId: String,
  studentName: String,
  submissionText: String,
  fileName: String,
  fileUrl: String,
  fileSize: Number,
  submittedAt: { type: Date, default: Date.now },
  grade: String,
  feedback: String,
});

const feedbackSchema = new mongoose.Schema({
  teacherId: String,
  studentId: String,
  studentName: String,
  text: String,
  timestamp: { type: Date, default: Date.now },
  read: { type: Boolean, default: false },
});

const chatRoomSchema = new mongoose.Schema({
  studentId: String,
  studentName: String,
  question: String,
  subject: String,
  createdAt: { type: Date, default: Date.now },
  status: { type: String, default: "open" },
  messages: [
    {
      userId: String,
      userName: String,
      userRole: String,
      message: String,
      timestamp: { type: Date, default: Date.now },
    },
  ],
});

const noteSchema = new mongoose.Schema({
  title: String,
  description: String,
  fileName: String,
  filePath: String,
  fileUrl: String,
  fileSize: Number,
  uploadedBy: String,
  uploadedByName: String,
  date: { type: Date, default: Date.now },
});

const chatHistorySchema = new mongoose.Schema({
  userId: String,
  userName: String,
  message: String,
  reply: String,
  timestamp: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
const Announcement = mongoose.model("Announcement", announcementSchema);
const Assignment = mongoose.model("Assignment", assignmentSchema);
const Submission = mongoose.model("Submission", submissionSchema);
const Feedback = mongoose.model("Feedback", feedbackSchema);
const ChatRoom = mongoose.model("ChatRoom", chatRoomSchema);
const Note = mongoose.model("Note", noteSchema);
const ChatHistory = mongoose.model("ChatHistory", chatHistorySchema);

// ================== AUTH ==================
app.post("/auth/signup", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (await User.findOne({ email }))
      return res.status(400).json({ message: "User already exists" });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, role });
    res.status(201).json({ user });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(400).json({ message: "Invalid credentials" });
    res.json({ user });
  } catch {
    res.status(500).json({ message: "Server error" });
  }
});

// Update profile
app.put("/auth/profile/:userId", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const update = { name, email };
    if (password) update.password = await bcrypt.hash(password, 10);
    const user = await User.findByIdAndUpdate(req.params.userId, update, { new: true });
    res.json(user);
  } catch {
    res.status(500).json({ message: "Update failed" });
  }
});

// ================== AI CHAT (Gemini) ==================
app.get("/ai/test", async (_, res) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const response = await (await model.generateContent("Say hello")).response;
    res.json({ success: true, testResponse: response.text() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/ai/chat", async (req, res) => {
  try {
    const { message, userId, userName } = req.body;
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const chat = model.startChat({
      history: [
        { role: "user", parts: [{ text: "You are a helpful AI assistant for a classroom." }] },
        { role: "model", parts: [{ text: "Hello! How can I help you today?" }] },
      ],
      generationConfig: { maxOutputTokens: 1000, temperature: 0.7 },
    });
    const result = await chat.sendMessage(message);
    const reply = (await result.response).text();
    await ChatHistory.create({ userId, userName, message, reply });
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: "AI error", details: err.message });
  }
});

app.get("/ai/chat/history/:userId", async (req, res) => {
  try {
    const history = await ChatHistory.find({ userId: req.params.userId })
      .sort({ timestamp: -1 })
      .limit(50);
    res.json(history);
  } catch {
    res.status(500).json({ error: "History fetch error" });
  }
});

app.delete("/ai/chat/history/:userId", async (req, res) => {
  try {
    await ChatHistory.deleteMany({ userId: req.params.userId });
    res.json({ message: "Chat history cleared" });
  } catch {
    res.status(500).json({ error: "Clear failed" });
  }
});


// ========== AI KNOWLEDGE BASE ==========
const aiKnowledge = {
  math: {
    keywords: ['math', 'mathematics', 'equation', 'solve', 'algebra', 'calculus', 'geometry'],
    concepts: {
      'quadratic equation': {
        answer: 'A quadratic equation is in the form ax² + bx + c = 0.\n\n**Methods to solve:**\n1. **Factoring**: Find factors of the equation\n2. **Quadratic Formula**: x = (-b ± √(b²-4ac)) / 2a\n3. **Completing the Square**: Rearrange to perfect square form\n\n**Example:**\nx² + 5x + 6 = 0\nFactoring: (x+2)(x+3) = 0\nSolutions: x = -2 or x = -3',
        related: ['algebra', 'polynomial', 'roots']
      },
      'photosynthesis': {
        answer: '**Photosynthesis** is the process by which plants make food using sunlight.\n\n**Chemical Equation:**\n6CO₂ + 6H₂O + Light Energy → C₆H₁₂O₆ + 6O₂\n\n**Process Steps:**\n1. **Light Absorption**: Chlorophyll captures sunlight\n2. **Water Splitting**: H₂O breaks into hydrogen and oxygen\n3. **CO₂ Fixation**: Carbon dioxide converts to glucose\n\n**Location:** Chloroplasts in plant cells\n\n**Products:**\n- Glucose (C₆H₁₂O₆) - food for plant\n- Oxygen (O₂) - released into atmosphere',
        related: ['biology', 'plants', 'cellular respiration']
      },
      'variable': {
        answer: '**Variables** store data that can change during program execution.\n\n**JavaScript Examples:**\n```javascript\n// Variable declaration\nlet age = 20;          // Can be changed\nconst name = "John";   // Cannot be changed\nvar score = 100;       // Old way (avoid)\n\n// Changing values\nage = 21;              // ✓ Allowed\nname = "Jane";         // ✗ Error - const cannot change\n```\n\n**Python Examples:**\n```python\n# Variable declaration\nage = 20\nname = "John"\nscore = 100.5\n\n# Dynamic typing\nage = "twenty"  # Can change type\n```\n\n**Key Concepts:**\n- Variables are like labeled boxes storing values\n- Choose meaningful names (age, not x)\n- Follow naming conventions (camelCase in JS)',
        related: ['programming', 'data types', 'constants']
      }
    }
  }
};

// ========== AI MODELS ==========
const trainingSchema = new mongoose.Schema({
  topic: String,
  domain: String,
  question: String,
  answer: String,
  keywords: [String],
  createdBy: String,
  createdAt: { type: Date, default: Date.now }
});

const quizSchema = new mongoose.Schema({
  documentName: String,
  questions: [{
    question: String,
    options: [String],
    correctAnswer: String,
    explanation: String
  }],
  summary: String,
  keyPoints: [String],
  generatedAt: { type: Date, default: Date.now }
});

const TrainingData = mongoose.model('TrainingData', trainingSchema);
const Quiz = mongoose.model('Quiz', quizSchema);

// ========== AI HELPER FUNCTIONS ==========

function findAIMatch(userMessage) {
  const messageLower = userMessage.toLowerCase();
  let bestMatch = null;
  let highestScore = 0;
  
  for (const [domain, data] of Object.entries(aiKnowledge)) {
    for (const [concept, info] of Object.entries(data.concepts)) {
      let score = 0;
      if (messageLower.includes(concept.toLowerCase())) score += 10;
      
      concept.split(' ').forEach(word => {
        if (messageLower.includes(word.toLowerCase())) score += 3;
      });
      
      if (score > highestScore) {
        highestScore = score;
        bestMatch = { concept, answer: info.answer, related: info.related };
      }
    }
  }
  
  return { match: bestMatch, confidence: highestScore };
}

async function extractPDFText(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

async function extractDOCXText(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

function createSummary(text) {
  const doc = compromise(text);
  const sentences = doc.sentences().out('array');
  
  const scored = sentences.map(sentence => {
    let score = 0;
    const s = compromise(sentence);
    score += s.nouns().length * 2;
    score += s.verbs().length;
    if (sentence.toLowerCase().includes('important')) score += 3;
    if (sentence.toLowerCase().includes('key')) score += 3;
    return { sentence, score };
  });
  
  return scored.sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(s => s.sentence)
    .join(' ');
}

function createQuiz(text) {
  const doc = compromise(text);
  const sentences = doc.sentences().out('array');
  const questions = [];
  
  sentences.forEach(sentence => {
    if (sentence.length < 30) return;
    
    const s = compromise(sentence);
    const nouns = s.nouns().out('array');
    
    if (nouns.length >= 2) {
      const blank = nouns[0];
      questions.push({
        question: `Fill in the blank: ${sentence.replace(blank, '______')}`,
        options: [blank, 'Option A', 'Option B', 'Option C'].sort(() => Math.random() - 0.5),
        correctAnswer: blank,
        explanation: sentence
      });
    }
    
    if (sentence.length > 50 && sentence.length < 150) {
      questions.push({
        question: `True or False: ${sentence}`,
        options: ['True', 'False'],
        correctAnswer: 'True',
        explanation: 'This statement is from the document.'
      });
    }
  });
  
  return questions.slice(0, 10);
}

// ========== NEW AI ROUTES ==========

// AI Smart Chat
app.post("/ai/smart-chat", async (req, res) => {
  try {
    const { message, userId, userName } = req.body;
    
    if (!message?.trim()) {
      return res.status(400).json({ error: "Message required" });
    }
    
    console.log(`💬 AI Chat: ${message}`);
    
    if (['hello', 'hi', 'hey'].some(g => message.toLowerCase().includes(g))) {
      const reply = '👋 Hello! Ask me about:\n• Math (equations, calculus)\n• Science (photosynthesis, physics)\n• Programming (variables, functions)';
      await ChatHistory.create({ userId, userName, message, reply });
      return res.json({ reply, intent: 'greeting' });
    }
    
    const { match, confidence } = findAIMatch(message);
    
    let reply;
    if (match && confidence > 5) {
      reply = `📚 **${match.concept.toUpperCase()}**\n\n${match.answer}`;
      if (match.related) reply += `\n\n🔗 **Related Topics:** ${match.related.join(', ')}`;
    } else {
      reply = "🤔 I couldn't find specific information about that.\n\n**Try asking:**\n• 'What is photosynthesis?'\n• 'Explain quadratic equations'\n• 'What is a variable in programming?'\n• 'How does calculus work?'";
    }
    
    await ChatHistory.create({ userId, userName, message, reply });
    res.json({ reply, confidence: confidence / 10 });
    
  } catch (err) {
    console.error("AI Chat Error:", err);
    res.status(500).json({ error: err.message });
  }
});


// Process Document
app.post("/ai/process-document", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    
    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    
    console.log(`📄 Processing: ${req.file.originalname}`);
    
    let text = '';
    
    if (fileExt === '.pdf') {
      text = await extractPDFText(filePath);
    } else if (fileExt === '.docx') {
      text = await extractDOCXText(filePath);
    } else if (fileExt === '.txt') {
      text = fs.readFileSync(filePath, 'utf8');
    } else {
      return res.status(400).json({ error: "Only PDF, DOCX, TXT supported" });
    }
    
    if (!text || text.trim().length < 50) {
      return res.status(400).json({ error: "Could not extract enough text from document" });
    }
    
    const summary = createSummary(text);
    const keyPoints = text.split('\n').filter(line => line.trim()).slice(0, 10);
    const questions = createQuiz(text);
    
    const quiz = await Quiz.create({
      documentName: req.file.originalname,
      questions,
      summary,
      keyPoints
    });
    
    res.json({
      success: true,
      documentName: req.file.originalname,
      summary,
      keyPoints,
      questions,
      quizId: quiz._id
    });
    
  } catch (err) {
    console.error("Processing Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Get all quizzes
app.get("/ai/quizzes", async (req, res) => {
  try {
    const quizzes = await Quiz.find().sort({ generatedAt: -1 });
    res.json({ quizzes, total: quizzes.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get specific quiz
app.get("/ai/quizzes/:id", async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);
    if (!quiz) return res.status(404).json({ error: "Quiz not found" });
    res.json(quiz);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate Essay
app.post("/ai/essay", async (req, res) => {
  try {
    const { topic } = req.body;
    if (!topic?.trim()) return res.status(400).json({ error: "Topic required" });
    
    console.log(`📝 Generating essay: ${topic}`);
    
    let essay = `# ${topic}\n\n`;
    essay += `## Introduction\n\n`;
    essay += `${topic} is a fundamental concept that plays a crucial role in understanding this subject matter. This essay explores the key aspects, importance, and applications of ${topic}.\n\n`;
    essay += `## Main Content\n\n`;
    
    const { match } = findAIMatch(topic);
    if (match) {
      essay += `### Understanding ${match.concept}\n\n`;
      essay += match.answer + '\n\n';
      
      if (match.related && match.related.length > 0) {
        essay += `### Related Concepts\n\n`;
        essay += `Understanding ${match.concept} also requires knowledge of related topics such as ${match.related.join(', ')}. These concepts are interconnected and build upon each other.\n\n`;
      }
    } else {
      essay += `### Core Principles\n\n`;
      essay += `The study of ${topic} encompasses several important principles:\n\n`;
      essay += `1. **Foundation**: The basic concepts that form the groundwork\n`;
      essay += `2. **Application**: How these concepts are used in practice\n`;
      essay += `3. **Significance**: Why this knowledge is important\n`;
      essay += `4. **Future Implications**: How this affects future developments\n\n`;
    }
    
    essay += `## Conclusion\n\n`;
    essay += `In conclusion, ${topic} is an essential area of study that provides valuable insights and practical applications. A thorough understanding of this subject enables better comprehension of related concepts and their real-world applications.\n`;
    
    res.json({ 
      success: true, 
      topic, 
      essay, 
      wordCount: essay.split(' ').length 
    });
    
  } catch (err) {
    console.error("Essay Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Generate Study Notes
app.post("/ai/notes", async (req, res) => {
  try {
    const { topic } = req.body;
    if (!topic?.trim()) return res.status(400).json({ error: "Topic required" });
    
    console.log(`📚 Generating notes: ${topic}`);
    
    let notes = `# 📚 Study Notes: ${topic}\n\n`;
    notes += `*Generated on: ${new Date().toLocaleDateString()}*\n\n`;
    notes += `---\n\n`;
    
    const { match } = findAIMatch(topic);
    
    if (match) {
      notes += `## 📖 ${match.concept}\n\n`;
      notes += match.answer + '\n\n';
      
      if (match.related && match.related.length > 0) {
        notes += `## 🔗 Related Topics\n\n`;
        match.related.forEach((rel, idx) => {
          notes += `${idx + 1}. ${rel}\n`;
        });
        notes += `\n`;
      }
    } else {
      notes += `## 📌 Key Concepts\n\n`;
      notes += `• **Definition**: Understanding what ${topic} means\n`;
      notes += `• **Components**: The main parts or elements\n`;
      notes += `• **Applications**: How it's used in practice\n`;
      notes += `• **Importance**: Why it matters\n\n`;
    }
    
    notes += `## 💡 Study Tips\n\n`;
    notes += `1. **Review Regularly**: Go over these notes daily\n`;
    notes += `2. **Practice**: Apply concepts with examples\n`;
    notes += `3. **Test Yourself**: Create practice questions\n`;
    notes += `4. **Connect Ideas**: Link to related topics\n\n`;
    
    notes += `## ❓ Practice Questions\n\n`;
    notes += `1. What is ${topic}?\n`;
    notes += `2. Why is ${topic} important?\n`;
    notes += `3. How is ${topic} applied in real situations?\n`;
    notes += `4. What are the key components of ${topic}?\n`;
    notes += `5. How does ${topic} relate to other concepts?\n`;
    
    res.json({ success: true, topic, notes });
    
  } catch (err) {
    console.error("Notes Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Add Training
app.post("/ai/add-training", async (req, res) => {
  try {
    const { topic, domain, question, answer, userId } = req.body;
    
    const training = await TrainingData.create({
      topic, domain, question, answer,
      createdBy: userId
    });
    
    if (!aiKnowledge[domain]) {
      aiKnowledge[domain] = { keywords: [], concepts: {} };
    }
    aiKnowledge[domain].concepts[topic] = { answer, related: [] };
    
    res.json({ success: true, message: '✅ Training added!', training });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Training
app.get("/ai/training-data", async (req, res) => {
  try {
    const training = await TrainingData.find().sort({ createdAt: -1 });
    res.json({ training, total: training.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate Explanation
app.post("/ai/explain", async (req, res) => {
  try {
    const { topic, level } = req.body;
    if (!topic?.trim()) return res.status(400).json({ error: "Topic required" });
    
    console.log(`💡 Explaining: ${topic} (${level})`);
    
    let explanation = '';
    const { match } = findAIMatch(topic);
    
    if (match) {
      if (level === 'simple') {
        explanation = `# 🔍 ${match.concept} - Simple Explanation\n\n`;
        explanation += `Let me explain ${match.concept} in simple terms:\n\n`;
      } else {
        explanation = `# 📚 ${match.concept} - Detailed Explanation\n\n`;
      }
      
      explanation += match.answer + '\n\n';
      
      if (match.related && match.related.length > 0) {
        explanation += `## 🔗 Connected Ideas\n\n`;
        explanation += `To fully understand ${match.concept}, you should also learn about:\n`;
        match.related.forEach((rel, idx) => {
          explanation += `${idx + 1}. ${rel}\n`;
        });
      }
      
      explanation += `\n## 💭 Think About This\n\n`;
      explanation += `• How does ${match.concept} apply to real life?\n`;
      explanation += `• What problems does it solve?\n`;
      explanation += `• How does it connect to other concepts?\n`;
      
    } else {
      explanation = `# 🤔 Understanding ${topic}\n\n`;
      explanation += `Let me break down ${topic} for you:\n\n`;
      
      if (level === 'simple') {
        explanation += `## What is ${topic}?\n\n`;
        explanation += `${topic} is a concept that helps us understand important ideas in this subject.\n\n`;
        explanation += `## Why is it Important?\n\n`;
        explanation += `Learning about ${topic} is valuable because it builds your knowledge and helps you solve problems.\n\n`;
        explanation += `## How to Learn It\n\n`;
        explanation += `1. Start with the basics\n`;
        explanation += `2. Practice with examples\n`;
        explanation += `3. Connect it to things you already know\n`;
      } else {
        explanation += `## Comprehensive Overview\n\n`;
        explanation += `${topic} encompasses several key aspects:\n\n`;
        explanation += `### Core Principles\n`;
        explanation += `• Foundation concepts\n`;
        explanation += `• Key terminology\n`;
        explanation += `• Practical applications\n\n`;
        explanation += `### Advanced Understanding\n`;
        explanation += `• Complex interactions\n`;
        explanation += `• Real-world implementations\n`;
        explanation += `• Future implications\n`;
      }
    }
    
    res.json({ success: true, topic, level, explanation });
    
  } catch (err) {
    console.error("Explain Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Generate Practice Questions
app.post("/ai/practice-questions", async (req, res) => {
  try {
    const { topic, count } = req.body;
    if (!topic?.trim()) return res.status(400).json({ error: "Topic required" });
    
    const questionCount = count || 5;
    console.log(`❓ Generating ${questionCount} questions for: ${topic}`);
    
    const questions = [];
    const { match } = findAIMatch(topic);
    
    if (match) {
      // Question 1: Definition
      questions.push({
        question: `What is ${match.concept}?`,
        hint: 'Think about the basic definition and main purpose',
        type: 'Definition'
      });
      
      // Question 2: Application
      questions.push({
        question: `How is ${match.concept} used in real-world situations?`,
        hint: 'Consider practical examples and applications',
        type: 'Application'
      });
      
      // Question 3: Explanation
      questions.push({
        question: `Explain ${match.concept} in your own words`,
        hint: 'Try to simplify the concept as if teaching someone else',
        type: 'Explanation'
      });
      
      // Question 4: Comparison
      if (match.related && match.related.length > 0) {
        questions.push({
          question: `How does ${match.concept} relate to ${match.related[0]}?`,
          hint: 'Look for connections and similarities between concepts',
          type: 'Comparison'
        });
      }
      
      // Question 5: Importance
      questions.push({
        question: `Why is understanding ${match.concept} important?`,
        hint: 'Consider the impact and significance of this concept',
        type: 'Evaluation'
      });
      
      // Question 6: Analysis
      questions.push({
        question: `What are the key components or parts of ${match.concept}?`,
        hint: 'Break down the concept into its main elements',
        type: 'Analysis'
      });
      
      // Question 7: Problem-solving
      questions.push({
        question: `Give an example problem that involves ${match.concept} and explain how to solve it`,
        hint: 'Create a scenario and walk through the solution',
        type: 'Problem-Solving'
      });
      
    } else {
      // Generic questions when no match found
      questions.push(
        {
          question: `What is ${topic}?`,
          hint: 'Define the term and its basic meaning',
          type: 'Definition'
        },
        {
          question: `Give three real-world examples of ${topic}`,
          hint: 'Think of practical situations where this applies',
          type: 'Examples'
        },
        {
          question: `Why is ${topic} important to study?`,
          hint: 'Consider its value and relevance',
          type: 'Importance'
        },
        {
          question: `How can you apply ${topic} in practice?`,
          hint: 'Think about practical uses and implementations',
          type: 'Application'
        },
        {
          question: `Compare ${topic} with a related concept`,
          hint: 'Find similarities and differences',
          type: 'Comparison'
        },
        {
          question: `What are the main challenges in understanding ${topic}?`,
          hint: 'Identify difficult aspects',
          type: 'Analysis'
        },
        {
          question: `Explain ${topic} to someone who has never heard of it`,
          hint: 'Use simple language and analogies',
          type: 'Explanation'
        }
      );
    }
    
    res.json({ 
      success: true, 
      topic, 
      questions: questions.slice(0, questionCount),
      total: questionCount
    });
    
  } catch (err) {
    console.error("Questions Error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================== FILE UPLOAD ==================
app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file" });
  res.json({
    fileName: req.file.originalname,
    fileUrl: `/uploads/${req.file.filename}`,
    fileSize: req.file.size,
  });
});

// File download
app.get("/download/:fileName", (req, res) => {
  const filePath = path.join(__dirname, "uploads", req.params.fileName);
  if (fs.existsSync(filePath)) res.download(filePath);
  else res.status(404).json({ message: "File not found" });
});

// ================== ANNOUNCEMENTS ==================
app.get("/announcements", async (_, res) => {
  try {
    res.json(await Announcement.find().sort({ date: -1 }));
  } catch {
    res.status(500).json({ message: "Fetch error" });
  }
});

app.post("/announcements", async (req, res) => {
  try {
    const ann = await Announcement.create(req.body);
    io.emit("new-announcement", ann);
    res.status(201).json(ann);
  } catch {
    res.status(500).json({ message: "Create error" });
  }
});

app.put("/announcements/:id/pin", async (req, res) => {
  try {
    const ann = await Announcement.findByIdAndUpdate(req.params.id, { pinned: true }, { new: true });
    io.emit("announcement-pinned", ann);
    res.json(ann);
  } catch {
    res.status(500).json({ message: "Pin failed" });
  }
});

app.delete("/announcements/:id", async (req, res) => {
  try {
    await Announcement.findByIdAndDelete(req.params.id);
    io.emit("announcement-deleted", req.params.id);
    res.json({ message: "Deleted" });
  } catch {
    res.status(500).json({ message: "Delete error" });
  }
});

// ================== NOTES ==================
app.get("/notes", async (_, res) => {
  try {
    res.json(await Note.find().sort({ date: -1 }));
  } catch {
    res.status(500).json({ message: "Fetch error" });
  }
});

app.post("/notes", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file" });
    const note = await Note.create({
      ...req.body,
      fileName: req.file.originalname,
      fileUrl: `/uploads/${req.file.filename}`,
      filePath: `/uploads/${req.file.filename}`,
      fileSize: req.file.size,
    });
    io.emit("new-note", note);
    res.status(201).json(note);
  } catch {
    res.status(500).json({ message: "Upload error" });
  }
});

app.put("/notes/:id", async (req, res) => {
  try {
    const note = await Note.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!note) return res.status(404).json({ message: "Not found" });
    io.emit("note-updated", note);
    res.json(note);
  } catch {
    res.status(500).json({ message: "Update error" });
  }
});

app.delete("/notes/:id", async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note) return res.status(404).json({ message: "Not found" });
    const file = path.join(__dirname, note.filePath);
    if (fs.existsSync(file)) fs.unlinkSync(file);
    await Note.findByIdAndDelete(req.params.id);
    io.emit("note-deleted", req.params.id);
    res.json({ message: "Deleted" });
  } catch {
    res.status(500).json({ message: "Delete error" });
  }
});

// ================== SEARCH ==================
app.get("/search/notes", async (req, res) => {
  const { q } = req.query;
  try {
    const results = await Note.find({
      $or: [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ],
    }).sort({ date: -1 });
    res.json(results);
  } catch {
    res.status(500).json({ message: "Search failed" });
  }
});

app.get("/search/assignments", async (req, res) => {
  const { q } = req.query;
  try {
    const results = await Assignment.find({
      $or: [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ],
    }).sort({ createdAt: -1 });
    res.json(results);
  } catch {
    res.status(500).json({ message: "Search failed" });
  }
});

// ================== ASSIGNMENTS ==================
app.get("/assignments", async (_, res) => {
  try {
    res.json(await Assignment.find().sort({ createdAt: -1 }));
  } catch {
    res.status(500).json({ message: "Fetch error" });
  }
});

app.post("/assignments", async (req, res) => {
  try {
    const assignment = await Assignment.create(req.body);
    io.emit("new-assignment", assignment);
    res.status(201).json(assignment);
  } catch {
    res.status(500).json({ message: "Create error" });
  }
});

app.delete("/assignments/:id", async (req, res) => {
  try {
    await Assignment.findByIdAndDelete(req.params.id);
    await Submission.deleteMany({ assignmentId: req.params.id });
    res.json({ message: "Deleted" });
  } catch {
    res.status(500).json({ message: "Delete error" });
  }
});


// Assignment reminder every hour
setInterval(async () => {
  const now = new Date();
  const upcoming = await Assignment.find({ endDate: { $gte: now, $lte: new Date(now.getTime() + 24*60*60*1000) } });
  upcoming.forEach(a => io.emit("assignment-reminder", { assignmentId: a._id, title: a.title, endDate: a.endDate }));
}, 60 * 60 * 1000);

// ================== SUBMISSIONS ==================
app.get("/assignments/:assignmentId/submissions", async (req, res) => {
  try {
    const subs = await Submission.find({ assignmentId: req.params.assignmentId }).sort({ submittedAt: -1 });
    res.json(subs);
  } catch {
    res.status(500).json({ message: "Fetch error" });
  }
});


app.post("/assignments/:assignmentId/submit", upload.single("file"), async (req, res) => {
  try {
    const { studentId, studentName, submissionText } = req.body;
    if (await Submission.findOne({ assignmentId: req.params.assignmentId, studentId }))
      return res.status(400).json({ message: "Already submitted" });
    const data = { assignmentId: req.params.assignmentId, studentId, studentName, submissionText };
    if (req.file) Object.assign(data, { fileName: req.file.originalname, fileUrl: `/uploads/${req.file.filename}`, fileSize: req.file.size });
    const sub = await Submission.create(data);
    io.emit("new-submission", sub);
    res.status(201).json(sub);
  } catch {
    res.status(500).json({ message: "Submit error" });
  }
});

app.put("/submissions/:id/grade", async (req, res) => {
  try {
    const sub = await Submission.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(sub);
  } catch {
    res.status(500).json({ message: "Grade error" });
  }
});

// ================== FEEDBACK ==================
app.get("/feedback/:teacherId", async (req, res) => {
  try {
    res.json(await Feedback.find({ teacherId: req.params.teacherId }).sort({ timestamp: -1 }));
  } catch {
    res.status(500).json({ message: "Fetch error" });
  }
});

app.put("/feedback/:id/read", async (req, res) => {
  try {
    const fb = await Feedback.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
    res.json(fb);
  } catch {
    res.status(500).json({ message: "Update error" });
  }
});

// ================== TEACHERS ==================
app.get("/teachers", async (_, res) => {
  try {
    const teachers = await User.find({ role: "teacher" }).select("name email").sort("name");
    res.json(teachers);
  } catch {
    res.status(500).json({ message: "Fetch error" });
  }
});

// ================== CHATROOMS ==================
app.get("/chatrooms", async (_, res) => {
  try {
    res.json(await ChatRoom.find().sort({ createdAt: -1 }).limit(50));
  } catch {
    res.status(500).json({ message: "Fetch error" });
  }
});

app.post("/chatrooms", async (req, res) => {
  try {
    const room = await ChatRoom.create(req.body);
    io.emit("new-chatroom", room);
    res.status(201).json(room);
  } catch {
    res.status(500).json({ message: "Create error" });
  }
});

app.post("/chatrooms/:roomId/messages", async (req, res) => {
  try {
    const { userId, userName, userRole, message } = req.body;
    const room = await ChatRoom.findById(req.params.roomId);
    if (!room) return res.status(404).json({ message: "Room not found" });
    const msg = { userId, userName, userRole, message, timestamp: new Date() };
    room.messages.push(msg);
    await room.save();
    io.to(req.params.roomId).emit("new-message", { roomId: req.params.roomId, message: msg });
    res.json(msg);
  } catch {
    res.status(500).json({ message: "Send error" });
  }
});

app.put("/chatrooms/:roomId/status", async (req, res) => {
  try {
    const room = await ChatRoom.findByIdAndUpdate(req.params.roomId, req.body, { new: true });
    io.emit("room-status-update", { roomId: req.params.roomId, status: room.status });
    res.json(room);
  } catch {
    res.status(500).json({ message: "Status update error" });
  }
});

// ================== SOCKET.IO ==================
io.on("connection", (socket) => {
  console.log("🟢 Client connected:", socket.id);

  socket.on("join-room", (id) => socket.join(id));
  socket.on("join-feedback-room", (id) => socket.join(`feedback-${id}`));
  socket.on("send-feedback", async (data) => {
    try {
      const fb = await Feedback.create(data);
      io.to(`feedback-${data.teacherId}`).emit("new-feedback", fb);
      socket.emit("feedback-sent", { success: true });
    } catch (e) {
      socket.emit("feedback-sent", { success: false, error: e.message });
    }
  });

  socket.on("join-chatroom", (id) => socket.join(id));
  socket.on("leave-chatroom", (id) => socket.leave(id));
  socket.on("canvas-live-update", (d) => socket.broadcast.emit("canvas-live-update", d));
  socket.on("canvas-live-status", (s) => socket.broadcast.emit("canvas-live-status", s));
  socket.on("share-notes", (d) => io.emit("notes-shared", d));

  socket.on("disconnect", () => console.log("🔴 Client disconnected:", socket.id));
});

// ================== START SERVER ==================
httpServer.listen(PORT, () => {
  console.log(`
🚀 SmartClass Server Running
📡 Port: ${PORT}
🌐 URL: http://localhost:${PORT}
Uploads: /uploads
AI Chat: /ai/chat
AI Test: /ai/test
  `);
});
