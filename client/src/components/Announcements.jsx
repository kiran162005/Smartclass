import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";
import axios from "axios";

// Socket connection
const socket = io("http://localhost:5000");

export default function Announcements({ user, setNotificationCount }) {
  const [announcements, setAnnouncements] = useState([]);
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Fetch announcements and listen for real-time updates
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await axios.get("http://localhost:5000/announcements");
        const data = Array.isArray(res.data) ? res.data : res.data.announcements || [];
        setAnnouncements(data);
        if (setNotificationCount) setNotificationCount(data.length);
      } catch {
        setAnnouncements([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnnouncements();

    socket.on("new-announcement", (newAnn) => {
      if (newAnn?.text || newAnn?.message || newAnn?.content) {
        setAnnouncements((prev) => [newAnn, ...prev]);
        if (setNotificationCount) setNotificationCount(prev => prev + 1);
      }
    });

    socket.on("announcement-deleted", (deletedId) => {
      setAnnouncements((prev) => prev.filter((a) => a._id !== deletedId && a.id !== deletedId));
      if (setNotificationCount) setNotificationCount(prev => Math.max(prev - 1, 0));
    });

    return () => {
      socket.off("new-announcement");
      socket.off("announcement-deleted");
    };
  }, [setNotificationCount]);

  // Send new announcement
  const handleSend = async () => {
    const trimmedText = text.trim();
    if (!trimmedText) return;
    const newAnn = {
      text: trimmedText,
      sender: user?.name || "Teacher",
      timestamp: new Date().toISOString(),
    };
    setText("");
    try {
      const res = await axios.post("http://localhost:5000/announcements", newAnn);
      if (res.data) setAnnouncements((prev) => [res.data, ...prev]);
    } catch {
      setText(trimmedText);
    }
  };

  // Delete announcement
  const handleDelete = async (a) => {
    const id = a._id || a.id;
    if (!id) return;
    if (!window.confirm("Delete this announcement?")) return;
    setAnnouncements((prev) => prev.filter((ann) => ann._id !== id && ann.id !== id));
    try {
      await axios.delete(`http://localhost:5000/announcements/${id}`);
    } catch {
      setAnnouncements((prev) => [a, ...prev]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">📢 Announcements</h2>
        <span className="text-sm text-gray-500">
          {new Date().toLocaleString()}
        </span>
      </div>

      {/* Announcement List */}
      <div className="space-y-4 max-h-[450px] overflow-y-auto">
        {isLoading ? (
          <p className="text-gray-500 text-center py-4">Loading announcements...</p>
        ) : announcements.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            {user?.role === "teacher"
              ? "No announcements yet. Post one below!"
              : "No announcements yet."}
          </p>
        ) : (
          announcements.map((a, idx) => {
            const id = a._id || a.id || `temp-${idx}`;
            const text = a.text || a.message || a.content || "";
            const sender = a.sender || a.author || "Unknown";
            const time = a.timestamp || a.date;
            return (
              <div
                key={id}
                className="bg-white p-4 rounded-xl shadow-md hover:shadow-xl transition-shadow duration-200 flex justify-between items-start gap-4"
              >
                <div className="flex-1">
                  <div className="text-xs text-gray-400 mb-1">
                    {time ? new Date(time).toLocaleString() : "Just now"}
                  </div>
                  <p className="text-gray-700">
                    <span className="font-semibold text-gray-800">{sender}:</span> {text}
                  </p>
                </div>
                {user?.role === "teacher" && (
                  <button
                    onClick={() => handleDelete(a)}
                    className="text-red-600 hover:bg-red-50 px-2 py-1 rounded transition"
                  >
                    Delete
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Teacher input */}
      {user?.role === "teacher" && (
        <div className="mt-6 flex flex-col gap-2">
          <textarea
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write a new announcement... (Ctrl+Enter to send)"
            className="w-full p-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent shadow-sm resize-none"
            onKeyDown={(e) => e.key === "Enter" && e.ctrlKey && handleSend()}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className={`px-6 py-2 rounded-xl font-semibold transition-colors ${
              text.trim()
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "bg-gray-300 text-gray-600 cursor-not-allowed"
            }`}
          >
            Send
          </button>
          <p className="text-xs text-gray-500 mt-1">Tip: Press Ctrl+Enter to send quickly</p>
        </div>
      )}
    </div>
  );
}
