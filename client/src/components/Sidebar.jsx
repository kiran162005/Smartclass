import { BookOpen, MessageCircle, File, Users, Cpu, LogOut, Home, GraduationCap,FileText,Brain  } from "lucide-react";

function Sidebar({ role, activeTab, setActiveTab }) {
  const commonItems = [
    { id: 'chatroom', label: 'Doubt Chat', icon: Users },
    { id: 'feedback', label: 'Feedback', icon: File },
    { id: 'ai', label: 'AI Assistant', icon: Cpu },
  ];

  const studentItems = [
    { id: 'liveclass', label: 'Live Class', icon: BookOpen },
    { id: 'practice', label: 'Practice Canvas', icon: File },
    { id: 'assignments', label: 'Assignments', icon: File },
    { id: 'announcements', label: 'Announcements', icon: MessageCircle },
    { id: 'notes', label: 'Class Notes', icon: BookOpen },
    { id: 'textgen', label: 'Text Generator', icon: FileText },
    { id: 'docquiz', label: 'Document Quiz', icon: Brain },

  ];

  const teacherItems = [
    { id: 'canvas', label: 'Teaching Canvas', icon: BookOpen },
    { id: 'assignments', label: 'Assignments', icon: File },
    { id: 'announcements', label: 'Announcements', icon: MessageCircle },
    { id: 'notes', label: 'Class Notes', icon: BookOpen },
    { id: 'textgen', label: 'Text Generator', icon: FileText },

  ];

  const menuItems = role === 'teacher' ? teacherItems.concat(commonItems) : studentItems.concat(commonItems);
  const menuItemsWithHome = [{ id: 'home', label: 'Dashboard', icon: Home }, ...menuItems];

  return (
    <div className="w-56 bg-gray-50 text-gray-800 h-screen flex flex-col shadow-md">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 flex items-center gap-3">
        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
          <GraduationCap size={24} className="text-indigo-600" />
        </div>
        <div>
          <h1 className="text-lg font-bold">SmartClass</h1>
          <p className="text-xs text-gray-500">{role === 'teacher' ? 'Teacher' : 'Student'}</p>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
        {menuItemsWithHome.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative w-full text-left px-4 py-2 rounded-lg flex items-center gap-3 font-semibold transition-all duration-300
                ${isActive ? 'bg-indigo-100 text-indigo-600 shadow-lg' : 'hover:bg-gray-200 text-gray-700'}
              `}
            >
              {/* Sliding icon */}
              <Icon
                size={20}
                className={`transition-transform duration-300 ${isActive ? '-translate-x-1' : 'group-hover:-translate-x-1'}`}
              />

              {/* Label with fade-in effect */}
              <span
                className={`transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-90 group-hover:opacity-100'}`}
              >
                {item.label}
              </span>

              {/* Active Indicator */}
              {isActive && (
                <span className="absolute left-0 top-0 h-full w-1 bg-indigo-600 rounded-r-full"></span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={() => window.location.reload()}
          className="w-full text-left px-4 py-2 rounded-lg hover:bg-red-100 transition flex items-center gap-2 font-semibold text-red-600"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
