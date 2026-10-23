import { useCallback, useMemo, useState, type FormEvent } from 'react';
import {
  BODY_METRICS,
  BODY_METRIC_LABELS_HE,
  BODY_METRIC_UNITS_HE,
  bodyChange,
  bodySeries,
  createBodyEntry,
  formatBodyChange,
  measuredMetrics,
  sortBodyEntries,
  type BodyEntryInput,
  type BodyMetric,
} from '../lib/body';
import { formatDateHe, formatKg, isValidDateString, toLocalDateString, weekdayHe } from '../lib/format';
import { createId } from '../lib/ids';
import { useApp } from '../state/AppContext';
import { useConfirm } from '../state/confirm';
import type { BodyEntry } from '../types';
import { BackButton, DateField, Icon, ScreenHeader, Toast } from './common';
import { LineChart } from './ProgressChart';

function entrySummary(entry: BodyEntry): string {
  return BODY_METRICS.filter((m) => entry[m] !== null)
    .map((m) => `${BODY_METRIC_LABELS_HE[m]} ${formatKg(entry[m]!)} ${BODY_METRIC_UNITS_HE[m]}`)
    .join(' · ');
}

export function BodyScreen() {
  const { data, update, goBack } = useApp();
  const confirm = useConfirm();
  const entries = data.bodyEntries;
  const metrics = useMemo(() => measuredMetrics(entries), [entries]);
  const [chosen, setChosen] = useState<BodyMetric>('weight');
  const metric = metrics.includes(chosen) ? chosen : (metrics[0] ?? 'weight');
  const series = useMemo(() => bodySeries(entries, metric), [entries, metric]);
  const change = bodyChange(entries, metric);
  const history = useMemo(() => sortBodyEntries(entries), [entries]);
  const [saved, setSaved] = useState<string | null>(null);
  const clearSaved = useCallback(() => setSaved(null), []);

  const remove = async (entry: BodyEntry) => {
    const ok = await confirm({
      title: 'למחוק את המדידה?',
      message: `${formatDateHe(entry.date)}: ${entrySummary(entry)}`,
      confirmLabel: 'מחק',
      danger: true,
    });
    if (ok) update((d) => ({ ...d, bodyEntries: d.bodyEntries.filter((e) => e.id !== entry.id) }));
  };

  return (
    <div className="stack" style={{ gap: 0 }}>
      <div className="progress-hero">
        <ScreenHeader start={<BackButton onClick={() => goBack({ name: 'workout' })} />} title="משקל גוף ומדידות" />

        {metrics.length > 1 && (
          <div className="segmented" role="radiogroup" aria-label="מה להציג בגרף">
            {metrics.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={metric === m}
                className={`segmented__item ${metric === m ? 'segmented__item--on' : ''}`}
                onClick={() => setChosen(m)}
              >
                {BODY_METRIC_LABELS_HE[m]}
              </button>
            ))}
          </div>
        )}

        {change ? (
          <>
            <div className="hero-text">
              <span className="small" style={{ color: 'var(--muted)' }}>
                {BODY_METRIC_LABELS_HE[metric]} · {formatDateHe(change.latest.date)}
              </span>
              <span className="big-number">
                {formatKg(change.latest.value)} <small>{BODY_METRIC_UNITS_HE[metric]}</small>
              </span>
              {change.sincePrevious !== null && change.sinceFirst !== null && (
                <span className="small" style={{ color: 'var(--muted)' }}>
                  <bdi>{formatBodyChange(change.sincePrevious, metric)}</bdi> מהמדידה הקודמת ·{' '}
                  <bdi>{formatBodyChange(change.sinceFirst, metric)}</bdi> מההתחלה
                </span>
              )}
            </div>
            <LineChart key={metric} points={series} unit={BODY_METRIC_UNITS_HE[metric]} title={BODY_METRIC_LABELS_HE[metric]} />
          </>
        ) : (
          <p className="muted small" style={{ paddingBottom: 24 }}>
            עוד אין מדידות. רשום משקל (ואם בא לך גם היקפים) כדי לראות כאן גרף לאורך זמן.
          </p>
        )}
      </div>

      <div className="progress-sheet">
        <span className="progress-sheet__grip" aria-hidden="true" />
        <NewBodyEntryForm
          lastWeight={history.find((e) => e.weight !== null)?.weight ?? null}
          onSaved={(entry) => {
            update((d) => ({ ...d, bodyEntries: [...d.bodyEntries, entry] }));
            setSaved('המדידה נשמרה');
          }}
        />

        {history.length > 0 && (
          <>
            <h2 className="section-title">כל המדידות ({history.length})</h2>
            <div>
              {history.map((entry) => (
                <div key={entry.id} className="session-row" style={{ cursor: 'default' }}>
                  <span className="headline">
                    <span className="headline__date">
                      {weekdayHe(entry.date)}, {formatDateHe(entry.date)}
                    </span>
                    <span className="headline__stats">{entrySummary(entry)}</span>
                  </span>
                  <button
                    type="button"
                    className="icon-btn icon-btn--danger"
                    aria-label={`מחק מדידה מ-${formatDateHe(entry.date)}`}
                    onClick={() => remove(entry)}
                  >
                    <Icon name="trash" size={18} />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      {saved && <Toast message={saved} icon="check" onDone={clearSaved} />}
    </div>
  );
}

const FIELDS: { metric: BodyMetric; label: string }[] = [
  { metric: 'waist', label: 'מותניים' },
  { metric: 'chest', label: 'חזה' },
  { metric: 'arm', label: 'זרוע' },
];

function NewBodyEntryForm({ lastWeight, onSaved }: { lastWeight: number | null; onSaved: (entry: BodyEntry) => void }) {
  const today = toLocalDateString(new Date());
  const blank = (): BodyEntryInput => ({
    date: today,
    weight: lastWeight === null ? '' : formatKg(lastWeight),
    waist: '',
    chest: '',
    arm: '',
  });
  const [input, setInput] = useState<BodyEntryInput>(blank);
  const [errors, setErrors] = useState<string[]>([]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = createBodyEntry({ ...input, date: isValidDateString(input.date) ? input.date : today }, createId('body-'));
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors([]);
    onSaved(result.entry);
    setInput({ ...blank(), weight: result.entry.weight === null ? input.weight : formatKg(result.entry.weight) });
  };

  const numberInput = (metric: BodyMetric, label: string) => (
    <input
      className="input"
      inputMode="decimal"
      enterKeyHint="done"
      aria-label={`${label} ב${BODY_METRIC_UNITS_HE[metric]}`}
      placeholder={metric === 'weight' ? '0' : 'רשות'}
      value={input[metric]}
      onChange={(e) => setInput({ ...input, [metric]: e.target.value })}
      onFocus={(e) => e.target.select()}
    />
  );

  return (
    <form className="form" onSubmit={submit} noValidate aria-label="מדידה חדשה" style={{ padding: '4px 6px' }}>
      <h2 style={{ margin: 0 }}>מדידה חדשה</h2>
      <div className="field">
        <span className="field__label">תאריך</span>
        <DateField label="תאריך המדידה" value={input.date} onChange={(date) => setInput({ ...input, date })} />
      </div>
      <label className="field">
        <span className="field__label">משקל גוף (ק"ג)</span>
        {numberInput('weight', 'משקל גוף')}
      </label>
      <div className="body-fields">
        {FIELDS.map((f) => (
          <label key={f.metric} className="field">
            <span className="field__label">{f.label} (ס"מ)</span>
            {numberInput(f.metric, f.label)}
          </label>
        ))}
      </div>
      {errors.length > 0 && (
        <ul className="errors" role="alert">
          {errors.map((err) => (
            <li key={err}>{err}</li>
          ))}
        </ul>
      )}
      <button type="submit" className="btn btn--primary btn--large btn--block">
        שמור מדידה
      </button>
    </form>
  );
}
