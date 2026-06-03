const p9 = require('../services/phase9Service');

const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

exports.getSecurityCommandCenter = wrap(async (req, res) => {
  const data = await p9.getSecurityCommandCenter();
  res.json({ success: true, data });
});

// Zero Trust
exports.calculateTrustScore = wrap(async (req, res) => {
  const data = await p9.calculateTrustScore(req.params.userId);
  res.json({ success: true, data });
});
exports.getTrustScores = wrap(async (req, res) => {
  const data = await p9.getTrustScores(req.query);
  res.json({ success: true, data });
});
exports.continuousVerification = wrap(async (req, res) => {
  const data = await p9.continuousVerification(req.body.userId, req.body.verifyType, req.body.deviceFingerprint, req.body.ipAddress, req.body.location);
  res.json({ success: true, data });
});

// Biometric
exports.enrollBiometric = wrap(async (req, res) => {
  const data = await p9.enrollBiometric(req.body.userId, req.body.biometricType, req.body.biometricData, req.body.metadata);
  res.status(201).json({ success: true, data });
});
exports.verifyBiometric = wrap(async (req, res) => {
  const data = await p9.verifyBiometric(req.body.userId, req.body.biometricData);
  res.json({ success: true, data });
});
exports.getBiometricProfiles = wrap(async (req, res) => {
  const data = await p9.getBiometricProfiles(req.query);
  res.json({ success: true, data });
});
exports.revokeBiometric = wrap(async (req, res) => {
  const data = await p9.revokeBiometric(req.params.userId);
  res.json({ success: true, data });
});

// Hardware Keys
exports.registerHardwareKey = wrap(async (req, res) => {
  const data = await p9.registerHardwareKey(req.body.userId, req.body.keyType, req.body.keySerial, req.body.keyLabel, req.body.publicKey, req.body.credentialId);
  res.status(201).json({ success: true, data });
});
exports.getHardwareKeys = wrap(async (req, res) => {
  const data = await p9.getHardwareKeys(req.query);
  res.json({ success: true, data });
});
exports.verifyHardwareKey = wrap(async (req, res) => {
  const data = await p9.verifyHardwareKey(req.body.keySerial);
  res.json({ success: true, data });
});
exports.revokeHardwareKey = wrap(async (req, res) => {
  const data = await p9.revokeHardwareKey(req.params.keySerial);
  res.json({ success: true, data });
});

// PAM
exports.createPamSession = wrap(async (req, res) => {
  const data = await p9.createPamSession(req.user?.id, req.user?.name, req.body.privilegedRole, req.body.targetSystem, req.body.targetType, req.body.accessLevel, req.body.justification, req.ip);
  res.status(201).json({ success: true, data });
});
exports.getPamSessions = wrap(async (req, res) => {
  const data = await p9.getPamSessions(req.query);
  res.json({ success: true, data });
});
exports.terminatePamSession = wrap(async (req, res) => {
  const data = await p9.terminatePamSession(req.params.sessionId);
  res.json({ success: true, data });
});
exports.createPamApproval = wrap(async (req, res) => {
  const data = await p9.createPamApproval(req.body.userId, req.body.userName, req.body.approverId, req.body.approverName, req.body.accessType, req.body.targetSystem, req.body.justification, req.body.urgency, req.body.durationMinutes);
  res.status(201).json({ success: true, data });
});
exports.approvePamRequest = wrap(async (req, res) => {
  const data = await p9.approvePamRequest(req.params.requestId, req.body.status);
  res.json({ success: true, data });
});
exports.getPamApprovals = wrap(async (req, res) => {
  const data = await p9.getPamApprovals(req.query);
  res.json({ success: true, data });
});

// JIT
exports.requestJitAccess = wrap(async (req, res) => {
  const data = await p9.requestJitAccess(req.body.userId, req.body.userName, req.body.resourceType, req.body.resourceName, req.body.permissionLevel, req.body.justification, req.body.durationMinutes);
  res.status(201).json({ success: true, data });
});
exports.approveJitRequest = wrap(async (req, res) => {
  const data = await p9.approveJitRequest(req.params.requestId, req.user?.id, req.user?.name);
  res.json({ success: true, data });
});
exports.getJitRequests = wrap(async (req, res) => {
  const data = await p9.getJitRequests(req.query);
  res.json({ success: true, data });
});
exports.checkExpiredJit = wrap(async (req, res) => {
  const data = await p9.checkExpiredJit();
  res.json({ success: true, data });
});

