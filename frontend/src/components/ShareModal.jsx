import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Share2,
  Copy,
  Check,
  Download,
  ExternalLink,
  AlertTriangle,
  QrCode,
  Globe,
  Sparkles,
} from 'lucide-react';

export default function ShareModal({
  isOpen,
  onClose,
  form,
  onTogglePublish,
  showToast,
}) {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrGenerating, setQrGenerating] = useState(false);
  const canvasRef = useRef(null);

  if (!isOpen || !form) return null;

  // Resolve canonical public URL: prefer configured production URL, else current window origin
  const baseOrigin = import.meta.env.VITE_PUBLIC_URL || window.location.origin;
  const canonicalUrl = `${baseOrigin}/?public=${form.id}`;
  const isPublished = Boolean(form.is_published);

  useEffect(() => {
    let isMounted = true;
    const generateQr = async () => {
      setQrGenerating(true);
      try {
        const url = await QRCode.toDataURL(canonicalUrl, {
          width: 512,
          margin: 2,
          color: {
            dark: '#1e293b',
            light: '#ffffff',
          },
          errorCorrectionLevel: 'H',
        });
        if (isMounted) {
          setQrDataUrl(url);
        }
      } catch (err) {
        console.error('QR code generation failed:', err);
      } finally {
        if (isMounted) setQrGenerating(false);
      }
    };

    generateQr();
    return () => {
      isMounted = false;
    };
  }, [canonicalUrl]);

  const handleCopy = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(canonicalUrl)
        .then(() => {
          setCopied(true);
          if (showToast) showToast('Survey link copied to clipboard!', 'success');
          setTimeout(() => setCopied(false), 2500);
        })
        .catch(() => {
          fallbackCopy();
        });
    } else {
      fallbackCopy();
    }
  };

  const fallbackCopy = () => {
    try {
      const el = document.createElement('textarea');
      el.value = canonicalUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      if (showToast) showToast('Survey link copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      if (showToast) showToast(`Public link: ${canonicalUrl}`, 'info');
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;

    try {
      // Convert data URL to Blob to safely manage browser memory with object URLs
      const byteString = atob(qrDataUrl.split(',')[1]);
      const mimeString = qrDataUrl.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: mimeString });
      const objectUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = objectUrl;
      const safeTitle = (form.title || 'form')
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_')
        .slice(0, 30);
      link.download = `${safeTitle}-qr-code.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up temporary browser object URL immediately after download triggers
      setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 1000);

      if (showToast) showToast('QR Code downloaded as PNG!', 'success');
    } catch (err) {
      console.error('Failed to download QR code:', err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="share-modal-title">
      <div className="modal-card share-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 'var(--radius-md)',
                background: 'rgba(99, 102, 241, 0.1)',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Share2 size={20} />
            </div>
            <div>
              <h2 id="share-modal-title" className="modal-title" style={{ fontSize: '1.25rem' }}>
                Share Form & QR Code
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {form.title}
              </p>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '1.5rem' }}>
          {/* Unpublished Warning Banner */}
          {!isPublished && (
            <div
              className="share-warning-banner"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '0.9rem 1rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: '#b45309',
                marginBottom: '1.25rem',
              }}
            >
              <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ flex: 1, fontSize: '0.85rem', lineHeight: 1.45 }}>
                <strong>Form is currently in Draft mode (Unpublished).</strong>
                <p style={{ margin: '0.25rem 0 0.5rem 0', color: 'var(--text-main)' }}>
                  Respondents visiting this link or scanning the QR code will see that the survey is closed until it is published.
                </p>
                {onTogglePublish && (
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => onTogglePublish(form.id)}
                    style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem' }}
                  >
                    Publish Form Now
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Canonical Link Box */}
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Globe size={14} />
              <span>Public Survey Link</span>
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="text"
                readOnly
                value={canonicalUrl}
                className="form-input"
                style={{
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  background: 'var(--color-surface-hover)',
                  cursor: 'text',
                }}
                onClick={(e) => e.target.select()}
              />
              <button
                type="button"
                className={`btn ${copied ? 'btn-success' : 'btn-primary'}`}
                onClick={handleCopy}
                title="Copy canonical survey link"
                style={{ flexShrink: 0 }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* QR Code Card */}
          <div
            className="qr-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '1.5rem',
              background: 'var(--color-surface-hover)',
              border: '1.5px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                background: '#ffffff',
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-sm)',
                marginBottom: '1rem',
                display: 'inline-block',
              }}
            >
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR code to open ${form.title}`}
                  style={{ width: 180, height: 180, display: 'block' }}
                />
              ) : (
                <div
                  style={{
                    width: 180,
                    height: 180,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                  }}
                >
                  <QrCode size={48} style={{ opacity: 0.4 }} />
                </div>
              )}
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', maxWidth: 360 }}>
              Scan with any mobile camera to immediately open the responsive survey form.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', width: '100%', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleDownloadQr}
                disabled={!qrDataUrl || qrGenerating}
              >
                <Download size={16} />
                <span>Download QR Code (PNG)</span>
              </button>
              <a
                href={canonicalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost"
                title="Test public survey in a new tab"
              >
                <ExternalLink size={16} />
                <span>Open Survey</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
