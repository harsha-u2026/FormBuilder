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
  Sun,
  Moon,
  Menu,
  X,
  ShieldCheck,
  Mail,
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
  theme = 'light',
  onToggleTheme,
}) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  // Close mobile menu on window resize to desktop
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 768) {
        setIsMobileMenuOpen(false);
      }
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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

  const handleNavClick = (view) => {
    setActiveView(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        {/* Brand Logo */}
        <div
          className="nav-brand"
          onClick={() => handleNavClick('dashboard')}
          role="button"
          tabIndex={0}
        >
          <div className="brand-icon">
            <Sparkles size={20} color="#ffffff" />
          </div>
          <span className="brand-name">FormBuilder</span>
          <span className="brand-badge">STUDIO</span>
        </div>

        {/* Desktop Navigation Tabs */}
        <nav className="nav-tabs" aria-label="Main Navigation">
          <button
            className={`nav-tab-btn ${activeView === 'dashboard' ? 'active' : ''}`}
            onClick={() => handleNavClick('dashboard')}
            title="Home Dashboard"
          >
            <Layers size={16} />
            <span className="tab-label">Dashboard</span>
          </button>

          <button
            className={`nav-tab-btn ${activeView === 'builder' ? 'active' : ''}`}
            onClick={() => handleNavClick('builder')}
            title={activeForm ? `Builder: ${activeForm.title}` : (hasForms ? 'Open Form Builder' : 'Create a form first')}
          >
            <Edit3 size={16} />
            <span className="tab-label">Builder</span>
          </button>

          <button
            className={`nav-tab-btn ${activeView === 'respondent' ? 'active' : ''}`}
            onClick={() => handleNavClick('respondent')}
            title={activeForm ? `Preview: ${activeForm.title}` : (hasForms ? 'Preview Survey' : 'Create a form first')}
          >
            <Eye size={16} />
            <span className="tab-label">Preview Survey</span>
          </button>

          <button
            className={`nav-tab-btn ${activeView === 'analytics' ? 'active' : ''}`}
            onClick={() => handleNavClick('analytics')}
            title={activeForm ? `Responses: ${activeForm.title}` : (hasForms ? 'View Responses & Analytics' : 'Create a form first')}
          >
            <BarChart2 size={16} />
            <span className="tab-label">Responses</span>
          </button>
        </nav>

        {/* Action Controls & Utilities */}
        <div className="nav-actions">
          {/* Database Status Indicator */}
          {dbStatus && (
            <div className="db-pill" title={`Connected to ${dbStatus.database} database`}>
              <span className="db-dot" />
              <span className="db-text">{dbStatus.database === 'sqlite' ? 'SQLite' : 'PostgreSQL'}</span>
            </div>
          )}

          {/* Quick Action Buttons */}
          <button
            className="btn btn-secondary btn-sm nav-desktop-btn"
            onClick={onOpenTemplates}
            title="Browse Form Templates"
          >
            Templates
          </button>

          <button
            className="btn btn-primary btn-sm nav-desktop-btn"
            onClick={onCreateBlank}
            title="Create New Blank Form"
          >
            <Plus size={16} />
            <span>New Form</span>
          </button>

          {/* Theme Toggle Button (Light / Dark) */}
          <button
            className="theme-toggle-btn"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <Sun size={18} className="theme-icon sun-icon" />
            ) : (
              <Moon size={18} className="theme-icon moon-icon" />
            )}
          </button>

          {/* Account / Profile Menu for Logged-In Users */}
          {currentUser ? (
            <div className="user-profile-menu-container" ref={userMenuRef}>
              <button
                className="user-profile-btn"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                aria-expanded={isUserMenuOpen}
                aria-haspopup="true"
                title={`Account: ${currentUser.email}`}
              >
                <div className="user-avatar-circle">
                  <UserIcon size={13} className="user-icon-glyph" />
                </div>
                <span className="user-profile-name">
                  {currentUser.full_name || currentUser.email.split('@')[0]}
                </span>
                <ChevronDown size={14} className={`user-chevron ${isUserMenuOpen ? 'open' : ''}`} />
              </button>

              {isUserMenuOpen && (
                <div className="user-dropdown-menu" role="menu">
                  <div className="user-dropdown-header">
                    <div className="user-dropdown-avatar-row">
                      <div className="user-dropdown-avatar-lg">
                        {getInitials(currentUser)}
                      </div>
                      <div className="user-dropdown-details">
                        <div className="user-dropdown-fullname">
                          {currentUser.full_name || currentUser.email.split('@')[0]}
                        </div>
                        <div className="user-dropdown-email">
                          <Mail size={12} className="inline-icon" />
                          <span>{currentUser.email}</span>
                        </div>
                      </div>
                    </div>
                    <div className="user-dropdown-badge">
                      <ShieldCheck size={13} className="inline-icon" />
                      <span>Authenticated Account</span>
                    </div>
                  </div>

                  <div className="user-dropdown-divider" />

                  <div className="user-dropdown-info-row">
                    <span className="info-label">Status</span>
                    <span className="info-value status-active">Active</span>
                  </div>

                  <div className="user-dropdown-divider" />

                  <button
                    className="user-dropdown-item logout-item"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      onLogout();
                    }}
                    role="menuitem"
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
              <span className="signin-text">Sign In</span>
            </button>
          )}

          {/* Mobile Menu Hamburger Toggle */}
          <button
            className="mobile-menu-toggle-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Dropdown Navigation */}
      {isMobileMenuOpen && (
        <div className="mobile-nav-drawer" role="dialog" aria-label="Mobile Navigation">
          <nav className="mobile-nav-links">
            <button
              className={`mobile-nav-item ${activeView === 'dashboard' ? 'active' : ''}`}
              onClick={() => handleNavClick('dashboard')}
            >
              <Layers size={18} />
              <span>Dashboard</span>
            </button>

            <button
              className={`mobile-nav-item ${activeView === 'builder' ? 'active' : ''}`}
              onClick={() => handleNavClick('builder')}
            >
              <Edit3 size={18} />
              <span>Form Builder</span>
            </button>

            <button
              className={`mobile-nav-item ${activeView === 'respondent' ? 'active' : ''}`}
              onClick={() => handleNavClick('respondent')}
            >
              <Eye size={18} />
              <span>Preview Survey</span>
            </button>

            <button
              className={`mobile-nav-item ${activeView === 'analytics' ? 'active' : ''}`}
              onClick={() => handleNavClick('analytics')}
            >
              <BarChart2 size={18} />
              <span>Responses & Analytics</span>
            </button>
          </nav>

          <div className="mobile-drawer-actions">
            <button
              className="btn btn-primary btn-sm mobile-action-btn"
              onClick={() => {
                setIsMobileMenuOpen(false);
                onCreateBlank();
              }}
            >
              <Plus size={16} />
              <span>Create New Form</span>
            </button>

            <button
              className="btn btn-secondary btn-sm mobile-action-btn"
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenTemplates();
              }}
            >
              <Sparkles size={16} />
              <span>Browse Templates</span>
            </button>

            {dbStatus && (
              <div className="mobile-db-pill">
                <span className="db-dot" />
                <span>Connected: {dbStatus.database === 'sqlite' ? 'SQLite (Dev)' : 'PostgreSQL'}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
