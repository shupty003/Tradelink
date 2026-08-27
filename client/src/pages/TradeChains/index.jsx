/**
 * pages/TradeChains/index.jsx — Multi-Party Trade Chains with Location Matching
 *
 * When a direct trade isn't available, search for a chain of members whose
 * offers and wants close a loop back to you. A found chain is only ever a
 * suggestion — proposing one creates a single ChainSwap for your own leg:
 * a true, direct skill-for-skill exchange with no payment and no
 * valuation-engine price, entirely separate from the cash TradeProposal
 * system. The other members are then notified about their part of the
 * chain; nothing here ever creates a swap on someone else's behalf.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import DateTimePicker from '../../components/ui/DateTimePicker';
import TradeChainMap from '../../components/trade-chains/TradeChainMap';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import { ROUTES } from '../../constants';

const toLocalInputValue = date => {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const MIN_SESSION_DATETIME = toLocalInputValue(new Date(Date.now() + 30 * 60 * 1000));

const formatDateTime = iso =>
  new Date(iso).toLocaleString('en-BD', { dateStyle: 'medium', timeStyle: 'short' });

const ChainResultCard = ({ chain, wantId, myLocation, myName, categoryLabel, onProposed }) => {
  const { addToast } = useToast();
  const [sessionDate, setSessionDate] = useState('');
  const [proposing, setProposing] = useState(false);

  const firstPartner = chain.participants[0];

  const handlePropose = async () => {
    if (!sessionDate) {
      addToast('Choose a session time for your leg of the chain first.', 'error');
      return;
    }
    setProposing(true);
    try {
      await api.post('/chain-swaps', {
        listingId: firstPartner.listing.id,
        scheduledAt: new Date(sessionDate).toISOString(),
      });

      await api
        .post('/trade-chains/notify', {
          wantId,
          participants: chain.participants.map(p => ({ userId: p.user.id, listingId: p.listing.id })),
          closingListingId: chain.closingListing.id,
        })
        .catch(() => {}); // my own leg already succeeded either way — this is best-effort

      addToast('Swap proposed — no payment involved! The rest of the chain has been notified.', 'success');
      onProposed();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to propose this chain.', 'error');
    } finally {
      setProposing(false);
    }
  };

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <Badge color="primary">{chain.chainLength}-person chain</Badge>
      </div>

      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2 text-sm text-steel-700">
        <span className="font-semibold text-navy-900">You</span>
        {chain.participants.map(p => (
          <span key={p.user.id} className="flex flex-wrap items-center gap-1.5">
            <span className="text-steel-400">→ get "{p.listing.title}" ({categoryLabel(p.listing)}) from →</span>
            <span className="font-semibold text-navy-900">{p.user.name}</span>
          </span>
        ))}
        <span className="text-steel-400">
          → who gets "{chain.closingListing.title}" ({categoryLabel(chain.closingListing)}) from →
        </span>
        <span className="font-semibold text-navy-900">You</span>
      </div>

      <TradeChainMap
        meetingPoint={chain.meetingPoint}
        participants={chain.participants}
        myLocation={myLocation}
        myName={myName}
      />
      {!chain.meetingPoint && (
        <p className="text-xs text-steel-500">
          No meeting-point suggestion — add your location on{' '}
          <Link to={ROUTES.PROFILE} className="font-semibold text-navy-800 hover:underline">
            My Profile
          </Link>{' '}
          and ask this chain's members to do the same for in-person exchanges.
        </p>
      )}

      <div className="border-t border-concrete-200 pt-4">
        <p className="mb-3 text-xs text-steel-500">
          This proposes a direct skill swap with {firstPartner.user.name} — no payment involved, you're
          simply exchanging skills. The other members will be notified about their part of the chain.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div
            // The picker's calendar popover always drops open below the input
            // with no viewport-flip logic — on this page the input can sit low
            // enough on the page that the popover opens past the bottom of the
            // screen. Nudge it into view once the popover has actually been
            // added to the page (rAF, after React's DOM commit) — scrolling
            // any earlier clamps short, since the page isn't tall enough yet
            // to scroll the input all the way to the top. Scoped to this page
            // only; the shared DateTimePicker component itself isn't touched.
            onClick={() => {
              requestAnimationFrame(() => {
                const el = document.getElementById(`chain-date-${firstPartner.user.id}`);
                if (!el) {return;}
                // This layout has more than one nested container that can end
                // up scrollable, and a single scrollIntoView() call isn't
                // guaranteed to align the element against every one of them —
                // walk every actually-overflowing ancestor and align the
                // input to the top of each directly.
                let node = el.parentElement;
                while (node) {
                  if (node.scrollHeight > node.clientHeight) {
                    const elTop = el.getBoundingClientRect().top;
                    const nodeTop = node.getBoundingClientRect().top;
                    node.scrollTop += elTop - nodeTop - 16;
                  }
                  node = node.parentElement;
                }
              });
            }}
          >
            <label htmlFor={`chain-date-${firstPartner.user.id}`} className="mb-1.5 block text-xs font-medium text-steel-700">
              Session time with {firstPartner.user.name}
            </label>
            <DateTimePicker
              id={`chain-date-${firstPartner.user.id}`}
              min={MIN_SESSION_DATETIME}
              value={sessionDate}
              onChange={setSessionDate}
            />
          </div>
          <Button size="sm" disabled={proposing} onClick={handlePropose}>
            {proposing ? 'Proposing…' : 'Propose This Chain'}
          </Button>
        </div>
      </div>
    </Card>
  );
};

const SWAP_STATUS_COLORS = {
  pending: 'yellow',
  accepted: 'green',
  declined: 'red',
  cancelled: 'gray',
  completed: 'primary',
};

const SwapCard = ({ swap, role, busy, onAccept, onDecline, onCancel, onConfirm }) => {
  const counterparty = role === 'received' ? swap.requester : swap.provider;
  const myConfirmed = role === 'received' ? swap.providerConfirmed : swap.requesterConfirmed;

  return (
    <article className="surface-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-slate-950">{swap.listingTitle}</h3>
            <Badge color={SWAP_STATUS_COLORS[swap.status] || 'gray'}>
              {swap.status.charAt(0).toUpperCase() + swap.status.slice(1)}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-steel-600">
            {role === 'received' ? 'Requested by' : 'Provider'}:{' '}
            <span className="font-medium text-steel-800">{counterparty?.name || 'Unknown'}</span>
          </p>
        </div>
        <Badge color="gray">No payment</Badge>
      </div>

      <p className="mt-3 text-sm text-steel-600">Session: {formatDateTime(swap.scheduledAt)}</p>
      {swap.message && (
        <p className="mt-2 rounded-md bg-concrete-50 p-3 text-sm text-steel-700">"{swap.message}"</p>
      )}

      {swap.status === 'pending' && (
        <div className="mt-4 flex flex-wrap gap-2">
          {role === 'received' ? (
            <>
              <Button size="sm" disabled={busy} onClick={onAccept}>
                {busy ? 'Working…' : 'Accept'}
              </Button>
              <Button size="sm" variant="danger" disabled={busy} onClick={onDecline}>
                Decline
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" disabled={busy} onClick={onCancel}>
              {busy ? 'Working…' : 'Cancel'}
            </Button>
          )}
        </div>
      )}

      {swap.status === 'accepted' && (
        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap gap-4 rounded-md border border-concrete-200 bg-concrete-50 p-3 text-xs">
            <span className={swap.requesterConfirmed ? 'font-semibold text-emerald-700' : 'text-steel-500'}>
              {swap.requesterConfirmed ? '✓' : '○'} Requester confirmed
            </span>
            <span className={swap.providerConfirmed ? 'font-semibold text-emerald-700' : 'text-steel-500'}>
              {swap.providerConfirmed ? '✓' : '○'} Provider confirmed
            </span>
          </div>
          {!myConfirmed && (
            <Button size="sm" disabled={busy} onClick={onConfirm}>
              {busy ? 'Working…' : "Confirm — It Happened"}
            </Button>
          )}
        </div>
      )}

      {swap.status === 'completed' && (
        <p className="mt-3 text-sm font-semibold text-emerald-700">✓ Swap complete — no payment involved.</p>
      )}
    </article>
  );
};

const MySwaps = ({ refreshKey }) => {
  const { addToast } = useToast();
  const [tab, setTab] = useState('received');
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const loadAll = () => {
    setLoading(true);
    Promise.all([api.get('/chain-swaps/received'), api.get('/chain-swaps/sent')])
      .then(([receivedRes, sentRes]) => {
        setReceived(receivedRes.data.data);
        setSent(sentRes.data.data);
      })
      .catch(() => {
        setReceived([]);
        setSent([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const act = async (id, action) => {
    setBusyId(id);
    try {
      if (action === 'cancel') {
        await api.delete(`/chain-swaps/${id}`);
      } else {
        await api.patch(`/chain-swaps/${id}/${action}`);
      }
      loadAll();
    } catch (err) {
      addToast(err.response?.data?.message || 'Something went wrong. Please try again.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const list = tab === 'received' ? received : sent;
  const pendingReceivedCount = received.filter(s => s.status === 'pending').length;

  if (loading) {
    return <p className="text-sm text-steel-500">Loading your swaps…</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab('received')}
          className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
            tab === 'received' ? 'bg-navy-800 text-white' : 'bg-white text-steel-700 border border-concrete-200'
          }`}
        >
          Received{pendingReceivedCount > 0 ? ` (${pendingReceivedCount})` : ''}
        </button>
        <button
          type="button"
          onClick={() => setTab('sent')}
          className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
            tab === 'sent' ? 'bg-navy-800 text-white' : 'bg-white text-steel-700 border border-concrete-200'
          }`}
        >
          Sent
        </button>
      </div>

      {list.length === 0 ? (
        <div className="rounded-lg border border-concrete-200 bg-concrete-50 py-12 text-center">
          <p className="text-sm text-steel-600">
            {tab === 'received' ? 'No swap requests received yet.' : "You haven't proposed any swaps yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map(swap => (
            <SwapCard
              key={swap._id}
              swap={swap}
              role={tab}
              busy={busyId === swap._id}
              onAccept={() => act(swap._id, 'accept')}
              onDecline={() => act(swap._id, 'decline')}
              onCancel={() => act(swap._id, 'cancel')}
              onConfirm={() => act(swap._id, 'confirm')}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const TradeChains = () => {
  const { addToast } = useToast();
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [wants, setWants] = useState([]);
  const [selectedWantId, setSelectedWantId] = useState('');
  const [results, setResults] = useState(null);
  const [swapRefreshKey, setSwapRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  const categoryLabel = ({ category, customCategoryName }) => {
    if (category === 'other') {return customCategoryName || 'Other';}
    return categories.find(c => c.slug === category)?.name || category;
  };

  const loadWants = () => {
    setLoading(true);
    Promise.all([api.get('/valuations'), api.get('/wants/mine')])
      .then(([catRes, wantRes]) => {
        setCategories(catRes.data.data);
        setWants(wantRes.data.data);
        setSelectedWantId(prev => prev || wantRes.data.data[0]?._id || '');
      })
      .catch(() => {
        setCategories([]);
        setWants([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadWants();
  }, []);

  const handleSearch = async () => {
    if (!selectedWantId) {return;}
    setSearching(true);
    setResults(null);
    try {
      const res = await api.get('/trade-chains/search', { params: { wantId: selectedWantId } });
      setResults(res.data.data);
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to search for chains.', 'error');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <span className="eyebrow mb-2">Multi-Party Trade Chains</span>
        <h1 className="text-3xl font-semibold text-slate-950">Trade Chains</h1>
        <p className="mt-2 text-sm text-steel-600">
          When a direct trade isn't available, search for a chain of members whose offers and wants
          close a loop back to you. Chain trades are true, no-payment skill swaps — you teach
          something and learn something in return, with no money changing hands anywhere in the loop.
        </p>
      </div>

      <Card className="p-5">
        {loading ? (
          <p className="text-sm text-steel-500">Loading your wants…</p>
        ) : wants.length === 0 ? (
          <div className="text-sm text-steel-600">
            You haven't added anything you're looking for yet.{' '}
            <Link to={ROUTES.MY_SKILLS} className="font-semibold text-navy-800 hover:underline">
              Add one on My Skills
            </Link>{' '}
            to start finding chains.
          </div>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[240px] flex-1">
              <label htmlFor="want-select" className="mb-1.5 block text-sm font-medium text-steel-700">
                What are you looking for?
              </label>
              <select
                id="want-select"
                className="input-base"
                value={selectedWantId}
                onChange={e => {
                  setSelectedWantId(e.target.value);
                  setResults(null);
                }}
              >
                {wants.map(w => (
                  <option key={w._id} value={w._id}>
                    {categoryLabel(w)}
                    {w.notes ? ` — ${w.notes}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <Button disabled={searching} onClick={handleSearch}>
              {searching ? 'Searching…' : 'Find a Chain'}
            </Button>
          </div>
        )}
      </Card>

      {results &&
        (results.length === 0 ? (
          <div className="rounded-lg border border-concrete-200 bg-concrete-50 py-16 text-center">
            <p className="text-base font-semibold text-slate-950">No chain found</p>
            <p className="mt-2 text-sm text-steel-600">
              Nobody's offers and wants currently close a loop back to you. Check again later as more
              members add listings and wants.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {results.map((chain, idx) => (
              <ChainResultCard
                key={idx}
                chain={chain}
                wantId={selectedWantId}
                myLocation={user?.location}
                myName={user?.name}
                categoryLabel={categoryLabel}
                onProposed={() => {
                  setResults(null);
                  setSwapRefreshKey(k => k + 1);
                }}
              />
            ))}
          </div>
        ))}

      <div className="border-t border-concrete-200 pt-6">
        <h2 className="mb-4 text-xl font-semibold text-slate-950">My Chain Swaps</h2>
        <MySwaps refreshKey={swapRefreshKey} />
      </div>
    </div>
  );
};

export default TradeChains;
