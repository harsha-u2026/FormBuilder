import React, { useState } from 'react';
import {
  Star,
  CheckCircle2,
  CircleDot,
  CheckSquare,
  ArrowLeft,
  Send,
  Calendar,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  UploadCloud,
  X,
  FileText,
  Loader2,
} from 'lucide-react';
import { api } from '../api/client';

export function isFieldVisible(field, answers) {
  const rules = field.conditional_rules;
  if (!rules || !rules.conditions || !Array.isArray(rules.conditions) || rules.conditions.length === 0) {
    return true;
  }

  const validConditions = rules.conditions.filter((c) => c && c.field_id);
  if (validConditions.length === 0) return true;

  const logicType = (rules.logic_type || 'all').toLowerCase();
  const action = (rules.action || 'show').toLowerCase();

  const results = validConditions.map((cond) => {
    const rawVal = answers[String(cond.field_id)];
    const op = (cond.operator || 'equals').toLowerCase();
    const expected = cond.value;

    if (op === 'is_empty') {
      return rawVal === undefined || rawVal === null || rawVal === '' || (Array.isArray(rawVal) && rawVal.length === 0);
    }
    if (op === 'is_not_empty') {
      return rawVal !== undefined && rawVal !== null && rawVal !== '' && (!Array.isArray(rawVal) || rawVal.length > 0);
    }

    if (rawVal === undefined || rawVal === null) {
      return op === 'not_equals' || op === 'not_contains';
    }

    // Array / multiselect answers
    if (Array.isArray(rawVal)) {
      const normExp = String(expected || '').trim().toLowerCase();
      const normList = rawVal.map((v) => String(v).trim().toLowerCase());
      if (op === 'contains') return normList.includes(normExp);
      if (op === 'not_contains') return !normList.includes(normExp);
      if (op === 'equals') return normList.length === 1 && normList[0] === normExp;
      if (op === 'not_equals') return normList.length !== 1 || normList[0] !== normExp;
      return false;
    }

    // Boolean switch answers
    if (typeof rawVal === 'boolean') {
      let expBool = null;
      if (typeof expected === 'boolean') expBool = expected;
      else if (['true', 'yes', '1'].includes(String(expected).toLowerCase())) expBool = true;
      else if (['false', 'no', '0'].includes(String(expected).toLowerCase())) expBool = false;

      if (expBool !== null) {
        if (op === 'equals') return rawVal === expBool;
        if (op === 'not_equals') return rawVal !== expBool;
      }
      return false;
    }

    // Numeric comparison
    if (op === 'greater_than' || op === 'less_than') {
      const numAct = Number(rawVal);
      const numExp = Number(expected);
      if (isNaN(numAct) || isNaN(numExp)) return false;
      return op === 'greater_than' ? numAct > numExp : numAct < numExp;
    }

    // String / generic comparison
    const strAct = String(rawVal).trim().toLowerCase();
    const strExp = String(expected !== undefined && expected !== null ? expected : '').trim().toLowerCase();

    if (op === 'equals') return strAct === strExp;
    if (op === 'not_equals') return strAct !== strExp;
    if (op === 'contains') return strAct.includes(strExp);
    if (op === 'not_contains') return !strAct.includes(strExp);

    return true;
  });

  const matched = logicType === 'all' ? results.every(Boolean) : results.some(Boolean);
  return action === 'hide' ? !matched : matched;
}

