const router = require('express').Router();
const ctrl = require('../controllers/fileSecurityController');
const { authenticate, authorize } = require('../middleware/auth');
const { createFileUploadMiddleware } = require('../middleware/fileSecurityMiddleware');

router.use(authenticate);

// ─── Upload ─────────────────────────────────────────────────────
router.post('/upload', ctrl.getUploadMiddleware(), createFileUploadMiddleware(), ctrl.uploadFile);

// ─── Files ──────────────────────────────────────────────────────
router.get('/files', ctrl.listFiles);
router.get('/files/:id', ctrl.getFile);
router.put('/files/:id', ctrl.updateFile);
router.delete('/files/:id', authorize('files', 'delete'), ctrl.deleteFile);

// ─── Download / Preview ─────────────────────────────────────────
router.get('/download/:id', ctrl.downloadFile);
router.get('/download/token/:token', ctrl.signedDownload);
router.get('/preview/:id', ctrl.previewFile);

// ─── Download Tokens ────────────────────────────────────────────
router.post('/files/:id/token', ctrl.generateDownloadToken);

// ─── Sharing ────────────────────────────────────────────────────
router.post('/files/:id/share', ctrl.shareFile);
router.post('/shares/:shareId/revoke', ctrl.revokeShare);
router.get('/shared/access/:token', ctrl.accessShared);
router.get('/my-shares', ctrl.getMyShares);
router.get('/share-analytics', ctrl.getShareAnalytics);

// ─── Access Logs ────────────────────────────────────────────────
router.get('/access-logs', ctrl.getFileAccessLogs);

// ─── DLP Alerts ─────────────────────────────────────────────────
router.get('/dlp/alerts', ctrl.getDLPAlerts);
router.post('/dlp/alerts/:id/resolve', ctrl.resolveDLPAlert);
router.get('/dlp/stats', ctrl.getDLPStats);

// ─── Classification ─────────────────────────────────────────────
router.get('/classifications', ctrl.getClassifications);
router.put('/classifications/:id', authorize('system_settings', 'update'), ctrl.updateClassification);

// ─── Malware Scan ───────────────────────────────────────────────
router.get('/scans/:fileId', ctrl.getScanHistory);
router.get('/scan-stats', ctrl.getScanStats);

// ─── Storage ────────────────────────────────────────────────────
router.get('/storage-analytics', ctrl.getStorageAnalytics);

// ─── Watermarks ─────────────────────────────────────────────────
router.get('/watermarks/:fileId', ctrl.getWatermarkLogs);

// ─── Dashboard ──────────────────────────────────────────────────
router.get('/dashboard', ctrl.getDashboard);

module.exports = router;
