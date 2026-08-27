/**
 * pages/Profile/index.jsx — My Profile & Profile Edit
 *
 * Displays the logged-in member's profile and provides an interactive form
 * to update name, bio, company, phone, and avatar. Profile updates are
 * persisted to MongoDB and synced immediately across the app state.
 *
 * Includes a Reputation Score section below the profile card showing trust
 * score, tier badge, completion rate, average rating, and full breakdown.
 */

import { useState, useEffect } from 'react';
import useAuth from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import ReputationBadge from '../../components/common/ReputationBadge';
import IpLocationBadge from '../../components/common/IpLocationBadge';
import api from '../../services/api';
import { getInitials, formatDate } from '../../utils/formatters';

const ROLE_COLORS = {
  admin: 'accent',
  operations: 'primary',
  client: 'gray',
};

const DISPUTE_STATUS_META = {
  disputed: { label: 'Open', color: 'red' },
  completed: { label: 'Resolved', color: 'green' },
  cancelled: { label: 'Resolved (Cancelled)', color: 'gray' },
};

const formatDateTime = iso =>
  iso ? new Date(iso).toLocaleString('en-BD', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const DisputeThread = ({ dispute }) => {
  const { addToast } = useToast();
  const [messages, setMessages] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const loadMessages = () => {
    setLoading(true);
    api.get(`/trade-proposals/${dispute._id}/messages`)
      .then(res => setMessages(res.data.data))
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispute._id]);

  const handleReply = async () => {
    if (reply.trim().length < 1) {return;}
    setSending(true);
    try {
      await api.post(`/trade-proposals/${dispute._id}/messages`, { message: reply.trim() });
      setReply('');
      loadMessages();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to send message.', 'error');
    } finally {
      setSending(false);
    }
  };

  const complainant = dispute.disputedBy === dispute.requester._id ? dispute.requester : dispute.provider;

  return (
    <div className="mt-3 space-y-3 rounded-lg border border-concrete-200 bg-concrete-50 p-3">
      {dispute.disputeReason && (
        <div className="rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-800">
          <span className="font-semibold">Complaint from {complainant?.name || 'Unknown'}: </span>
          "{dispute.disputeReason}"
        </div>
      )}
      {dispute.adminResolutionNote && (
        <div className="rounded-md border border-navy-100 bg-navy-50 p-2.5 text-xs text-navy-800">
          <span className="font-semibold">Admin resolution: </span>{dispute.adminResolutionNote}
        </div>
      )}

      <div className="max-h-64 space-y-2 overflow-y-auto">
        {loading ? (
          <p className="text-xs text-steel-500">Loading messages…</p>
        ) : !messages || messages.length === 0 ? (
          <p className="text-xs text-steel-500">No messages yet.</p>
        ) : (
          messages.map(m => (
            <div
              key={m._id}
              className={`rounded-md p-2 text-xs ${
                m.senderRole === 'admin' ? 'border border-amber-200 bg-amber-50' : 'border border-concrete-200 bg-white'
              }`}
            >
              <p className="font-semibold text-navy-900">
                {m.senderRole === 'admin' ? '🛡️ Admin' : m.sender?.name || 'User'}
                <span className="ml-2 font-normal text-steel-400">{formatDateTime(m.createdAt)}</span>
              </p>
              <p className="mt-0.5 text-steel-700">{m.message}</p>
            </div>
          ))
        )}
      </div>

      {dispute.status === 'disputed' ? (
        <div className="space-y-2">
          <textarea
            rows={2}
            className="input-base text-xs"
            placeholder="Reply to admin…"
            value={reply}
            onChange={e => setReply(e.target.value)}
            maxLength={1000}
          />
          <Button size="sm" disabled={sending || !reply.trim()} onClick={handleReply}>
            {sending ? 'Sending…' : 'Send Reply'}
          </Button>
        </div>
      ) : (
        <p className="text-xs text-steel-500">This dispute has been resolved — the thread is now read-only.</p>
      )}
    </div>
  );
};

