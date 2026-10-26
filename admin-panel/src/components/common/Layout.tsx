import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import { Outlet } from 'react-router-dom';

const Layout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onToggle={toggleSidebar} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-slate-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={toggleSidebar}
                className="lg:hidden p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-2xl font-bold text-slate-900 ml-2 lg:ml-0">
                Панель управления
              </h1>
            </div>
            <div className="text-sm text-slate-500">
              {new Date().toLocaleDateString('ru-RU', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;