import React, { useState } from 'react';
import {
  Sliders,
  Settings,
  Plus,
  Trash2,
  Check,
  Share2,
  ExternalLink,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

const PALETTE = [
  { name: 'Indigo', color: '#6366f1' },
  { name: 'Sky', color: '#0ea5e9' },
  { name: 'Emerald', color: '#10b981' },
  { name: 'Rose', color: '#f43f5e' },
  { name: 'Amber', color: '#f59e0b' },
  { name: 'Violet', color: '#8b5cf6' },
];

export default function Inspector({
  selectedField,
  form,
  onUpdateField,
  onUpdateFormSettings,
  onTogglePublish,
  onCopyShareLink,
}) {
  const [activeTab, setActiveTab] = useState('field');

  return (
    <aside className="builder-inspector">
      <div className="inspector-tabs">
        <button
          className={`inspector-tab ${activeTab === 'field' ? 'active' : ''}`}
          onClick={() => setActiveTab('field')}
        >
          Question
        </button>
        <button
          className={`inspector-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Form Settings
        </button>
      </div>

      <div className="inspector-body">
        {activeTab === 'field' ? (
          selectedField ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="form-label">Type: {selectedField.field_type}</span>
              </div>

              {/* Label */}
              <div className="form-group">
                <label className="form-label">Question Label</label>
                <input
                  type="text"
                  className="form-input"
                  value={selectedField.label || ''}
                  onChange={(e) => onUpdateField(selectedField.id, { label: e.target.value })}
                />
              </div>

              {/* Placeholder (if applicable) */}
              {['text', 'textarea', 'email', 'number', 'select'].includes(selectedField.field_type) && (
                <div className="form-group">
                  <label className="form-label">Placeholder Text</label>
                  <input
                    type="text"
                    className="form-input"
                    value={selectedField.placeholder || ''}
                    placeholder="e.g. Enter your name..."
                    onChange={(e) => onUpdateField(selectedField.id, { placeholder: e.target.value })}
                  />
                </div>
              )}

              {/* Help Text */}
              <div className="form-group">
                <label className="form-label">Helper / Sub-text</label>
                <input
                  type="text"
                  className="form-input"
                  value={selectedField.help_text || ''}
                  placeholder="Optional guidance for the respondent..."
                  onChange={(e) => onUpdateField(selectedField.id, { help_text: e.target.value })}
                />
              </div>

              {/* Required Toggle */}
              <div className="toggle-switch-container">
                <div>
                  <div className="toggle-label">Required Field</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>
                    Respondent cannot submit without answering
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon"
                  onClick={() => onUpdateField(selectedField.id, { required: !selectedField.required })}
                >
                  {selectedField.required ? (
                    <ToggleRight size={28} color="var(--primary)" />
                  ) : (
                    <ToggleLeft size={28} color="var(--text-faint)" />
                  )}
                </button>
              </div>

              {/* Choices / Options Manager */}
              {['radio', 'checkbox', 'select'].includes(selectedField.field_type) && (
                <div className="form-group" style={{ marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="form-label">Choices</label>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        const currentOpts = selectedField.options || [];
                        const nextNum = currentOpts.length + 1;
                        onUpdateField(selectedField.id, {
                          options: [...currentOpts, `Option ${nextNum}`],
                        });
                      }}
                    >
                      <Plus size={14} />
                      <span>Add Option</span>
                    </button>
                  </div>

                  <div className="options-manager">
                    {(selectedField.options || []).map((opt, idx) => (
                      <div key={idx} className="option-row">
                        <input
                          type="text"
                          className="form-input"
                          style={{ padding: '0.4rem 0.65rem' }}
                          value={typeof opt === 'object' ? opt.label : opt}
                          onChange={(e) => {
                            const newOpts = [...(selectedField.options || [])];
                            newOpts[idx] = e.target.value;
                            onUpdateField(selectedField.id, { options: newOpts });
                          }}
                        />
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => {
                            const newOpts = (selectedField.options || []).filter((_, i) => i !== idx);
                            onUpdateField(selectedField.id, { options: newOpts });
                          }}
                          style={{ color: '#f87171' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-faint)', padding: '2rem 1rem' }}>
              <Sliders size={32} style={{ margin: '0 auto 0.75rem auto', opacity: 0.5 }} />
              <p style={{ fontSize: '0.875rem' }}>Click any question on the canvas to configure its properties.</p>
            </div>
          )
        ) : (
          /* Form Settings Tab */
          <>
            {/* Theme Accent Color */}
            <div className="form-group">
              <label className="form-label">Theme Accent Color</label>
              <div className="color-swatches">
                {PALETTE.map((swatch) => (
                  <div
                    key={swatch.color}
                    className={`color-swatch ${form.theme_color === swatch.color ? 'active' : ''}`}
                    style={{ backgroundColor: swatch.color }}
                    onClick={() => onUpdateFormSettings({ theme_color: swatch.color })}
                    title={swatch.name}
                  />
                ))}
              </div>
            </div>

            {/* Submit Button Label */}
            <div className="form-group">
              <label className="form-label">Submit Button Label</label>
              <input
                type="text"
                className="form-input"
                value={form.submit_button_text || 'Submit'}
                onChange={(e) => onUpdateFormSettings({ submit_button_text: e.target.value })}
              />
            </div>

            {/* Success Message */}
            <div className="form-group">
              <label className="form-label">Success Message</label>
              <textarea
                className="form-textarea"
                rows={3}
                value={form.success_message || ''}
                placeholder="Message displayed after successful submission..."
                onChange={(e) => onUpdateFormSettings({ success_message: e.target.value })}
              />
            </div>

            {/* Publish Toggle */}
            <div className="toggle-switch-container">
              <div>
                <div className="toggle-label">
                  {form.is_published ? 'Form is Live (Published)' : 'Draft Mode (Unpublished)'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>
                  {form.is_published
                    ? 'Anyone with the link can submit answers'
                    : 'Survey is closed and responses are paused'}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={() => onTogglePublish(form.id)}
              >
                {form.is_published ? (
                  <ToggleRight size={28} color="var(--success)" />
                ) : (
                  <ToggleLeft size={28} color="var(--text-faint)" />
                )}
              </button>
            </div>

            {/* Share Link button */}
            <button
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.5rem' }}
              onClick={() => onCopyShareLink(form.id)}
            >
              <Share2 size={16} />
              <span>Copy Public Link</span>
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
