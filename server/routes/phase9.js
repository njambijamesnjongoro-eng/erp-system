const router = require('express').Router();
const ctrl = require('../controllers/phase9Controller');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// Security Command Center
router.get('/command-center', ctrl.getSecurityCommandCenter);

// Zero Trust
router.post('/trust/calculate/:userId', ctrl.calculateTrustScore);
router.get('/trust/scores', ctrl.getTrustScores);
router.post('/trust/verify', ctrl.continuousVerification);

// Biometric
router.post('/biometric/enroll', ctrl.enrollBiometric);
router.post('/biometric/verify', ctrl.verifyBiometric);
router.get('/biometric/profiles', ctrl.getBiometricProfiles);
router.delete('/biometric/:userId', ctrl.revokeBiometric);

// Hardware Keys
router.post('/hardware-keys/register', ctrl.registerHardwareKey);
router.get('/hardware-keys', ctrl.getHardwareKeys);
router.post('/hardware-keys/verify', ctrl.verifyHardwareKey);
router.delete('/hardware-keys/:keySerial', ctrl.revokeHardwareKey);

// PAM Sessions
router.get('/pam/sessions', ctrl.getPamSessions);
router.post('/pam/sessions', ctrl.createPamSession);
router.post('/pam/sessions/:sessionId/terminate', ctrl.terminatePamSession);

// PAM Approvals
router.get('/pam/approvals', ctrl.getPamApprovals);
router.post('/pam/approvals', ctrl.createPamApproval);
router.put('/pam/approvals/:requestId', ctrl.approvePamRequest);

// JIT Access
router.get('/jit-requests', ctrl.getJitRequests);
router.post('/jit-requests', ctrl.requestJitAccess);
router.post('/jit-requests/:requestId/approve', ctrl.approveJitRequest);
router.post('/jit-requests/check-expired', ctrl.checkExpiredJit);

// DLP
router.get('/dlp/rules', ctrl.getDlpRules);
router.post('/dlp/rules', ctrl.createDlpRule);
router.put('/dlp/rules/:ruleId', ctrl.updateDlpRule);
router.get('/dlp/events', ctrl.getDlpEvents);
router.get('/dlp/events/stats', ctrl.getDlpStats);
router.post('/dlp/events', ctrl.detectDlpEvent);
router.put('/dlp/events/:eventId/status', ctrl.updateDlpEventStatus);

// Sensitive Data
router.get('/sensitive-data', ctrl.getSensitiveData);
router.post('/sensitive-data', ctrl.discoverSensitiveData);
router.post('/sensitive-data/scan', ctrl.runDiscoveryScan);

// DRM
router.get('/drm/documents', ctrl.getDrmDocuments);
router.post('/drm/documents', ctrl.createDrmDocument);
router.get('/drm/documents/:documentId', ctrl.accessDrmDocument);
router.post('/drm/documents/:documentId/revoke', ctrl.revokeDrmDocument);

// Session Recordings
router.get('/session-recordings', ctrl.getSessionRecordings);
router.post('/session-recordings/start', ctrl.startSessionRecording);

// SIEM
router.get('/siem/events', ctrl.getSiemEvents);
router.get('/siem/events/stats', ctrl.getSiemStats);
router.post('/siem/events', ctrl.ingestSiemEvent);
router.post('/siem/correlate', ctrl.correlateSiemEvents);
router.get('/siem/correlations', ctrl.getSiemCorrelations);

// SOAR
router.get('/soar/playbooks', ctrl.getSoarPlaybooks);
router.post('/soar/playbooks', ctrl.createSoarPlaybook);
router.get('/soar/executions', ctrl.getSoarExecutions);
router.post('/soar/execute', ctrl.autoSoarExecution);

// Identity Governance
router.get('/identity/reviews', ctrl.getIdentityReviews);
router.post('/identity/reviews', ctrl.createIdentityReview);
router.put('/identity/reviews/:reviewId', ctrl.approveIdentityReview);

// Executive Protection
router.get('/executive-protection', ctrl.getExecutiveProtection);
router.post('/executive-protection', ctrl.createExecutiveProtection);
router.put('/executive-protection/:userId', ctrl.updateExecutiveProtection);

// Deception
router.get('/deception/assets', ctrl.getDeceptionAssets);
router.post('/deception/assets', ctrl.createDeceptionAsset);
router.post('/deception/assets/:assetId/trigger', ctrl.triggerDeceptionAsset);

// Insider Threats
router.get('/insider-threats', ctrl.getInsiderThreats);
router.post('/insider-threats', ctrl.createInsiderThreat);
router.put('/insider-threats/:caseId', ctrl.updateInsiderThreat);

// Executive Vault
router.get('/vault/items', ctrl.getVaultItems);
router.post('/vault/items', ctrl.createVaultItem);
router.get('/vault/items/:itemId', ctrl.accessVaultItem);
router.post('/vault/items/:itemId/archive', ctrl.archiveVaultItem);

// Compliance
router.get('/compliance/mapping', ctrl.getComplianceMapping);
router.put('/compliance/mapping/:id', ctrl.updateComplianceControl);

// Threat Hunting
router.get('/threat-hunts', ctrl.getThreatHunts);
router.post('/threat-hunts', ctrl.createThreatHunt);
router.put('/threat-hunts/:huntId', ctrl.updateThreatHunt);

// Security Scores
router.get('/security-scores', ctrl.getSecurityScores);
router.post('/security-scores/calculate', ctrl.calculateSecurityScores);

// Cyber Resilience
router.get('/resilience/plans', ctrl.getCyberResiliencePlans);
router.post('/resilience/plans', ctrl.createResiliencePlan);
router.post('/resilience/plans/:planId/test', ctrl.testResiliencePlan);

// Reports
router.get('/reports', ctrl.getSecurityReports);
router.post('/reports', ctrl.generateReport);
router.post('/reports/board', ctrl.generateBoardReport);
router.post('/reports/executive', ctrl.generateExecutiveReport);

// Incident Response
router.get('/incident-response/plans', ctrl.getIncidentResponsePlans);

module.exports = router;
