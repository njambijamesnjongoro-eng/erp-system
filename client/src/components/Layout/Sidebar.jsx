import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Building2, UserCircle, Shield,
  Settings, FileText, LogOut, ChevronLeft, ChevronRight,
  Briefcase, DollarSign, Package, ShoppingCart, Search,
  Calendar, Clock, BookOpen, BarChart3, Upload, UserPlus,
  Activity, Award, ChevronDown, Truck, Wrench, ClipboardCheck,
  TrendingUp, Bell, Lightbulb, Server, Database, Key, AlertTriangle,
  User, MessageSquare, Ticket, Plug, GitBranch, Brain, Workflow, ListTodo, Share2,
  Radar, AlertOctagon, Siren, Fingerprint, UserCheck, FileBarChart, Globe,
  Bot, ScanLine, Braces, LineChart, Eye, Thermometer, Sparkles,
  Cloud, Network, Container, ShieldCheck, KeyRound,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { classNames } from '../../utils/helpers';

const roleMenus = {
  'System Admin': [
    'dashboard', 'hr', 'finance', 'assets', 'procurement', 'users', 'roles', 'departments', 'settings',
    'analytics', 'admin', 'portal', 'enterprise', 'security', 'file-security', 'soc', 'grc', 'ai-security', 'infrastructure', 'phase9',
  ],
  'CEO': [
    'dashboard', 'hr', 'finance', 'assets', 'procurement', 'users', 'departments', 'reports',
    'analytics', 'audit', 'portal',
  ],
  'Manager': [
    'dashboard', 'hr', 'finance', 'assets', 'procurement', 'reports',
    'analytics', 'portal',
  ],
  'HR Officer': [
    'dashboard', 'hr', 'departments', 'users',
    'analytics',
  ],
  'Finance Officer': [
    'dashboard', 'finance', 'payroll', 'assets', 'procurement', 'reports',
    'analytics',
  ],
  'Asset Manager': [
    'dashboard', 'assets', 'reports',
    'analytics',
  ],
  'Procurement Officer': [
    'dashboard', 'assets', 'procurement', 'reports',
    'analytics',
  ],
  'Employee': [
    'dashboard', 'profile',
  ],
  'Auditor': [
    'dashboard', 'audit', 'compliance', 'reports',
    'analytics',
  ],
};

