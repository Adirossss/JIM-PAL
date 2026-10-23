import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Destructive action: the confirm button is red. */
  danger?: boolean;
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | null>(null);

/**
 * In-app replacement for window.confirm: a bottom sheet that resolves to
 * true (confirm) or false (cancel, backdrop, Escape). Native confirm dialogs
 * show the site's address, which makes a home-screen app feel like a website.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<{ options: ConfirmOptions; resolve: (ok: boolean) => void } | null>(null);

  const confirm = useCallback<Confirm>(
    (options) => new Promise<boolean>((resolve) => setRequest({ options, resolve })),
    [],
  );

  const close = (ok: boolean) => {
    request?.resolve(ok);
    setRequest(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request && <ConfirmSheet options={request.options} onClose={close} />}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): Confirm {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return confirm;
}

function ConfirmSheet({ options, onClose }: { options: ConfirmOptions; onClose: (ok: boolean) => void }) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose(false)}>
      <div
        className="confirm-sheet"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={options.message ? 'confirm-message' : undefined}
      >
        <span className="progress-sheet__grip" aria-hidden="true" />
        <h2 id="confirm-title">{options.title}</h2>
        {options.message && (
          <p id="confirm-message" className="muted">
            {options.message}
          </p>
        )}
        <div className="confirm-sheet__actions">
          <button
            ref={confirmRef}
            type="button"
            data-confirm="yes"
            className={`btn btn--large ${options.danger ? 'btn--primary btn--danger' : 'btn--primary'}`}
            onClick={() => onClose(true)}
          >
            {options.confirmLabel}
          </button>
          <button type="button" data-confirm="no" className="btn btn--secondary btn--large" onClick={() => onClose(false)}>
            {options.cancelLabel ?? 'ביטול'}
          </button>
        </div>
      </div>
    </div>
  );
}
