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
  Loader2,
  AlertCircle,
  Check,
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
  onReorderFields,
  onPreview,
  onShare,
  onResponses,
  saveStatus = 'saved',
  lastSavedTime = null,
  onRetrySave = null,
}) {
  const fields = form.fields || [];
  const containerRef = useRef(null);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = React.useState(null);
  const [dropTarget, setDropTarget] = React.useState(null); // { index: number, position: 'before' | 'after' } | null

  useEffect(() => {
    if (selectedFieldId) {
      const el = document.getElementById(`field-card-${selectedFieldId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selectedFieldId]);

  // Drag-and-drop handlers
  const handleDragStart = (e, index) => {
    // If user clicked or dragged from controls, buttons, or input elements, cancel drag
    if (
      e.target.closest('.field-controls') ||
      e.target.closest('button') ||
      e.target.closest('input') ||
      e.target.closest('textarea') ||
      e.target.closest('select')
    ) {
      e.preventDefault();
      return;
    }

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));

    // Defer state update slightly so the browser generates a crisp drag preview ghost
    requestAnimationFrame(() => {
      setDraggedIndex(index);
    });
  };

  const handleDragOverCard = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    if (draggedIndex === null) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const midpoint = rect.top + rect.height / 2;
    const position = e.clientY < midpoint ? 'before' : 'after';

    // No-op conditions:
    // 1) Hovering the item being dragged
    // 2) Hovering card directly above with 'after' (same position)
    // 3) Hovering card directly below with 'before' (same position)
    const isNoOp =
      draggedIndex === index ||
      (index === draggedIndex - 1 && position === 'after') ||
      (index === draggedIndex + 1 && position === 'before');

    if (isNoOp) {
      if (dropTarget !== null) setDropTarget(null);
      return;
    }

    if (!dropTarget || dropTarget.index !== index || dropTarget.position !== position) {
      setDropTarget({ index, position });
    }
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDropTarget(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedIndex === null || !dropTarget) {
      setDraggedIndex(null);
      setDropTarget(null);
      return;
    }

    const { index: tIdx, position } = dropTarget;

    const newFields = [...fields];
    const [moved] = newFields.splice(draggedIndex, 1);
    const targetInRemaining = newFields.findIndex((f) => f.id === fields[tIdx]?.id);

    if (targetInRemaining === -1) {
      setDraggedIndex(null);
      setDropTarget(null);
      return;
    }

    const insertIdx = position === 'before' ? targetInRemaining : targetInRemaining + 1;
    newFields.splice(insertIdx, 0, moved);

    setDraggedIndex(null);
    setDropTarget(null);

    if (onReorderFields) {
      onReorderFields(newFields);
    }
  };

  const handleCanvasBodyDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex === null) return;

    if (fields.length > 0) {
      const firstCard = document.getElementById(`field-card-${fields[0].id}`);
      const lastCard = document.getElementById(`field-card-${fields[fields.length - 1].id}`);
      if (firstCard && e.clientY < firstCard.getBoundingClientRect().top) {
        if (draggedIndex !== 0) {
          if (!dropTarget || dropTarget.index !== 0 || dropTarget.position !== 'before') {
            setDropTarget({ index: 0, position: 'before' });
          }
        } else if (dropTarget !== null) {
          setDropTarget(null);
        }
      } else if (lastCard && e.clientY > lastCard.getBoundingClientRect().bottom) {
        const lastIdx = fields.length - 1;
        if (draggedIndex !== lastIdx) {
          if (!dropTarget || dropTarget.index !== lastIdx || dropTarget.position !== 'after') {
            setDropTarget({ index: lastIdx, position: 'after' });
          }
        } else if (dropTarget !== null) {
          setDropTarget(null);
        }
      }
    }
  };

  const handleCanvasBodyDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDropTarget(null);
    }
  };

  return (
    <div className="builder-canvas-container" ref={containerRef}>
      {/* Top Bar above canvas */}
      <div className="builder-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
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

          {/* Automatic Draft Save State Indicator */}
          {saveStatus === 'saving' && (
            <span
              className="save-status-pill saving"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.75rem',
                color: 'var(--color-primary)',
                background: 'rgba(99, 102, 241, 0.1)',
                padding: '0.2rem 0.6rem',
                borderRadius: '999px',
                fontWeight: 500,
              }}
            >
              <Loader2 size={12} className="spin-animation" />
              <span>Saving...</span>
            </span>
          )}

          {saveStatus === 'saved' && (
            <span
              className="save-status-pill saved"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.75rem',
                color: '#16a34a',
                background: 'rgba(22, 163, 74, 0.1)',
                padding: '0.2rem 0.6rem',
                borderRadius: '999px',
                fontWeight: 500,
              }}
              title={lastSavedTime ? `Saved at ${lastSavedTime.toLocaleTimeString()}` : 'All changes saved to database'}
            >
              <Check size={12} />
              <span>Saved</span>
            </span>
          )}

          {saveStatus === 'failed' && (
            <span
              className="save-status-pill failed"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.75rem',
                color: '#dc2626',
                background: 'rgba(220, 38, 38, 0.1)',
                padding: '0.2rem 0.6rem',
                borderRadius: '999px',
                fontWeight: 600,
              }}
            >
              <AlertCircle size={12} />
              <span>Save failed</span>
              {onRetrySave && (
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={onRetrySave}
                  style={{
                    textDecoration: 'underline',
                    padding: '0 0.2rem',
                    height: 'auto',
                    color: '#dc2626',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Retry
                </button>
              )}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary btn-sm" onClick={onPreview}>
            <Eye size={14} />
            <span>Preview</span>
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onShare}>
            <Share2 size={14} />
            <span>Share & QR</span>
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onResponses}>
            <BarChart2 size={14} />
            <span>Responses ({form.response_count || 0})</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Sheet */}
      <div
        className="canvas-sheet"
        style={{
          '--card-accent': form.theme_settings?.primary_color || form.theme_color || '#6366f1',
          fontFamily: form.theme_settings?.font_family
            ? (form.theme_settings.font_family === 'roboto'
                ? "'Roboto', -apple-system, BlinkMacSystemFont, sans-serif"
                : form.theme_settings.font_family === 'outfit'
                ? "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif"
                : form.theme_settings.font_family === 'playfair'
                ? "'Playfair Display', Georgia, serif"
                : form.theme_settings.font_family === 'jetbrains'
                ? "'JetBrains Mono', monospace"
                : "'Inter', -apple-system, BlinkMacSystemFont, sans-serif")
            : undefined,
        }}
      >
        {/* Banner Preview if set */}
        {form.theme_settings?.banner_url && (
          <div
            style={{
              maxHeight: 180,
              overflow: 'hidden',
              borderRadius: 'calc(var(--radius-xl) - 2px) calc(var(--radius-xl) - 2px) 0 0',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <img
              src={form.theme_settings.banner_url}
              alt="Form banner preview"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
        )}

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
        <div
          className="canvas-body"
          onDragOver={handleCanvasBodyDragOver}
          onDragLeave={handleCanvasBodyDragLeave}
          onDrop={handleDrop}
        >
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
              const isDragging = draggedIndex === index;
              const showBefore = dropTarget && dropTarget.index === index && dropTarget.position === 'before';
              const showAfter = dropTarget && dropTarget.index === index && dropTarget.position === 'after';

              return (
                <React.Fragment key={field.id}>
                  {showBefore && (
                    <div className="drag-insertion-indicator" data-testid="drop-indicator-before" />
                  )}
                  <div
                    id={`field-card-${field.id}`}
                    className={`field-card ${isSelected ? 'selected' : ''} ${isDragging ? 'is-dragging' : ''}`}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOverCard(e, index)}
                    onDrop={handleDrop}
                    onDragEnd={handleDragEnd}
                    onClick={() => onSelectField(field.id)}
                  >
                    <div className="field-card-header">
                      <div className="field-meta-info">
                        <div className="drag-handle" title="Drag to reorder question">
                          <GripVertical size={14} color="currentColor" />
                        </div>
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

                      <div
                        className="field-controls"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => onMoveFieldUp(index)}
                          disabled={index === 0}
                          title="Move question up"
                          draggable={false}
                        >
                          <MoveUp size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => onMoveFieldDown(index)}
                          disabled={index === fields.length - 1}
                          title="Move question down"
                          draggable={false}
                        >
                          <MoveDown size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => onDuplicateField(field)}
                          title="Duplicate question"
                          draggable={false}
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => onDeleteField(field.id)}
                          style={{ color: '#f87171' }}
                          title="Delete question"
                          draggable={false}
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
                  {showAfter && (
                    <div className="drag-insertion-indicator" data-testid="drop-indicator-after" />
                  )}
                </React.Fragment>
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
