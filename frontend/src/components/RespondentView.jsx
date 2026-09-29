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
} from 'lucide-react';

export default function RespondentView({
  form,
  onSubmitResponse,
  onBackToStudio,
  isPreview = false,
}) {
  const [answers, setAnswers] = useState({});
  const [hoverRating, setHoverRating] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    const errors = {};
    for (const field of fields) {
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
            {fields.map((field, idx) => {
              const fieldKey = String(field.id);
              const hasError = !!validationErrors[fieldKey];

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
                  {renderInputField(
                    field,
                    answers[fieldKey],
                    (val) => handleInputChange(field.id, val),
                    handleCheckboxToggle,
                    hoverRating,
                    setHoverRating
                  )}

                  {hasError && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f87171', fontSize: '0.8rem' }}>
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

function renderInputField(field, value, onChange, onCheckboxToggle, hoverRating, setHoverRating) {
  const type = field.field_type;
  const fieldKey = String(field.id);

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
      <input
        type="date"
        className="form-input"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
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