// DLP
exports.getDlpRules = wrap(async (req, res) => {
  const data = await p9.getDlpRules(req.query);
  res.json({ success: true, data });
});
exports.createDlpRule = wrap(async (req, res) => {
  const data = await p9.createDlpRule(req.body);
  res.status(201).json({ success: true, data });
});
exports.updateDlpRule = wrap(async (req, res) => {
  const data = await p9.updateDlpRule(req.params.ruleId, req.body);
  res.json({ success: true, data });
});
exports.detectDlpEvent = wrap(async (req, res) => {
  const data = await p9.detectDlpEvent(req.body.ruleId, req.body.userId, req.body.userName, req.body.eventType, req.body.severity, req.body.dataClassification, req.body.dataDetails, req.body.sourceApp, req.body.sourceIp, req.body.contentPreview);
  res.status(201).json({ success: true, data });
});
exports.getDlpEvents = wrap(async (req, res) => {
  const data = await p9.getDlpEvents(req.query);
  res.json({ success: true, data });
});
exports.updateDlpEventStatus = wrap(async (req, res) => {
  const data = await p9.updateDlpEventStatus(req.params.eventId, req.body.status);
  res.json({ success: true, data });
});
exports.getDlpStats = wrap(async (req, res) => {
  const data = await p9.getDlpStats();
  res.json({ success: true, data });
});

// Sensitive Data
exports.discoverSensitiveData = wrap(async (req, res) => {
  const data = await p9.discoverSensitiveData(req.body.dataType, req.body.classification, req.body.location, req.body.tableName, req.body.columnName, req.body.recordCount);
  res.status(201).json({ success: true, data });
});
exports.getSensitiveData = wrap(async (req, res) => {
  const data = await p9.getSensitiveData(req.query);
  res.json({ success: true, data });
});
exports.runDiscoveryScan = wrap(async (req, res) => {
  const data = await p9.runDiscoveryScan();
  res.json({ success: true, data });
});

// DRM
exports.createDrmDocument = wrap(async (req, res) => {
  const data = await p9.createDrmDocument(req.body, req.user?.id, req.user?.name);
  res.status(201).json({ success: true, data });
});
exports.getDrmDocuments = wrap(async (req, res) => {
  const data = await p9.getDrmDocuments(req.query);
  res.json({ success: true, data });
});
exports.accessDrmDocument = wrap(async (req, res) => {
  const data = await p9.accessDrmDocument(req.params.documentId);
  res.json({ success: true, data });
});
exports.revokeDrmDocument = wrap(async (req, res) => {
  const data = await p9.revokeDrmDocument(req.params.documentId);
  res.json({ success: true, data });
});

// Session Recording
exports.startSessionRecording = wrap(async (req, res) => {
  const data = await p9.startSessionRecording(req.user?.id, req.user?.name, req.body.sessionType, req.body.sessionId);
  res.status(201).json({ success: true, data });
});
exports.getSessionRecordings = wrap(async (req, res) => {
  const data = await p9.getSessionRecordings(req.query);
  res.json({ success: true, data });
});

// SIEM
exports.ingestSiemEvent = wrap(async (req, res) => {
  const data = await p9.ingestSiemEvent(req.body.eventSource, req.body.eventType, req.body.eventCategory, req.body.severity, req.body.title, req.body.description, req.body.sourceIp, req.body.userId, req.body.userName, req.body.affectedResource, req.body.rawData);
  res.status(201).json({ success: true, data });
});
exports.getSiemEvents = wrap(async (req, res) => {
  const data = await p9.getSiemEvents(req.query);
  res.json({ success: true, data });
});
exports.correlateSiemEvents = wrap(async (req, res) => {
  const data = await p9.correlateSiemEvents();
  res.json({ success: true, data });
});
exports.getSiemCorrelations = wrap(async (req, res) => {
  const data = await p9.getSiemCorrelations(req.query);
  res.json({ success: true, data });
});
exports.getSiemStats = wrap(async (req, res) => {
  const data = await p9.getSiemStats();
  res.json({ success: true, data });
});

// SOAR
exports.createSoarPlaybook = wrap(async (req, res) => {
  const data = await p9.createSoarPlaybook(req.body, req.user?.id);
  res.status(201).json({ success: true, data });
});
exports.getSoarPlaybooks = wrap(async (req, res) => {
  const data = await p9.getSoarPlaybooks(req.query);
  res.json({ success: true, data });
});
exports.getSoarExecutions = wrap(async (req, res) => {
  const data = await p9.getSoarExecutions(req.query);
  res.json({ success: true, data });
});
exports.autoSoarExecution = wrap(async (req, res) => {
  const data = await p9.autoSoarExecution(req.body.triggerEventId, req.body.triggerType, req.body.triggerTitle);
  res.json({ success: true, data });
});

// Identity Governance
exports.createIdentityReview = wrap(async (req, res) => {
  const data = await p9.createIdentityReview(req.body.reviewType, req.body.userId, req.body.userName, req.body.userEmail, req.body.department, req.body.userRole, req.body.newUserRole, req.body.reviewerId, req.body.reviewerName);
  res.status(201).json({ success: true, data });
});
exports.getIdentityReviews = wrap(async (req, res) => {
  const data = await p9.getIdentityReviews(req.query);
  res.json({ success: true, data });
});
exports.approveIdentityReview = wrap(async (req, res) => {
  const data = await p9.approveIdentityReview(req.params.reviewId, req.body.status, req.body.comments);
  res.json({ success: true, data });
});

