import { useState } from 'react';
import StudentDashboard from './Dashboards/StudentDashboard';
import TeacherDashboard from './Dashboards/TeacherDashboard';
import Login from './Auth/Login';
import Signup from './Auth/Signup';

function MainApp() {
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(true);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
  };

  if (!user) {
    return showLogin ? (
      <Login 
        onSuccess={handleLoginSuccess} 
        switchToSignup={() => setShowLogin(false)} // ✅ pass toggle to Login
      />
    ) : (
      <Signup 
        onSuccess={() => setShowLogin(true)} 
        switchToLogin={() => setShowLogin(true)} // ✅ pass toggle to Signup
      />
    );
  }

  return user.role === 'teacher' ? (
    <TeacherDashboard user={user} />
  ) : (
    <StudentDashboard user={user} />
  );
}

export default MainApp;