const DisputesPanel = () => {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    api.get('/trade-proposals/disputes/mine')
      .then(res => setDisputes(res.data.data))
      .catch(() => setDisputes([]))
      .finally(() => setLoading(false));
    api.patch('/notifications/read-all', {}, { params: { category: 'profile' } }).catch(() => {});
  }, []);

  if (loading || disputes.length === 0) {return null;}

  return (
    <Card className="p-6">
      <div className="mb-4">
        <span className="eyebrow mb-1">Dispute Resolution</span>
        <h2 className="text-lg font-semibold text-slate-950">Disputes & Admin Messages</h2>
        <p className="mt-1 text-sm text-steel-600">
          Trades you've disputed or been disputed on, admin's messages, and your replies.
        </p>
      </div>

      <div className="space-y-3">
        {disputes.map(d => {
          const counterparty = d.viewerRole === 'requester' ? d.provider : d.requester;
          const isExpanded = expandedId === d._id;
          const meta = DISPUTE_STATUS_META[d.status] || { label: d.status, color: 'gray' };

          return (
            <div key={d._id} className="rounded-lg border border-concrete-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-950">{d.listingTitle}</p>
                  <p className="text-xs text-steel-500">
                    With {counterparty?.name || 'Unknown'} · Disputed {formatDate(d.disputedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge color={meta.color}>{meta.label}</Badge>
                  <Button size="sm" variant="outline" onClick={() => setExpandedId(isExpanded ? null : d._id)}>
                    {isExpanded ? 'Hide' : 'View'}
                  </Button>
                </div>
              </div>
              {isExpanded && <DisputeThread dispute={d} />}
            </div>
          );
        })}
      </div>
    </Card>
  );
};

const Field = ({ label, value }) => (
  <div>
    <p className="text-xs font-semibold uppercase tracking-wide text-steel-500">{label}</p>
    <p className="mt-1 text-sm text-slate-950">{value || <span className="text-steel-400">Not set</span>}</p>
  </div>
);

const StarDisplay = ({ rating, max = 5 }) => {
  const stars = [];
  for (let i = 1; i <= max; i++) {
    stars.push(
      <span key={i} className={i <= Math.floor(rating) ? 'text-amber-400' : 'text-concrete-300'}>
        ★
      </span>
    );
  }
  return <span className="inline-flex gap-0.5 text-lg">{stars}</span>;
};

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const { addToast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    bio: user?.bio || '',
    company: user?.company || '',
    phone: user?.phone || '',
    avatar: user?.avatar || '',
    city: user?.location?.city || '',
    lat: user?.location?.lat ?? '',
    lng: user?.location?.lng ?? '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

  // Reputation data
  const [reputation, setReputation] = useState(null);
  const [repLoading, setRepLoading] = useState(true);
  const [repExpanded, setRepExpanded] = useState(false);

  useEffect(() => {
    api.get('/reputation/me')
      .then(res => setReputation(res.data.data))
      .catch(() => setReputation(null))
      .finally(() => setRepLoading(false));
  }, []);

  if (!user) {
    return (
      <div className="flex justify-center py-16 text-sm text-steel-600">
        Loading your profile…
      </div>
    );
  }

  const handleStartEdit = () => {
    setForm({
      name: user.name || '',
      bio: user.bio || '',
      company: user.company || '',
      phone: user.phone || '',
      avatar: user.avatar || '',
      city: user.location?.city || '',
      lat: user.location?.lat ?? '',
      lng: user.location?.lng ?? '',
    });
    setStatusMessage({ type: '', text: '' });
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setStatusMessage({ type: '', text: '' });
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setStatusMessage({ type: '', text: '' });

    if (!form.name.trim()) {
      setStatusMessage({ type: 'error', text: 'Full Name is required.' });
      addToast('Full Name is required', 'error');
      return;
    }

    const hasLat = form.lat !== '';
    const hasLng = form.lng !== '';
    if (hasLat !== hasLng) {
      setStatusMessage({ type: 'error', text: 'Enter both latitude and longitude, or leave both blank.' });
      addToast('Enter both latitude and longitude, or leave both blank.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await updateProfile({
        name: form.name.trim(),
        bio: form.bio.trim(),
        company: form.company.trim(),
        phone: form.phone.trim(),
        avatar: form.avatar.trim(),
        location: {
          city: form.city.trim(),
          lat: hasLat ? Number(form.lat) : null,
          lng: hasLng ? Number(form.lng) : null,
        },
      });

      if (res.success) {
        setStatusMessage({ type: 'success', text: 'Profile updated successfully!' });
        addToast('Profile updated successfully!', 'success');
        setIsEditing(false);
      } else {
        const msg = res.message || 'Failed to update profile.';
        setStatusMessage({ type: 'error', text: msg });
        addToast(msg, 'error');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'An error occurred while updating profile.';
      setStatusMessage({
        type: 'error',
        text: msg,
      });
      addToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="eyebrow mb-2">My Profile</span>
          <h1 className="text-3xl font-semibold text-slate-950">Your Details</h1>
          <p className="mt-1 text-sm text-steel-600">
            View and manage your TradeLink student profile details.
          </p>
        </div>

        {!isEditing && (
          <Button size="sm" variant="outline" onClick={handleStartEdit}>
            ✏️ Edit Profile
          </Button>
        )}
      </div>

      {/* ── IP Geolocation 3rd-Party API Banner ───────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50/80 p-4 text-sm shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-lg text-sky-700">
            🌐
          </div>
          <div>
            <p className="font-semibold text-slate-950">
              Live Location Auto-Detection <span className="ml-1 text-xs text-sky-700">(ip-api.com REST API)</span>
            </p>
            <p className="text-xs text-steel-600">
              Auto-detects your city and country via external 3rd-party IP Geolocation REST API.
            </p>
          </div>
        </div>
        <IpLocationBadge
          onAutoDetectLocation={geo => {
            setForm(prev => ({
              ...prev,
              city: geo.city || prev.city,
              lat: geo.lat ?? prev.lat,
              lng: geo.lon ?? prev.lng,
            }));
            if (!isEditing) {setIsEditing(true);}
            addToast(`Location set to ${geo.city}, ${geo.country} via ip-api.com!`, 'info');
          }}
        />
      </div>

      {/* ── Status Banner ─────────────────────────────────────────────── */}
      {statusMessage.text && (
        <div
          className={`rounded-md p-4 text-sm border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* ── Profile Card ──────────────────────────────────────────────── */}
      <Card className="p-6">
        {/* Header Avatar & Basic Info */}
        <div className="flex flex-wrap items-center gap-4">
          <Avatar initials={getInitials(user.name)} src={user.avatar || undefined} size="xl" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold text-slate-950">{user.name}</h2>
              <Badge color={ROLE_COLORS[user.role] || 'gray'}>{user.role}</Badge>
              <Badge color={user.isVerified ? 'green' : 'yellow'}>
                {user.isVerified ? 'Verified' : 'Not Verified'}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-steel-600">{user.email}</p>
            <div className="mt-2">
              <IpLocationBadge
                onAutoDetectLocation={geo => {
                  setForm(prev => ({
                    ...prev,
                    city: geo.city || prev.city,
                    lat: geo.lat ?? prev.lat,
                    lng: geo.lon ?? prev.lng,
                  }));
                  if (!isEditing) {setIsEditing(true);}
                  addToast(`Location detected: ${geo.city}, ${geo.country} (via ip-api.com)`, 'info');
                }}
              />
            </div>
          </div>
        </div>

        {/* ── EDIT MODE FORM ────────────────────────────────────────── */}
        {isEditing ? (
          <form className="mt-6 border-t border-concrete-200 pt-6 space-y-4" onSubmit={handleSubmit}>
            <h3 className="text-base font-semibold text-slate-950">Edit Profile Details</h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="profile-name" className="mb-1.5 block text-sm font-medium text-steel-700">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="profile-name"
                  name="name"
                  type="text"
                  className="input-base"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label htmlFor="profile-email" className="mb-1.5 block text-sm font-medium text-steel-700">
                  Email Address <span className="text-xs text-steel-400">(Read-only)</span>
                </label>
                <input
                  id="profile-email"
                  type="email"
                  className="input-base bg-concrete-100 cursor-not-allowed"
                  value={user.email}
                  disabled
                />
              </div>

              <div>
                <label htmlFor="profile-company" className="mb-1.5 block text-sm font-medium text-steel-700">
                  Company / Organization
                </label>
                <input
                  id="profile-company"
                  name="company"
                  type="text"
                  placeholder="e.g. University of Dhaka"
                  className="input-base"
                  value={form.company}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="profile-phone" className="mb-1.5 block text-sm font-medium text-steel-700">
                  Phone Number
                </label>
                <input
                  id="profile-phone"
                  name="phone"
                  type="text"
                  placeholder="e.g. +880 1700 000000"
                  className="input-base"
                  value={form.phone}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label htmlFor="profile-avatar" className="mb-1.5 block text-sm font-medium text-steel-700">
                Avatar Image URL <span className="text-xs text-steel-400">(Optional)</span>
              </label>
              <input
                id="profile-avatar"
                name="avatar"
                type="text"
                placeholder="https://example.com/avatar.jpg"
                className="input-base"
                value={form.avatar}
                onChange={handleChange}
              />
            </div>

            <div>
              <p className="mb-1.5 text-sm font-medium text-steel-700">
                Location <span className="text-xs text-steel-400">(Optional — used for Trade Chains' in-person meeting-point suggestions)</span>
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="profile-city" className="mb-1.5 block text-xs font-medium text-steel-600">
                    City
                  </label>
                  <input
                    id="profile-city"
                    name="city"
                    type="text"
                    placeholder="e.g. Dhaka"
                    className="input-base"
                    value={form.city}
                    onChange={handleChange}
                    maxLength={100}
                  />
                </div>
                <div>
                  <label htmlFor="profile-lat" className="mb-1.5 block text-xs font-medium text-steel-600">
                    Latitude
                  </label>
                  <input
                    id="profile-lat"
                    name="lat"
                    type="number"
                    step="any"
                    placeholder="e.g. 23.8103"
                    className="input-base"
                    value={form.lat}
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label htmlFor="profile-lng" className="mb-1.5 block text-xs font-medium text-steel-600">
                    Longitude
                  </label>
                  <input
                    id="profile-lng"
                    name="lng"
                    type="number"
                    step="any"
                    placeholder="e.g. 90.4125"
                    className="input-base"
                    value={form.lng}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="profile-bio" className="mb-1.5 block text-sm font-medium text-steel-700">
                Bio / About Yourself
              </label>
              <textarea
                id="profile-bio"
                name="bio"
                rows={3}
                placeholder="Tell other students about your background and skills..."
                className="input-base"
                value={form.bio}
                onChange={handleChange}
                maxLength={500}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving Changes…' : 'Save Changes'}
              </Button>
              <Button type="button" variant="ghost" disabled={submitting} onClick={handleCancelEdit}>
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          /* ── VIEW MODE DETAILS ──────────────────────────────────────── */
          <>
            <div className="mt-6 grid grid-cols-1 gap-6 border-t border-concrete-200 pt-6 sm:grid-cols-2">
              <Field label="Full Name" value={user.name} />
              <Field label="Email Address" value={user.email} />
              <Field label="Company / Institution" value={user.company} />
              <Field label="Phone Number" value={user.phone} />
              <Field label="Role" value={user.role} />
              <Field label="Member Since" value={user.createdAt ? formatDate(user.createdAt) : null} />
              <Field label="Location" value={user.location?.city} />
            </div>

            <div className="mt-6 border-t border-concrete-200 pt-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-steel-500">Bio</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-950">
                {user.bio || <span className="text-steel-400">No bio added yet. Click "Edit Profile" above to add one.</span>}
              </p>
            </div>
          </>
        )}
      </Card>

      {/* ── Disputes & Admin Messages Section ────────────────────────────── */}
      <DisputesPanel />

      {/* ── Reputation Score Section ──────────────────────────────────── */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <span className="eyebrow mb-1">Trust & Reputation</span>
            <h2 className="text-lg font-semibold text-slate-950">Reputation Score</h2>
          </div>
          {reputation && (
            <button
              onClick={() => setRepExpanded(!repExpanded)}
              className="text-xs font-semibold text-navy-800 hover:underline"
            >
              {repExpanded ? 'Hide Breakdown' : 'View Full Breakdown'}
            </button>
          )}
        </div>

        {repLoading ? (
          <div className="flex justify-center py-8 text-sm text-steel-500">
            Calculating reputation…
          </div>
        ) : !reputation ? (
          <div className="py-8 text-center text-sm text-steel-500">
            No reputation data available yet. Complete trades and receive reviews to build your score.
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:gap-10">
            {/* Large score badge */}
            <ReputationBadge
              score={reputation.score}
              tier={reputation.tier}
              tierColor={reputation.tierColor}
              breakdown={reputation.breakdown}
              size="lg"
              showBreakdown={false}
            />

            {/* Stats grid */}
            <div className="flex-1 w-full space-y-5">
              {/* Completion Rate */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-slate-700">Trade Completion Rate</span>
                  <span className="text-sm font-bold text-slate-950">
                    {reputation.breakdown.completionRate.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-concrete-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-navy-800 transition-all duration-700"
                    style={{ width: `${reputation.breakdown.completionRate}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-steel-400">
                  {reputation.breakdown.completedTrades} completed of {reputation.breakdown.totalTrades} total trades
                </p>
              </div>

              {/* Average Rating */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-slate-700">Average Rating</span>
                  <span className="text-sm font-bold text-slate-950">
                    {reputation.breakdown.averageRating.toFixed(2)} / 5.00
                  </span>
                </div>
                <StarDisplay rating={reputation.breakdown.averageRating} />
                <p className="mt-1 text-xs text-steel-400">
                  Based on {reputation.breakdown.totalReviews} reviews received
                </p>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-4 rounded-lg border border-concrete-200 bg-concrete-50/50 p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-950">{reputation.breakdown.totalTrades}</p>
                  <p className="text-xs text-steel-500">Total Trades</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-950">{reputation.breakdown.totalReviews}</p>
                  <p className="text-xs text-steel-500">Reviews</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-950">{reputation.breakdown.disputePenalty}</p>
                  <p className="text-xs text-steel-500">Disputes</p>
                </div>
              </div>

              {/* Expandable full breakdown */}
              {repExpanded && (
                <div className="rounded-lg border border-concrete-200 bg-white p-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-steel-500">Formula Breakdown</p>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <div className="rounded border border-concrete-100 p-3">
                      <p className="text-xs text-steel-500">Completion (40%)</p>
                      <p className="text-lg font-bold text-slate-950">
                        {(reputation.breakdown.completionRate * 0.40).toFixed(1)}
                      </p>
                    </div>
                    <div className="rounded border border-concrete-100 p-3">
                      <p className="text-xs text-steel-500">Rating (40%)</p>
                      <p className="text-lg font-bold text-slate-950">
                        {(reputation.breakdown.averageRating > 0
                          ? ((reputation.breakdown.averageRating - 1) / 4) * 100 * 0.40
                          : 0
                        ).toFixed(1)}
                      </p>
                    </div>
                    <div className="rounded border border-concrete-100 p-3">
                      <p className="text-xs text-steel-500">No Disputes (20%)</p>
                      <p className="text-lg font-bold text-slate-950">
                        {((100 - reputation.breakdown.disputePenalty) * 0.20).toFixed(1)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded border border-concrete-200 bg-concrete-50 p-3">
                    <p className="text-[11px] font-mono text-steel-600 leading-relaxed">
                      Score = ({reputation.breakdown.completionRate.toFixed(1)} × 0.40) +
                      (Rating_Score × 0.40) +
                      ((100 − {reputation.breakdown.disputePenalty}) × 0.20) = <strong>{reputation.score}</strong>
                    </p>
                    <p className="mt-1 text-[10px] text-steel-400">
                      Time-decay: W(t) = e<sup>−0.015 × days</sup> · Half-life ≈ 46 days
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Profile;

