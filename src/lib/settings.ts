export function exportData(): string {
  const data: Record<string, string | null> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('xylaria-')) {
      data[key] = localStorage.getItem(key);
    }
  }
  return JSON.stringify(data, null, 2);
}

export function importData(json: string): boolean {
  try {
    const data = JSON.parse(json);
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('xylaria-') && typeof value === 'string') {
        localStorage.setItem(key, value);
      }
    }
    return true;
  } catch {
    return false;
  }
}