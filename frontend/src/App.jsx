import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import Toolbox from './components/builder/Toolbox';
import Canvas from './components/builder/Canvas';
import Inspector from './components/builder/Inspector';
import RespondentView from './components/RespondentView';
import AnalyticsView from './components/AnalyticsView';
import Toast from './components/Toast';
import AuthModal from './components/AuthModal';
import AccountModal from './components/AccountModal';
import { api } from './api/client';
import { Sun, Moon, Plus, Edit3, Sliders, Loader2, AlertCircle } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => api.getUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('formbuilder_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    } catch {
      // ignore
    }
    return 'light';
  });

  const [mobileBuilderTab, setMobileBuilderTab] = useState('canvas'); // 'toolbox' | 'canvas' | 'inspector'

  const [forms, setForms] = useState([]);
  const [activeFormId, setActiveFormId] = useState(null);
  const [activeForm, setActiveForm] = useState(null);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' | 'builder' | 'respondent' | 'analytics'
  const [dbStatus, setDbStatus] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isStandaloneRespondent, setIsStandaloneRespondent] = useState(false);
  const [isPublicLoading, setIsPublicLoading] = useState(false);
  const [publicError, setPublicError] = useState(null);

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('formbuilder_theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  // Handle automatic session expiration
  useEffect(() => {
    const handleAuthExpired = () => {
      setCurrentUser(null);
      showToast('Your session has expired. Please sign in again.', 'warning');
      openAuthModal('login');
    };
    window.addEventListener('formbuilder:auth-expired', handleAuthExpired);
    return () => window.removeEventListener('formbuilder:auth-expired', handleAuthExpired);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const showToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const openAuthModal = (mode = 'login') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const requireAuth = (actionName = 'proceed') => {
    if (!currentUser) {
      openAuthModal('login');
      showToast(`Please sign in to ${actionName}.`, 'info');
      return false;
    }
    return true;
  };

  // Robust extraction of public survey ID from either:
  // 1) Query parameter: ?public=123 or ?survey=123
  // 2) Clean path segment: /public/123, /p/123, /survey/123, /forms/123
  const getPublicSurveyId = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const fromQuery = params.get('survey') || params.get('public');
      if (fromQuery) return fromQuery;

      const pathname = window.location.pathname || '';
      const match = pathname.match(/^\/(?:public|survey|p|forms)\/([0-9a-zA-Z_-]+)/i);
      if (match) return match[1];
    } catch {
      // ignore
    }
    return null;
  };

  // Helper to sync browser URL history cleanly
  const syncUrl = (view, formId, replace = false) => {
    let targetUrl = '/';
    if (view && view !== 'dashboard' && formId) {
      targetUrl = `/?view=${view}&formId=${formId}`;
    } else if (view && view !== 'dashboard') {
      targetUrl = `/?view=${view}`;
    }

    const currentSearch = window.location.search;
    const targetSearch = targetUrl.includes('?') ? targetUrl.substring(targetUrl.indexOf('?')) : '';
    const currentPath = window.location.pathname;

    if (currentSearch !== targetSearch || (currentPath !== '/' && currentPath !== '')) {
      if (replace) {
        window.history.replaceState({ view, formId }, '', targetUrl);
      } else {
        window.history.pushState({ view, formId }, '', targetUrl);
      }
    }
  };

  // Listen to browser Back / Forward buttons (popstate)
  useEffect(() => {
    const handlePopState = async () => {
      const surveyId = getPublicSurveyId();
      if (surveyId) {
        setIsStandaloneRespondent(true);
        setIsPublicLoading(true);
        setPublicError(null);
        try {
          const data = await api.getPublicForm(surveyId);
          setActiveForm(data);
          setActiveView('respondent');
        } catch (err) {
          setPublicError(err.message || 'Survey unavailable or unpublished.');
          showToast(err.message, 'error');
        } finally {
          setIsPublicLoading(false);
        }
        return;
      }

      setIsStandaloneRespondent(false);
      setPublicError(null);
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view') || 'dashboard';
      const formIdParam = params.get('formId') || params.get('form');

      if (viewParam === 'dashboard' || !formIdParam) {
        setActiveView('dashboard');
      } else {
        const parsedId = Number(formIdParam) || formIdParam;
        try {
          const data = await api.getForm(parsedId);
          setActiveFormId(parsedId);
          setActiveForm(data);
          if (data.fields && data.fields.length > 0) {
            setSelectedFieldId(data.fields[0].id);
          } else {
            setSelectedFieldId(null);
          }
          setActiveView(viewParam);
        } catch (err) {
          console.error('Failed to load form from history:', err);
          setActiveView('dashboard');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Initial load & check DB health & session validation
  useEffect(() => {
    api.checkDbHealth().then(setDbStatus);

    const initApp = async () => {
      // Validate current user session with backend
      let verifiedUser = null;
      if (api.getToken()) {
        try {
          verifiedUser = await api.getMe();
          setCurrentUser(verifiedUser);
        } catch (err) {
          api.clearAuth();
          setCurrentUser(null);
        }
      }

      let loadedForms = [];
      try {
        loadedForms = await api.getForms();
        setForms(loadedForms);
      } catch (err) {
        console.error('Failed to load forms:', err);
      }

      // Check URL parameters or path for direct deep-link or public survey
      const surveyId = getPublicSurveyId();
      if (surveyId) {
        setIsStandaloneRespondent(true);
        setIsPublicLoading(true);
        setPublicError(null);
        try {
          const data = await api.getPublicForm(surveyId);
          setActiveForm(data);
          setActiveView('respondent');
        } catch (err) {
          setPublicError(err.message || 'Survey unavailable or unpublished.');
          showToast(err.message, 'error');
        } finally {
          setIsPublicLoading(false);
        }
        return;
      }

      const viewParam = params.get('view');
      const formIdParam = params.get('formId') || params.get('form');

      if (formIdParam && ['builder', 'respondent', 'analytics'].includes(viewParam)) {
        const parsedId = Number(formIdParam) || formIdParam;
        try {
          const data = await api.getForm(parsedId);
          setActiveFormId(parsedId);
          setActiveForm(data);
          if (data.fields && data.fields.length > 0) {
            setSelectedFieldId(data.fields[0].id);
          } else {
            setSelectedFieldId(null);
          }
          setActiveView(viewParam);
        } catch (err) {
          console.error('Could not load deep-linked form:', err);
          if (err.status === 401) {
            openAuthModal('login');
            showToast('Please sign in to access this form.', 'info');
          }
          setActiveView('dashboard');
        }
      } else if (['builder', 'respondent', 'analytics'].includes(viewParam) && loadedForms.length > 0) {
        const firstId = loadedForms[0].id;
        try {
          const data = await api.getForm(firstId);
          setActiveFormId(firstId);
          setActiveForm(data);
          if (data.fields && data.fields.length > 0) {
            setSelectedFieldId(data.fields[0].id);
          }
          setActiveView(viewParam);
          syncUrl(viewParam, firstId, true);
        } catch (err) {
          setActiveView('dashboard');
        }
      } else {
        setActiveView('dashboard');
      }
    };

    initApp();
  }, []);

  const loadForms = async () => {
    try {
      const data = await api.getForms();
      setForms(data);
      return data;
    } catch (err) {
      console.error('Failed to load forms:', err);
      setForms([]);
      return [];
    }
  };

  const handleAuthSuccess = async (user, message) => {
    setCurrentUser(user);
    showToast(message, 'success');
    const userForms = await loadForms();
    if (userForms.length > 0 && !activeForm) {
      setActiveFormId(userForms[0].id);
      setActiveForm(userForms[0]);
    }
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setActiveFormId(null);
    setActiveForm(null);
    setForms([]);
    setActiveView('dashboard');
    syncUrl('dashboard', null, false);
    showToast('Signed out successfully.', 'info');
  };

  const selectForm = async (formId, targetView = 'builder', pushHistory = true) => {
    try {
      const data = await api.getForm(formId);
      setActiveFormId(formId);
      setActiveForm(data);
      if (data.fields && data.fields.length > 0) {
        setSelectedFieldId(data.fields[0].id);
      } else {
        setSelectedFieldId(null);
      }
      setActiveView(targetView);
      if (pushHistory) {
        syncUrl(targetView, formId, false);
      }
    } catch (err) {
      if (err.status === 401) {
        openAuthModal('login');
      }
      showToast(err.message, 'error');
    }
  };

  const navigateTo = async (targetView, formId = null, pushHistory = true) => {
    if (targetView === 'dashboard') {
      setActiveView('dashboard');
      if (pushHistory) {
        syncUrl('dashboard', null, false);
      }
      return;
    }

    if (['builder', 'analytics'].includes(targetView) && !currentUser) {
      requireAuth(`open ${targetView}`);
      return;
    }

    // Determine target form ID
    const resolvedFormId = formId || activeFormId || (forms.length > 0 ? forms[0].id : null);

    if (resolvedFormId) {
      await selectForm(resolvedFormId, targetView, pushHistory);
    } else {
      if (targetView === 'builder') {
        if (!requireAuth('create or edit a form')) return;
        setIsTemplatesModalOpen(true);
        showToast('Please select or create a form first.', 'info');
      } else {
        showToast('No forms available yet. Create a form first.', 'info');
      }
    }
  };

  const handleCreateBlank = async () => {
    if (!requireAuth('create a form')) return;

    try {
      const newForm = await api.createForm({
        title: 'Untitled Survey',
        description: 'Please answer the questions below.',
        theme_color: '#4F46E5',
        is_published: false,
      });
      await loadForms();
      setActiveFormId(newForm.id);
      setActiveForm(newForm);
      setSelectedFieldId(null);
      setActiveView('builder');
      syncUrl('builder', newForm.id, false);
      showToast('New blank form created!', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleCreateTemplate = async (templateKey) => {
    if (!requireAuth('use templates')) return;

    try {
      const newForm = await api.createFromTemplate(templateKey);
      await loadForms();
      setActiveFormId(newForm.id);
      setActiveForm(newForm);
      if (newForm.fields && newForm.fields.length > 0) {
        setSelectedFieldId(newForm.fields[0].id);
      }
      setActiveView('builder');
      syncUrl('builder', newForm.id, false);
      showToast(`Created form from template!`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDeleteForm = async (formId) => {
    if (!requireAuth('delete this form')) return;
    if (!window.confirm('Are you sure you want to delete this form and all its responses?')) {
      return;
    }
    try {
      await api.deleteForm(formId);
      await loadForms();
      if (activeFormId === formId) {
        setActiveFormId(null);
        setActiveForm(null);
        setActiveView('dashboard');
        syncUrl('dashboard', null, false);
      }
      showToast('Form deleted successfully.', 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDuplicateForm = async (formId) => {
    if (!requireAuth('duplicate this form')) return;

    try {
      const dup = await api.duplicateForm(formId);
      await loadForms();
      showToast(`Duplicated as "${dup.title}"`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleTogglePublish = async (formId) => {
    if (!requireAuth('toggle publishing')) return;

    try {
      const res = await api.togglePublish(formId);
      await loadForms();
      if (activeForm && activeForm.id === formId) {
        setActiveForm((prev) => ({ ...prev, is_published: res.is_published }));
      }
      showToast(
        res.is_published ? 'Form is now Published and live!' : 'Form moved to Drafts.',
        res.is_published ? 'success' : 'info'
      );
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleCopyShareLink = (formId) => {
    const baseOrigin = import.meta.env.VITE_PUBLIC_URL || window.location.origin;
    const url = `${baseOrigin}/?public=${formId}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url)
        .then(() => {
          showToast('Public survey link copied to clipboard!', 'success');
        })
        .catch(() => {
          showToast(`Public survey link: ${url}`, 'info');
        });
    } else {
      showToast(`Public survey link: ${url}`, 'info');
    }
  };

  // Builder actions
  const handleUpdateFormHeader = async (patch) => {
    if (!requireAuth('save changes')) return;

    setActiveForm((prev) => ({ ...prev, ...patch }));
    try {
      await api.updateForm(activeForm.id, patch);
      await loadForms();
    } catch (err) {
      console.error('Failed to update form header:', err);
    }
  };

  const handleUpdateFormSettings = async (patch) => {
    if (!requireAuth('update form settings')) return;

    setActiveForm((prev) => ({ ...prev, ...patch }));
    try {
      await api.updateForm(activeForm.id, patch);
      await loadForms();
      showToast('Form settings updated.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleAddField = async (type, defaultProps) => {
    if (!requireAuth('add questions')) return;
    if (!activeForm) return;

    try {
      const newField = await api.addField(activeForm.id, {
        field_type: type,
        ...defaultProps,
      });
      setActiveForm((prev) => ({
        ...prev,
        fields: [...(prev.fields || []), newField],
      }));
      setSelectedFieldId(newField.id);
      if (typeof window !== 'undefined' && window.innerWidth <= 768) {
        setMobileBuilderTab('canvas');
      }
      await loadForms();
      showToast(`Added ${type} question.`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleSelectField = (fieldId) => {
    setSelectedFieldId(fieldId);
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      setMobileBuilderTab('inspector');
    }
  };

  const handleUpdateField = async (fieldId, patch) => {
    if (!requireAuth('modify questions')) return;

    setActiveForm((prev) => ({
      ...prev,
      fields: (prev.fields || []).map((f) => (f.id === fieldId ? { ...f, ...patch } : f)),
    }));
    try {
      await api.updateField(activeForm.id, fieldId, patch);
    } catch (err) {
      console.error('Failed to update field:', err);
    }
  };

  const handleDeleteField = async (fieldId) => {
    if (!requireAuth('delete questions')) return;

    try {
      await api.deleteField(activeForm.id, fieldId);
      setActiveForm((prev) => {
        const remaining = (prev.fields || []).filter((f) => f.id !== fieldId);
        return { ...prev, fields: remaining };
      });
      if (selectedFieldId === fieldId) {
        setSelectedFieldId(null);
      }
      await loadForms();
      showToast('Question removed.', 'info');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleDuplicateField = async (field) => {
    if (!requireAuth('duplicate questions')) return;

    try {
      const newField = await api.addField(activeForm.id, {
        field_type: field.field_type,
        label: `${field.label} (Copy)`,
        placeholder: field.placeholder,
        help_text: field.help_text,
        required: field.required,
        options: field.options,
        validation_rules: field.validation_rules,
      });
      setActiveForm((prev) => ({
        ...prev,
        fields: [...(prev.fields || []), newField],
      }));
      setSelectedFieldId(newField.id);
      await loadForms();
      showToast('Question duplicated.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleMoveField = async (fromIndex, toIndex) => {
    if (!requireAuth('reorder questions')) return;
    if (!activeForm || !activeForm.fields) return;

    const currentFields = [...activeForm.fields];
    const [moved] = currentFields.splice(fromIndex, 1);
    currentFields.splice(toIndex, 0, moved);

    setActiveForm((prev) => ({ ...prev, fields: currentFields }));
    try {
      await api.reorderFields(activeForm.id, currentFields);
    } catch (err) {
      console.error('Failed to reorder fields:', err);
    }
  };

  // Public submission handler (Anonymous respondents can always submit!)
  const handleSubmitResponse = async (formId, answers) => {
    const res = await api.submitPublicForm(formId, answers);
    if (currentUser) {
      await loadForms();
    }
    return res;
  };

  const selectedField = activeForm?.fields?.find((f) => f.id === selectedFieldId);

  // Standalone respondent view (direct survey taker)
  if (isStandaloneRespondent) {
    if (isPublicLoading) {
      return (
        <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={36} className="spin-animation" style={{ margin: '0 auto 1rem auto', color: 'var(--primary)' }} />
            <p style={{ fontSize: '1rem', fontWeight: 600 }}>Loading survey...</p>
          </div>
          <Toast toasts={toasts} onRemove={removeToast} />
        </main>
      );
    }

    if (publicError || !activeForm) {
      return (
        <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
          <div className="respondent-card" style={{ maxWidth: 500, textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
              <AlertCircle size={24} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem' }}>Survey Unavailable</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              {publicError || 'This form is either unpublished, closed, or does not exist.'}
            </p>
            <button className="btn btn-secondary" onClick={() => window.location.reload()}>
              Retry
            </button>
          </div>
          <Toast toasts={toasts} onRemove={removeToast} />
        </main>
      );
    }

    return (
      <main className="main-content">
        <button
          className="standalone-theme-toggle"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <RespondentView
          form={activeForm}
          onSubmitResponse={handleSubmitResponse}
          isPreview={false}
        />
        <Toast toasts={toasts} onRemove={removeToast} />
      </main>
    );
  }

  return (
    <>
      <Navbar
        activeView={activeView}
        setActiveView={navigateTo}
        activeForm={activeForm}
        hasForms={forms.length > 0}
        dbStatus={dbStatus}
        onCreateBlank={handleCreateBlank}
        onOpenTemplates={() => {
          if (requireAuth('browse templates')) {
            setIsTemplatesModalOpen(true);
          }
        }}
        currentUser={currentUser}
        onOpenAuthModal={() => openAuthModal('login')}
        onOpenAccountModal={() => setIsAccountModalOpen(true)}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="main-content">
        {activeView === 'dashboard' && (
          <Dashboard
            forms={forms}
            onSelectForm={selectForm}
            onCreateBlank={handleCreateBlank}
            onCreateTemplate={handleCreateTemplate}
            onDeleteForm={handleDeleteForm}
            onDuplicateForm={handleDuplicateForm}
            onTogglePublish={handleTogglePublish}
            onCopyShareLink={handleCopyShareLink}
            isTemplatesModalOpen={isTemplatesModalOpen}
            setIsTemplatesModalOpen={setIsTemplatesModalOpen}
            currentUser={currentUser}
            onOpenAuthModal={() => openAuthModal('login')}
          />
        )}

        {activeView === 'builder' && activeForm && (
          <div className="builder-wrapper">
            {/* Mobile / Tablet Segmented Builder Tabs */}
            <div className="builder-mobile-tabs" role="tablist" aria-label="Builder View Panels">
              <button
                type="button"
                className={`builder-mobile-tab ${mobileBuilderTab === 'toolbox' ? 'active' : ''}`}
                onClick={() => setMobileBuilderTab('toolbox')}
                role="tab"
                aria-selected={mobileBuilderTab === 'toolbox'}
              >
                <Plus size={15} />
                <span>+ Questions</span>
              </button>
              <button
                type="button"
                className={`builder-mobile-tab ${mobileBuilderTab === 'canvas' ? 'active' : ''}`}
                onClick={() => setMobileBuilderTab('canvas')}
                role="tab"
                aria-selected={mobileBuilderTab === 'canvas'}
              >
                <Edit3 size={15} />
                <span>Form ({activeForm.fields?.length || 0})</span>
              </button>
              <button
                type="button"
                className={`builder-mobile-tab ${mobileBuilderTab === 'inspector' ? 'active' : ''}`}
                onClick={() => setMobileBuilderTab('inspector')}
                role="tab"
                aria-selected={mobileBuilderTab === 'inspector'}
              >
                <Sliders size={15} />
                <span>{selectedField ? 'Question Settings' : 'Settings'}</span>
              </button>
            </div>

            <div className={`builder-layout mobile-tab-${mobileBuilderTab}`}>
              <div className="builder-panel-toolbox">
                <Toolbox onAddField={handleAddField} />
              </div>
              <div className="builder-panel-canvas">
                <Canvas
                  form={activeForm}
                  selectedFieldId={selectedFieldId}
                  onSelectField={handleSelectField}
                  onUpdateFormHeader={handleUpdateFormHeader}
                  onMoveFieldUp={(idx) => handleMoveField(idx, idx - 1)}
                  onMoveFieldDown={(idx) => handleMoveField(idx, idx + 1)}
                  onDeleteField={handleDeleteField}
                  onDuplicateField={handleDuplicateField}
                  onPreview={() => navigateTo('respondent', activeForm.id)}
                  onShare={() => handleCopyShareLink(activeForm.id)}
                  onResponses={() => navigateTo('analytics', activeForm.id)}
                />
              </div>
              <div className="builder-panel-inspector">
                <Inspector
                  selectedField={selectedField}
                  form={activeForm}
                  onUpdateField={handleUpdateField}
                  onUpdateFormSettings={handleUpdateFormSettings}
                  onTogglePublish={handleTogglePublish}
                  onCopyShareLink={handleCopyShareLink}
                />
              </div>
            </div>
          </div>
        )}

        {activeView === 'respondent' && activeForm && (
          <RespondentView
            form={activeForm}
            onSubmitResponse={handleSubmitResponse}
            onBackToStudio={() => navigateTo('builder', activeForm.id)}
            isPreview={true}
          />
        )}

        {activeView === 'analytics' && activeForm && (
          <AnalyticsView
            form={activeForm}
            onBack={() => navigateTo('dashboard')}
            onOpenBuilder={() => navigateTo('builder', activeForm.id)}
          />
        )}
      </main>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        initialMode={authModalMode}
      />

      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        currentUser={currentUser}
        onUserUpdated={(u) => {
          setCurrentUser(u);
          api.setUser(u);
        }}
        onLogout={handleLogout}
        showToast={showToast}
      />

      <Toast toasts={toasts} onRemove={removeToast} />
    </>
  );
}
