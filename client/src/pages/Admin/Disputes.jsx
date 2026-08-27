import React, { useEffect, useState } from 'react';
import PageHeader from '../../components/layout/PageHeader';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Card from '../../components/ui/Card';
import Skeleton from '../../components/ui/Skeleton';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { formatCurrency, formatDate } from '../../utils/formatters';

const formatDateTime = iso =>
  iso
    ? new Date(iso).toLocaleString('en-BD', { dateStyle: 'medium', timeStyle: 'short' })
    : '—';

// Both parties are expected to respond to a dispute within 2 days of it
// being raised. Past that, the admin has the authority to suspend both
// accounts (see AdminDisputes' "Suspend Both Accounts" action below).
const RESPONSE_WINDOW_MS = 2 * 24 * 60 * 60 * 1000;

const ResponseDeadlinePanel = ({ disputedAt }) => {
  if (!disputedAt) return null;
  const deadline = new Date(new Date(disputedAt).getTime() + RESPONSE_WINDOW_MS);
  const isOverdue = new Date() > deadline;

  return (
    <div className="flex items-center justify-between rounded-lg border border-concrete-200 bg-concrete-50 p-3 text-xs">
      <span className="text-steel-600">
        Both parties are expected to respond by{' '}
        <span className="font-semibold text-navy-900">{formatDateTime(deadline)}</span>
      </span>
      <Badge color={isOverdue ? 'red' : 'yellow'}>{isOverdue ? 'Response window passed' : 'Within response window'}</Badge>
    </div>
  );
};

/**
 * Dispute Resolution Using Valuation Data — shows the exact market rate
 * (ValuationSnapshot) that was in effect for the trade's skill category at
 * the moment it was agreed upon, alongside the price both parties actually
 * locked in, so the admin resolves against objective data.
 */
const MarketRatePanel = ({ proposal, marketRateAtProposal }) => {
  if (!marketRateAtProposal) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        No historical valuation snapshot is available for "{proposal.category}" at the time this trade
        was agreed upon — objective comparison isn't possible for this trade.
      </div>
    );
  }

  const agreed = proposal.priceAtProposal;
  const market = marketRateAtProposal.priceBDT;
  const matches = Math.round(agreed) === Math.round(market);

  return (
    <div className="space-y-3 rounded-lg border border-navy-100 bg-navy-50/40 p-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-navy-800">
          Market Rate at Time of Trade
        </p>
        <Badge color={matches ? 'green' : 'red'}>
          {matches ? 'Matches agreed price' : 'Differs from agreed price'}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div>
          <p className="text-steel-500">Market rate ({formatDateTime(marketRateAtProposal.createdAt)})</p>
          <p className="text-base font-bold text-navy-900">{formatCurrency(market)}</p>
        </div>
        <div>
          <p className="text-steel-500">Price agreed by both parties</p>
          <p className="text-base font-bold text-navy-900">{formatCurrency(agreed)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-navy-100 pt-2 text-[11px] text-steel-600 sm:grid-cols-4">
        <p>Supply: <span className="font-semibold text-navy-900">{marketRateAtProposal.supply}</span></p>
        <p>Demand: <span className="font-semibold text-navy-900">{marketRateAtProposal.demand}</span></p>
        <p>Ratio: <span className="font-semibold text-navy-900">{marketRateAtProposal.ratio?.toFixed(2)}</span></p>
        <p>Multiplier: <span className="font-semibold text-navy-900">×{marketRateAtProposal.multiplier?.toFixed(2)}</span></p>
      </div>

      {proposal.isUrgent && proposal.rushSurchargeBDT > 0 && (
        <p className="border-t border-navy-100 pt-2 text-[11px] text-amber-700">
          Rush pricing added +{formatCurrency(proposal.rushSurchargeBDT)} (×{proposal.rushMultiplier}) on top of
          the market rate for this urgent booking.
        </p>
      )}
      {proposal.creditsRedeemed > 0 && (
        <p className="text-[11px] text-steel-600">
          {proposal.creditsRedeemed} credit{proposal.creditsRedeemed !== 1 ? 's' : ''} redeemed for a{' '}
          {formatCurrency(proposal.discountBDT)} discount — final price {formatCurrency(proposal.finalPriceBDT)}.
        </p>
      )}
    </div>
  );
};

/**
 * The same shared message thread the two parties see on their Profile page
 * (client/src/pages/Profile/index.jsx's DisputeThread) — admin reads and
 * replies from here instead.
 */
