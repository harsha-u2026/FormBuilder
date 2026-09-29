import React, { useState } from 'react';
import {
  Plus,
  Sparkles,
  Search,
  FileText,
  Users,
  CheckCircle2,
  Calendar,
  Share2,
  Copy,
  Trash2,
  Edit3,
  Eye,
  BarChart2,
  ExternalLink,
  Briefcase,
  AlertTriangle,
  X,
} from 'lucide-react';

export default function Dashboard({
  forms,
  onSelectForm,
  onCreateBlank,
  onCreateTemplate,
  onDeleteForm,
  onDuplicateForm,
  onTogglePublish,
  onCopyShareLink,
  isTemplatesModalOpen,
  setIsTemplatesModalOpen,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Compute metrics
  const totalForms = forms.length;
  const totalSubmissions = forms.reduce((acc, f) => acc + (f.response_count || 0), 0);
  const activeForms = forms.filter((f) => f.is_published).length;
  const avgQuestions = totalForms > 0 ? Math.round(forms.reduce((acc, f) => acc + (f.field_count || 0), 0) / totalForms) : 0;

  // Filter forms
  const filteredForms = forms.filter((form) => {
    const matchesSearch =
      form.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (form.description && form.description.toLowerCase().includes(searchTerm.toLowerCase()));

    if (statusFilter === 'published') return matchesSearch && form.is_published;
    if (statusFilter === 'draft') return matchesSearch && !form.is_published;
    return matchesSearch;
  });

  const templateOptions = [
    {
      key: 'csat',
      title: 'Customer Satisfaction (CSAT)',
      desc: 'Measure user satisfaction with rating scales, recommendation score, and open-ended feedback.',
      icon: Users,
      color: '#4F46E5',
    },
    {
      key: 'event',
      title: 'Event Registration & RSVP',
      desc: 'Collect attendee contact details, in-person vs virtual attendance, and dietary preferences.',
      icon: Calendar,
      color: '#0284C7',
    },
    {
      key: 'job',
      title: 'Job Application Form',
      desc: 'Screen candidates with role selection, experience level, portfolio link, and motivation.',
      icon: Briefcase,
      color: '#16A34A',
    },
    {
      key: 'bug',
      title: 'Bug & Issue Report',
      desc: 'Streamline bug tracking with severity level, reproduction steps, and expected behavior.',
      icon: AlertTriangle,
      color: '#DC2626',
    },
  ];

  return (
    <div className="dashboard-container">
      {/* Hero Section */}
      <div className="dashboard-hero">
        <div>
          <h1 className="hero-title">Forms & Surveys Dashboard</h1>
          <p className="hero-subtitle">
            Create, distribute, and analyze beautiful forms with instant real-time responses.
          </p>
        </div>
        <div className="hero-actions">
          <button className="btn btn-secondary" onClick={() => setIsTemplatesModalOpen(true)}>
            <Sparkles size={16} />
            <span>Templates</span>
          </button>
          <button className="btn btn-primary" onClick={onCreateBlank}>
            <Plus size={16} />
            <span>Create Form</span>
          </button>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon-box" style={{ background: 'var(--color-accent-light, #EEF2FF)', color: 'var(--color-primary, #4F46E5)' }}>
            <FileText size={24} />
          </div>
          <div>
            <div className="metric-val">{totalForms}</div>
            <div className="metric-label">Total Forms</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box" style={{ background: 'var(--color-success-light, #DCFCE7)', color: 'var(--color-success, #16A34A)' }}>
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="metric-val">{totalSubmissions}</div>
            <div className="metric-label">Total Responses</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box" style={{ background: 'var(--color-info-light, #E0F2FE)', color: 'var(--color-info, #0284C7)' }}>
            <Users size={24} />
          </div>
          <div>
            <div className="metric-val">{activeForms}</div>
            <div className="metric-label">Published Forms</div>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon-box" style={{ background: 'var(--color-warning-light, #FEF3C7)', color: 'var(--color-warning, #D97706)' }}>
            <Sparkles size={24} />
          </div>
          <div>
            <div className="metric-val">{avgQuestions}</div>
            <div className="metric-label">Avg Questions / Form</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="filter-bar">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search forms by title or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-pills">
          <button
            className={`filter-pill ${statusFilter === 'all' ? 'active' : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            All ({forms.length})
          </button>
          <button
            className={`filter-pill ${statusFilter === 'published' ? 'active' : ''}`}
            onClick={() => setStatusFilter('published')}
          >
            Published ({forms.filter((f) => f.is_published).length})
          </button>
          <button
            className={`filter-pill ${statusFilter === 'draft' ? 'active' : ''}`}
            onClick={() => setStatusFilter('draft')}
          >
            Drafts ({forms.filter((f) => !f.is_published).length})
          </button>
        </div>
      </div>

      {/* Forms Grid */}
      {filteredForms.length === 0 ? (
        <div className="canvas-sheet" style={{ margin: '2rem auto', textAlign: 'center', padding: '4rem 2rem' }}>
          <FileText size={48} color="var(--text-faint)" style={{ margin: '0 auto 1rem auto' }} />
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>No forms found</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {searchTerm || statusFilter !== 'all'
              ? 'Try clearing your search query or status filter.'
              : 'Get started by creating your first form from scratch or using a template.'}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button className="btn btn-secondary" onClick={() => setIsTemplatesModalOpen(true)}>
              <Sparkles size={16} />
              <span>Choose Template</span>
            </button>
            <button className="btn btn-primary" onClick={onCreateBlank}>
              <Plus size={16} />
              <span>Create Blank Form</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="forms-grid">
          {filteredForms.map((form) => (
            <div
              key={form.id}
              className="form-card"
              style={{ '--card-accent': form.theme_color || '#4F46E5', cursor: 'pointer' }}
              onClick={() => onSelectForm(form.id, 'builder')}
              title="Click to open form builder"
            >
              <div>
                <div className="form-card-top" onClick={(e) => e.stopPropagation()}>
                  <span
                    className={`status-badge ${form.is_published ? 'published' : 'draft'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePublish(form.id);
                    }}
                    style={{ cursor: 'pointer' }}
                    title="Click to toggle publish status"
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        backgroundColor: form.is_published ? 'var(--success)' : 'var(--warning)',
                      }}
                    />
                    {form.is_published ? 'Published' : 'Draft'}
                  </span>

                  <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>
                    {new Date(form.updated_at).toLocaleDateString()}
                  </span>
                </div>

                <h3
                  className="form-card-title"
                  onClick={() => onSelectForm(form.id, 'builder')}
                  style={{ cursor: 'pointer' }}
                >
                  {form.title}
                </h3>
                <p className="form-card-desc">{form.description || 'No description provided.'}</p>
              </div>

              <div>
                <div className="form-card-meta">
                  <span
                    className="meta-chip"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectForm(form.id, 'builder');
                    }}
                    title="Open Form Builder"
                    style={{ cursor: 'pointer' }}
                  >
                    <FileText size={14} />
                    <span>{form.field_count} questions</span>
                  </span>
                  <span
                    className="meta-chip"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectForm(form.id, 'analytics');
                    }}
                    title="View Responses & Analytics"
                    style={{ cursor: 'pointer' }}
                  >
                    <CheckCircle2 size={14} />
                    <span>{form.response_count} responses</span>
                  </span>
                </div>

                <div className="form-card-actions" onClick={(e) => e.stopPropagation()}>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectForm(form.id, 'builder');
                      }}
                      title="Edit form structure in Builder"
                    >
                      <Edit3 size={14} />
                      <span>Builder</span>
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectForm(form.id, 'respondent');
                      }}
                      title="Preview or test form as a respondent"
                    >
                      <Eye size={14} />
                      <span>Preview</span>
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectForm(form.id, 'analytics');
                      }}
                      title="View responses and visual analytics"
                    >
                      <BarChart2 size={14} />
                      <span>Responses</span>
                    </button>
                  </div>

                  <div className="action-group-right">
                    <button
                      className="btn btn-ghost btn-sm btn-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCopyShareLink(form.id);
                      }}
                      title="Copy Public Link"
                    >
                      <Share2 size={14} />
                    </button>
                    <button
                      className="btn btn-ghost btn-sm btn-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateForm(form.id);
                      }}
                      title="Duplicate Form"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      className="btn btn-ghost btn-sm btn-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteForm(form.id);
                      }}
                      style={{ color: 'var(--color-error, #DC2626)' }}
                      title="Delete Form"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Template Picker Modal */}
      {isTemplatesModalOpen && (
        <div className="modal-overlay" onClick={() => setIsTemplatesModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Sparkles size={20} color="var(--primary)" />
                <h2 className="modal-title">Select a Form Template</h2>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setIsTemplatesModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="template-grid">
                {templateOptions.map((tpl) => {
                  const IconComp = tpl.icon;
                  return (
                    <div
                      key={tpl.key}
                      className="template-card"
                      onClick={() => {
                        onCreateTemplate(tpl.key);
                        setIsTemplatesModalOpen(false);
                      }}
                    >
                      <div className="template-badge" style={{ background: tpl.color }}>
                        <IconComp size={20} />
                      </div>
                      <div className="template-name">{tpl.title}</div>
                      <div className="template-desc">{tpl.desc}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
