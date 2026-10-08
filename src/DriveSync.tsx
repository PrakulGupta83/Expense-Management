import { useEffect, useRef, useState } from 'react';
import { describeDriveError, getDrive, saveToDrive } from './drive';
import { buildMonthWorkbook } from './export';
import { AppData, Expense, monthLabel } from './store';

type Status =
  | { kind: 'checking' }
  | { kind: 'unavailable' }
  | { kind: 'idle' }
  | { kind: 'saving'; month: string }
  | { kind: 'saved'; month: string; at: Date }
  | { kind: 'error'; message: string };

function monthSignatures(expenses: Expense[]): Record<string, string> {
  const byMonth: Record<string, Expense[]> = {};
  for (const e of expenses) (byMonth[e.date.slice(0, 7)] ??= []).push(e);
  return Object.fromEntries(Object.entries(byMonth).map(([m, list]) => [m, JSON.stringify(list)]));
}

/** Keeps one Excel file per month in Google Drive, re-saved a few seconds after any change. */
export function useDriveSync(month: string, data: AppData) {
  const { expenses, budgets, plans, transfers } = data;
  const [status, setStatus] = useState<Status>({ kind: 'checking' });
  const [folderUrl, setFolderUrl] = useState<string | null>(null);
  const dirty = useRef(new Set<string>());
  const prevSigs = useRef<Record<string, string> | null>(null);
  const prevPlanning = useRef<unknown[] | null>(null);
  const latest = useRef(data);
  latest.current = data;
  const running = useRef(false);

  useEffect(() => {
    getDrive().then((mcp) => setStatus(mcp ? { kind: 'idle' } : { kind: 'unavailable' }));
  }, []);

  async function flush() {
    if (running.current) return;
    running.current = true;
    try {
      while (dirty.current.size) {
        const m = [...dirty.current][0];
        dirty.current.delete(m);
        setStatus({ kind: 'saving', month: m });
        try {
          const { folder } = await saveToDrive(`Expenses ${m}.xlsx`, buildMonthWorkbook(m, latest.current));
          if (folder.viewUrl) setFolderUrl(folder.viewUrl);
          setStatus({ kind: 'saved', month: m, at: new Date() });
        } catch (err) {
          dirty.current.add(m); // keep it pending for the next attempt
          setStatus({ kind: 'error', message: describeDriveError(err) });
          return;
        }
      }
    } finally {
      running.current = false;
    }
  }

  // Detect which months changed since the last render.
  useEffect(() => {
    const sigs = monthSignatures(expenses);
    if (prevSigs.current) {
      for (const m of new Set([...Object.keys(sigs), ...Object.keys(prevSigs.current)])) {
        if (sigs[m] !== prevSigs.current[m]) dirty.current.add(m);
      }
    }
    prevSigs.current = sigs;
    // Budget, plan or transfer changes re-save the month being viewed.
    const planning = [budgets, plans, transfers];
    if (prevPlanning.current && planning.some((v, i) => v !== prevPlanning.current![i])) dirty.current.add(month);
    prevPlanning.current = planning;
    if (!dirty.current.size || status.kind === 'unavailable' || status.kind === 'checking') return;
    const t = setTimeout(flush, 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expenses, budgets, plans, transfers]);

  function saveNow() {
    dirty.current.add(month);
    void flush();
  }

  return { status, folderUrl, saveNow };
}

export function DriveStatus({ sync, month }: { sync: ReturnType<typeof useDriveSync>; month: string }) {
  const { status, folderUrl, saveNow } = sync;
  if (status.kind === 'checking') return null;
  if (status.kind === 'unavailable') {
    return <p className="drive-bar muted small">Google Drive saving works when the app is opened from claude.ai.</p>;
  }
  const time = (d: Date) => d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  return (
    <div className={`drive-bar small ${status.kind === 'error' ? 'error' : ''}`}>
      <span>
        {status.kind === 'idle' && <>Google Drive: each month's Excel is saved to the "Our Expenses" folder after every change.</>}
        {status.kind === 'saving' && <>Saving {monthLabel(status.month)} to Google Drive…</>}
        {status.kind === 'saved' && (
          <>
            ✓ {monthLabel(status.month)} saved to Google Drive at {time(status.at)}
          </>
        )}
        {status.kind === 'error' && status.message}
      </span>
      <span className="drive-actions">
        {folderUrl && (
          <a className="link" href={folderUrl} target="_blank" rel="noreferrer">
            Open folder
          </a>
        )}
        <button className="link" onClick={saveNow} disabled={status.kind === 'saving'}>
          Save {monthLabel(month)} to Drive now
        </button>
      </span>
    </div>
  );
}
