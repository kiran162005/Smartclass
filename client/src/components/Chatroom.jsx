import { useState, useEffect, useRef } from "react";
import { MessageSquare, Send, CheckCircle, Clock, User } from "lucide-react";
import socket from "../services/socket";
import {
  getChatRooms,
  getChatRoom,
  createChatRoom,
  sendMessageToRoom,
  updateRoomStatus,
} from "../services/api";

export default function Chatroom({ user }) {
  const [view, setView] = useState("list");
  const [chatrooms, setChatrooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [question, setQuestion] = useState("");
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const isTeacher = user?.role === "teacher";

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ================= FETCH CHATROOMS =================
  useEffect(() => {
    fetchChatRooms();

    socket.on("new-chatroom", (room) => {
      setChatrooms((prev) => [room, ...prev]);
    });

    socket.on("room-status-update", ({ roomId, status }) => {
      setChatrooms((prev) =>
        prev.map((room) =>
          room._id === roomId ? { ...room, status } : room
        )
      );
    });

    return () => {
      socket.off("new-chatroom");
      socket.off("room-status-update");
    };
  }, []);

  // ================= SOCKET MESSAGES =================
  useEffect(() => {
    if (!selectedRoom) return;

    socket.emit("join-chatroom", selectedRoom._id);

    const handleNewMessage = (data) => {
      if (data.roomId === selectedRoom._id) {
        setMessages((prev) => [...prev, data.message]);
      }
    };

    socket.on("new-message", handleNewMessage);

    return () => {
      socket.emit("leave-chatroom", selectedRoom._id);
      socket.off("new-message", handleNewMessage);
    };
  }, [selectedRoom]);

  const fetchChatRooms = async () => {
    try {
      const data = await getChatRooms();
      setChatrooms(data);
    } catch (err) {
      console.error(err);
      alert("Failed to load chatrooms");
    }
  };

  // ================= CREATE DOUBT =================
  const handleCreateDoubt = async () => {
    if (!question.trim() || !subject.trim()) {
      return alert("Please fill all fields");
    }

    setLoading(true);
    try {
      await createChatRoom({
        studentId: user._id,
        studentName: user.name,
        question,
        subject,
      });

      setQuestion("");
      setSubject("");
      await fetchChatRooms();
      alert("✅ Doubt posted successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to create doubt");
    } finally {
      setLoading(false);
    }
  };

  // ================= OPEN CHAT (FIXED) =================
  const handleSelectRoom = async (room) => {
    setView("chat");
    setSelectedRoom(room);
    setMessages([]);
    setLoading(true);

    try {
      const fullRoom = await getChatRoom(room._id);
      setSelectedRoom(fullRoom);
      setMessages(fullRoom.messages || []);
    } catch (err) {
      console.error("Failed to load messages", err);
      alert("Failed to load chat messages");
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  // ================= SEND MESSAGE (FIXED - KEY CHANGE!) =================
  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const messageData = {
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      message: input.trim(),
    };

    // Clear input immediately for better UX
    const messageCopy = input;
    setInput("");

    try {
      // Send to server - this will save to DB and emit via socket
      await sendMessageToRoom(selectedRoom._id, messageData);
      
      // Message will be added via socket listener automatically
      // DO NOT add it here manually - that was causing the duplicate/disappearing issue
    } catch (err) {
      console.error("Failed to send message", err);
      alert("Failed to send message");
      // Restore the message if send failed
      setInput(messageCopy);
    }
  };

  const handleResolve = async () => {
    try {
      await updateRoomStatus(selectedRoom._id, "answered");
      setSelectedRoom((prev) => ({ ...prev, status: "answered" }));
      setChatrooms((prev) =>
        prev.map((room) =>
          room._id === selectedRoom._id ? { ...room, status: "answered" } : room
        )
      );
      alert("✅ Doubt marked as resolved!");
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ================= LIST VIEW =================
  if (view === "list") {
    return (
      <div className="max-w-5xl mx-auto p-4">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <MessageSquare size={28} />
                <div>
                  <h2 className="text-2xl font-bold">Doubt Resolution</h2>
                  <p className="text-sm text-indigo-100">
                    Ask questions, get answers
                  </p>
                </div>
              </div>
              <span className="bg-white/20 px-4 py-2 rounded-full text-sm font-semibold">
                {isTeacher ? "👨‍🏫 Teacher" : "👨‍🎓 Student"}
              </span>
            </div>
          </div>

          {!isTeacher && (
            <div className="p-6 bg-gray-50 border-b">
              <h3 className="font-bold text-gray-800 mb-3">Post a New Doubt</h3>
              <input
                placeholder="Subject (e.g., Mathematics, Physics)"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full mb-3 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              <textarea
                placeholder="Describe your doubt in detail..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none"
                rows={3}
              />
              <button
                onClick={handleCreateDoubt}
                disabled={loading}
                className="w-full mt-3 bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition font-semibold disabled:opacity-50"
              >
                {loading ? "Posting..." : "Post Doubt"}
              </button>
            </div>
          )}

          <div className="p-6">
            <h3 className="font-bold text-gray-800 mb-4">
              {isTeacher ? "Student Doubts" : "Your Doubts"}
            </h3>
            {chatrooms.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />
                <p>No doubts posted yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {chatrooms.map((room) => (
                  <div
                    key={room._id}
                    onClick={() => handleSelectRoom(room)}
                    className="p-4 border-2 rounded-xl cursor-pointer hover:bg-indigo-50 hover:border-indigo-300 transition"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-gray-600" />
                        <span className="font-semibold text-gray-800">
                          {room.studentName}
                        </span>
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-semibold">
                          {room.subject}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {room.status === "answered" ? (
                          <div className="flex items-center gap-1 text-green-600 text-sm font-semibold">
                            <CheckCircle size={16} />
                            <span>Resolved</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-orange-600 text-sm font-semibold">
                            <Clock size={16} />
                            <span>Pending</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-700">{room.question}</p>
                    <div className="mt-2 text-xs text-gray-500">
                      {room.messages?.length || 0} message(s)
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ================= CHAT VIEW =================
  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-xl shadow-lg h-[calc(100vh-8rem)] flex flex-col">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
          <button
            onClick={() => {
              setView("list");
              setSelectedRoom(null);
              setMessages([]);
            }}
            className="text-sm underline mb-2 hover:text-indigo-200"
          >
            ← Back to Doubts
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold">{selectedRoom?.studentName}'s Doubt</h3>
              <p className="text-sm text-indigo-100">{selectedRoom?.subject}</p>
            </div>
            {isTeacher && selectedRoom?.status !== "answered" && (
              <button
                onClick={handleResolve}
                className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2"
              >
                <CheckCircle size={18} />
                Mark as Resolved
              </button>
            )}
          </div>
        </div>

        <div className="p-4 bg-indigo-50 border-b">
          <div className="font-semibold text-gray-800 mb-1">Question:</div>
          <p className="text-gray-700">{selectedRoom?.question}</p>
        </div>

        <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading messages...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">
                <MessageSquare size={48} className="mx-auto mb-4 opacity-20" />
                <p>No messages yet</p>
                {isTeacher && <p className="text-sm mt-2">Start the conversation!</p>}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg, i) => {
                const isCurrentUser = msg.userId === user._id;
                const isTeacherMsg = msg.userRole === "teacher";

                return (
                  <div
                    key={i}
                    className={`flex ${isCurrentUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                        isTeacherMsg
                          ? "bg-indigo-600 text-white"
                          : "bg-white border-2 border-gray-200 text-gray-800"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">
                          {msg.userName}
                        </span>
                        {isTeacherMsg && (
                          <span className="text-xs bg-white/20 px-2 py-0.5 rounded">
                            Teacher
                          </span>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap break-words">
                        {msg.message}
                      </p>
                      {msg.timestamp && (
                        <p className="text-xs opacity-70 mt-1">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* INPUT FOR BOTH TEACHER AND STUDENT */}
        <div className="p-4 border-t bg-white">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                isTeacher
                  ? "Type your answer..."
                  : "Ask a follow-up question..."
              }
              className="flex-1 border-2 rounded-xl p-3 resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              rows={2}
            />
            <button
              onClick={handleSendMessage}
              disabled={!input.trim()}
              className="bg-indigo-600 text-white px-6 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={20} />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}