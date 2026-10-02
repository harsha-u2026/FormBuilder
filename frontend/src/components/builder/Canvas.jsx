import React, { useEffect, useRef } from 'react';
import {
  MoveUp,
  MoveDown,
  Trash2,
  Copy,
  Plus,
  Eye,
  Share2,
  BarChart2,
  GripVertical,
  Star,
  CheckCircle2,
  CircleDot,
  CheckSquare,
  ChevronDown,
  ToggleLeft,
  Calendar,
  UploadCloud,
  GitBranch,
} from 'lucide-react';

export default function Canvas({
  form,
  selectedFieldId,
  onSelectField,
  onUpdateFormHeader,
  onMoveFieldUp,
  onMoveFieldDown,
  onDeleteField,
  onDuplicateField,
  onPreview,
  onShare,
  onResponses,
}) {
  const fields = form.fields || [];
  const containerRef = useRef(null);

  useEffect(() => {
    if (selectedFieldId) {
      const el = document.getElementById(`field-card-${selectedFieldId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedFieldId]);

  return (
    <div className="builder-canvas-container" ref={containerRef}>
      {/* Top Bar above canvas */}
      <div className="builder-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span
            className={`status-badge ${form.is_published ? 'published' : 'draft'}`}
            style={{ fontSize: '0.75rem' }}
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
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {fields.length} {fields.length === 1 ? 'Question' : 'Questions'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={onPreview}>
            <Eye size={14} />
            <span>Preview</span>
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onShare}>
            <Share2 size={14} />
            <span>Share</span>
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onResponses}>
            <BarChart2 size={14} />
            <span>Responses ({form.response_count || 0})</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Sheet */}
      <div className="canvas-sheet" style={{ '--card-accent': form.theme_color || '#6366f1' }}>
        {/* Form Title & Description Header */}
        <div className="canvas-header">
          <input
            type="text"
            className="form-title-input"
            value={form.title || ''}
            placeholder="Form Title"
            onChange={(e) => onUpdateFormHeader({ title: e.target.value })}
          />
          <textarea
            className="form-desc-input"
            value={form.description || ''}
            placeholder="Form description or instructions for respondents..."
            onChange={(e) => onUpdateFormHeader({ description: e.target.value })}
          />
        </div>

        {/* Form Fields Canvas Body */}
        <div className="canvas-body">
          {fields.length === 0 ? (
            <div className="empty-canvas">
              <Plus size={36} color="var(--primary)" />
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                No questions added yet
              </div>
              <p style={{ maxWidth: 360, fontSize: '0.875rem' }}>
                Pick a question type from the left sidebar to start building your form.
              </p>
            </div>
          ) : (
            fields.map((field, index) => {
              const isSelected = selectedFieldId === field.id;

              return (
                <div
                  key={field.id}
                  id={`field-card-${field.id}`}
                  className={`field-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => onSelectField(field.id)}
                >
                  <div className="field-card-header">
                    <div className="field-meta-info">
                      <GripVertical size={14} color="var(--text-faint)" />
                      <span className="field-type-pill">{field.field_type}</span>
                      {field.conditional_rules?.conditions?.length > 0 && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            background: 'rgba(99, 102, 241, 0.12)',
                            color: 'var(--primary)',
                            padding: '0.15rem 0.45rem',
                            borderRadius: '12px',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                          }}
                          title="Conditional rules active"
                        >
                          <GitBranch size={10} />
                          <span>Logic ({field.conditional_rules.conditions.length})</span>
                        </span>
                      )}
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>
                        #{index + 1}
                      </span>
                    </div>

                    <div className="field-controls" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => onMoveFieldUp(index)}
                        disabled={index === 0}
                        title="Move question up"
                      >
                        <MoveUp size={14} />
                      </button>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => onMoveFieldDown(index)}
                        disabled={index === fields.length - 1}
                        title="Move question down"
                      >
                        <MoveDown size={14} />
                      </button>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => onDuplicateField(field)}
                        title="Duplicate question"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        className="btn btn-ghost btn-icon btn-sm"
                        onClick={() => onDeleteField(field.id)}
                        style={{ color: '#f87171' }}
                        title="Delete question"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="field-label-preview">
                    {field.label || 'Untitled Question'}
                    {field.required && <span className="required-indicator">*</span>}
                  </div>

                  {field.help_text && (
                    <div className="field-help-preview">{field.help_text}</div>
                  )}

                  {/* Input Visual Preview */}
                  {renderFieldMock(field)}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function renderFieldMock(field) {
  const type = field.field_type;

  if (type === 'textarea') {
    return (
      <div
        className="field-input-mock"
        style={{ minHeight: 60, display: 'flex', alignItems: 'flex-start' }}
      >
        {field.placeholder || 'Long text answer...'}
      </div>
    );
  }

  if (type === 'rating') {
    return (
      <div style={{ display: 'flex', gap: '0.4rem', padding: '0.25rem 0' }}>
        {[1, 2, 3, 4, 5].map((s) => (
          <Star key={s} size={22} color="#fbbf24" fill="#fbbf24" style={{ opacity: 0.8 }} />
        ))}
      </div>
    );
  }

  if (type === 'radio') {
    const opts = field.options || ['Option 1', 'Option 2'];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.25rem' }}>
        {opts.map((opt, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <CircleDot size={14} color="var(--primary)" />
            <span>{typeof opt === 'object' ? opt.label : opt}</span>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'checkbox') {
    const opts = field.options || ['Choice 1', 'Choice 2'];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.25rem' }}>
        {opts.map((opt, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <CheckSquare size={14} color="var(--primary)" />
            <span>{typeof opt === 'object' ? opt.label : opt}</span>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'select') {
    return (
      <div className="field-input-mock" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{field.placeholder || 'Select an option...'}</span>
        <ChevronDown size={14} />
      </div>
    );
  }

  if (type === 'switch') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
        <ToggleLeft size={24} color="var(--primary)" />
        <span style={{ fontSize: '0.85rem' }}>No / Off</span>
      </div>
    );
  }

  if (type === 'date') {
    return (
      <div
        className="date-input-container"
        onClick={(e) => {
          const input = e.currentTarget.querySelector('input[type="date"]');
          if (input) {
            try {
              if (typeof input.showPicker === 'function') {
                input.showPicker();
              }
            } catch (err) {
              input.focus();
            }
          }
        }}
      >
        <input
          type="date"
          className="form-input date-picker-input"
          defaultValue=""
          onClick={(e) => {
            try {
              if (typeof e.currentTarget.showPicker === 'function') {
                e.currentTarget.showPicker();
              }
            } catch (err) {
              e.currentTarget.focus();
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              try {
                if (typeof e.currentTarget.showPicker === 'function') {
                  e.currentTarget.showPicker();
                }
              } catch (err) {}
            }
          }}
        />
      </div>
    );
  }

  if (type === 'file') {
    const rules = field.validation_rules || {};
    const maxMb = rules.max_file_size_mb || 10;
    const maxFiles = rules.max_files || 3;
    const allowed = (rules.allowed_types && rules.allowed_types.length > 0)
      ? rules.allowed_types.join(', ')
      : 'All file types';
    return (
      <div
        style={{
          border: '1.5px dashed var(--border-subtle, #cbd5e1)',
          borderRadius: 'var(--radius-md, 8px)',
          padding: '1.25rem 1rem',
          textAlign: 'center',
          background: 'var(--bg-surface-elevated, rgba(99, 102, 241, 0.03))',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.35rem',
        }}
      >
        <UploadCloud size={24} color="var(--primary)" />
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
          Click or drag files to upload
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Up to {maxFiles} {maxFiles === 1 ? 'file' : 'files'}, max {maxMb} MB each ({allowed})
        </span>
      </div>
    );
  }

  return (
    <div className="field-input-mock">
      {field.placeholder || 'Short answer text...'}
    </div>
  );
}