// Executive Protection
exports.getExecutiveProtection = wrap(async (req, res) => {
  const data = await p9.getExecutiveProtection(req.query);
  res.json({ success: true, data });
});
exports.createExecutiveProtection = wrap(async (req, res) => {
  const data = await p9.createExecutiveProtection(req.body);
  res.status(201).json({ success: true, data });
});
exports.updateExecutiveProtection = wrap(async (req, res) => {
  const data = await p9.updateExecutiveProtection(req.params.userId, req.body);
  res.json({ success: true, data });
});

// Deception
exports.createDeceptionAsset = wrap(async (req, res) => {
  const data = await p9.createDeceptionAsset(req.body.assetType, req.body.assetName, req.body.description, req.body.honeytoken, req.body.baitValue, req.body.deploymentLocation);
  res.status(201).json({ success: true, data });
});
exports.getDeceptionAssets = wrap(async (req, res) => {
  const data = await p9.getDeceptionAssets(req.query);
  res.json({ success: true, data });
});
exports.triggerDeceptionAsset = wrap(async (req, res) => {
  const data = await p9.triggerDeceptionAsset(req.params.assetId, req.body.triggeredBy, req.body.triggeredIp);
  res.json({ success: true, data });
});

// Insider Threats
exports.createInsiderThreat = wrap(async (req, res) => {
  const data = await p9.createInsiderThreat(req.body.userId, req.body.userName, req.body.department, req.body.threatType, req.body.severity, req.body.riskScore, req.body.indicators, req.body.evidence, req.body.description);
  res.status(201).json({ success: true, data });
});
exports.getInsiderThreats = wrap(async (req, res) => {
  const data = await p9.getInsiderThreats(req.query);
  res.json({ success: true, data });
});
exports.updateInsiderThreat = wrap(async (req, res) => {
  const data = await p9.updateInsiderThreat(req.params.caseId, req.body);
  res.json({ success: true, data });
});

// Executive Vault
exports.createVaultItem = wrap(async (req, res) => {
  const data = await p9.createVaultItem(req.body, req.user?.id, req.user?.name);
  res.status(201).json({ success: true, data });
});
exports.getVaultItems = wrap(async (req, res) => {
  const data = await p9.getVaultItems(req.query);
  res.json({ success: true, data });
});
exports.accessVaultItem = wrap(async (req, res) => {
  const data = await p9.accessVaultItem(req.params.itemId);
  res.json({ success: true, data });
});
exports.archiveVaultItem = wrap(async (req, res) => {
  const data = await p9.archiveVaultItem(req.params.itemId);
  res.json({ success: true, data });
});

// Compliance
exports.getComplianceMapping = wrap(async (req, res) => {
  const data = await p9.getComplianceMapping(req.query);
  res.json({ success: true, data });
});
exports.updateComplianceControl = wrap(async (req, res) => {
  const data = await p9.updateComplianceControl(req.params.id, req.body);
  res.json({ success: true, data });
});

// Threat Hunting
exports.createThreatHunt = wrap(async (req, res) => {
  const data = await p9.createThreatHunt(req.body);
  res.status(201).json({ success: true, data });
});
exports.getThreatHunts = wrap(async (req, res) => {
  const data = await p9.getThreatHunts(req.query);
  res.json({ success: true, data });
});
exports.updateThreatHunt = wrap(async (req, res) => {
  const data = await p9.updateThreatHunt(req.params.huntId, req.body);
  res.json({ success: true, data });
});

// Security Scores
exports.getSecurityScores = wrap(async (req, res) => {
  const data = await p9.getSecurityScores(req.query);
  res.json({ success: true, data });
});
exports.calculateSecurityScores = wrap(async (req, res) => {
  const data = await p9.calculateSecurityScores();
  res.json({ success: true, data });
});

// Cyber Resilience
exports.getCyberResiliencePlans = wrap(async (req, res) => {
  const data = await p9.getCyberResiliencePlans(req.query);
  res.json({ success: true, data });
});
exports.createResiliencePlan = wrap(async (req, res) => {
  const data = await p9.createResiliencePlan(req.body);
  res.status(201).json({ success: true, data });
});
exports.testResiliencePlan = wrap(async (req, res) => {
  const data = await p9.testResiliencePlan(req.params.planId);
  res.json({ success: true, data });
});

// Reports
exports.generateReport = wrap(async (req, res) => {
  const data = await p9.generateReport(req.body.reportName, req.body.reportType, req.body.reportFormat, req.user?.id, req.user?.name, req.body.reportData);
  res.status(201).json({ success: true, data });
});
exports.getSecurityReports = wrap(async (req, res) => {
  const data = await p9.getSecurityReports(req.query);
  res.json({ success: true, data });
});
exports.generateBoardReport = wrap(async (req, res) => {
  const data = await p9.generateBoardReport(req.user?.id, req.user?.name);
  res.json({ success: true, data });
});
exports.generateExecutiveReport = wrap(async (req, res) => {
  const data = await p9.generateExecutiveReport(req.user?.id, req.user?.name);
  res.json({ success: true, data });
});

// Incident Response
exports.getIncidentResponsePlans = wrap(async (req, res) => {
  const data = await p9.getIncidentResponsePlans(req.query);
  res.json({ success: true, data });
});
