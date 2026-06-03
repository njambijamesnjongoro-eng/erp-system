import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { DashboardLayout } from './components/Layout/DashboardLayout';
import { ProtectedRoute } from './components/Layout/ProtectedRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Profile } from './pages/Profile';

// HR Pages
import { HrDashboard } from './pages/hr/HrDashboard';
import { EmployeeDirectory } from './pages/hr/EmployeeDirectory';
import { EmployeeProfile } from './pages/hr/EmployeeProfile';
import { EmployeeForm } from './pages/hr/EmployeeForm';
import { AttendancePage } from './pages/hr/AttendancePage';
import { LeavePage } from './pages/hr/LeavePage';
import { InsurancePage as HrInsurancePage } from './pages/hr/InsurancePage';
import { TrainingPage } from './pages/hr/TrainingPage';
import { PerformancePage } from './pages/hr/PerformancePage';
import { DocumentsPage } from './pages/hr/DocumentsPage';
import { OnboardingPage } from './pages/hr/OnboardingPage';

// Finance Pages
import { FinanceDashboard } from './pages/finance/FinanceDashboard';
import { PayrollPage } from './pages/finance/PayrollPage';
import { ExpensePage } from './pages/finance/ExpensePage';
import { BudgetPage } from './pages/finance/BudgetPage';
import { TaxPage } from './pages/finance/TaxPage';
import { LoanPage } from './pages/finance/LoanPage';
import { ReportsPage as FinanceReportsPage } from './pages/finance/ReportsPage';
import { AccountsPage } from './pages/finance/AccountsPage';

// Asset & Fleet Pages
import { AssetDashboard } from './pages/assets/AssetDashboard';
import { AssetDirectory } from './pages/assets/AssetDirectory';
import { AssetDetail } from './pages/assets/AssetDetail';
import { FleetPage } from './pages/assets/FleetPage';
import { MaintenancePage } from './pages/assets/MaintenancePage';
import { InsurancePage } from './pages/assets/InsurancePage';
import { SparePartsPage } from './pages/assets/SparePartsPage';
import { VendorsPage } from './pages/assets/VendorsPage';

// Procurement & Inventory Pages
import { ProcurementDashboard } from './pages/procurement/ProcurementDashboard';
import { ProcurementRequests } from './pages/procurement/ProcurementRequests';

// Analytics & BI Pages
import { ExecutiveDashboard } from './pages/analytics/ExecutiveDashboard';
import { AnalyticsPage } from './pages/analytics/AnalyticsPage';
import { NotificationsPage } from './pages/analytics/NotificationsPage';
import { ReportsPage as AnalyticsReportsPage } from './pages/analytics/ReportsPage';
import { AuditLogsPage } from './pages/analytics/AuditLogsPage';
import { BIInsightsPage } from './pages/analytics/BIInsightsPage';
import { SystemHealthPage } from './pages/analytics/SystemHealthPage';

// Admin & Security Pages
import { SystemDashboard } from './pages/admin/SystemDashboard';
import { UserManagement } from './pages/admin/UserManagement';
import { SecurityMonitor } from './pages/admin/SecurityMonitor';
import { BackupManager } from './pages/admin/BackupManager';
import { AuditViewer } from './pages/admin/AuditViewer';
import { APIMonitor } from './pages/admin/APIMonitor';
import { SystemSettings } from './pages/admin/SystemSettings';
import { DeploymentStatus } from './pages/admin/DeploymentStatus';
import { ProcurementApprovals } from './pages/procurement/ProcurementApprovals';
import { SuppliersPage } from './pages/procurement/SuppliersPage';
import { PurchaseOrdersPage } from './pages/procurement/PurchaseOrdersPage';
import { InventoryPage } from './pages/procurement/InventoryPage';
import { WarehousesPage } from './pages/procurement/WarehousesPage';
import { GRNPage } from './pages/procurement/GRNPage';
import { ProcurementReports } from './pages/procurement/ProcurementReports';

// Portal Pages
import { EssPortal } from './pages/portal/EssPortal';
import { ClientPortal } from './pages/portal/ClientPortal';
import { VendorPortal } from './pages/portal/VendorPortal';
import { SupportTickets } from './pages/portal/SupportTickets';
import { CommunicationsCenter } from './pages/portal/CommunicationsCenter';
import { CalendarPage } from './pages/portal/CalendarPage';
import { IntegrationsPage } from './pages/portal/IntegrationsPage';
import { PaymentsPage } from './pages/portal/PaymentsPage';