const AdminMessageThread = ({ proposalId, isDisputed }) => {
  const { addToast } = useToast();
  const [messages, setMessages] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const loadMessages = () => {
    setLoading(true);
    api.get(`/admin/trades/${proposalId}/messages`)
      .then(res => setMessages(res.data.data))
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposalId]);

  const handleSend = async () => {
    if (!reply.trim()) return;
    setSending(true);
    try {
      await api.post(`/admin/trades/${proposalId}/messages`, { message: reply.trim() });
      setReply('');
      loadMessages();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to send message.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-steel-600">Message Thread</p>
      <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-concrete-200 bg-concrete-50 p-2">
        {loading ? (
          <p className="text-xs text-steel-500 p-1">Loading messages…</p>
        ) : !messages || messages.length === 0 ? (
          <p className="text-xs text-steel-500 p-1">No messages yet — write one below to ask either party for their side.</p>
        ) : (
          messages.map(m => (
            <div
              key={m._id}
              className={`rounded-md p-2 text-xs ${
                m.senderRole === 'admin' ? 'border border-amber-200 bg-amber-50' : 'border border-concrete-200 bg-white'
              }`}
            >
              <p className="font-semibold text-navy-900">
                {m.senderRole === 'admin' ? '🛡️ You (Admin)' : `${m.sender?.name || 'User'} (${m.senderRole})`}
                <span className="ml-2 font-normal text-steel-400">{formatDateTime(m.createdAt)}</span>
              </p>
              <p className="mt-0.5 text-steel-700">{m.message}</p>
            </div>
          ))
        )}
      </div>

      {isDisputed ? (
        <div className="flex gap-2">
          <textarea
            rows={2}
            className="input-base text-xs"
            placeholder="Ask the requester or provider for their side…"
            value={reply}
            onChange={e => setReply(e.target.value)}
            maxLength={1000}
          />
          <Button size="sm" disabled={sending || !reply.trim()} onClick={handleSend}>
            {sending ? 'Sending…' : 'Send'}
          </Button>
        </div>
      ) : (
        <p className="text-[11px] text-steel-500">This dispute is resolved — the thread is read-only.</p>
      )}
    </div>
  );
};

