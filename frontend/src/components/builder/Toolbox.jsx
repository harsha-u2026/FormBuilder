import React from 'react';
import {
  Type,
  AlignLeft,
  Hash,
  CircleDot,
  CheckSquare,
  ChevronDown,
  Star,
  Calendar,
  Mail,
  ToggleLeft,
  Info,
  UploadCloud,
} from 'lucide-react';

export const FIELD_DEFINITIONS = [
  {
    category: 'Text & Input',
    items: [
      {
        type: 'text',
        label: 'Short Answer',
        icon: Type,
        defaultProps: {
          label: 'Short Text Question',
          placeholder: 'Type your answer here...',
          required: false,
        },
      },
      {
        type: 'textarea',
        label: 'Paragraph',
        icon: AlignLeft,
        defaultProps: {
          label: 'Long Text / Detailed Feedback',
          placeholder: 'Enter your detailed thoughts...',
          required: false,
        },
      },
      {
        type: 'email',
        label: 'Email Address',
        icon: Mail,
        defaultProps: {
          label: 'Email Address',
          placeholder: 'name@example.com',
          required: true,
        },
      },
      {
        type: 'number',
        label: 'Numeric Value',
        icon: Hash,
        defaultProps: {
          label: 'Number Input',
          placeholder: '0',
          required: false,
        },
      },
    ],
  },
  {
    category: 'Choices & Options',
    items: [
      {
        type: 'radio',
        label: 'Single Choice (Radio)',
        icon: CircleDot,
        defaultProps: {
          label: 'Select One Option',
          options: ['Option 1', 'Option 2', 'Option 3'],
          required: true,
        },
      },
      {
        type: 'checkbox',
        label: 'Multiple Choice (Checkboxes)',
        icon: CheckSquare,
        defaultProps: {
          label: 'Select All That Apply',
          options: ['Choice A', 'Choice B', 'Choice C'],
          required: false,
        },
      },
      {
        type: 'select',
        label: 'Dropdown Menu',
        icon: ChevronDown,
        defaultProps: {
          label: 'Choose from dropdown',
          options: ['Item 1', 'Item 2', 'Item 3'],
          required: false,
        },
      },
    ],
  },
  {
    category: 'Special & Upload',
    items: [
      {
        type: 'file',
        label: 'File Upload',
        icon: UploadCloud,
        defaultProps: {
          label: 'Upload Attachment / File',
          help_text: 'Attach required documents or images (max 10 MB)',
          required: false,
          validation_rules: {
            allowed_types: ['.pdf', '.png', '.jpg', '.jpeg', '.docx'],
            max_file_size_mb: 10,
            max_files: 3,
          },
        },
      },
      {
        type: 'rating',
        label: 'Star Rating',
        icon: Star,
        defaultProps: {
          label: 'Rate your overall satisfaction',
          help_text: '1 = Poor, 5 = Exceptional',
          required: true,
        },
      },
      {
        type: 'date',
        label: 'Date Picker',
        icon: Calendar,
        defaultProps: {
          label: 'Select a Date',
          required: false,
        },
      },
      {
        type: 'switch',
        label: 'Yes / No Toggle',
        icon: ToggleLeft,
        defaultProps: {
          label: 'Do you agree to the terms and conditions?',
          required: true,
        },
      },
    ],
  },
];

export default function Toolbox({ onAddField }) {
  return (
    <aside className="builder-sidebar">
      <div className="panel-header">
        <span className="panel-title">Add Questions</span>
      </div>

      <div className="toolbox-section">
        {FIELD_DEFINITIONS.map((cat, idx) => (
          <div key={idx}>
            <div className="toolbox-group-title">{cat.category}</div>
            <div className="toolbox-items">
              {cat.items.map((item) => {
                const IconComp = item.icon;
                return (
                  <button
                    key={item.type}
                    className="toolbox-item"
                    onClick={() => onAddField(item.type, item.defaultProps)}
                  >
                    <div className="toolbox-icon">
                      <IconComp size={16} />
                    </div>
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div
          style={{
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            display: 'flex',
            gap: '0.5rem',
            alignItems: 'flex-start',
          }}
        >
          <Info size={16} color="var(--primary)" style={{ flexShrink: 0, marginTop: 2 }} />
          <span>Click any field type above to insert it into your active form. Configure properties in the right inspector.</span>
        </div>
      </div>
    </aside>
  );
}