// Department & Roles Pages
import { DepartmentsPage } from './pages/departments/DepartmentsPage';
import { RolesPage } from './pages/roles/RolesPage';

// Security Pages
import { SessionManagement } from './pages/security/SessionManagement';
import { SecuritySettings } from './pages/security/SecuritySettings';
import { MFASetup } from './pages/security/MFASetup';
import { DeviceTrustManagement } from './pages/security/DeviceTrustManagement';
import { LoginHistory } from './pages/security/LoginHistory';
import { SecurityRiskDashboard } from './pages/security/SecurityRiskDashboard';
import { SecuritySettingsCenter } from './pages/security/SecuritySettingsCenter';
import { InfrastructureDashboard } from './pages/security/InfrastructureDashboard';
import { AuditLogViewer } from './pages/security/AuditLogViewer';
import { ApiSecurityMonitoring } from './pages/security/ApiSecurityMonitoring';

// File Security Pages (Phase 4)
import { FileSecurityDashboard } from './pages/fileSecurity/FileSecurityDashboard';
import { FileUploadCenter } from './pages/fileSecurity/FileUploadCenter';
import { FileManager } from './pages/fileSecurity/FileManager';
import { SharedDocumentsPage } from './pages/fileSecurity/SharedDocumentsPage';
import { FileActivityLogs } from './pages/fileSecurity/FileActivityLogs';
import { StorageAnalytics } from './pages/fileSecurity/StorageAnalytics';
import { ClassificationManagement } from './pages/fileSecurity/ClassificationManagement';

// GRC Pages (Phase 6)
import { GRCDashboard } from './pages/grc/GRCDashboard';
import { PolicyCenter } from './pages/grc/PolicyCenter';
import { AuditCenter } from './pages/grc/AuditCenter';
import { RiskManagement } from './pages/grc/RiskManagement';
import { ComplianceCenter } from './pages/grc/ComplianceCenter';
import { AccessReviewCenter } from './pages/grc/AccessReviewCenter';
import { GovernanceReports } from './pages/grc/GovernanceReports';
import { InvestigationCenter } from './pages/grc/InvestigationCenter';
import { SoDControlCenter } from './pages/grc/SoDControlCenter';

// Phase 9 Security Pages
import { SecurityCommandCenter } from './pages/phase9/SecurityCommandCenter';
import { PAMCenter } from './pages/phase9/PAMCenter';
import { DLPCenter } from './pages/phase9/DLPCenter';
import { SIEMDashboard } from './pages/phase9/SIEMDashboard';
import { ThreatHuntingCenter } from './pages/phase9/ThreatHuntingCenter';
import { ExecutiveVault } from './pages/phase9/ExecutiveVault';
import { BiometricManagement } from './pages/phase9/BiometricManagement';
import { HardwareKeyManagement } from './pages/phase9/HardwareKeyManagement';
import { CyberResilienceCenter } from './pages/phase9/CyberResilienceCenter';
import { ComplianceCenter as Phase9ComplianceCenter } from './pages/phase9/ComplianceCenter';
import { InsiderThreatCenter } from './pages/phase9/InsiderThreatCenter';

// Infrastructure Security Pages (Phase 8)
import { InfrastructureDashboard as InfraSecurityDashboard } from './pages/infrastructure/InfrastructureDashboard';
import { ServerMonitoring } from './pages/infrastructure/ServerMonitoring';
import { FirewallCenter } from './pages/infrastructure/FirewallCenter';
import { VulnerabilityCenter } from './pages/infrastructure/VulnerabilityCenter';
import { BackupCenter } from './pages/infrastructure/BackupCenter';
import { DeploymentCenter } from './pages/infrastructure/DeploymentCenter';
import { CloudManagement } from './pages/infrastructure/CloudManagement';
import { SSLManagement } from './pages/infrastructure/SSLManagement';

// AI Security Pages (Phase 7)
import { AISecurityCenter } from './pages/ai/AISecurityCenter';
import { FraudDetectionCenter } from './pages/ai/FraudDetectionCenter';
import { UserBehaviorAnalytics } from './pages/ai/UserBehaviorAnalytics';
import { RiskIntelligenceDashboard } from './pages/ai/RiskIntelligenceDashboard';
import { ThreatPredictionCenter } from './pages/ai/ThreatPredictionCenter';
import { InsiderThreatMonitoring } from './pages/ai/InsiderThreatMonitoring';
import { SecurityHeatmaps } from './pages/ai/SecurityHeatmaps';
import { AIRecommendationsCenter } from './pages/ai/AIRecommendationsCenter';

