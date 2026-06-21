import * as cheerio from 'cheerio';
import type { AnyNode, Element } from 'domhandler';
import type { ParsedBookmark } from '../../shared/types.js';

export function parseBookmarksHtml(html: string): ParsedBookmark[] {
  const $ = cheerio.load(html);
  const bookmarks: ParsedBookmark[] = [];
  const folderStack: string[] = [];

  function traverseNode(node: AnyNode): void {
    if (node.type === 'tag' && node.tagName === 'h3') {
      const folderName = $(node).text().trim();
      folderStack.push(folderName);
      return;
    }

    if (node.type === 'tag' && node.tagName === 'a') {
      const $a = $(node);
      const title = $a.text().trim() || 'Untitled';
      const url = $a.attr('href') || '';
      const tagsAttr = $a.attr('tags') || '';
      const tags = tagsAttr ? tagsAttr.split(',').map(t => t.trim()).filter(Boolean) : [];
      const folder = folderStack.length > 0 ? folderStack.join('/') : '';

      if (url && url.startsWith('http')) {
        bookmarks.push({ title, url, folder, tags });
      }
      return;
    }

    if ((node.type === 'tag' && (node.tagName === 'dl' || node.tagName === 'dt')) || node.type === 'root') {
      const prevFolderDepth = folderStack.length;
      const children = node.childNodes || [];
      for (const child of children) {
        if (child.type === 'tag' || child.type === 'root') {
          traverseNode(child);
        }
      }
      while (folderStack.length > prevFolderDepth) {
        folderStack.pop();
      }
    } else {
      const children = (node as Element).childNodes || [];
      for (const child of children) {
        if (child.type === 'tag') {
          traverseNode(child);
        }
      }
    }
  }

  const body = $('body');
  const bodyEl = body.get(0);
  if (bodyEl) {
    const children = bodyEl.childNodes || [];
    for (const child of children) {
      if (child.type === 'tag') {
        traverseNode(child);
      }
    }
  }

  return bookmarks;
}
