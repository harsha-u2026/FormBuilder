import React from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export default function Toast({ toasts, onRemove }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => {
        let Icon = CheckCircle2;
        if (toast.type === 'error') Icon = AlertCircle;
        if (toast.type === 'info') Icon = Info;

        return (
          <div key={toast.id} className={`toast ${toast.type || 'info'}`} onClick={() => onRemove(toast.id)}>
            <Icon size={18} />
            <span>{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
}
