export function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

export function normalizeUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    urlObj.hash = '';
    if (urlObj.pathname === '/' && urlObj.search === '') {
      return `${urlObj.protocol}//${urlObj.hostname}/`;
    }
    return urlObj.toString();
  } catch {
    return url;
  }
}
