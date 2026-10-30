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
  GitBranch,
  UploadCloud,
  HelpCircle,
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

  const otherFields = (form.fields || []).filter((f) => f.id !== selectedField?.id);

  // Conditional logic helpers
  const logicRules = selectedField?.conditional_rules || {
    action: 'show',
    logic_type: 'all',
    conditions: [],
  };

  const updateLogicRules = (updates) => {
    if (!selectedField) return;
    const nextRules = {
      ...logicRules,
      ...updates,
    };
    onUpdateField(selectedField.id, { conditional_rules: nextRules });
  };

  const addCondition = () => {
    if (!selectedField || otherFields.length === 0) return;
    const defaultTarget = otherFields[0];
    const newCond = {
      field_id: defaultTarget.id,
      operator: 'equals',
      value: defaultTarget.options && defaultTarget.options.length > 0
        ? (typeof defaultTarget.options[0] === 'object' ? defaultTarget.options[0].value : defaultTarget.options[0])
        : '',
    };
    const nextConditions = [...(logicRules.conditions || []), newCond];
    updateLogicRules({ conditions: nextConditions });
  };

  const updateCondition = (index, updates) => {
    const nextConditions = [...(logicRules.conditions || [])];
    nextConditions[index] = { ...nextConditions[index], ...updates };
    updateLogicRules({ conditions: nextConditions });
  };

  const removeCondition = (index) => {
    const nextConditions = (logicRules.conditions || []).filter((_, i) => i !== index);
    updateLogicRules({ conditions: nextConditions });
  };

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
          className={`inspector-tab ${activeTab === 'logic' ? 'active' : ''}`}
          onClick={() => setActiveTab('logic')}
        >
          Logic {logicRules.conditions?.length > 0 && `(${logicRules.conditions.length})`}
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

              {/* File Upload Configurations */}
              {selectedField.field_type === 'file' && (
                <div
                  style={{
                    marginTop: '1rem',
                    padding: '0.85rem',
                    background: 'var(--bg-surface-elevated, #f8fafc)',
                    border: '1px solid var(--border-subtle, #e2e8f0)',
                    borderRadius: 'var(--radius-md, 8px)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600, fontSize: '0.85rem' }}>
                    <UploadCloud size={16} color="var(--primary)" />
                    <span>Upload Rules & Limits</span>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                      Allowed Extensions (comma separated)
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder=".pdf, .png, .jpg, .docx"
                      value={(selectedField.validation_rules?.allowed_types || []).join(', ')}
                      onChange={(e) => {
                        const types = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                        onUpdateField(selectedField.id, {
                          validation_rules: {
                            ...(selectedField.validation_rules || {}),
                            allowed_types: types,
                          },
                        });
                      }}
                    />
                    <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                      {[
                        { label: 'Images', exts: ['.png', '.jpg', '.jpeg', '.webp'] },
                        { label: 'PDF & Docs', exts: ['.pdf', '.docx', '.txt'] },
                        { label: 'Spreadsheets', exts: ['.xlsx', '.csv'] },
                        { label: 'All Files', exts: [] },
                      ].map((preset, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          className="btn btn-ghost btn-xs"
                          style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', border: '1px solid var(--border-subtle)' }}
                          onClick={() => {
                            onUpdateField(selectedField.id, {
                              validation_rules: {
                                ...(selectedField.validation_rules || {}),
                                allowed_types: preset.exts,
                              },
                            });
                          }}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                        Max Size (MB)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="25"
                        className="form-input"
                        value={selectedField.validation_rules?.max_file_size_mb || 10}
                        onChange={(e) => {
                          const val = Math.max(1, Math.min(25, Number(e.target.value) || 10));
                          onUpdateField(selectedField.id, {
                            validation_rules: {
                              ...(selectedField.validation_rules || {}),
                              max_file_size_mb: val,
                            },
                          });
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>
                        Max Files
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        className="form-input"
                        value={selectedField.validation_rules?.max_files || 3}
                        onChange={(e) => {
                          const val = Math.max(1, Math.min(10, Number(e.target.value) || 3));
                          onUpdateField(selectedField.id, {
                            validation_rules: {
                              ...(selectedField.validation_rules || {}),
                              max_files: val,
                            },
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

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
        ) : activeTab === 'logic' ? (
          /* Conditional Logic Tab */
          selectedField ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.95rem' }}>
                  <GitBranch size={16} color="var(--primary)" />
                  <span>Conditional Visibility</span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Control when <strong>"{selectedField.label}"</strong> is displayed to the respondent.
                </p>
              </div>

              {otherFields.length === 0 ? (
                <div
                  style={{
                    background: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    textAlign: 'center',
                    fontSize: '0.85rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  <p>Add other questions to your form to create conditional visibility rules.</p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Action</label>
                      <select
                        className="form-select"
                        value={logicRules.action || 'show'}
                        onChange={(e) => updateLogicRules({ action: e.target.value })}
                      >
                        <option value="show">Show question</option>
                        <option value="hide">Hide question</option>
                      </select>
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Condition Match</label>
                      <select
                        className="form-select"
                        value={logicRules.logic_type || 'all'}
                        onChange={(e) => updateLogicRules({ logic_type: e.target.value })}
                      >
                        <option value="all">ALL match (AND)</option>
                        <option value="any">ANY match (OR)</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {(logicRules.conditions || []).map((cond, cIdx) => {
                      const targetField = form.fields.find((f) => f.id === cond.field_id) || otherFields[0];
                      const targetOptions = targetField?.options || [];

                      return (
                        <div
                          key={cIdx}
                          style={{
                            background: 'var(--bg-surface-elevated, #f8fafc)',
                            border: '1px solid var(--border-subtle, #e2e8f0)',
                            borderRadius: 'var(--radius-md, 8px)',
                            padding: '0.75rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>
                              RULE #{cIdx + 1}: IF
                            </span>
                            <button
                              type="button"
                              className="btn btn-ghost btn-icon btn-sm"
                              style={{ color: '#f87171' }}
                              onClick={() => removeCondition(cIdx)}
                              title="Delete this condition"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          <select
                            className="form-select"
                            value={cond.field_id || ''}
                            onChange={(e) => updateCondition(cIdx, { field_id: Number(e.target.value), value: '' })}
                          >
                            {otherFields.map((f, i) => (
                              <option key={f.id} value={f.id}>
                                #{i + 1}: {f.label} ({f.field_type})
                              </option>
                            ))}
                          </select>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                            <select
                              className="form-select"
                              value={cond.operator || 'equals'}
                              onChange={(e) => updateCondition(cIdx, { operator: e.target.value })}
                            >
                              <option value="equals">Equals</option>
                              <option value="not_equals">Does not equal</option>
                              <option value="contains">Contains</option>
                              <option value="not_contains">Does not contain</option>
                              <option value="greater_than">Greater than (&gt;)</option>
                              <option value="less_than">Less than (&lt;)</option>
                              <option value="is_empty">Is empty</option>
                              <option value="is_not_empty">Is answered</option>
                            </select>

                            {!['is_empty', 'is_not_empty'].includes(cond.operator) && (
                              targetOptions.length > 0 ? (
                                <select
                                  className="form-select"
                                  value={cond.value || ''}
                                  onChange={(e) => updateCondition(cIdx, { value: e.target.value })}
                                >
                                  <option value="">Select option...</option>
                                  {targetOptions.map((opt, oIdx) => {
                                    const val = typeof opt === 'object' ? opt.value : opt;
                                    const lbl = typeof opt === 'object' ? opt.label : opt;
                                    return <option key={oIdx} value={val}>{lbl}</option>;
                                  })}
                                </select>
                              ) : targetField?.field_type === 'switch' ? (
                                <select
                                  className="form-select"
                                  value={String(cond.value)}
                                  onChange={(e) => updateCondition(cIdx, { value: e.target.value === 'true' })}
                                >
                                  <option value="true">Yes / Agreed</option>
                                  <option value="false">No / Disagreed</option>
                                </select>
                              ) : (
                                <input
                                  type={targetField?.field_type === 'number' ? 'number' : 'text'}
                                  className="form-input"
                                  placeholder="Value..."
                                  value={cond.value !== undefined ? cond.value : ''}
                                  onChange={(e) => updateCondition(cIdx, { value: e.target.value })}
                                />
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ width: '100%' }}
                    onClick={addCondition}
                  >
                    <Plus size={14} />
                    <span>Add Condition Rule</span>
                  </button>
                </>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-faint)', padding: '2rem 1rem' }}>
              <GitBranch size={32} style={{ margin: '0 auto 0.75rem auto', opacity: 0.5 }} />
              <p style={{ fontSize: '0.875rem' }}>Select a question on the canvas to configure its visibility rules.</p>
            </div>
          )
        ) : (
          /* Form Settings & Branding Tab */
          <div className="inspector-settings-list" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Theme Accent Color */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Theme Accent Color</span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {form.theme_settings?.primary_color || form.theme_color || '#6366f1'}
                </span>
              </label>
              <div className="color-swatches" style={{ marginBottom: '0.5rem' }}>
                {PALETTE.map((swatch) => (
                  <div
                    key={swatch.color}
                    className={`color-swatch ${(form.theme_settings?.primary_color || form.theme_color) === swatch.color ? 'active' : ''}`}
                    style={{ backgroundColor: swatch.color }}
                    onClick={() => {
                      const current = form.theme_settings || {};
                      onUpdateFormSettings({
                        theme_color: swatch.color,
                        theme_settings: { ...current, primary_color: swatch.color },
                      });
                    }}
                    title={swatch.name}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="color"
                  value={form.theme_settings?.primary_color || form.theme_color || '#6366f1'}
                  onChange={(e) => {
                    const current = form.theme_settings || {};
                    onUpdateFormSettings({
                      theme_color: e.target.value,
                      theme_settings: { ...current, primary_color: e.target.value },
                    });
                  }}
                  style={{
                    width: 36,
                    height: 36,
                    padding: 0,
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                  }}
                  title="Pick custom color"
                />
                <input
                  type="text"
                  className="form-input"
                  placeholder="#6366f1"
                  value={form.theme_settings?.primary_color || form.theme_color || '#6366f1'}
                  onChange={(e) => {
                    const val = e.target.value;
                    const current = form.theme_settings || {};
                    onUpdateFormSettings({
                      theme_color: val,
                      theme_settings: { ...current, primary_color: val },
                    });
                  }}
                  style={{ fontSize: '0.85rem', fontFamily: 'monospace' }}
                />
              </div>
            </div>

            {/* Typography Choice */}
            <div className="form-group">
              <label className="form-label">Typography / Font Family</label>
              <select
                className="form-select"
                value={form.theme_settings?.font_family || 'inter'}
                onChange={(e) => {
                  const current = form.theme_settings || {};
                  onUpdateFormSettings({
                    theme_settings: { ...current, font_family: e.target.value },
                  });
                }}
              >
                <option value="inter">Inter (Modern & Clean Sans)</option>
                <option value="outfit">Outfit (Geometric & Friendly)</option>
                <option value="roboto">Roboto (Neutral & Crisp)</option>
                <option value="playfair">Playfair Display (Editorial Serif)</option>
                <option value="jetbrains">JetBrains Mono (Technical Monospace)</option>
              </select>
            </div>

            {/* Button Style */}
            <div className="form-group">
              <label className="form-label">Button Styling</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem' }}>
                {[
                  { key: 'rounded', label: 'Rounded (8px)' },
                  { key: 'pill', label: 'Pill Shape' },
                  { key: 'sharp', label: 'Sharp (2px)' },
                ].map((b) => {
                  const isCurrent = (form.theme_settings?.button_style || 'rounded') === b.key;
                  return (
                    <button
                      key={b.key}
                      type="button"
                      className={`btn btn-sm ${isCurrent ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => {
                        const current = form.theme_settings || {};
                        onUpdateFormSettings({
                          theme_settings: { ...current, button_style: b.key },
                        });
                      }}
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.4rem 0.2rem',
                        borderRadius: b.key === 'pill' ? '999px' : b.key === 'sharp' ? '2px' : '6px',
                      }}
                    >
                      {b.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form Background Tone */}
            <div className="form-group">
              <label className="form-label">Background Atmosphere</label>
              <select
                className="form-select"
                value={form.theme_settings?.background_style || 'clean'}
                onChange={(e) => {
                  const current = form.theme_settings || {};
                  onUpdateFormSettings({
                    theme_settings: { ...current, background_style: e.target.value },
                  });
                }}
              >
                <option value="clean">Clean Minimalist (Light / Dark)</option>
                <option value="slate">Cool Slate Tone</option>
                <option value="warm">Warm Paper / Sand</option>
                <option value="midnight">Midnight Contrast</option>
              </select>
            </div>

            {/* Header Banner Image */}
            <div className="form-group">
              <label className="form-label">Header Banner Image</label>
              {form.theme_settings?.banner_url ? (
                <div style={{ position: 'relative', marginBottom: '0.5rem', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                  <img
                    src={form.theme_settings.banner_url}
                    alt="Current header banner"
                    style={{ width: '100%', height: 90, objectFit: 'cover', display: 'block' }}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-icon"
                    onClick={() => {
                      const current = form.theme_settings || {};
                      onUpdateFormSettings({
                        theme_settings: { ...current, banner_url: null },
                      });
                    }}
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      background: 'rgba(0,0,0,0.6)',
                      color: '#ffffff',
                    }}
                    title="Remove banner image"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : null}

              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="https://images.unsplash.com/... or paste image URL"
                  value={form.theme_settings?.banner_url || ''}
                  onChange={(e) => {
                    const current = form.theme_settings || {};
                    onUpdateFormSettings({
                      theme_settings: { ...current, banner_url: e.target.value.trim() || null },
                    });
                  }}
                  style={{ fontSize: '0.8rem' }}
                />
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

            {/* Share & QR Code Link */}
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '0.25rem' }}
              onClick={() => onCopyShareLink(form.id)}
            >
              <Share2 size={16} />
              <span>Share & Generate QR Code</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

