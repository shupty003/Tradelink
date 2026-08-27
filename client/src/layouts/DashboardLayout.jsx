/**
 * layouts/DashboardLayout.jsx — Responsive Authenticated Member Layout
 */

import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import Logo from '../components/common/Logo';
import Avatar from '../components/ui/Avatar';
import { ROUTES } from '../constants';
import useAuth from '../hooks/useAuth';
import api from '../services/api';

const MEMBER_SIDEBAR_LINKS = [
  { label: 'Overview',       to: ROUTES.DASHBOARD,             icon: 'OV' },
  { label: 'Browse Skills',  to: ROUTES.BROWSE,                icon: 'SK' },
  { label: 'Market Prices',  to: `${ROUTES.DASHBOARD}/prices`, icon: 'MP' },
  { label: 'My Profile',     to: `${ROUTES.DASHBOARD}/profile`, icon: 'PF', notifCategory: 'profile' },
  { label: 'My Skills',      to: ROUTES.MY_SKILLS,             icon: 'MS' },
  { label: 'Credit Wallet',  to: ROUTES.WALLET,                icon: 'CW' },
  { label: 'Watchlist',      to: ROUTES.WATCHLIST,             icon: 'WL' },
  { label: 'Trade Chains',   to: ROUTES.TRADE_CHAINS,          icon: 'TC' },
  { label: 'Requests',       to: `${ROUTES.DASHBOARD}/requests`, icon: 'RQ', notifCategory: 'request' },
  { label: 'Transactions',   to: `${ROUTES.DASHBOARD}/transactions`, icon: 'TX', notifCategory: 'transaction' },
  { label: 'Messages',       to: `${ROUTES.DASHBOARD}/messages`, icon: 'MG', notifCategory: 'message' },
  { label: 'Reviews',        to: `${ROUTES.DASHBOARD}/reviews`,  icon: 'RV' },
  { label: 'Settings',       to: `${ROUTES.DASHBOARD}/settings`, icon: 'ST' },
];

const NotificationBadge = ({ count }) => {
  if (!count) return null;
  return (
    <span className="ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">
      {count > 9 ? '9+' : count}
    </span>
  );
};

const ADMIN_SIDEBAR_LINKS = [
  { label: 'System Overview', to: `${ROUTES.DASHBOARD}/admin/overview`,   icon: '📊' },
  { label: 'User Directory', to: `${ROUTES.DASHBOARD}/admin/users`,      icon: '👥' },
  { label: 'Categories',      to: `${ROUTES.DASHBOARD}/admin/categories`, icon: '🏷️' },
  { label: 'Trade Monitor',   to: `${ROUTES.DASHBOARD}/admin/trades`,     icon: '🤝' },
  { label: 'Disputes Queue',  to: `${ROUTES.DASHBOARD}/admin/disputes`,   icon: '🛡️' },
  { label: 'Market Prices',   to: `${ROUTES.DASHBOARD}/prices`,           icon: '📈' },
];

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifCounts, setNotifCounts] = useState({});
  const isAdmin = user?.role === 'admin';
  const sidebarLinks = isAdmin ? ADMIN_SIDEBAR_LINKS : MEMBER_SIDEBAR_LINKS;
  const firstName = user?.name?.split(' ')[0] || (isAdmin ? 'Admin' : 'Member Workspace');

  useEffect(() => {
    if (isAdmin) {return;}
    api.get('/notifications/counts')
      .then(res => setNotifCounts(res.data.data))
      .catch(() => {});
  }, [isAdmin, location.pathname]);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const handleLogout = async () => {
    closeMobileMenu();
    await logout();
    navigate(ROUTES.HOME);
  };

  return (
    <div className="min-h-screen bg-page lg:flex">
      {/* ── Desktop Sidebar ────────────────────────────────────────────────── */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-64 flex-col border-r border-concrete-200 bg-white">
        <div className="border-b border-concrete-200 p-4">
          <div className="flex items-center justify-between">
            <Logo />
            <NavLink to={ROUTES.HOME} className="text-xs font-semibold text-steel-600 hover:text-navy-900">
              ← Home
            </NavLink>
          </div>
          {isAdmin && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-900 border border-amber-300">
              <span>🛡️ System Admin Mode</span>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4" aria-label="Dashboard navigation">
          {sidebarLinks.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === ROUTES.DASHBOARD || link.to.endsWith('/overview')}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors duration-150 ${
                  isActive
                    ? 'bg-navy-900 text-white shadow-sm'
                    : 'text-steel-700 hover:bg-concrete-100 hover:text-navy-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded border text-xs ${
                      isActive
                        ? 'border-white/30 bg-white/15 text-white'
                        : 'border-concrete-200 bg-white text-steel-700'
                    }`}
                  >
                    {link.icon}
                  </span>
                  {link.label}
                  {link.notifCategory && <NotificationBadge count={notifCounts[link.notifCategory]} />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-concrete-200 p-4">
          <div className="rounded-md bg-concrete-50 p-3">
            <div className="flex items-center gap-3">
              <Avatar initials={user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'ME'} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-950">{firstName}</p>
                <p className="truncate text-xs text-steel-500">{user?.email || 'Logged in'}</p>
              </div>
            </div>
            <button
              id="sidebar-logout-btn"
              type="button"
              onClick={handleLogout}
              className="mt-3 w-full rounded-md border border-concrete-300 px-3 py-2 text-sm font-semibold text-steel-700 transition-colors duration-150 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
            >
              Log Out
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main Content & Mobile Header ───────────────────────────────────── */}
      <div className="min-h-screen flex-1 min-w-0 max-w-full overflow-x-hidden lg:ml-64">
        {/* Mobile Header Bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-concrete-200 bg-white px-4 py-3 lg:hidden">
          <Logo />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(prev => !prev)}
              className="flex items-center gap-1.5 rounded-md border border-concrete-300 px-3 py-1.5 text-xs font-semibold text-steel-700 hover:bg-concrete-50"
            >
              <span>{isMobileMenuOpen ? '✕ Close' : '☰ Menu'}</span>
            </button>
          </div>
        </header>

        {/* Mobile Slide-down Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-b border-concrete-200 bg-white p-4 space-y-1 animate-in slide-in-from-top-2">
            <nav className="grid grid-cols-2 gap-2">
              {sidebarLinks.map(link => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === ROUTES.DASHBOARD || link.to.endsWith('/overview')}
                  onClick={closeMobileMenu}
                  className={({ isActive }) =>
                    `flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-navy-800 text-white'
                        : 'bg-concrete-50 text-steel-700 hover:bg-concrete-100'
                    }`
                  }
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-white/20 text-[9px] font-bold">
                    {link.icon}
                  </span>
                  <span className="truncate">{link.label}</span>
                  {link.notifCategory && <NotificationBadge count={notifCounts[link.notifCategory]} />}
                </NavLink>
              ))}
            </nav>
            <div className="pt-3 border-t border-concrete-200 flex justify-between items-center">
              <span className="text-xs text-steel-600 truncate max-w-[180px]">{user?.email}</span>
              <button
                type="button"
                onClick={handleLogout}
                className="text-xs font-semibold text-red-600 hover:underline"
              >
                Log Out
              </button>
            </div>
          </div>
        )}

        <main className="p-4 sm:p-6 lg:p-8 min-w-0 max-w-full overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
