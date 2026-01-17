import { useState, useEffect } from "react";
import { Send, Check, Mail } from "lucide-react";
import socket from "../services/socket";
import {
  getFeedbackForTeacher,
  markFeedbackAsRead,
  getTeachers,
} from "../services/api";

export default function Feedback({ role = "student", user }) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [text, setText] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Fetch teachers for student
  useEffect(() => {
    if (role === "student") {
      fetchTeachers();
    }
  }, [role]);

  // Teacher: Join room and fetch existing feedback
  useEffect(() => {
    if (role === "teacher" && user?._id) {
      const teacherId = user._id;

      // Join feedback room
      socket.emit("join-feedback-room", teacherId);

      // Fetch existing feedback
      fetchFeedback(teacherId);

      // Listen for new feedback
      socket.on("new-feedback", (data) => {
        setFeedbacks((prev) => [data, ...prev]);

        // Browser notification
        if (Notification.permission === "granted") {
          new Notification("New Feedback", {
            body: `New feedback from ${data.studentName}`,
            icon: "/icon.png",
          });
        }
      });

      return () => {
        socket.off("new-feedback");
      };
    }
  }, [role, user]);

  const fetchTeachers = async () => {
    try {
      const data = await getTeachers();
      setTeachers(data);
      if (data.length > 0) setSelectedTeacher(data[0]._id);
    } catch (error) {
      console.error("Error fetching teachers:", error);
    }
  };

  const fetchFeedback = async (teacherId) => {
    try {
      setLoading(true);
      const data = await getFeedbackForTeacher(teacherId);
      setFeedbacks(data);
    } catch (error) {
      console.error("Error fetching feedback:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => {
    if (!text.trim() || !selectedTeacher || !user) return;

    setSending(true);

    socket.emit("send-feedback", {
      teacherId: selectedTeacher,
      studentId: user._id,
      studentName: user.name,
      text: text.trim(),
    });

    socket.once("feedback-sent", (response) => {
      setSending(false);
      if (response.success) {
        setText("");
        alert("✅ Feedback sent successfully!");
      } else {
        alert("❌ Failed to send feedback. Please try again.");
      }
    });
  };

  const handleMarkAsRead = async (feedbackId) => {
    try {
      await markFeedbackAsRead(feedbackId);
      setFeedbacks((prev) =>
        prev.map((fb) =>
          fb._id === feedbackId ? { ...fb, read: true } : fb
        )
      );
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail size={24} />
          <h2 className="text-xl font-semibold">Feedback Board</h2>
        </div>
        <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
          {role === "teacher" ? "👨‍🏫 Teacher" : "👨‍🎓 Student"}
        </span>
      </div>

      {/* TEACHER VIEW */}
      {role === "teacher" && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-700">
              Received Feedback ({feedbacks.length})
            </h3>
            <button
              onClick={() => fetchFeedback(user._id)}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              🔄 Refresh
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Mail size={48} className="mx-auto mb-4 opacity-20" />
              <p>No feedback received yet</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {feedbacks.map((fb) => (
                <div
                  key={fb._id}
                  className={`p-4 rounded-lg border transition ${
                    fb.read
                      ? "bg-gray-50 border-gray-200"
                      : "bg-indigo-50 border-indigo-200"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-indigo-500 text-white rounded-full flex items-center justify-center font-semibold">
                        {fb.studentName?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">
                          {fb.studentName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(fb.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {!fb.read && (
                      <button
                        onClick={() => handleMarkAsRead(fb._id)}
                        className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800"
                      >
                        <Check size={14} /> Mark as read
                      </button>
                    )}
                  </div>
                  <p className="text-gray-700 pl-10">{fb.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STUDENT VIEW */}
      {role === "student" && (
        <div className="p-6 space-y-4">
          {teachers.length === 0 ? (
            // If no teachers available
            <div className="text-center py-12">
              <Mail size={48} className="mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                No Teachers Available
              </h3>
              <p className="text-gray-500 mb-4">
                There are no teachers registered in the system yet.
              </p>
              <p className="text-sm text-gray-400">
                Please contact your administrator to add teachers.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Teacher
                </label>
                <select
                  value={selectedTeacher}
                  onChange={(e) => setSelectedTeacher(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={sending}
                >
                  {teachers.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Your Feedback
                </label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Share your thoughts, suggestions, or concerns..."
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={5}
                  disabled={sending}
                />
              </div>

              <button
                onClick={handleSend}
                disabled={!text.trim() || !selectedTeacher || sending}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {sending ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={18} /> Send Feedback
                  </>
                )}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
