import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { useScrollLock } from './scrollLock';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Destructive action: the confirm button is red. */
  danger?: boolean;
}

export interface PromptOptions {
  title: string;
  message?: string;
  label: string;
  initial?: string;
  placeholder?: string;
  maxLength?: number;
  confirmLabel: string;
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;
type Prompt = (options: PromptOptions) => Promise<string | null>;

type Request =
  | { kind: 'confirm'; options: ConfirmOptions; resolve: (ok: boolean) => void }
  | { kind: 'prompt'; options: PromptOptions; resolve: (value: string | null) => void };

const DialogContext = createContext<{ confirm: Confirm; prompt: Prompt } | null>(null);

/**
 * In-app replacements for window.confirm / window.prompt: bottom sheets that
 * resolve when closed. Native dialogs show the site's address, which makes a
 * home-screen app feel like a website.
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<Request | null>(null);

  const confirm = useCallback<Confirm>(
    (options) => new Promise<boolean>((resolve) => setRequest({ kind: 'confirm', options, resolve })),
    [],
  );
  const prompt = useCallback<Prompt>(
    (options) => new Promise<string | null>((resolve) => setRequest({ kind: 'prompt', options, resolve })),
    [],
  );
  const [api] = useState(() => ({ confirm, prompt }));

  return (
    <DialogContext.Provider value={api}>
      {children}
      {request?.kind === 'confirm' && (
        <ConfirmSheet
          options={request.options}
          onClose={(ok) => {
            request.resolve(ok);
            setRequest(null);
          }}
        />
      )}
      {request?.kind === 'prompt' && (
        <PromptSheet
          options={request.options}
          onClose={(value) => {
            request.resolve(value);
            setRequest(null);
          }}
        />
      )}
    </DialogContext.Provider>
  );
}

function useDialogs() {
  const api = useContext(DialogContext);
  if (!api) throw new Error('dialogs must be used inside <ConfirmProvider>');
  return api;
}

export function useConfirm(): Confirm {
  return useDialogs().confirm;
}

export function usePrompt(): Prompt {
  return useDialogs().prompt;
}

function useEscape(onEscape: () => void) {
  const ref = useRef(onEscape);
  ref.current = onEscape;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') ref.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

function ConfirmSheet({ options, onClose }: { options: ConfirmOptions; onClose: (ok: boolean) => void }) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  useScrollLock(backdropRef);
  useEscape(() => onClose(false));
  useEffect(() => confirmRef.current?.focus(), []);

  return (
    <div ref={backdropRef} className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose(false)}>
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

function PromptSheet({ options, onClose }: { options: PromptOptions; onClose: (value: string | null) => void }) {
  const [value, setValue] = useState(options.initial ?? '');
  const backdropRef = useRef<HTMLDivElement>(null);
  useScrollLock(backdropRef);
  useEscape(() => onClose(null));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (value.trim()) onClose(value.trim());
  };

  return (
    <div ref={backdropRef} className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose(null)}>
      <form className="confirm-sheet" role="dialog" aria-modal="true" aria-labelledby="prompt-title" onSubmit={submit}>
        <span className="progress-sheet__grip" aria-hidden="true" />
        <h2 id="prompt-title">{options.title}</h2>
        {options.message && <p className="muted">{options.message}</p>}
        <label className="field">
          <span className="field__label">{options.label}</span>
          <input
            className="input"
            value={value}
            placeholder={options.placeholder}
            maxLength={options.maxLength}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            enterKeyHint="done"
          />
        </label>
        <div className="confirm-sheet__actions">
          <button type="submit" data-confirm="yes" className="btn btn--primary btn--large" disabled={!value.trim()}>
            {options.confirmLabel}
          </button>
          <button type="button" data-confirm="no" className="btn btn--secondary btn--large" onClick={() => onClose(null)}>
            ביטול
          </button>
        </div>
      </form>
    </div>
  );
}
