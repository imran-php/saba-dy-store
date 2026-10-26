import React from 'react';
import { NavLink } from 'react-router-dom';
import { ShoppingBag, Package, LogOut, Menu, X, Settings } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
  const { logout } = useAuth();

  const menuItems = [
    {
      path: '/admin',
      label: 'Главная',
      icon: Package,
      end: true,
    },
    {
      path: '/admin/orders',
      label: 'Заказы',
      icon: ShoppingBag,
    },
    {
      path: '/admin/products',
      label: 'Товары',
      icon: Package,
    },
    {
      path: '/admin/settings',
      label: 'Настройки',
      icon: Settings,
    },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-0
      `}>
        <div className="flex items-center justify-between h-16 px-6 bg-slate-800">
          <a href="/" className="text-xl font-bold text-white hover:text-orange-500 transition-colors">
            saba-dy Admin
          </a>
          <button
            onClick={onToggle}
            className="lg:hidden text-slate-300 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="mt-8 px-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    end={item.end}
                    className={({ isActive }) => `
                      flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200
                      ${isActive 
                        ? 'bg-orange-500 text-white' 
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.label}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <button
            onClick={logout}
            className="flex items-center w-full px-4 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition-colors duration-200"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Выйти
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;