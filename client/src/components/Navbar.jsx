// src/components/Navbar.jsx
import React from "react";
import { loginUser, signupUser } from "../services/api";

export default function Navbar({ user, onLogout, subtitle }) {
  return (
    <header className="w-full bg-white/60 backdrop-blur-md border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-4">
        <div className="text-2xl font-bold text-indigo-600">SmartClass</div>
        {subtitle && <div className="text-sm text-gray-600">{subtitle}</div>}
      </div>

      <div className="flex items-center gap-4">
        <div className="text-sm text-gray-700">
          <div className="font-medium">{user?.name ?? user?.email ?? "User"}</div>
          <div className="text-xs text-gray-500">{(user?.role ?? "student").toUpperCase()}</div>
        </div>

        <button
          onClick={onLogout}
          className="ml-2 bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-2 rounded-md shadow-sm"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
