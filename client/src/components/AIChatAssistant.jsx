import React, { useState, useRef, useEffect } from "react";
import { Bot, Send, User, Sparkles, Loader2, Trash2, Copy, Check, FileText } from "lucide-react";

// Error boundary wrapper component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, errorMessage: error.message || "Something went wrong!" };
  }
  componentDidCatch(error, info) {
    console.error("ErrorBoundary:", error, info);
  }
  render() {
    if (this.state.hasError)
      return (
        <div className="flex items-center justify-center h-full text-red-500">
          {this.state.errorMessage}
        </div>
      );
    return this.props.children;
  }
}

const AIChatAssistant = ({ user }) => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: "👋 Hello! I'm your AI assistant powered by Gemini. How can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);
  useEffect(() => inputRef.current?.focus(), []);

  if (!user)
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Loading user info...</p>
      </div>
    );

  const formatTime = (date) =>
    new Date(date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const handleSend = async (file) => {
    if ((!input.trim() && !file) || loading) return;
    
    const userMessage = {
      sender: "user",
      text: input.trim() || (file ? `📎 Uploaded file: ${file.name}` : ""),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("message", input.trim());
      formData.append("userId", user?._id || "guest");
      formData.append("userName", user?.name || "Guest");
      if (file) formData.append("file", file);

      const response = await fetch("http://localhost:5000/ai/chat", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const botMessage = {
        sender: "bot",
        text: data.reply || "😕 Couldn't generate a response.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      console.error("AI Chat Error:", err);
      setMessages((prev) => [
        ...prev,
        { 
          sender: "bot", 
          text: "😕 AI service unavailable. Please check if the server is running and try again.", 
          timestamp: new Date() 
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    if (window.confirm("Clear chat history?"))
      setMessages([{ sender: "bot", text: "👋 Chat cleared! How can I help you?", timestamp: new Date() }]);
  };

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) handleSend(file);
  };

  return (
    <div className="w-full h-full flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="flex flex-col w-full max-w-4xl h-[700px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 flex items-center justify-between shadow-lg flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 bg-white rounded-full flex items-center justify-center">
              <Bot className="text-indigo-600" size={24} />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
            </div>
            <div>
              <h2 className="text-xl font-bold">AI Assistant</h2>
              <p className="text-xs text-indigo-100 flex items-center gap-1">
                <Sparkles size={12} />
                Powered by Gemini
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <label className="p-2 hover:bg-white/20 rounded-lg cursor-pointer" title="Upload file">
              <FileText size={20} />
              <input type="file" className="hidden" onChange={handleFileChange} />
            </label>
            <button onClick={handleClearChat} className="p-2 hover:bg-white/20 rounded-lg" title="Clear chat">
              <Trash2 size={20} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-gray-50 to-white">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"} animate-fadeIn`}
            >
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  msg.sender === "user"
                    ? "bg-gradient-to-br from-indigo-500 to-purple-600"
                    : "bg-gradient-to-br from-purple-500 to-pink-600"
                }`}
              >
                {msg.sender === "user" ? (
                  <User size={18} className="text-white" />
                ) : (
                  <Bot size={18} className="text-white" />
                )}
              </div>
              <div className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"} max-w-[75%]`}>
                <div className="flex items-center gap-2 mb-1 text-xs text-gray-600">
                  <span>{msg.sender === "user" ? user?.name || "You" : "AI Assistant"}</span>
                  <span className="text-gray-400">{formatTime(msg.timestamp)}</span>
                </div>
                <div className="relative group">
                  <div
                    className={`px-4 py-3 rounded-2xl shadow-md break-words whitespace-pre-wrap ${
                      msg.sender === "user"
                        ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-tr-none"
                        : "bg-white text-gray-800 border border-gray-200 rounded-tl-none"
                    }`}
                  >
                    {msg.text}
                  </div>
                  {msg.sender === "bot" && (
                    <button
                      onClick={() => handleCopy(msg.text, idx)}
                      className="absolute -right-2 top-0 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-white rounded-lg shadow-md hover:bg-gray-50"
                    >
                      {copiedIndex === idx ? (
                        <Check size={14} className="text-green-600" />
                      ) : (
                        <Copy size={14} className="text-gray-600" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3 animate-fadeIn">
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-purple-500 to-pink-600">
                <Bot size={18} className="text-white" />
              </div>
              <div className="bg-white text-gray-800 px-4 py-3 rounded-2xl rounded-tl-none border border-gray-200 shadow-md flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-indigo-600" /> AI is thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex-shrink-0">
          <div className="flex gap-3 items-end max-w-4xl mx-auto">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                rows={1}
                className="w-full border-2 border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded-2xl px-4 py-3 pr-12 transition-all duration-200 outline-none resize-none max-h-32 bg-white"
                placeholder={loading ? "AI is typing..." : "Type your message here..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
              />
            </div>
            <button
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className={`p-3 rounded-2xl transition-all duration-200 flex items-center justify-center shadow-lg ${
                loading || !input.trim()
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-xl hover:scale-105 active:scale-95"
              }`}
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default function WrappedAIChatAssistant(props) {
  return (
    <ErrorBoundary>
      <AIChatAssistant {...props} />
    </ErrorBoundary>
  );
}