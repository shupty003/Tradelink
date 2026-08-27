/**
 * pages/BrowseSkills/index.jsx — Category Browsing With Live Price Filtering & Credit Wallet Discounts
 *
 * Browse all skill categories with their current live price (from the
 * Dynamic Valuation Engine), and filter/sort the active skill listings
 * (see Skill Listing Profiles) by category, live price, or search text.
 *
 * Each listing shows its provider's details, and "Book Session" opens a
 * Trade Proposal. The booking form also lets a logged-in requester
 * redeem Credit Wallet credits for a live-previewed discount before sending.
 */

import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PageHeader from '../../components/layout/PageHeader';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import DateTimePicker from '../../components/ui/DateTimePicker';
import { cn } from '../../utils/cn';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import { ROUTES } from '../../constants';
import ReputationBadge from '../../components/common/ReputationBadge';
import { formatCurrency, truncate } from '../../utils/formatters';

const toLocalInputValue = date => {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const MIN_SESSION_DATETIME = toLocalInputValue(new Date(Date.now() + 30 * 60 * 1000));

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

const initialsOf = name =>
  name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '??';

const CategoryChip = ({ active, label, price, count, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'flex flex-shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors duration-150',
      active
        ? 'border-navy-800 bg-navy-800 text-white'
        : 'border-concrete-200 bg-white text-steel-700 hover:border-concrete-300'
    )}
  >
    {label}
    {price != null && (
      <span className={cn('text-xs font-bold', active ? 'text-accent-200' : 'text-accent-700')}>
        {formatCurrency(price)}
      </span>
    )}
    <span className={cn('text-xs', active ? 'text-navy-100' : 'text-steel-400')}>({count})</span>
  </button>
);

