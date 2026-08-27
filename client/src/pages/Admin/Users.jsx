import React, { useEffect, useState } from 'react';
import PageHeader from '../../components/layout/PageHeader';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Skeleton from '../../components/ui/Skeleton';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import IpLocationBadge from '../../components/common/IpLocationBadge';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [suspendFilter, setSuspendFilter] = useState('');
  const toast = useToast();

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (suspendFilter) params.isSuspended = suspendFilter;

      const res = await api.get('/admin/users', { params });
      setUsers(res.data.data.users);
    } catch {
      toast.error('Failed to load user directory.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter, suspendFilter]);

  const handleToggleSuspend = async (user) => {
    const newStatus = !user.isSuspended;
    try {
      const res = await api.patch(`/admin/users/${user.id}/suspend`, { isSuspended: newStatus });
      toast.success(res.data.message);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isSuspended: newStatus } : u));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user suspension status.');
    }
  };

  const handlePromoteToAdmin = async (user) => {
    if (!window.confirm(`Make ${user.name} an admin? They'll get full access to this admin panel.`)) {return;}
    try {
      const res = await api.patch(`/admin/users/${user.id}/promote`);
      toast.success(res.data.message);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, role: 'admin' } : u));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to promote user.');
    }
  };

  const handleToggleVerify = async (user) => {
    const newStatus = !user.isVerified;
    try {
      const res = await api.patch(`/admin/users/${user.id}/verify`, { isVerified: newStatus });
      toast.success(res.data.message);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isVerified: newStatus } : u));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update verification status.');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management 👥"
        description="View registered platform members, toggle account verification badges, or suspend accounts violating guidelines."
      />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50/80 p-4 text-sm shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-xl">🌐</span>
          <div>
            <p className="font-semibold text-slate-950">
              Admin Node IP Geolocation <span className="text-xs text-sky-700">(ip-api.com REST API)</span>
            </p>
            <p className="text-xs text-steel-600">
              Current admin session origin auto-detected via external 3rd-party IP Geolocation API.
            </p>
          </div>
        </div>
        <IpLocationBadge />
      </div>

      {/* Filters Bar */}
      <Card className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-base text-sm"
          />
        </div>
        <div className="flex items-center gap-3">
          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="input-base text-sm py-2 px-3 w-36"
          >
            <option value="">All Roles</option>
            <option value="client">Client</option>
            <option value="admin">Admin</option>
          </select>

          <select
            value={suspendFilter}
            onChange={e => setSuspendFilter(e.target.value)}
            className="input-base text-sm py-2 px-3 w-40"
          >
            <option value="">All Statuses</option>
            <option value="false">Active Only</option>
            <option value="true">Suspended Only</option>
          </select>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-steel-500">
            No registered users match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-concrete-200 bg-concrete-50 text-xs font-semibold uppercase tracking-wider text-steel-600">
                <tr>
                  <th className="px-5 py-3.5">Member</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Verification</th>
                  <th className="px-5 py-3.5">Account Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-concrete-200">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-concrete-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar initials={u.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'} src={u.avatar} size="sm" />
                        <div>
                          <p className="font-semibold text-navy-900">{u.name}</p>
                          <p className="text-xs text-steel-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge color={u.role === 'admin' ? 'purple' : 'gray'}>
                        {u.role}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => handleToggleVerify(u)}
                        className="cursor-pointer"
                        title="Click to toggle verification status"
                      >
                        <Badge color={u.isVerified ? 'green' : 'yellow'}>
                          {u.isVerified ? '✓ Verified' : 'Unverified'}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-5 py-4">
                      <Badge color={u.isSuspended ? 'red' : 'green'}>
                        {u.isSuspended ? '🚫 Suspended' : 'Active'}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {u.role !== 'admin' && (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handlePromoteToAdmin(u)}
                            className="rounded-lg bg-purple-100 px-3 py-1.5 text-xs font-semibold text-purple-800 transition-colors hover:bg-purple-200"
                          >
                            Promote to Admin
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleSuspend(u)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                              u.isSuspended
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-red-100 text-red-800 hover:bg-red-200'
                            }`}
                          >
                            {u.isSuspended ? 'Reactivate User' : 'Suspend User'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}