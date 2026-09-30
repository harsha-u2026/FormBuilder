import React, { useState, useRef, useEffect } from 'react';
import {
  Layers,
  Edit3,
  Eye,
  BarChart2,
  Sparkles,
  Plus,
  LogIn,
  LogOut,
  User as UserIcon,
  ChevronDown,
} from 'lucide-react';

export default function Navbar({
  activeView,
  setActiveView,
  activeForm,
  hasForms = false,
  dbStatus,
  onCreateBlank,
  onOpenTemplates,
  currentUser,
  onOpenAuthModal,
  onLogout,
}) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (user) => {
    if (!user) return 'U';
    if (user.full_name) {
      const parts = user.full_name.trim().split(' ');
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return user.full_name[0].toUpperCase();
    }
    return user.email[0].toUpperCase();
  };

  return (
    <header className="navbar">
      <div className="nav-brand" onClick={() => setActiveView('dashboard')}>
        <div className="brand-icon">
          <Sparkles size={20} color="#ffffff" />
        </div>
        <span className="brand-name">FormBuilder</span>
        <span className="brand-badge">STUDIO</span>
      </div>

      <nav className="nav-tabs">
        <button
          className={`nav-tab-btn ${activeView === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveView('dashboard')}
          title="Home Dashboard"
        >
          <Layers size={16} />
          <span>Dashboard</span>
        </button>

        <button
          className={`nav-tab-btn ${activeView === 'builder' ? 'active' : ''}`}
          onClick={() => setActiveView('builder')}
          title={activeForm ? `Builder: ${activeForm.title}` : (hasForms ? 'Open Form Builder' : 'Create a form first')}
        >
          <Edit3 size={16} />
          <span>Builder</span>
        </button>

        <button
          className={`nav-tab-btn ${activeView === 'respondent' ? 'active' : ''}`}
          onClick={() => setActiveView('respondent')}
          title={activeForm ? `Preview: ${activeForm.title}` : (hasForms ? 'Preview Survey' : 'Create a form first')}
        >
          <Eye size={16} />
          <span>Preview Survey</span>
        </button>

        <button
          className={`nav-tab-btn ${activeView === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveView('analytics')}
          title={activeForm ? `Responses: ${activeForm.title}` : (hasForms ? 'View Responses & Analytics' : 'Create a form first')}
        >
          <BarChart2 size={16} />
          <span>Responses</span>
        </button>
      </nav>

      <div className="nav-actions">
        {dbStatus && (
          <div className="db-pill" title={`Connected to ${dbStatus.database} database`}>
            <span className="db-dot" />
            <span>{dbStatus.database === 'sqlite' ? 'SQLite (Dev)' : 'PostgreSQL'}</span>
          </div>
        )}

        <button className="btn btn-secondary btn-sm" onClick={onOpenTemplates}>
          Templates
        </button>

        <button className="btn btn-primary btn-sm" onClick={onCreateBlank}>
          <Plus size={16} />
          <span>New Form</span>
        </button>

        {/* User Authentication Status */}
        {currentUser ? (
          <div className="user-profile-menu-container" ref={userMenuRef}>
            <button
              className="user-profile-btn"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              title={currentUser.email}
            >
              <div className="user-avatar-circle">
                {getInitials(currentUser)}
              </div>
              <span className="user-profile-name">
                {currentUser.full_name || currentUser.email.split('@')[0]}
              </span>
              <ChevronDown size={14} className="user-chevron" />
            </button>

            {isUserMenuOpen && (
              <div className="user-dropdown-menu">
                <div className="user-dropdown-header">
                  <div className="user-dropdown-email">{currentUser.email}</div>
                  <div className="user-dropdown-badge">Authenticated Account</div>
                </div>
                <div className="user-dropdown-divider" />
                <button
                  className="user-dropdown-item logout-item"
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    onLogout();
                  }}
                >
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            className="btn btn-secondary btn-sm auth-signin-btn"
            onClick={onOpenAuthModal}
            title="Sign In or Register"
          >
            <LogIn size={15} />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}
