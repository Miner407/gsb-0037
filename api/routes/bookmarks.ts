import { Router, type Request, type Response } from 'express';
import * as bookmarkService from '../services/bookmarkService.js';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, domain, folder, archived, limit, offset } = req.query;
    const bookmarks = await bookmarkService.getBookmarks({
      search: search as string,
      domain: domain as string,
      folder: folder as string,
      archived: archived !== undefined ? archived === 'true' : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
      offset: offset ? parseInt(offset as string, 10) : undefined,
    });
    res.json({ success: true, data: bookmarks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch bookmarks' });
  }
});

router.get('/folders', async (req: Request, res: Response) => {
  try {
    const folders = await bookmarkService.getAllFolders();
    res.json({ success: true, data: folders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch folders' });
  }
});

router.put('/batch', async (req: Request, res: Response) => {
  try {
    const { ids, archived } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ success: false, error: 'ids must be an array' });
    }
    const updated = await bookmarkService.batchUpdate(ids, { archived });
    res.json({ success: true, data: { updated } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to batch update bookmarks' });
  }
});

router.delete('/batch', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids)) {
      return res.status(400).json({ success: false, error: 'ids must be an array' });
    }
    const deleted = await bookmarkService.batchDelete(ids);
    res.json({ success: true, data: { deleted } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to batch delete bookmarks' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, url, folder, tags } = req.body;
    if (!title || !url) {
      return res.status(400).json({ success: false, error: 'Title and URL are required' });
    }
    const bookmark = await bookmarkService.createBookmark({ title, url, folder, tags });
    res.status(201).json({ success: true, data: bookmark });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to create bookmark' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const bookmark = await bookmarkService.getBookmarkById(id);
    if (!bookmark) {
      return res.status(404).json({ success: false, error: 'Bookmark not found' });
    }
    res.json({ success: true, data: bookmark });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch bookmark' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const bookmark = await bookmarkService.updateBookmark(id, req.body);
    if (!bookmark) {
      return res.status(404).json({ success: false, error: 'Bookmark not found' });
    }
    res.json({ success: true, data: bookmark });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to update bookmark' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    const deleted = await bookmarkService.deleteBookmark(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Bookmark not found' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to delete bookmark' });
  }
});

export default router;
