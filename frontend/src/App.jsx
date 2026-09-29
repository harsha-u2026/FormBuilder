import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import Toolbox from './components/builder/Toolbox';
import Canvas from './components/builder/Canvas';
import Inspector from './components/builder/Inspector';
import RespondentView from './components/RespondentView';
import AnalyticsView from './components/AnalyticsView';
import Toast from './components/Toast';
import { api } from './api/client';

export default function App() {
  const [forms, setForms] = useState([]);
  const [activeFormId, setActiveFormId] = useState(null);
  const [activeForm, setActiveForm] = useState(null);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [activeView, setActiveView] = useState('dashboard'); // 'dashboard' | 'builder' | 'respondent' | 'analytics'
  const [dbStatus, setDbStatus] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [isStandaloneRespondent, setIsStandaloneRespondent] = useState(false);

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

  // Initial load & check DB health
  useEffect(() => {
    api.checkDbHealth().then(setDbStatus);

    const initApp = async () => {
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
      return [];
    }
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

    // Determine target form ID
    const resolvedFormId = formId || activeFormId || (forms.length > 0 ? forms[0].id : null);

    if (resolvedFormId) {
      await selectForm(resolvedFormId, targetView, pushHistory);
    } else {
      if (targetView === 'builder') {
        setIsTemplatesModalOpen(true);
        showToast('Please select or create a form first.', 'info');
      } else {
        showToast('No forms available yet. Create a form first.', 'info');
      }
    }
  };

  const handleCreateBlank = async () => {
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
    try {
      const dup = await api.duplicateForm(formId);
      await loadForms();
      showToast(`Duplicated as "${dup.title}"`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleTogglePublish = async (formId) => {
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
    setActiveForm((prev) => ({ ...prev, ...patch }));
    try {
      await api.updateForm(activeForm.id, patch);
      await loadForms();
    } catch (err) {
      console.error('Failed to update form header:', err);
    }
  };

  const handleUpdateFormSettings = async (patch) => {
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
      await loadForms();
      showToast(`Added ${type} question.`, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleUpdateField = async (fieldId, patch) => {
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

  const handleSubmitResponse = async (formId, answers) => {
    const res = await api.submitPublicForm(formId, answers);
    await loadForms();
    return res;
  };

  const selectedField = activeForm?.fields?.find((f) => f.id === selectedFieldId);

  // Standalone respondent view (direct survey taker)
  if (isStandaloneRespondent && activeForm) {
    return (
      <main className="main-content">
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
        onOpenTemplates={() => setIsTemplatesModalOpen(true)}
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
          />
        )}

        {activeView === 'builder' && activeForm && (
          <div className="builder-layout">
            <Toolbox onAddField={handleAddField} />
            <Canvas
              form={activeForm}
              selectedFieldId={selectedFieldId}
              onSelectField={setSelectedFieldId}
              onUpdateFormHeader={handleUpdateFormHeader}
              onMoveFieldUp={(idx) => handleMoveField(idx, idx - 1)}
              onMoveFieldDown={(idx) => handleMoveField(idx, idx + 1)}
              onDeleteField={handleDeleteField}
              onDuplicateField={handleDuplicateField}
              onPreview={() => navigateTo('respondent', activeForm.id)}
              onShare={() => handleCopyShareLink(activeForm.id)}
              onResponses={() => navigateTo('analytics', activeForm.id)}
            />
            <Inspector
              selectedField={selectedField}
              form={activeForm}
              onUpdateField={handleUpdateField}
              onUpdateFormSettings={handleUpdateFormSettings}
              onTogglePublish={handleTogglePublish}
              onCopyShareLink={handleCopyShareLink}
            />
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

      <Toast toasts={toasts} onRemove={removeToast} />
    </>
  );
}