// SOC Pages (Phase 5)
import { SOCDashboard } from './pages/soc/SOCDashboard';
import { AlertsCenter } from './pages/soc/AlertsCenter';
import { IncidentCenter } from './pages/soc/IncidentCenter';
import { ThreatAnalytics } from './pages/soc/ThreatAnalytics';
import { UserRiskDashboard } from './pages/soc/UserRiskDashboard';
import { SecurityReports } from './pages/soc/SecurityReports';
import { ThreatIntelligenceCenter } from './pages/soc/ThreatIntelligenceCenter';

// Enterprise Pages
import { EnterpriseDashboard } from './pages/enterprise/EnterpriseDashboard';
import { CompaniesPage } from './pages/enterprise/CompaniesPage';
import { BranchesPage } from './pages/enterprise/BranchesPage';
import { ComplianceDashboard } from './pages/enterprise/ComplianceDashboard';
import { AIAnalyticsPage } from './pages/enterprise/AIAnalyticsPage';
import { WorkflowsPage } from './pages/enterprise/WorkflowsPage';
import { RiskManagementPage } from './pages/enterprise/RiskManagementPage';
import { PoliciesPage } from './pages/enterprise/PoliciesPage';
import { ForecastsPage } from './pages/enterprise/ForecastsPage';
import { EnterpriseSettingsPage } from './pages/enterprise/EnterpriseSettingsPage';

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              {/* Core */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />

              {/* HR Module */}
              <Route path="/hr" element={<HrDashboard />} />
              <Route path="/hr/dashboard" element={<HrDashboard />} />
              <Route path="/hr/employees" element={<EmployeeDirectory />} />
              <Route path="/hr/employees/new" element={<EmployeeForm />} />
              <Route path="/hr/employees/:id" element={<EmployeeProfile />} />
              <Route path="/hr/employees/:id/edit" element={<EmployeeForm />} />
              <Route path="/hr/attendance" element={<AttendancePage />} />
              <Route path="/hr/leave" element={<LeavePage />} />
              <Route path="/hr/insurance" element={<HrInsurancePage />} />
              <Route path="/hr/training" element={<TrainingPage />} />
              <Route path="/hr/performance" element={<PerformancePage />} />
              <Route path="/hr/documents" element={<DocumentsPage />} />
              <Route path="/hr/onboarding" element={<OnboardingPage />} />

              {/* Finance Module */}
              <Route path="/finance" element={<FinanceDashboard />} />
              <Route path="/finance/dashboard" element={<FinanceDashboard />} />
              <Route path="/finance/payroll" element={<PayrollPage />} />
              <Route path="/finance/expenses" element={<ExpensePage />} />
              <Route path="/finance/budgets" element={<BudgetPage />} />
              <Route path="/finance/taxes" element={<TaxPage />} />
              <Route path="/finance/loans" element={<LoanPage />} />
              <Route path="/finance/reports" element={<FinanceReportsPage />} />
              <Route path="/finance/accounts" element={<AccountsPage />} />

              {/* Asset & Fleet Module */}
              <Route path="/assets" element={<AssetDashboard />} />
              <Route path="/assets/dashboard" element={<AssetDashboard />} />
              <Route path="/assets/directory" element={<AssetDirectory />} />
              <Route path="/assets/new" element={<AssetDirectory />} />
              <Route path="/assets/:id" element={<AssetDetail />} />
              <Route path="/assets/fleet" element={<FleetPage />} />
              <Route path="/assets/maintenance" element={<MaintenancePage />} />
              <Route path="/assets/insurance" element={<InsurancePage />} />
              <Route path="/assets/spare-parts" element={<SparePartsPage />} />
              <Route path="/assets/vendors" element={<VendorsPage />} />

              {/* Procurement & Inventory Module */}
              <Route path="/procurement" element={<ProcurementDashboard />} />
              <Route path="/procurement/dashboard" element={<ProcurementDashboard />} />
              <Route path="/procurement/requests" element={<ProcurementRequests />} />
              <Route path="/procurement/approvals" element={<ProcurementApprovals />} />
              <Route path="/procurement/suppliers" element={<SuppliersPage />} />
              <Route path="/procurement/purchase-orders" element={<PurchaseOrdersPage />} />
              <Route path="/procurement/inventory" element={<InventoryPage />} />
              <Route path="/procurement/warehouses" element={<WarehousesPage />} />
              <Route path="/procurement/goods-receipt" element={<GRNPage />} />
              <Route path="/procurement/reports" element={<ProcurementReports />} />

              {/* Analytics & BI Module */}
              <Route path="/analytics" element={<ExecutiveDashboard />} />
              <Route path="/analytics/executive-dashboard" element={<ExecutiveDashboard />} />
              <Route path="/analytics/analytics" element={<AnalyticsPage />} />
              <Route path="/analytics/notifications" element={<NotificationsPage />} />
              <Route path="/analytics/reports" element={<AnalyticsReportsPage />} />
              <Route path="/analytics/audit-logs" element={<AuditLogsPage />} />
              <Route path="/analytics/bi-insights" element={<BIInsightsPage />} />
              <Route path="/analytics/system-health" element={<SystemHealthPage />} />

              {/* Admin & Security Module */}
              <Route path="/admin" element={<SystemDashboard />} />
              <Route path="/admin/dashboard" element={<SystemDashboard />} />
              <Route path="/admin/users" element={<UserManagement />} />
              <Route path="/admin/security" element={<SecurityMonitor />} />
              <Route path="/admin/backups" element={<BackupManager />} />
              <Route path="/admin/audit" element={<AuditViewer />} />
              <Route path="/admin/api-keys" element={<APIMonitor />} />
              <Route path="/admin/settings" element={<SystemSettings />} />
              <Route path="/admin/deployment" element={<DeploymentStatus />} />

              {/* Portal Routes */}
              <Route path="/portal/ess" element={<EssPortal />} />
              <Route path="/portal/client" element={<ClientPortal />} />
              <Route path="/portal/vendor" element={<VendorPortal />} />
              <Route path="/portal/tickets" element={<SupportTickets />} />
              <Route path="/portal/communications" element={<CommunicationsCenter />} />
              <Route path="/portal/calendar" element={<CalendarPage />} />
              <Route path="/portal/integrations" element={<IntegrationsPage />} />
              <Route path="/portal/payments" element={<PaymentsPage />} />

              {/* Enterprise Routes */}
              <Route path="/enterprise/dashboard" element={<EnterpriseDashboard />} />
              <Route path="/enterprise/companies" element={<CompaniesPage />} />
              <Route path="/enterprise/branches" element={<BranchesPage />} />
              <Route path="/enterprise/compliance" element={<ComplianceDashboard />} />
              <Route path="/enterprise/ai" element={<AIAnalyticsPage />} />
              <Route path="/enterprise/workflows" element={<WorkflowsPage />} />
              <Route path="/enterprise/risks" element={<RiskManagementPage />} />
              <Route path="/enterprise/policies" element={<PoliciesPage />} />
              <Route path="/enterprise/forecasts" element={<ForecastsPage />} />
              <Route path="/enterprise/settings" element={<EnterpriseSettingsPage />} />

              {/* Standalone module pages */}
              <Route path="/departments" element={<DepartmentsPage />} />
              <Route path="/users" element={<UserManagement />} />
              <Route path="/roles" element={<RolesPage />} />
              <Route path="/payroll" element={<Navigate to="/finance/payroll" replace />} />
              <Route path="/audit" element={<Navigate to="/analytics/audit-logs" replace />} />
              <Route path="/compliance" element={<Navigate to="/analytics/audit-logs" replace />} />
              <Route path="/reports" element={<Navigate to="/finance/reports" replace />} />
              {/* Security Routes */}
              <Route path="/security/sessions" element={<SessionManagement />} />
              <Route path="/security/settings" element={<SecuritySettings />} />
              <Route path="/security/settings/center" element={<SecuritySettingsCenter />} />
              <Route path="/security/mfa" element={<MFASetup />} />
              <Route path="/security/devices" element={<DeviceTrustManagement />} />
              <Route path="/security/history" element={<LoginHistory />} />
              <Route path="/security/risk-dashboard" element={<SecurityRiskDashboard />} />
              {/* Phase 3 Security Pages */}
              <Route path="/security/infrastructure" element={<InfrastructureDashboard />} />
              <Route path="/security/audit-logs" element={<AuditLogViewer />} />
              <Route path="/security/api-monitoring" element={<ApiSecurityMonitoring />} />

              {/* Phase 4 File Security Routes */}
              <Route path="/file-security/dashboard" element={<FileSecurityDashboard />} />
              <Route path="/file-security/upload" element={<FileUploadCenter />} />
              <Route path="/file-security/files" element={<FileManager />} />
              <Route path="/file-security/shares" element={<SharedDocumentsPage />} />
              <Route path="/file-security/activity" element={<FileActivityLogs />} />
              <Route path="/file-security/storage" element={<StorageAnalytics />} />
              <Route path="/file-security/classifications" element={<ClassificationManagement />} />

              {/* Phase 5 SOC Routes */}
              <Route path="/soc/dashboard" element={<SOCDashboard />} />
              <Route path="/soc/alerts" element={<AlertsCenter />} />
              <Route path="/soc/incidents" element={<IncidentCenter />} />
              <Route path="/soc/threats" element={<ThreatAnalytics />} />
              <Route path="/soc/user-risk" element={<UserRiskDashboard />} />
              <Route path="/soc/reports" element={<SecurityReports />} />
              <Route path="/soc/threat-intel" element={<ThreatIntelligenceCenter />} />

              {/* Phase 6 GRC Routes */}
              <Route path="/grc/dashboard" element={<GRCDashboard />} />
              <Route path="/grc/policies" element={<PolicyCenter />} />
              <Route path="/grc/audits" element={<AuditCenter />} />
              <Route path="/grc/risks" element={<RiskManagement />} />
              <Route path="/grc/compliance" element={<ComplianceCenter />} />
              <Route path="/grc/access-reviews" element={<AccessReviewCenter />} />
              <Route path="/grc/reports" element={<GovernanceReports />} />
              <Route path="/grc/investigations" element={<InvestigationCenter />} />
              <Route path="/grc/sod" element={<SoDControlCenter />} />

              {/* Phase 9 Ultimate Security Routes */}
              <Route path="/phase9/command-center" element={<SecurityCommandCenter />} />
              <Route path="/phase9/pam" element={<PAMCenter />} />
              <Route path="/phase9/dlp" element={<DLPCenter />} />
              <Route path="/phase9/siem" element={<SIEMDashboard />} />
              <Route path="/phase9/threat-hunting" element={<ThreatHuntingCenter />} />
              <Route path="/phase9/vault" element={<ExecutiveVault />} />
              <Route path="/phase9/biometric" element={<BiometricManagement />} />
              <Route path="/phase9/hardware-keys" element={<HardwareKeyManagement />} />
              <Route path="/phase9/resilience" element={<CyberResilienceCenter />} />
              <Route path="/phase9/compliance" element={<Phase9ComplianceCenter />} />
              <Route path="/phase9/insider-threats" element={<InsiderThreatCenter />} />

              {/* Phase 8 Infrastructure Security Routes */}
              <Route path="/infrastructure/dashboard" element={<InfraSecurityDashboard />} />
              <Route path="/infrastructure/servers" element={<ServerMonitoring />} />
              <Route path="/infrastructure/firewall" element={<FirewallCenter />} />
              <Route path="/infrastructure/vulnerabilities" element={<VulnerabilityCenter />} />
              <Route path="/infrastructure/backups" element={<BackupCenter />} />
              <Route path="/infrastructure/deployments" element={<DeploymentCenter />} />
              <Route path="/infrastructure/cloud" element={<CloudManagement />} />
              <Route path="/infrastructure/ssl" element={<SSLManagement />} />

              {/* Phase 7 AI Security Routes */}
              <Route path="/ai-security/dashboard" element={<AISecurityCenter />} />
              <Route path="/ai-security/fraud" element={<FraudDetectionCenter />} />
              <Route path="/ai-security/behavior" element={<UserBehaviorAnalytics />} />
              <Route path="/ai-security/risk" element={<RiskIntelligenceDashboard />} />
              <Route path="/ai-security/predictions" element={<ThreatPredictionCenter />} />
              <Route path="/ai-security/insider-threats" element={<InsiderThreatMonitoring />} />
              <Route path="/ai-security/heatmaps" element={<SecurityHeatmaps />} />
              <Route path="/ai-security/recommendations" element={<AIRecommendationsCenter />} />

              <Route path="/settings" element={<Navigate to="/admin/settings" replace />} />
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
