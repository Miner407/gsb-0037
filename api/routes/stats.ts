import { Router, type Request, type Response } from 'express';
import * as bookmarkService from '../services/bookmarkService.js';

const router = Router();

router.get('/overview', async (req: Request, res: Response) => {
  try {
    const stats = await bookmarkService.getStatsOverview();
    res.json({ success: true, data: stats });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch overview stats' });
  }
});

router.get('/duplicates', async (req: Request, res: Response) => {
  try {
    const duplicates = await bookmarkService.getDuplicates();
    res.json({ success: true, data: duplicates });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch duplicates' });
  }
});

router.get('/domains', async (req: Request, res: Response) => {
  try {
    const domains = await bookmarkService.getDomainStats();
    res.json({ success: true, data: domains });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch domain stats' });
  }
});

router.get('/recent', async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const recent = await bookmarkService.getRecentBookmarks(limit);
    res.json({ success: true, data: recent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to fetch recent bookmarks' });
  }
});

export default router;
