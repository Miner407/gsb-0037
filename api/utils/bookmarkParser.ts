import * as cheerio from 'cheerio';
import type { ParsedBookmark } from '../../shared/types.js';

type CheerioElement = any;

export function parseBookmarksHtml(html: string): ParsedBookmark[] {
  const $ = cheerio.load(html);
  const bookmarks: ParsedBookmark[] = [];
  const folderStack: string[] = [];

  function traverseNode(node: CheerioElement): void {
    if (node.tagName === 'h3') {
      const folderName = $(node).text().trim();
      folderStack.push(folderName);
      return;
    }

    if (node.tagName === 'a') {
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

    if (node.tagName === 'dl' || node.tagName === 'dt' || node.type === 'root') {
      const prevFolderDepth = folderStack.length;
      $(node).contents().each((_, child) => {
        if (child.type === 'tag' || child.type === 'root') {
          traverseNode(child as CheerioElement);
        }
      });
      while (folderStack.length > prevFolderDepth) {
        folderStack.pop();
      }
    } else {
      $(node).contents().each((_, child) => {
        if (child.type === 'tag') {
          traverseNode(child as CheerioElement);
        }
      });
    }
  }

  $('body').contents().each((_, el) => {
    if (el.type === 'tag') {
      traverseNode(el as CheerioElement);
    }
  });

  return bookmarks;
}
