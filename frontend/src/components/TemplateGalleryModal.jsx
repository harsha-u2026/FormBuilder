import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Search,
  Eye,
  ArrowRight,
  Plus,
  Users,
  GraduationCap,
  Calendar,
  Briefcase,
  HelpCircle,
  Bug,
  CheckCircle2,
  Sliders,
  Star,
  FileText,
  Tag,
} from 'lucide-react';
import { api } from '../api/client';

const CATEGORY_ICONS = {
  'All': Sparkles,
  'Customer Feedback': Users,
  'Education': GraduationCap,
  'Events & Meetups': Calendar,
  'Hiring & Careers': Briefcase,
  'Quizzes & Testing': HelpCircle,
  'Testing & QA': Bug,
};

const TEMPLATE_ICONS = {
  'csat': Users,
  'college': GraduationCap,
  'event': Calendar,
  'job': Briefcase,
  'quiz': HelpCircle,
  'bug': Bug,
};

export default function TemplateGalleryModal({
  isOpen,
  onClose,
  onCreateTemplate,
  onCreateBlank,
}) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [previewTemplate, setPreviewTemplate] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setPreviewTemplate(null);
      setSearchTerm('');
      setSelectedCategory('All');
      return;
    }

    let isMounted = true;
    const fetchTemplates = async () => {
      setLoading(true);
      try {
        const data = await api.getTemplates();
        if (isMounted) setTemplates(data);
      } catch (err) {
        console.error('Failed to load templates:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchTemplates();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Extract unique categories
  const categories = ['All', ...new Set(templates.map((t) => t.category || 'General'))];

  // Filter templates
  const filteredTemplates = templates.filter((tpl) => {
    const matchesCategory = selectedCategory === 'All' || tpl.category === selectedCategory;
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      !q ||
      tpl.title.toLowerCase().includes(q) ||
      tpl.description.toLowerCase().includes(q) ||
      (tpl.category && tpl.category.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="template-gallery-title">
      <div
        className="modal-card template-gallery-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: previewTemplate ? 960 : 860, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Modal Header */}
        <div className="modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15))',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <h2 id="template-gallery-title" className="modal-title" style={{ fontSize: '1.25rem' }}>
                Form & Survey Template Gallery
              </h2>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                Start from a professionally crafted template or launch a blank canvas
              </p>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close template gallery">
            <X size={18} />
          </button>
        </div>

        {/* Modal Search & Blank Action Bar */}
        <div
          style={{
            padding: '1rem 1.5rem',
            background: 'var(--color-surface-hover)',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
          }}
        >
          {/* Search Box */}
          <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)',
              }}
            />
            <input
              type="text"
              placeholder="Search templates (e.g. feedback, quiz, registration)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ paddingLeft: '2.25rem', fontSize: '0.875rem' }}
            />
          </div>

          {/* Blank Form Button */}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              onClose();
              onCreateBlank();
            }}
            title="Create an empty form without pre-populated questions"
          >
            <Plus size={16} />
            <span>Create Blank Form</span>
          </button>
        </div>

        {/* Category Pills */}
        <div
          style={{
            padding: '0.75rem 1.5rem',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            gap: '0.5rem',
            overflowX: 'auto',
          }}
        >
          {categories.map((cat) => {
            const IconCmp = CATEGORY_ICONS[cat] || Tag;
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                className={`category-pill ${isActive ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.4rem 0.8rem',
                  borderRadius: '999px',
                  fontSize: '0.8rem',
                  fontWeight: isActive ? 600 : 500,
                  border: isActive ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                  background: isActive ? 'rgba(99, 102, 241, 0.1)' : 'var(--color-surface)',
                  color: isActive ? 'var(--color-primary)' : 'var(--text-main)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <IconCmp size={14} />
                <span>{cat}</span>
              </button>
            );
          })}
        </div>

        {/* Main Body: Grid or Preview Split */}
        <div
          className="modal-body"
          style={{
            padding: '1.5rem',
            overflowY: 'auto',
            flex: 1,
            display: previewTemplate ? 'grid' : 'block',
            gridTemplateColumns: previewTemplate ? '1fr 1.25fr' : undefined,
            gap: '1.5rem',
          }}
        >
          {/* Templates Grid / Column */}
          <div>
            {filteredTemplates.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                <p style={{ fontWeight: 600 }}>No templates found matching "{searchTerm}"</p>
                <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Try searching for a different keyword or category.</p>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: previewTemplate ? '1fr' : 'repeat(auto-fill, minmax(250px, 1fr))',
                  gap: '1rem',
                }}
              >
                {filteredTemplates.map((tpl) => {
                  const IconComponent = TEMPLATE_ICONS[tpl.key] || Sparkles;
                  const isSelectedForPreview = previewTemplate?.key === tpl.key;

                  return (
                    <div
                      key={tpl.key}
                      className="template-card"
                      style={{
                        padding: '1.25rem',
                        borderRadius: 'var(--radius-lg)',
                        border: isSelectedForPreview
                          ? '2px solid var(--color-primary)'
                          : '1px solid var(--color-border)',
                        background: isSelectedForPreview
                          ? 'rgba(99, 102, 241, 0.04)'
                          : 'var(--color-surface)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)',
                      }}
                      onClick={() => setPreviewTemplate(tpl)}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                          <div
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 'var(--radius-md)',
                              background: tpl.theme_color || '#6366f1',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <IconComponent size={20} />
                          </div>
                          <span
                            style={{
                              fontSize: '0.725rem',
                              fontWeight: 600,
                              padding: '0.2rem 0.5rem',
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--color-surface-hover)',
                              color: 'var(--text-muted)',
                            }}
                          >
                            {tpl.field_count} Questions
                          </span>
                        </div>

                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: tpl.theme_color, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.25rem' }}>
                          {tpl.category}
                        </div>
                        <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.4rem', lineHeight: 1.3 }}>
                          {tpl.title}
                        </h3>
                        <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: '1rem' }}>
                          {tpl.description}
                        </p>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ flex: 1 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewTemplate(tpl);
                          }}
                        >
                          <Eye size={14} />
                          <span>Preview</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          style={{ flex: 1 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                            onCreateTemplate(tpl.key);
                          }}
                        >
                          <span>Use</span>
                          <ArrowRight size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Template Interactive Preview Panel */}
          {previewTemplate && (
            <div
              className="template-preview-panel"
              style={{
                background: 'var(--color-surface-hover)',
                border: '1.5px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '65vh',
                overflowY: 'auto',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: previewTemplate.theme_color, textTransform: 'uppercase' }}>
                    Previewing Template
                  </span>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0.2rem 0' }}>
                    {previewTemplate.title}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {previewTemplate.description}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon btn-sm"
                  onClick={() => setPreviewTemplate(null)}
                  title="Close preview"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Preconfigured Questions List */}
              <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <CheckCircle2 size={16} color="var(--color-primary)" />
                  <span>Included Questions ({previewTemplate.fields?.length || 0})</span>
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {previewTemplate.fields?.map((field, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '0.9rem 1rem',
                        background: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                          Question #{idx + 1}
                        </span>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <span
                            style={{
                              fontSize: '0.7rem',
                              padding: '0.1rem 0.4rem',
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--color-surface-hover)',
                              color: 'var(--text-main)',
                              fontWeight: 600,
                            }}
                          >
                            {field.field_type}
                          </span>
                          {field.required && (
                            <span
                              style={{
                                fontSize: '0.7rem',
                                padding: '0.1rem 0.4rem',
                                borderRadius: 'var(--radius-sm)',
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: '#ef4444',
                                fontWeight: 600,
                              }}
                            >
                              Required
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        {field.label}
                      </div>

                      {field.help_text && (
                        <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          {field.help_text}
                        </div>
                      )}

                      {field.options && Array.isArray(field.options) && (
                        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                          {field.options.map((opt, oIdx) => (
                            <span
                              key={oIdx}
                              style={{
                                fontSize: '0.725rem',
                                padding: '0.15rem 0.5rem',
                                borderRadius: 'var(--radius-sm)',
                                background: 'var(--color-surface-hover)',
                                border: '1px solid var(--color-border)',
                                color: 'var(--text-main)',
                              }}
                            >
                              {typeof opt === 'object' ? opt.label || opt.value : String(opt)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.75rem' }}
                onClick={() => {
                  onClose();
                  onCreateTemplate(previewTemplate.key);
                }}
              >
                <span>Use This Template</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
