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
import { api } from './api/client';
import { Sun, Moon, Plus, Edit3, Sliders } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => api.getUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');

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

  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('formbuilder_theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

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

  // Helper to sync browser URL history
  const syncUrl = (view, formId, replace = false) => {
    let targetUrl = window.location.pathname;
    if (view && view !== 'dashboard' && formId) {
      targetUrl = `${window.location.pathname}?view=${view}&formId=${formId}`;
    } else if (view && view !== 'dashboard') {
      targetUrl = `${window.location.pathname}?view=${view}`;
    }

    const currentSearch = window.location.search;
    const targetSearch = targetUrl.includes('?') ? targetUrl.substring(targetUrl.indexOf('?')) : '';

    if (currentSearch !== targetSearch) {
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
      const params = new URLSearchParams(window.location.search);
      const surveyId = params.get('survey') || params.get('public');
      if (surveyId) {
        setIsStandaloneRespondent(true);
        try {
          const data = await api.getPublicForm(surveyId);
          setActiveForm(data);
          setActiveView('respondent');
        } catch (err) {
          showToast(err.message, 'error');
        }
        return;
      }

      setIsStandaloneRespondent(false);
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

      // Check URL parameters for direct deep-link or public survey
      const params = new URLSearchParams(window.location.search);
      const surveyId = params.get('survey') || params.get('public');
      if (surveyId) {
        setIsStandaloneRespondent(true);
        try {
          const data = await api.getPublicForm(surveyId);
          setActiveForm(data);
          setActiveView('respondent');
        } catch (err) {
          showToast(err.message, 'error');
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
    const url = `${window.location.origin}${window.location.pathname}?public=${formId}`;
    navigator.clipboard.writeText(url);
    showToast('Public survey link copied to clipboard!', 'success');
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
  if (isStandaloneRespondent && activeForm) {
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

      <Toast toasts={toasts} onRemove={removeToast} />
    </>
  );
}
