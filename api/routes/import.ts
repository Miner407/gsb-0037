import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import * as bookmarkService from '../services/bookmarkService.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/preview', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    const htmlContent = req.file.buffer.toString('utf-8');
    const result = await bookmarkService.previewImportBookmarks(htmlContent);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to preview import' });
  }
});

router.post('/', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    const htmlContent = req.file.buffer.toString('utf-8');
    const result = await bookmarkService.importBookmarks(htmlContent);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: 'Failed to import bookmarks' });
  }
});

export default router;
