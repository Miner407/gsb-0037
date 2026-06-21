import { Link, useLocation } from 'react-router-dom';
import { Bookmark, LayoutDashboard, Upload } from 'lucide-react';
import { useState } from 'react';
import ImportModal from './ImportModal';

export default function Navbar() {
  const location = useLocation();
  const [showImport, setShowImport] = useState(false);

  const navLinks = [
    { to: '/', label: '仪表板', icon: LayoutDashboard },
    { to: '/bookmarks', label: '书签管理', icon: Bookmark },
  ];

  return (
    <>
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-primary-700 flex items-center justify-center">
                  <Bookmark className="w-5 h-5 text-accent-400" />
                </div>
                <span className="font-serif text-xl font-semibold text-primary-800">Bookmark Manager</span>
              </Link>

              <div className="flex items-center gap-1">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = location.pathname === link.to;
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            <button
              onClick={() => setShowImport(true)}
              className="btn-accent"
            >
              <Upload className="w-4 h-4" />
              导入书签
            </button>
          </div>
        </div>
      </nav>

      <ImportModal open={showImport} onClose={() => setShowImport(false)} />
    </>
  );
}
