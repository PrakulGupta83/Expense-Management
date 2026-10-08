// Saves monthly Excel files into an "Our Expenses" folder in the viewer's Google Drive,
// through the claude.ai viewer's Google Drive connector (the `mcp` capability).
// Outside the claude.ai viewer there is no connector, and Drive sync is simply unavailable.

const SERVER = 'Google Drive';
const FOLDER_NAME = 'Our Expenses';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const FOLDER_KEY = 'cem.driveFolder';

type DriveFile = { id: string; title: string; viewUrl?: string };
type Mcp = { callTool: (server: string, tool: string, input?: unknown, opts?: unknown) => Promise<{ payload?: unknown }> };

export type DriveError = { code: string; message: string };

let mcpPromise: Promise<Mcp | null> | null = null;
export function getDrive(): Promise<Mcp | null> {
  const claude = (window as unknown as { claude?: { use?: (n: string) => Promise<unknown> } }).claude;
  if (!claude?.use) return Promise.resolve(null);
  mcpPromise ??= claude.use('mcp').then((m) => (m as Mcp) ?? null).catch(() => null);
  return mcpPromise;
}

async function call<T>(mcp: Mcp, tool: string, input: unknown): Promise<T> {
  const res = await mcp.callTool(SERVER, tool, input, { cache: false });
  return (res.payload ?? {}) as T;
}

async function search(mcp: Mcp, query: string): Promise<DriveFile[]> {
  const res = await call<{ files?: DriveFile[] }>(mcp, 'search_files', { query, excludeContentSnippets: true, pageSize: 20 });
  return res.files ?? [];
}

function readCachedFolder(): DriveFile | null {
  try {
    const raw = localStorage.getItem(FOLDER_KEY);
    return raw ? (JSON.parse(raw) as DriveFile) : null;
  } catch {
    return null;
  }
}

async function findOrCreateFolder(mcp: Mcp): Promise<DriveFile> {
  const cached = readCachedFolder();
  if (cached) return cached;
  const found = await search(mcp, `title = '${FOLDER_NAME}' and mimeType = '${FOLDER_MIME}' and owner = 'me'`);
  const folder =
    found[0] ?? (await call<DriveFile>(mcp, 'create_file', { title: FOLDER_NAME, contentMimeType: FOLDER_MIME }));
  try {
    localStorage.setItem(FOLDER_KEY, JSON.stringify({ id: folder.id, title: folder.title, viewUrl: folder.viewUrl }));
  } catch {
    // Not cached; it is looked up again next time.
  }
  return folder;
}

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/**
 * Replaces `filename` in the folder with new contents: uploads the new file first,
 * then moves older copies to Drive's trash (the connector cannot overwrite a file in place).
 */
export async function saveToDrive(filename: string, data: ArrayBuffer): Promise<{ folder: DriveFile; file: DriveFile }> {
  const mcp = await getDrive();
  if (!mcp) throw { code: 'unavailable', message: 'Google Drive is not available here.' } satisfies DriveError;
  let folder = await findOrCreateFolder(mcp);
  let old: DriveFile[];
  try {
    old = await search(mcp, `title = '${filename}' and parentId = '${folder.id}'`);
  } catch (err) {
    // The cached folder may have been deleted; look it up again once.
    try {
      localStorage.removeItem(FOLDER_KEY);
    } catch {
      /* ignore */
    }
    folder = await findOrCreateFolder(mcp);
    old = await search(mcp, `title = '${filename}' and parentId = '${folder.id}'`);
    void err;
  }
  const file = await call<DriveFile>(mcp, 'create_file', {
    title: filename,
    parentId: folder.id,
    base64Content: toBase64(data),
    contentMimeType: XLSX_MIME,
    disableConversionToGoogleType: true,
  });
  for (const f of old) {
    if (f.id !== file.id) await call(mcp, 'trash_file', { fileId: f.id }).catch(() => undefined);
  }
  return { folder, file };
}

export function describeDriveError(err: unknown): string {
  const code = (err as DriveError)?.code;
  switch (code) {
    case 'needs_reauth':
      return 'Google Drive needs to be reconnected: claude.ai → Settings → Connectors → Google Drive.';
    case 'server_not_connected':
    case 'selection_required':
      return 'Add Google Drive in claude.ai → Settings → Connectors to save here.';
    case 'not_in_manifest':
    case 'approval_required':
    case 'consent_required':
    case 'not_granted':
      return 'Google Drive access was not allowed for this app. Tap "Save to Drive now" to be asked again.';
    case 'unavailable':
    case 'capability_disabled':
    case 'capability_removed':
      return 'Google Drive is not available in this view.';
    case 'server_unavailable':
      return 'Google Drive did not respond. Try "Save to Drive now" in a minute.';
    default:
      return `Could not save to Google Drive${(err as DriveError)?.message ? `: ${(err as DriveError).message}` : '.'}`;
  }
}
