import axios from "axios";

const BASE_URL = "http://localhost:5000";
const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// ================== AUTH ==================
export const loginUser = (email, password) =>
  api.post("/auth/login", { email, password });

export const signupUser = (name, email, password, role = "student") =>
  api.post("/auth/signup", { name, email, password, role });

// ================== ANNOUNCEMENTS ==================
export const getAnnouncements = () =>
  api.get("/announcements").then(res => res.data);

export const postAnnouncement = (data) =>
  api.post("/announcements", data).then(res => res.data);



// ================== CHAT ==================
export const getChats = (roomId) =>
  api.get(`/chat/${roomId}`).then(res => res.data);

export const sendMessage = (roomId, message) =>
  api.post(`/chat/${roomId}`, { message }).then(res => res.data);

// ================== FILE UPLOAD ==================
export const uploadFile = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post("/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then(res => res.data);
};

// ================== DRAWING CANVAS ==================
export const saveCanvas = (userId, canvasData) =>
  api.post(`/canvas/${userId}`, { canvasData }).then(res => res.data);

export const getCanvas = (userId) =>
  api.get(`/canvas/${userId}`).then(res => res.data);

// ================== FEEDBACK ==================
export const getFeedback = (userId) =>
  api.get(`/feedback/${userId}`).then(res => res.data);

export const postFeedback = (userId, feedback) =>
  api.post(`/feedback/${userId}`, { feedback }).then(res => res.data);

// ================== AI CHAT ASSISTANT ==================
export const sendToAI = (message) =>
  api.post("/ai/chat", { message }).then(res => res.data);

// ================== FEEDBACK ==================
export const getFeedbackForTeacher = (teacherId) =>
  api.get(`/feedback/${teacherId}`).then(res => res.data);

export const markFeedbackAsRead = (feedbackId) =>
  api.put(`/feedback/${feedbackId}/read`).then(res => res.data);

export const getTeachers = () =>
  api.get("/teachers").then(res => res.data);

// ================== CHATROOMS ==================
export const getChatRooms = () =>
  api.get("/chatrooms").then(res => res.data);

export const getChatRoom = (roomId) =>
  api.get(`/chatrooms/${roomId}`).then(res => res.data);

export const createChatRoom = (data) =>
  api.post("/chatrooms", data).then(res => res.data);

export const sendMessageToRoom = (roomId, data) =>
  api.post(`/chatrooms/${roomId}/messages`, data).then(res => res.data);

export const updateRoomStatus = (roomId, status) =>
  api.put(`/chatrooms/${roomId}/status`, { status }).then(res => res.data);

// ================== ASSIGNMENTS ==================
export const getAssignments = () =>
  api.get("/assignments").then(res => res.data);

export const createAssignment = (data) =>
  api.post("/assignments", data).then(res => res.data);

export const deleteAssignment = (id) =>
  api.delete(`/assignments/${id}`).then(res => res.data);

export const getSubmissions = (assignmentId) =>
  api.get(`/assignments/${assignmentId}/submissions`).then(res => res.data);

export const checkSubmission = async (assignmentId, studentId) => {
  try {
    const submissions = await api.get(`/assignments/${assignmentId}/submissions`);
    const mySubmission = submissions.data.find(sub => sub.studentId === studentId);
    return mySubmission || null;
  } catch (err) {
    return null;
  }
};



// export const submitAssignment = (assignmentId, data) =>
//   api.post(`/assignments/${assignmentId}/submit`, data).then(res => res.data);

// Update submitAssignment function
export const submitAssignment = (assignmentId, formData) =>
  api.post(`/assignments/${assignmentId}/submit`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  }).then(res => res.data);

export const gradeSubmission = (submissionId, data) =>
  api.put(`/submissions/${submissionId}/grade`, data).then(res => res.data);

// ========== AI FEATURES (ADD TO EXISTING api.js) ==========

// AI Smart Chat
export const sendAIChat = (message, userId, userName) =>
  api.post("/ai/smart-chat", { message, userId, userName });

// Process Document
export const processAIDocument = (formData) =>
  api.post("/ai/process-doc", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });

// Get Quizzes
export const getAIQuizzes = () => api.get("/ai/quizzes");
export const getAIQuiz = (id) => api.get(`/ai/quizzes/${id}`);

// Generate Essay
export const generateAIEssay = (topic) => api.post("/ai/essay", { topic });

// Generate Notes
export const generateAINotes = (topic) => api.post("/ai/notes", { topic });

// Training
export const addAITraining = (data) => api.post("/ai/add-training", data);
export const getAITraining = () => api.get("/ai/training-data");

export default api;