export default function AdminDisputes() {
  const [disputes, setDisputes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [isSuspending, setIsSuspending] = useState(false);
  const { addToast } = useToast();

  const fetchDisputes = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/admin/trades', { params: { status: 'disputed' } });
      setDisputes(res.data.data.proposals);
    } catch {
      addToast('Failed to load disputed trade queue.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, []);

  const openDispute = async proposalId => {
    setSelectedId(proposalId);
    setIsLoadingDetail(true);
    try {
      const res = await api.get(`/admin/trades/${proposalId}`);
      setDetail(res.data.data);
    } catch {
      addToast('Failed to load dispute details.', 'error');
      setSelectedId(null);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const closeModal = () => {
    setSelectedId(null);
    setDetail(null);
    setAdminNote('');
  };

  const handleResolve = async action => {
    if (!selectedId) return;
    setIsResolving(true);
    try {
      const res = await api.post(`/admin/trades/${selectedId}/resolve`, {
        action,
        adminNote: adminNote.trim() || undefined
      });
      addToast(res.data.message, 'success');
      closeModal();
      fetchDisputes();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to resolve dispute.', 'error');
    } finally {
      setIsResolving(false);
    }
  };

  const handleSuspendBoth = async () => {
    if (!selectedId) return;
    setIsSuspending(true);
    try {
      const res = await api.post(`/admin/trades/${selectedId}/suspend-both`);
      addToast(res.data.message, 'success');
      closeModal();
      fetchDisputes();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to suspend both accounts.', 'error');
    } finally {
      setIsSuspending(false);
    }
  };

  const proposal = detail?.proposal;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Disputes & Moderation Queue 🛡️"
        description="Review reported session disputes against the objective market rate recorded at the moment each trade was agreed upon, then execute an administrative resolution."
      />

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : disputes.length === 0 ? (
          <div className="p-10 text-center text-steel-500">
            <p className="text-2xl mb-1">🎉</p>
            <p className="font-semibold text-navy-900">No Open Disputes</p>
            <p className="text-xs text-steel-500">All member skill sessions are operating smoothly without reports.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-concrete-200 bg-concrete-50 text-xs font-semibold uppercase tracking-wider text-steel-600">
                <tr>
                  <th className="px-5 py-3.5">Session Skill</th>
                  <th className="px-5 py-3.5">Requester</th>
                  <th className="px-5 py-3.5">Provider</th>
                  <th className="px-5 py-3.5">Escrow Amount</th>
                  <th className="px-5 py-3.5">Disputed Date</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-concrete-200">
                {disputes.map(d => (
                  <tr key={d._id} className="hover:bg-concrete-50/50 transition-colors">
                    <td className="px-5 py-4 font-semibold text-navy-900">
                      {d.listingTitle || 'Skill Session'}
                    </td>
                    <td className="px-5 py-4 text-xs">
                      <p className="font-semibold text-navy-900">{d.requester?.name}</p>
                      <p className="text-steel-500">{d.requester?.email}</p>
                    </td>
                    <td className="px-5 py-4 text-xs">
                      <p className="font-semibold text-navy-900">{d.provider?.name}</p>
                      <p className="text-steel-500">{d.provider?.email}</p>
                    </td>
                    <td className="px-5 py-4 font-bold text-navy-900">
                      {formatCurrency(d.finalPriceBDT ?? d.priceAtProposal ?? 0)}
                    </td>
                    <td className="px-5 py-4 text-xs font-medium text-steel-600">
                      {formatDate(d.disputedAt || d.updatedAt)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button variant="primary" size="sm" onClick={() => openDispute(d._id)}>
                        Resolve Dispute
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Dispute Resolution Modal */}
      {selectedId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {isLoadingDetail || !proposal ? (
              <div className="space-y-3 py-6">
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between border-b border-concrete-200 pb-3">
                  <h3 className="text-lg font-bold text-navy-900">
                    Dispute Resolution — {proposal.listingTitle}
                  </h3>
                  <Badge color="red">Disputed</Badge>
                </div>

                {proposal.disputeReason && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                    <span className="font-semibold">Reason given: </span>"{proposal.disputeReason}"
                    {proposal.disputedAt && (
                      <span className="text-red-600"> — raised {formatDateTime(proposal.disputedAt)}</span>
                    )}
                  </div>
                )}

                <ResponseDeadlinePanel disputedAt={proposal.disputedAt} />

                <div className="space-y-3 text-xs bg-concrete-50 p-3 rounded-lg border border-concrete-200">
                  <div className="flex justify-between">
                    <span className="text-steel-600">Requester:</span>
                    <span className="font-semibold text-navy-900">{proposal.requester?.name} ({proposal.requester?.email})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-steel-600">Provider:</span>
                    <span className="font-semibold text-navy-900">{proposal.provider?.name} ({proposal.provider?.email})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-steel-600">Escrow Value:</span>
                    <span className="font-bold text-navy-900">{formatCurrency(proposal.finalPriceBDT)}</span>
                  </div>
                </div>

                <MarketRatePanel proposal={proposal} marketRateAtProposal={detail.marketRateAtProposal} />

                <AdminMessageThread proposalId={selectedId} isDisputed={proposal.status === 'disputed'} />

                <div>
                  <label className="block text-xs font-semibold text-steel-700 mb-1">
                    Admin Resolution Note (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="State resolution reasoning or policy enforcement notes..."
                    value={adminNote}
                    onChange={e => setAdminNote(e.target.value)}
                    className="input-base text-xs"
                  />
                </div>

                <div className="border-t border-concrete-200 pt-3">
                  <p className="mb-2 text-[11px] text-steel-500">
                    If neither party has engaged with this dispute, you may suspend both accounts
                    independently of resolving the trade's money below.
                  </p>
                  <button
                    type="button"
                    disabled={isSuspending}
                    onClick={handleSuspendBoth}
                    className="w-full rounded-lg border border-red-300 bg-white px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors sm:w-auto"
                  >
                    {isSuspending ? 'Suspending…' : '🚫 Suspend Both Accounts'}
                  </button>
                </div>

                <div className="pt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                  <Button type="button" variant="outline" size="sm" onClick={closeModal}>
                    Cancel
                  </Button>
                  <button
                    type="button"
                    disabled={isResolving}
                    onClick={() => handleResolve('mark_resolved')}
                    className="rounded-lg border border-navy-200 bg-white px-4 py-2 text-xs font-semibold text-navy-800 hover:bg-navy-50 transition-colors"
                  >
                    💬 Mark Resolved (No Refund/Release)
                  </button>
                  <button
                    type="button"
                    disabled={isResolving}
                    onClick={() => handleResolve('refund_requester')}
                    className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-700 transition-colors"
                  >
                    ↩ Refund Requester
                  </button>
                  <button
                    type="button"
                    disabled={isResolving}
                    onClick={() => handleResolve('release_provider')}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                  >
                    ✓ Release to Provider
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
