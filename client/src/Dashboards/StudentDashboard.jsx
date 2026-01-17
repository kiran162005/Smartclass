import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import DrawingCanvas from '../components/DrawingCanvas';
import PracticeCanvas from '../components/PracticeCanvas';
import AssignmentsManager from '../components/AssignmentsManager';
import Announcements from '../components/Announcements';
import Chatroom from '../components/Chatroom';
import Feedback from '../components/Feedback';
import ClassNotesViewer from '../components/ClassNotesViewer';
import { default as AIChatAssistant } from "../components/AIChatAssistant";
import socket from '../services/socket';
import TextGenerator from '../components/TextGenerator';
import DocumentQuizGenerator from '../components/DocumentQuizGenerator';

import { Clock, FileText, BookOpen, MessageCircle } from 'lucide-react';

function StudentDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('home');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const quickAccess = [
    { title: 'Join Live Class', icon: Clock, tab: 'liveclass' },
    { title: 'Pending Assignments', icon: FileText, tab: 'assignments' },
    { title: 'Practice Canvas', icon: BookOpen, tab: 'practice' },
    { title: 'View Announcements', icon: MessageCircle, tab: 'announcements' },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar role="student" activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 overflow-auto p-6">
        {/* Hero Banner */}
        {activeTab === 'home' && (
          <div className="bg-teal-100 text-gray-800 p-8 rounded-2xl mb-6 shadow-lg">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold mb-1">Welcome, {user.name}</h1>
                <p className="text-gray-600 text-lg">
                  Your teacher is ready to guide you today.
                </p>
              </div>
              <div className="text-sm text-gray-700 font-medium">
                {currentTime.toLocaleDateString()} • {currentTime.toLocaleTimeString()}
              </div>
            </div>
          </div>
        )}

        {/* Quick Access Cards */}
        {activeTab === 'home' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {quickAccess.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  onClick={() => setActiveTab(item.tab)}
                  className="bg-white rounded-2xl shadow-md p-6 flex items-center gap-4 cursor-pointer transition transform hover:scale-105 hover:shadow-xl hover:bg-teal-50 duration-300 group"
                >
                  <Icon
                    size={28}
                    className="text-teal-600 transition-transform duration-300 group-hover:rotate-[15deg]"
                  />
                  <p className="text-gray-800 font-semibold">{item.title}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Render Components based on activeTab */}
        {activeTab === 'liveclass' && <DrawingCanvas isTeacher={false} user={user} socket={socket} />}
        {activeTab === 'practice' && <PracticeCanvas />}
        {activeTab === 'assignments' && <AssignmentsManager user={user} />}
        {activeTab === 'notes' && <ClassNotesViewer user={user} />}
        {activeTab === 'announcements' && <Announcements user={user} />}
        {activeTab === 'chatroom' && <Chatroom user={user} />}
        {activeTab === 'feedback' && <Feedback role="student" user={user} />}
        {activeTab === 'ai' && <AIChatAssistant user={user} />}
        {activeTab === 'textgen' && <TextGenerator />}
        {activeTab === 'docquiz' && <DocumentQuizGenerator user={user} />}


      </main>
    </div>
  );
}

export default StudentDashboard;