const BrowseSkills = () => {
  const { user, isLoggedIn } = useAuth();
  const { addToast } = useToast();
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');

  const [categories, setCategories] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [category, setCategory] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');

  const [bookingOpenId, setBookingOpenId] = useState(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingMessage, setBookingMessage] = useState('');
  const [bookingCredits, setBookingCredits] = useState('');
  const [bookingIsUrgent, setBookingIsUrgent] = useState(false);
  const [rushPreview, setRushPreview] = useState(null);
  const [bookingPreview, setBookingPreview] = useState(null);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookedIds, setBookedIds] = useState(() => new Set());
  const [walletBalance, setWalletBalance] = useState(null);

  // Debounce free-text search so we're not firing a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setLoading(true);
    api
      .get('/browse', { params: { category: category || undefined, search: search || undefined, sort } })
      .then(res => {
        setCategories(res.data.data.categories || []);
        setListings(res.data.data.listings || []);
      })
      .catch(() => {
        setCategories([]);
        setListings([]);
      })
      .finally(() => setLoading(false));
  }, [category, search, sort]);

  useEffect(() => {
    if (!isLoggedIn) return;
    api
      .get('/wallet/mine')
      .then(res => setWalletBalance(res.data.data.balance))
      .catch(() => setWalletBalance(null));
  }, [isLoggedIn]);

  // Live Time-Decay Rush Pricing preview — only once urgent is checked and
  // a session time is chosen, debounced.
  useEffect(() => {
    if (!bookingOpenId || !bookingIsUrgent || !bookingDate) {
      setRushPreview(null);
      return undefined;
    }
    const listing = listings.find(l => l._id === bookingOpenId);
    if (!listing || listing.currentPriceBDT == null) return undefined;

    const t = setTimeout(() => {
      api
        .get('/trade-proposals/rush-preview', {
          params: { priceBDT: listing.currentPriceBDT, deadline: new Date(bookingDate).toISOString() },
        })
        .then(res => setRushPreview(res.data.data))
        .catch(() => setRushPreview(null));
    }, 250);

    return () => clearTimeout(t);
  }, [bookingOpenId, bookingIsUrgent, bookingDate, listings]);

  // Live discount preview for whichever booking form is open, debounced.
  // Uses the rush-adjusted price (if urgent) so the credit cap and final
  // price both reflect the true cost, not the pre-surcharge base price.
  useEffect(() => {
    if (!bookingOpenId) {
      setBookingPreview(null);
      return undefined;
    }
    const listing = listings.find(l => l._id === bookingOpenId);
    if (!listing || listing.currentPriceBDT == null) return undefined;

    const effectivePrice = bookingIsUrgent && rushPreview ? rushPreview.priceWithRushBDT : listing.currentPriceBDT;

    const t = setTimeout(() => {
      api
        .get('/wallet/preview-redemption', {
          params: { price: effectivePrice, credits: Number(bookingCredits) || 0 },
        })
        .then(res => setBookingPreview(res.data.data))
        .catch(() => setBookingPreview(null));
    }, 250);

    return () => clearTimeout(t);
  }, [bookingOpenId, bookingCredits, bookingIsUrgent, rushPreview, listings]);

  const totalListings = categories.reduce((sum, c) => sum + (c.listingCount || 0), 0);

  const openBooking = listingId => {
    setBookingOpenId(listingId);
    setBookingDate('');
    setBookingMessage('');
    setBookingCredits('');
    setBookingIsUrgent(false);
    setRushPreview(null);
    setBookingPreview(null);
    setBookingError('');
  };

  const closeBooking = () => {
    setBookingOpenId(null);
    setBookingError('');
  };

  const submitBooking = async listingId => {
    setBookingError('');
    if (!bookingDate) {
      setBookingError('Please choose a session date and time.');
      return;
    }

    const creditsNum = Number(bookingCredits) || 0;
    const currentBalance = walletBalance ?? 0;
    if (creditsNum > 0) {
      if (creditsNum > currentBalance) {
        setBookingError(`Insufficient credits: You requested ${creditsNum} credit${creditsNum !== 1 ? 's' : ''} but only have ${currentBalance} available in your wallet.`);
        return;
      }
      if (bookingPreview && creditsNum > bookingPreview.maxCreditsAllowed) {
        setBookingError(`Discount cap exceeded: You can only redeem up to ${bookingPreview.maxCreditsAllowed} credit${bookingPreview.maxCreditsAllowed !== 1 ? 's' : ''} on this trade (max 20% discount).`);
        return;
      }
    }

    setBookingSubmitting(true);
    try {
      await api.post('/trade-proposals', {
        listingId,
        proposedSessionAt: new Date(bookingDate).toISOString(),
        message: bookingMessage.trim() || undefined,
        creditsToRedeem: creditsNum,
        isUrgent: bookingIsUrgent,
      });
      setBookedIds(prev => new Set(prev).add(listingId));
      setBookingOpenId(null);
      if (walletBalance != null && bookingPreview?.creditsApplied) {
        setWalletBalance(walletBalance - bookingPreview.creditsApplied);
      }
      addToast('Trade proposal sent successfully!', 'success');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send the proposal. Please try again.';
      setBookingError(msg);
      addToast(msg, 'error');
    } finally {
      setBookingSubmitting(false);
    }
  };

  const mainContent = (
    <div className="space-y-6 min-w-0 max-w-full">
      {/* ── Category Chips ────────────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-2 max-w-full">
        <CategoryChip
          active={category === ''}
          label="All Categories"
          price={null}
          count={totalListings}
          onClick={() => setCategory('')}
        />
        {categories.map(cat => (
          <CategoryChip
            key={cat.slug}
            active={category === cat.slug}
            label={cat.name}
            price={cat.priceBDT}
            count={cat.listingCount}
            onClick={() => setCategory(cat.slug)}
          />
        ))}
      </div>

      {/* ── Search + Sort Controls ───────────────────────────────────── */}
      <div className="surface-card p-4 flex flex-col gap-3 sm:flex-row sm:items-center min-w-0 max-w-full">
        <input
          id="browse-search"
          type="search"
          placeholder="Search listings by title or description..."
          className="input-base flex-1 min-w-0"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
        />
        <select
          id="browse-sort"
          className="input-base cursor-pointer sm:w-56"
          value={sort}
          onChange={e => setSort(e.target.value)}
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>
              Sort: {opt.label}
            </option>
          ))}
        </select>
      </div>

      <p className="text-sm text-steel-600">
        {loading ? 'Loading…' : (
          <>Showing <span className="font-semibold text-slate-950">{listings.length}</span> available listing{listings.length !== 1 ? 's' : ''}</>
        )}
      </p>

      {/* ── Listings ──────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-16 text-sm text-steel-600">Loading listings…</div>
      ) : listings.length === 0 ? (
        <div className="rounded-lg border border-concrete-200 bg-concrete-50 py-16 text-center">
          <p className="text-base font-semibold text-slate-950">No listings match your filters</p>
          <p className="mt-2 text-sm text-steel-600">Try a different category, search term, or check back later.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 min-w-0 max-w-full">
          {listings.map(listing => {
            const isOwnListing = isLoggedIn && user?.id && String(listing.user?._id) === String(user.id);
            const isPriced = listing.currentPriceBDT != null;
            const isBooked = bookedIds.has(listing._id);
            const isFormOpen = bookingOpenId === listing._id;

            return (
              <article key={listing._id} className="surface-card flex flex-col p-5 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <Badge color="gray">{listing.categoryName}</Badge>
                  {isPriced ? (
                    <span className="text-lg font-bold text-navy-900">{formatCurrency(listing.currentPriceBDT)}</span>
                  ) : (
                    <span className="text-xs font-semibold text-steel-400">Not tracked</span>
                  )}
                </div>

                <h3 className="mt-3 text-base font-semibold text-slate-950">{listing.title}</h3>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-steel-600">
                  {truncate(listing.description, 120)}
                </p>

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-concrete-200 pt-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar
                      initials={initialsOf(listing.user?.name)}
                      src={listing.user?.avatar || undefined}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-950">
                        {listing.user?.name || 'Unknown provider'}
                      </p>
                      <p className="truncate text-xs text-steel-500">
                        {listing.user?.company || listing.user?.bio || 'TradeLink member'}
                      </p>
                    </div>
                  </div>
                  {listing.reputation && (
                    <ReputationBadge
                      score={listing.reputation.score}
                      tier={listing.reputation.tier}
                      tierColor={listing.reputation.tierColor}
                      breakdown={listing.reputation.breakdown}
                      size="sm"
                      showBreakdown={false}
                    />
                  )}
                </div>

                {!isLoggedIn ? (
                  <Link
                    to={ROUTES.LOGIN}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md border border-navy-800 px-5 py-2.5 text-sm font-semibold text-navy-800 transition-colors duration-150 hover:bg-navy-50"
                  >
                    Log In to Book
                  </Link>
                ) : isOwnListing ? (
                  <Button size="sm" fullWidth className="mt-4" disabled title="You can't book your own listing">
                    Your Own Listing
                  </Button>
                ) : !isPriced ? (
                  <Button size="sm" fullWidth className="mt-4" disabled title="This skill isn't priced by the valuation engine yet">
                    Not Available Yet
                  </Button>
                ) : isBooked ? (
                  <Button size="sm" fullWidth className="mt-4" disabled>
                    Proposal Sent ✓
                  </Button>
                ) : isFormOpen ? (
                  <div className="mt-4 space-y-3 border-t border-concrete-200 pt-4">
                    <p className="text-xs text-steel-500">
                      Booking locks in today's live price:{' '}
                      <span className="font-semibold text-navy-900">{formatCurrency(listing.currentPriceBDT)}</span>
                    </p>
                    <div>
                      <label htmlFor={`session-time-${listing._id}`} className="mb-1 block text-xs font-medium text-steel-700">
                        Proposed session time
                      </label>
                      <DateTimePicker
                        id={`session-time-${listing._id}`}
                        min={MIN_SESSION_DATETIME}
                        value={bookingDate}
                        onChange={val => setBookingDate(val)}
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-xs font-medium text-steel-700">
                        <input
                          id={`session-urgent-${listing._id}`}
                          type="checkbox"
                          checked={bookingIsUrgent}
                          onChange={e => setBookingIsUrgent(e.target.checked)}
                          className="h-4 w-4 rounded border-concrete-300 text-navy-800 focus:ring-navy-700"
                        />
                        ⚡ Mark as urgent (rush pricing may apply)
                      </label>
                      {bookingIsUrgent && (
                        <p className="mt-1.5 text-xs text-steel-500">
                          {!bookingDate ? (
                            'Choose a session time above to see the rush surcharge.'
                          ) : rushPreview && rushPreview.rushSurchargeBDT > 0 ? (
                            <>
                              Rush surcharge: +{formatCurrency(rushPreview.rushSurchargeBDT)} (×
                              {rushPreview.rushMultiplier.toFixed(2)}) → {formatCurrency(rushPreview.priceWithRushBDT)}{' '}
                              before any credit discount. The sooner the session, the higher the surcharge.
                            </>
                          ) : rushPreview ? (
                            "This session is far enough out that no rush surcharge applies."
                          ) : (
                            'Calculating rush surcharge…'
                          )}
                        </p>
                      )}
                    </div>

                    <textarea
                      rows={2}
                      placeholder="Optional message to the provider"
                      className="input-base"
                      value={bookingMessage}
                      onChange={e => setBookingMessage(e.target.value)}
                      maxLength={500}
                    />

                    {isLoggedIn && (
                      <div>
                        <label
                          htmlFor={`session-credits-${listing._id}`}
                          className="mb-1 block text-xs font-medium text-steel-700"
                        >
                          Redeem credits ({walletBalance ?? 0} available)
                        </label>
                        <input
                          id={`session-credits-${listing._id}`}
                          type="number"
                          min="0"
                          max={walletBalance || 0}
                          disabled={!walletBalance || walletBalance <= 0}
                          step="1"
                          placeholder={walletBalance > 0 ? "0" : "0 credits available"}
                          className="input-base disabled:bg-concrete-100 disabled:text-steel-400"
                          value={bookingCredits}
                          onChange={e => setBookingCredits(e.target.value)}
                        />
                        {walletBalance > 0 && bookingPreview ? (
                          <p className="mt-1.5 text-xs text-steel-600">
                            {bookingPreview.creditsApplied > 0 ? (
                              <>
                                {bookingPreview.creditsApplied} credit{bookingPreview.creditsApplied !== 1 ? 's' : ''} = −
                                {formatCurrency(bookingPreview.discountBDT)} → final price{' '}
                                <span className="font-semibold text-navy-900">
                                  {formatCurrency(bookingPreview.finalPriceBDT)}
                                </span>
                              </>
                            ) : (
                              `Up to ${bookingPreview.maxCreditsAllowed} credits usable on this trade (max ${bookingPreview.maxDiscountPercent}% off).`
                            )}
                          </p>
                        ) : (!walletBalance || walletBalance === 0) ? (
                          <p className="mt-1 text-[11px] text-steel-500">
                            Earn credits automatically by completing trades on TradeLink!
                          </p>
                        ) : null}
                      </div>
                    )}

                    {bookingError && <p className="text-xs text-red-600">{bookingError}</p>}
                    <div className="flex gap-2">
                      <Button size="sm" disabled={bookingSubmitting} onClick={() => submitBooking(listing._id)}>
                        {bookingSubmitting ? 'Sending…' : 'Send Proposal'}
                      </Button>
                      <Button size="sm" variant="ghost" disabled={bookingSubmitting} onClick={closeBooking}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button size="sm" fullWidth className="mt-4" onClick={() => openBooking(listing._id)}>
                    Book Session
                  </Button>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );

  if (isDashboard) {
    return (
      <div className="space-y-6 min-w-0 max-w-full">
        <div>
          <span className="eyebrow mb-2">Category Browsing</span>
          <h1 className="text-3xl font-semibold text-slate-950">Browse Skills & Live Prices</h1>
          <p className="mt-2 text-sm text-steel-600">
            Filter active skill listings by category, live Dynamic Valuation price, or keyword.
          </p>
        </div>
        {mainContent}
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full">
      <PageHeader
        eyebrow="Category Browsing"
        title="Browse Skills & Live Prices"
        subtitle="Every category's price adjusts live with supply and demand. Only currently available listings are shown."
      />
      <div className="container-xl py-12 min-w-0 max-w-full">{mainContent}</div>
    </div>
  );
};

export default BrowseSkills;
