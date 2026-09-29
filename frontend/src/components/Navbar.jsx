import React from 'react';
import { Layers, Edit3, Eye, BarChart2, Sparkles, Plus, Database } from 'lucide-react';

export default function Navbar({
  activeView,
  setActiveView,
  activeForm,
  hasForms = false,
  dbStatus,
  onCreateBlank,
  onOpenTemplates,
}) {
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
      </div>
    </header>
  );
}