const menuItems = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  {
    key: 'hr', label: 'HR Management', icon: Users, path: '/hr',
    submenu: [
      { key: 'hr-dashboard', label: 'HR Dashboard', icon: LayoutDashboard, path: '/hr/dashboard' },
      { key: 'hr-employees', label: 'Employees', icon: UserCircle, path: '/hr/employees' },
      { key: 'hr-attendance', label: 'Attendance', icon: Clock, path: '/hr/attendance' },
      { key: 'hr-leave', label: 'Leave', icon: Calendar, path: '/hr/leave' },
      { key: 'hr-insurance', label: 'Insurance', icon: Shield, path: '/hr/insurance' },
      { key: 'hr-training', label: 'Training', icon: BookOpen, path: '/hr/training' },
      { key: 'hr-performance', label: 'Performance', icon: Activity, path: '/hr/performance' },
      { key: 'hr-documents', label: 'Documents', icon: FileText, path: '/hr/documents' },
      { key: 'hr-onboarding', label: 'Onboarding', icon: UserPlus, path: '/hr/onboarding' },
    ],
  },
  { key: 'departments', label: 'Departments', icon: Building2, path: '/departments' },
  { key: 'users', label: 'Users', icon: UserCircle, path: '/users' },
  { key: 'roles', label: 'Roles', icon: Shield, path: '/roles' },
  {
    key: 'finance', label: 'Finance', icon: DollarSign, path: '/finance',
    submenu: [
      { key: 'finance-dashboard', label: 'Finance Dashboard', icon: LayoutDashboard, path: '/finance/dashboard' },
      { key: 'finance-payroll', label: 'Payroll', icon: Briefcase, path: '/finance/payroll' },
      { key: 'finance-expenses', label: 'Expenses', icon: FileText, path: '/finance/expenses' },
      { key: 'finance-budgets', label: 'Budgets', icon: BarChart3, path: '/finance/budgets' },
      { key: 'finance-taxes', label: 'Taxes', icon: FileText, path: '/finance/taxes' },
      { key: 'finance-loans', label: 'Loans', icon: DollarSign, path: '/finance/loans' },
      { key: 'finance-accounts', label: 'Accounts', icon: Shield, path: '/finance/accounts' },
      { key: 'finance-reports', label: 'Reports', icon: BarChart3, path: '/finance/reports' },
    ],
  },
  { key: 'payroll', label: 'Payroll', icon: Briefcase, path: '/finance/payroll' },
  {
    key: 'assets', label: 'Assets', icon: Package, path: '/assets',
    submenu: [
      { key: 'assets-dashboard', label: 'Asset Dashboard', icon: LayoutDashboard, path: '/assets/dashboard' },
      { key: 'assets-directory', label: 'Asset Directory', icon: Package, path: '/assets/directory' },
      { key: 'assets-fleet', label: 'Fleet', icon: Truck, path: '/assets/fleet' },
      { key: 'assets-maintenance', label: 'Maintenance', icon: Wrench, path: '/assets/maintenance' },
      { key: 'assets-insurance', label: 'Insurance', icon: Shield, path: '/assets/insurance' },
      { key: 'assets-spareparts', label: 'Spare Parts', icon: BarChart3, path: '/assets/spare-parts' },
      { key: 'assets-vendors', label: 'Vendors', icon: Building2, path: '/assets/vendors' },
    ],
  },
  {
    key: 'procurement', label: 'Procurement', icon: ShoppingCart, path: '/procurement',
    submenu: [
      { key: 'procurement-dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/procurement/dashboard' },
      { key: 'procurement-requests', label: 'Requests', icon: FileText, path: '/procurement/requests' },
      { key: 'procurement-approvals', label: 'Approvals', icon: Shield, path: '/procurement/approvals' },
      { key: 'procurement-suppliers', label: 'Suppliers', icon: Building2, path: '/procurement/suppliers' },
      { key: 'procurement-purchase-orders', label: 'Purchase Orders', icon: FileText, path: '/procurement/purchase-orders' },
      { key: 'procurement-inventory', label: 'Inventory', icon: Package, path: '/procurement/inventory' },
      { key: 'procurement-warehouses', label: 'Warehouses', icon: Building2, path: '/procurement/warehouses' },
      { key: 'procurement-grn', label: 'Goods Receipt', icon: ClipboardCheck, path: '/procurement/goods-receipt' },
      { key: 'procurement-reports', label: 'Reports', icon: BarChart3, path: '/procurement/reports' },
    ],
  },
  {
    key: 'analytics',
    label: 'Analytics & BI',
    icon: BarChart3,
    path: '/analytics',
    submenu: [
      { key: 'executive-dashboard', label: 'Executive Dashboard', icon: LayoutDashboard, path: '/analytics/executive-dashboard' },
      { key: 'analytics', label: 'Analytics', icon: TrendingUp, path: '/analytics/analytics' },
      { key: 'notifications', label: 'Notifications', icon: Bell, path: '/analytics/notifications' },
      { key: 'reports', label: 'Reports', icon: FileText, path: '/analytics/reports' },
      { key: 'audit-logs', label: 'Audit Logs', icon: Shield, path: '/analytics/audit-logs' },
      { key: 'bi-insights', label: 'BI Insights', icon: Lightbulb, path: '/analytics/bi-insights' },
      { key: 'system-health', label: 'System Health', icon: Activity, path: '/analytics/system-health' },
    ],
  },
  {
    key: 'admin',
    label: 'Administration',
    icon: Shield,
    path: '/admin',
    submenu: [
      { key: 'admin-dashboard', label: 'System Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
      { key: 'admin-users', label: 'User Management', icon: Users, path: '/admin/users' },
      { key: 'security', label: 'Security Monitor', icon: AlertTriangle, path: '/admin/security' },
      { key: 'backups', label: 'Backup Manager', icon: Database, path: '/admin/backups' },
      { key: 'audit', label: 'Audit Viewer', icon: Search, path: '/admin/audit' },
      { key: 'api-keys', label: 'API Monitor', icon: Key, path: '/admin/api-keys' },
      { key: 'settings', label: 'System Settings', icon: Settings, path: '/admin/settings' },
      { key: 'deployment', label: 'Deployment', icon: Server, path: '/admin/deployment' },
    ],
  },
  {
    key: 'portal',
    label: 'Portal & Communication',
    icon: MessageSquare,
    path: '/portal/communications',
    submenu: [
      { key: 'portal-ess', label: 'Employee Portal', icon: User, path: '/portal/ess' },
      { key: 'portal-client', label: 'Client Portal', icon: Building2, path: '/portal/client' },
      { key: 'portal-vendor', label: 'Vendor Portal', icon: Truck, path: '/portal/vendor' },
      { key: 'portal-communications', label: 'Communications', icon: MessageSquare, path: '/portal/communications' },
      { key: 'portal-tickets', label: 'Support Tickets', icon: Ticket, path: '/portal/tickets' },
      { key: 'portal-calendar', label: 'Calendar', icon: Calendar, path: '/portal/calendar' },
      { key: 'portal-integrations', label: 'Integrations', icon: Plug, path: '/portal/integrations' },
      { key: 'portal-payments', label: 'Payments', icon: DollarSign, path: '/portal/payments' },
    ],
  },
  {
    key: 'enterprise',
    label: 'Enterprise',
    icon: Building2,
    path: '/enterprise/dashboard',
    submenu: [
      { key: 'enterprise-dashboard', label: 'Enterprise Dashboard', icon: LayoutDashboard, path: '/enterprise/dashboard' },
      { key: 'enterprise-companies', label: 'Companies', icon: Building2, path: '/enterprise/companies' },
      { key: 'enterprise-branches', label: 'Branches', icon: GitBranch, path: '/enterprise/branches' },
      { key: 'enterprise-compliance', label: 'Compliance', icon: Shield, path: '/enterprise/compliance' },
      { key: 'enterprise-ai', label: 'AI Analytics', icon: Brain, path: '/enterprise/ai' },
      { key: 'enterprise-workflows', label: 'Workflows', icon: Workflow, path: '/enterprise/workflows' },
      { key: 'enterprise-risks', label: 'Risk Management', icon: AlertTriangle, path: '/enterprise/risks' },
      { key: 'enterprise-policies', label: 'Policies', icon: FileText, path: '/enterprise/policies' },
      { key: 'enterprise-forecasts', label: 'Forecasts', icon: TrendingUp, path: '/enterprise/forecasts' },
      { key: 'enterprise-settings', label: 'Enterprise Settings', icon: Settings, path: '/enterprise/settings' },
    ],
  },
  { key: 'audit', label: 'Audit', icon: Search, path: '/audit' },
  { key: 'compliance', label: 'Compliance', icon: Shield, path: '/compliance' },
  { key: 'reports', label: 'Reports', icon: FileText, path: '/reports' },
  { key: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
  {
    key: 'security',
    label: 'Security',
    icon: Shield,
    path: '/security/sessions',
    submenu: [
      { key: 'security-sessions', label: 'Session Mgmt', icon: Shield, path: '/security/sessions' },
      { key: 'security-mfa', label: 'MFA Setup', icon: Shield, path: '/security/mfa' },
      { key: 'security-devices', label: 'Device Trust', icon: Server, path: '/security/devices' },
      { key: 'security-history', label: 'Login History', icon: FileText, path: '/security/history' },
      { key: 'security-risk', label: 'Risk Dashboard', icon: AlertTriangle, path: '/security/risk-dashboard' },
      { key: 'security-settings', label: 'Settings', icon: Settings, path: '/security/settings/center' },
      { key: 'security-infrastructure', label: 'Infrastructure', icon: Server, path: '/security/infrastructure' },
      { key: 'security-audit-logs', label: 'Audit Log Viewer', icon: Search, path: '/security/audit-logs' },
      { key: 'security-api-monitoring', label: 'API Monitoring', icon: Activity, path: '/security/api-monitoring' },
    ],
  },
  {
    key: 'file-security',
    label: 'File Security',
    icon: Shield,
    path: '/file-security/dashboard',
    submenu: [
      { key: 'fs-dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/file-security/dashboard' },
      { key: 'fs-upload', label: 'Upload Center', icon: Upload, path: '/file-security/upload' },
      { key: 'fs-files', label: 'File Manager', icon: FileText, path: '/file-security/files' },
      { key: 'fs-shares', label: 'Shared Documents', icon: Share2, path: '/file-security/shares' },
      { key: 'fs-activity', label: 'Activity Logs', icon: Activity, path: '/file-security/activity' },
      { key: 'fs-storage', label: 'Storage Analytics', icon: Database, path: '/file-security/storage' },
      { key: 'fs-classification', label: 'Classifications', icon: Shield, path: '/file-security/classifications' },
    ],
  },
  {
    key: 'soc',
    label: 'SOC',
    icon: Radar,
    path: '/soc/dashboard',
    submenu: [
      { key: 'soc-dashboard', label: 'SOC Dashboard', icon: LayoutDashboard, path: '/soc/dashboard' },
      { key: 'soc-alerts', label: 'Alerts Center', icon: AlertOctagon, path: '/soc/alerts' },
      { key: 'soc-incidents', label: 'Incident Center', icon: Siren, path: '/soc/incidents' },
      { key: 'soc-threats', label: 'Threat Analytics', icon: Fingerprint, path: '/soc/threats' },
      { key: 'soc-user-risk', label: 'User Risk', icon: UserCheck, path: '/soc/user-risk' },
      { key: 'soc-reports', label: 'Security Reports', icon: FileBarChart, path: '/soc/reports' },
      { key: 'soc-threat-intel', label: 'Threat Intel', icon: Globe, path: '/soc/threat-intel' },
    ],
  },
  {
    key: 'ai-security',
    label: 'AI Security',
    icon: Bot,
    path: '/ai-security/dashboard',
    submenu: [
      { key: 'ai-dashboard', label: 'AI Security Center', icon: LayoutDashboard, path: '/ai-security/dashboard' },
      { key: 'ai-fraud', label: 'Fraud Detection', icon: ScanLine, path: '/ai-security/fraud' },
      { key: 'ai-behavior', label: 'User Behavior', icon: UserCheck, path: '/ai-security/behavior' },
      { key: 'ai-risk', label: 'Risk Intelligence', icon: LineChart, path: '/ai-security/risk' },
      { key: 'ai-predictions', label: 'Threat Predictions', icon: Brain, path: '/ai-security/predictions' },
      { key: 'ai-insider', label: 'Insider Threats', icon: Eye, path: '/ai-security/insider-threats' },
      { key: 'ai-heatmaps', label: 'Security Heatmaps', icon: Thermometer, path: '/ai-security/heatmaps' },
      { key: 'ai-recommendations', label: 'AI Recommendations', icon: Sparkles, path: '/ai-security/recommendations' },
    ],
  },
  {
    key: 'grc',
    label: 'GRC',
    icon: Shield,
    path: '/grc/dashboard',
    submenu: [
      { key: 'grc-dashboard', label: 'GRC Dashboard', icon: LayoutDashboard, path: '/grc/dashboard' },
      { key: 'grc-policies', label: 'Policy Center', icon: FileText, path: '/grc/policies' },
      { key: 'grc-audits', label: 'Audit Center', icon: Search, path: '/grc/audits' },
      { key: 'grc-risks', label: 'Risk Management', icon: AlertTriangle, path: '/grc/risks' },
      { key: 'grc-compliance', label: 'Compliance Center', icon: Shield, path: '/grc/compliance' },
      { key: 'grc-access-reviews', label: 'Access Reviews', icon: UserCheck, path: '/grc/access-reviews' },
      { key: 'grc-reports', label: 'Governance Reports', icon: FileBarChart, path: '/grc/reports' },
      { key: 'grc-investigations', label: 'Investigations', icon: Activity, path: '/grc/investigations' },
      { key: 'grc-sod', label: 'SoD Controls', icon: AlertOctagon, path: '/grc/sod' },
    ],
  },
  {
    key: 'phase9',
    label: 'Phase 9',
    icon: ShieldCheck,
    path: '/phase9/command-center',
    submenu: [
      { key: 'p9-command', label: 'Security Command Center', icon: LayoutDashboard, path: '/phase9/command-center' },
      { key: 'p9-pam', label: 'PAM Center', icon: Shield, path: '/phase9/pam' },
      { key: 'p9-dlp', label: 'DLP Center', icon: AlertTriangle, path: '/phase9/dlp' },
      { key: 'p9-siem', label: 'SIEM Dashboard', icon: Activity, path: '/phase9/siem' },
      { key: 'p9-hunting', label: 'Threat Hunting', icon: Search, path: '/phase9/threat-hunting' },
      { key: 'p9-vault', label: 'Executive Vault', icon: Database, path: '/phase9/vault' },
      { key: 'p9-biometric', label: 'Biometric Mgmt', icon: Fingerprint, path: '/phase9/biometric' },
      { key: 'p9-hardware', label: 'Hardware Keys', icon: KeyRound, path: '/phase9/hardware-keys' },
      { key: 'p9-resilience', label: 'Cyber Resilience', icon: Shield, path: '/phase9/resilience' },
      { key: 'p9-compliance', label: 'Compliance', icon: FileText, path: '/phase9/compliance' },
      { key: 'p9-insider', label: 'Insider Threats', icon: Eye, path: '/phase9/insider-threats' },
    ],
  },
  {
    key: 'infrastructure',
    label: 'Infrastructure',
    icon: Server,
    path: '/infrastructure/dashboard',
    submenu: [
      { key: 'infra-dashboard', label: 'Infrastructure Dashboard', icon: LayoutDashboard, path: '/infrastructure/dashboard' },
      { key: 'infra-servers', label: 'Server Monitoring', icon: Server, path: '/infrastructure/servers' },
      { key: 'infra-firewall', label: 'Firewall Center', icon: Shield, path: '/infrastructure/firewall' },
      { key: 'infra-vulnerabilities', label: 'Vulnerability Center', icon: AlertTriangle, path: '/infrastructure/vulnerabilities' },
      { key: 'infra-backups', label: 'Backup Center', icon: Database, path: '/infrastructure/backups' },
      { key: 'infra-deployments', label: 'Deployment Center', icon: GitBranch, path: '/infrastructure/deployments' },
      { key: 'infra-cloud', label: 'Cloud Management', icon: Cloud, path: '/infrastructure/cloud' },
      { key: 'infra-ssl', label: 'SSL Management', icon: Shield, path: '/infrastructure/ssl' },
    ],
  },
  { key: 'profile', label: 'Profile', icon: UserCircle, path: '/profile' },
];

export function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth();
  const allowedMenus = roleMenus[user?.role_name] || ['dashboard', 'profile'];
  const [expandedMenus, setExpandedMenus] = useState({});

  const visibleItems = menuItems.filter(item => allowedMenus.includes(item.key));

  const toggleSubmenu = (key) => {
    setExpandedMenus(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <aside
      className={classNames(
        'fixed left-0 top-0 h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-30 transition-all duration-300 flex flex-col',
        collapsed ? 'w-[72px]' : 'w-[260px]'
      )}
    >
      <div className="flex items-center h-16 px-4 border-b border-gray-200 dark:border-gray-800">
        <div className={classNames('flex items-center gap-3', collapsed && 'justify-center w-full')}>
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Briefcase className="w-4 h-4 text-white" />
          </div>
          {!collapsed && <span className="font-bold text-lg">ERP System</span>}
        </div>
        <button
          onClick={onToggle}
          className={classNames(
            'p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors',
            collapsed ? 'absolute -right-4 top-5 bg-white dark:bg-gray-900 border shadow-sm' : 'ml-auto'
          )}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {visibleItems.map((item) => {
          if (item.submenu) {
            const isExpanded = expandedMenus[item.key];
            return (
              <div key={item.key}>
                <button
                  onClick={() => !collapsed && toggleSubmenu(item.key)}
                  className={classNames(
                    'sidebar-link w-full',
                    'sidebar-link-inactive',
                    collapsed && 'justify-center'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown className={classNames('w-4 h-4 transition-transform', isExpanded && 'rotate-180')} />
                    </>
                  )}
                </button>
                {!collapsed && isExpanded && (
                  <div className="ml-2 mt-1 space-y-1 pl-4 border-l-2 border-gray-100 dark:border-gray-800">
                    {item.submenu.map(sub => (
                      <NavLink
                        key={sub.key}
                        to={sub.path}
                        className={({ isActive }) =>
                          classNames(
                            'sidebar-link text-sm',
                            isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'
                          )
                        }
                      >
                        <sub.icon className="w-4 h-4 flex-shrink-0" />
                        <span>{sub.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={item.key}
              to={item.path}
              className={({ isActive }) =>
                classNames(
                  'sidebar-link',
                  isActive ? 'sidebar-link-active' : 'sidebar-link-inactive',
                  collapsed && 'justify-center px-0'
                )
              }
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-gray-200 dark:border-gray-800">
        {!collapsed && user && (
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium truncate">{user.full_name || user.email}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.role_name}</p>
          </div>
        )}
        <button
          onClick={logout}
          className={classNames(
            'sidebar-link sidebar-link-inactive w-full',
            collapsed && 'justify-center'
          )}
          title="Logout"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