export default function RespondentView({
  form,
  onSubmitResponse,
  onBackToStudio,
  isPreview = false,
}) {
  const [answers, setAnswers] = useState({});
  const [hoverRating, setHoverRating] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [uploadingFields, setUploadingFields] = useState({});
  const [uploadErrors, setUploadErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState('');

  if (!form) return null;

  const fields = form.fields || [];

  const handleInputChange = (fieldId, value) => {
    setAnswers((prev) => ({ ...prev, [String(fieldId)]: value }));
    if (validationErrors[String(fieldId)]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[String(fieldId)];
        return next;
      });
    }
  };

  const handleCheckboxToggle = (fieldId, choice) => {
    const key = String(fieldId);
    const current = Array.isArray(answers[key]) ? answers[key] : [];
    const next = current.includes(choice)
      ? current.filter((item) => item !== choice)
      : [...current, choice];
    handleInputChange(fieldId, next);
  };

  const handleFileUpload = async (field, fileList) => {
    const fieldKey = String(field.id);
    setUploadErrors((prev) => ({ ...prev, [fieldKey]: '' }));

    if (!fileList || fileList.length === 0) return;

    const rules = field.validation_rules || {};
    const maxFiles = Number(rules.max_files) || 5;
    const maxMb = Number(rules.max_file_size_mb) || 10;
    const maxBytes = maxMb * 1024 * 1024;
    const allowedTypes = (rules.allowed_types || []).map((t) => t.trim().toLowerCase());

    const currentFiles = Array.isArray(answers[fieldKey]) ? answers[fieldKey] : [];
    if (currentFiles.length + fileList.length > maxFiles) {
      setUploadErrors((prev) => ({
        ...prev,
        [fieldKey]: `You can upload at most ${maxFiles} ${maxFiles === 1 ? 'file' : 'files'} for this question.`,
      }));
      return;
    }

    // Client-side validations
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      if (f.size > maxBytes) {
        setUploadErrors((prev) => ({
          ...prev,
          [fieldKey]: `"${f.name}" is too large. Maximum allowed size is ${maxMb} MB.`,
        }));
        return;
      }
      if (allowedTypes.length > 0) {
        const ext = '.' + f.name.split('.').pop().toLowerCase();
        const matches = allowedTypes.some(
          (t) => t === ext || (t.endsWith('/*') && f.type.startsWith(t.slice(0, -2)))
        );
        if (!matches) {
          setUploadErrors((prev) => ({
            ...prev,
            [fieldKey]: `"${f.name}" has an unsupported file type. Allowed: ${allowedTypes.join(', ')}`,
          }));
          return;
        }
      }
    }

    setUploadingFields((prev) => ({ ...prev, [fieldKey]: true }));
    try {
      const uploadedData = await api.uploadPublicFile(form.id, field.id, fileList);
      const updatedList = [...currentFiles, ...uploadedData];
      handleInputChange(field.id, updatedList);
    } catch (err) {
      setUploadErrors((prev) => ({
        ...prev,
        [fieldKey]: err.message || 'File upload failed. Please try again.',
      }));
    } finally {
      setUploadingFields((prev) => ({ ...prev, [fieldKey]: false }));
    }
  };

  const handleRemoveFile = (fieldId, fileKey) => {
    const key = String(fieldId);
    const current = Array.isArray(answers[key]) ? answers[key] : [];
    const next = current.filter((f) => f.file_key !== fileKey);
    handleInputChange(fieldId, next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields (ONLY for fields that are conditionally visible)
    const errors = {};
    for (const field of fields) {
      // Check conditional visibility
      if (!isFieldVisible(field, answers)) {
        continue; // Conditionally hidden questions do NOT trigger required validation
      }

      if (field.required) {
        const val = answers[String(field.id)];
        if (val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0)) {
          errors[String(field.id)] = 'This field is required.';
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await onSubmitResponse(form.id, answers);
      setIsSuccess(true);
      setSubmissionFeedback(res.message || form.success_message);
    } catch (err) {
      alert(err.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setAnswers({});
    setValidationErrors({});
    setUploadErrors({});
    setIsSuccess(false);
  };

  return (
    <div className="respondent-container" style={{ '--form-accent': form.theme_color || '#6366f1' }}>
      {/* Back to Builder button if opened inside app */}
      {onBackToStudio && (
        <div style={{ width: '100%', maxWidth: 680, marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" onClick={onBackToStudio}>
            <ArrowLeft size={16} />
            <span>Back to Builder</span>
          </button>
          {isPreview && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Interactive Live Preview
            </span>
          )}
        </div>
      )}

      <div className="respondent-card">
        {/* Form Header */}
        <div className="respondent-header">
          <h1 className="respondent-title">{form.title}</h1>
          {form.description && <p className="respondent-desc">{form.description}</p>}
        </div>

        {isSuccess ? (
          /* Success Screen */
          <div className="success-screen">
            <div className="success-icon-badge">
              <CheckCircle2 size={40} />
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Response Submitted!</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: 450 }}>
              {submissionFeedback || 'Thank you for taking the time to share your response.'}
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
              <button className="btn btn-secondary" onClick={handleReset}>
                Submit Another Response
              </button>
              {onBackToStudio && (
                <button className="btn btn-primary" onClick={onBackToStudio}>
                  Return to Studio
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Questions Form */
          <form onSubmit={handleSubmit} className="respondent-body">
            {fields.map((field) => {
              // Dynamic conditional visibility
              const visible = isFieldVisible(field, answers);
              if (!visible) return null;

              const fieldKey = String(field.id);
              const hasError = !!validationErrors[fieldKey];
              const uploadError = uploadErrors[fieldKey];
              const isUploading = !!uploadingFields[fieldKey];

              return (
                <div key={field.id} className="respondent-field">
                  <label className="field-label-text">
                    {field.label}
                    {field.required && <span className="required-indicator">*</span>}
                  </label>

                  {field.help_text && (
                    <div className="field-help-text">{field.help_text}</div>
                  )}

                  {/* Input Rendering based on field type */}
                  {renderInputField({
                    field,
                    value: answers[fieldKey],
                    onChange: (val) => handleInputChange(field.id, val),
                    onCheckboxToggle: handleCheckboxToggle,
                    hoverRating,
                    setHoverRating,
                    onFileUpload: (files) => handleFileUpload(field, files),
                    onRemoveFile: (fileKey) => handleRemoveFile(field.id, fileKey),
                    isUploading,
                  })}

                  {uploadError && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f87171', fontSize: '0.8rem', marginTop: '0.35rem' }}>
                      <AlertCircle size={14} />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  {hasError && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f87171', fontSize: '0.8rem', marginTop: '0.35rem' }}>
                      <AlertCircle size={14} />
                      <span>{validationErrors[fieldKey]}</span>
                    </div>
                  )}
                </div>
              );
            })}

            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
                style={{
                  background: form.theme_color || '#6366f1',
                  borderColor: form.theme_color || '#6366f1',
                  padding: '0.75rem 2rem',
                  fontSize: '1rem',
                }}
              >
                {isSubmitting ? (
                  <span>Submitting...</span>
                ) : (
                  <>
                    <Send size={16} />
                    <span>{form.submit_button_text || 'Submit'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function renderInputField({
  field,
  value,
  onChange,
  onCheckboxToggle,
  hoverRating,
  setHoverRating,
  onFileUpload,
  onRemoveFile,
  isUploading,
}) {
  const type = field.field_type;
  const fieldKey = String(field.id);

  if (type === 'file') {
    const rules = field.validation_rules || {};
    const maxFiles = Number(rules.max_files) || 5;
    const maxMb = Number(rules.max_file_size_mb) || 10;
    const allowed = (rules.allowed_types || []).join(', ');
    const uploadedFiles = Array.isArray(value) ? value : [];
    const canUploadMore = uploadedFiles.length < maxFiles;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* Upload Zone */}
        {canUploadMore && (
          <label
            style={{
              border: '2px dashed var(--border-subtle, #cbd5e1)',
              borderRadius: 'var(--radius-md, 8px)',
              padding: '1.5rem 1rem',
              textAlign: 'center',
              cursor: isUploading ? 'not-allowed' : 'pointer',
              background: 'var(--bg-surface-elevated, #f8fafc)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'border-color 0.2s',
            }}
          >
            <input
              type="file"
              multiple={maxFiles > 1}
              style={{ display: 'none' }}
              disabled={isUploading}
              accept={(rules.allowed_types || []).join(',')}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  onFileUpload(Array.from(e.target.files));
                  e.target.value = '';
                }
              }}
            />
            {isUploading ? (
              <>
                <Loader2 size={26} className="spin-icon" color="var(--primary)" />
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Uploading attachment...</span>
              </>
            ) : (
              <>
                <UploadCloud size={26} color="var(--primary)" />
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Click to choose or drag files here
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Max {maxFiles} {maxFiles === 1 ? 'file' : 'files'}, up to {maxMb} MB each {allowed ? `(${allowed})` : ''}
                </span>
              </>
            )}
          </label>
        )}

        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Attached Files ({uploadedFiles.length}/{maxFiles}):
            </span>
            {uploadedFiles.map((file, idx) => {
              const sizeKb = file.file_size ? round(file.file_size / 1024, 1) : null;
              return (
                <div
                  key={file.file_key || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.6rem 0.85rem',
                    background: 'var(--bg-surface-elevated, #f8fafc)',
                    border: '1px solid var(--border-subtle, #e2e8f0)',
                    borderRadius: 'var(--radius-sm, 6px)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                    <FileText size={16} color="var(--primary)" style={{ flexShrink: 0 }} />
                    <span
                      style={{
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {file.original_filename || file.name || 'Uploaded File'}
                    </span>
                    {sizeKb && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                        ({sizeKb} KB)
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn btn-ghost btn-icon btn-sm"
                    style={{ color: '#ef4444', flexShrink: 0 }}
                    onClick={() => onRemoveFile(file.file_key)}
                    title="Remove file"
                  >
                    <X size={15} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (type === 'textarea') {
    return (
      <textarea
        className="form-textarea"
        rows={4}
        placeholder={field.placeholder || ''}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (type === 'rating') {
    const currentRating = value || 0;
    const activeHover = hoverRating[fieldKey] || 0;

    return (
      <div className="star-rating-box">
        {[1, 2, 3, 4, 5].map((score) => {
          const filled = (activeHover || currentRating) >= score;
          return (
            <button
              type="button"
              key={score}
              className={`star-btn ${filled ? 'active' : ''}`}
              onMouseEnter={() => setHoverRating((prev) => ({ ...prev, [fieldKey]: score }))}
              onMouseLeave={() => setHoverRating((prev) => ({ ...prev, [fieldKey]: 0 }))}
              onClick={() => onChange(score)}
            >
              <Star
                size={32}
                fill={filled ? '#fbbf24' : 'transparent'}
                color={filled ? '#fbbf24' : 'var(--text-faint)'}
              />
            </button>
          );
        })}
        {currentRating > 0 && (
          <span style={{ marginLeft: '0.75rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            {currentRating} / 5
          </span>
        )}
      </div>
    );
  }

  if (type === 'radio') {
    const opts = field.options || ['Option 1', 'Option 2'];
    return (
      <div className="choices-list">
        {opts.map((opt, i) => {
          const optVal = typeof opt === 'object' ? opt.value : opt;
          const optLabel = typeof opt === 'object' ? opt.label : opt;
          const isSelected = value === optVal;

          return (
            <div
              key={i}
              className={`choice-option ${isSelected ? 'selected' : ''}`}
              onClick={() => onChange(optVal)}
            >
              <CircleDot
                size={18}
                color={isSelected ? 'var(--form-accent, var(--primary))' : 'var(--text-faint)'}
              />
              <span style={{ fontSize: '0.95rem' }}>{optLabel}</span>
            </div>
          );
        })}
      </div>
    );
  }

  if (type === 'checkbox') {
    const opts = field.options || ['Choice 1', 'Choice 2'];
    const currentSelected = Array.isArray(value) ? value : [];

    return (
      <div className="choices-list">
        {opts.map((opt, i) => {
          const optVal = typeof opt === 'object' ? opt.value : opt;
          const optLabel = typeof opt === 'object' ? opt.label : opt;
          const isSelected = currentSelected.includes(optVal);

          return (
            <div
              key={i}
              className={`choice-option ${isSelected ? 'selected' : ''}`}
              onClick={() => onCheckboxToggle(field.id, optVal)}
            >
              <CheckSquare
                size={18}
                color={isSelected ? 'var(--form-accent, var(--primary))' : 'var(--text-faint)'}
              />
              <span style={{ fontSize: '0.95rem' }}>{optLabel}</span>
            </div>
          );
        })}
      </div>
    );
  }

  if (type === 'select') {
    const opts = field.options || [];
    return (
      <select
        className="form-select"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{field.placeholder || 'Select an option...'}</option>
        {opts.map((opt, i) => {
          const optVal = typeof opt === 'object' ? opt.value : opt;
          const optLabel = typeof opt === 'object' ? opt.label : opt;
          return (
            <option key={i} value={optVal}>
              {optLabel}
            </option>
          );
        })}
      </select>
    );
  }

  if (type === 'switch') {
    const isChecked = !!value;
    return (
      <div
        className="choice-option"
        onClick={() => onChange(!isChecked)}
        style={{ width: 'fit-content' }}
      >
        {isChecked ? (
          <ToggleRight size={28} color="var(--form-accent, var(--primary))" />
        ) : (
          <ToggleLeft size={28} color="var(--text-faint)" />
        )}
        <span style={{ fontSize: '0.95rem' }}>{isChecked ? 'Yes / Agreed' : 'No / Disagreed'}</span>
      </div>
    );
  }

  if (type === 'date') {
    return (
      <div className="date-input-container">
        <input
          type="date"
          className="form-input date-picker-input"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
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

  if (type === 'number') {
    return (
      <input
        type="number"
        className="form-input"
        placeholder={field.placeholder || '0'}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  if (type === 'email') {
    return (
      <input
        type="email"
        className="form-input"
        placeholder={field.placeholder || 'name@example.com'}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  return (
    <input
      type="text"
      className="form-input"
      placeholder={field.placeholder || ''}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function round(val, decimals = 1) {
  return Number(Math.round(val + 'e' + decimals) + 'e-' + decimals);
}
