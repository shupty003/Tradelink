/**
 * pages/MySkills/index.jsx — Skill Listing Profiles (manage my listings)
 *
 * Lets a member create and manage the skills they offer: title,
 * description, and a category (one of the seeded valuation-engine
 * categories, or a free-text "Other"). There's no price field — cost is
 * never user-set, it's always the category's live price from the Dynamic
 * Valuation Engine.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import api from '../../services/api';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { ROUTES } from '../../constants';

import { useToast } from '../../context/ToastContext';

const EMPTY_FORM = { title: '', description: '', category: '', customCategoryName: '' };

const CategorySelect = ({ id, categories, value, onChange }) => (
  <select id={id} name="category" className="input-base" value={value} onChange={onChange} required>
    <option value="" disabled>
      Select a category…
    </option>
    {categories.map(cat => (
      <option key={cat.slug} value={cat.slug}>
        {cat.name}
      </option>
    ))}
    <option value="other">Other (not listed)</option>
  </select>
);

const StatusBadge = ({ status }) => (
  <Badge color={status === 'active' ? 'green' : 'gray'}>{status === 'active' ? 'Active' : 'Inactive'}</Badge>
);

const EMPTY_WANT_FORM = { category: '', customCategoryName: '', notes: '' };

const MySkills = () => {
  const { addToast } = useToast();
  const [categories, setCategories] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  // ─── Wants (Multi-Party Trade Chains) ────────────────────────────────────
  const [wants, setWants] = useState([]);
  const [wantsLoading, setWantsLoading] = useState(true);
  const [wantForm, setWantForm] = useState(EMPTY_WANT_FORM);
  const [wantFormError, setWantFormError] = useState('');
  const [wantSubmitting, setWantSubmitting] = useState(false);
  const [wantBusyId, setWantBusyId] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [rowError, setRowError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const loadAll = () => {
    setLoading(true);
    Promise.all([api.get('/valuations'), api.get('/skill-listings/mine')])
      .then(([catRes, listingRes]) => {
        setCategories(catRes.data.data);
        setListings(listingRes.data.data);
      })
      .catch(() => {
        setCategories([]);
        setListings([]);
      })
      .finally(() => setLoading(false));
  };

  const loadWants = () => {
    setWantsLoading(true);
    api
      .get('/wants/mine')
      .then(res => setWants(res.data.data))
      .catch(() => setWants([]))
      .finally(() => setWantsLoading(false));
  };

  useEffect(() => {
    loadAll();
    loadWants();
  }, []);

  const categoryName = slug => {
    if (slug === 'other') return 'Other';
    return categories.find(c => c.slug === slug)?.name || slug;
  };

  // ─── Wants: create / delete ──────────────────────────────────────────────

  const handleWantFormChange = e => {
    const { name, value } = e.target;
    setWantForm(prev => ({ ...prev, [name]: value }));
    setWantFormError('');
  };

  const handleWantSubmit = async e => {
    e.preventDefault();
    setWantFormError('');

    if (!wantForm.category) {
      setWantFormError('Category is required.');
      return;
    }
    if (wantForm.category === 'other' && !wantForm.customCategoryName.trim()) {
      setWantFormError("Please name the skill category since it isn't in the list.");
      return;
    }

    setWantSubmitting(true);
    try {
      await api.post('/wants', {
        category: wantForm.category,
        customCategoryName: wantForm.category === 'other' ? wantForm.customCategoryName.trim() : undefined,
        notes: wantForm.notes.trim(),
      });
      setWantForm(EMPTY_WANT_FORM);
      addToast('Added to what you\'re looking for!', 'success');
      loadWants();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to add. Please try again.';
      setWantFormError(msg);
      addToast(msg, 'error');
    } finally {
      setWantSubmitting(false);
    }
  };

  const deleteWant = async want => {
    setWantBusyId(want._id);
    try {
      await api.delete(`/wants/${want._id}`);
      addToast('Removed', 'info');
      loadWants();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to remove.', 'error');
    } finally {
      setWantBusyId(null);
    }
  };

  // ─── Create ───────────────────────────────────────────────────────────────

  const handleFormChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setFormError('');
  };

  const handleCreateSubmit = async e => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!form.title.trim() || !form.description.trim() || !form.category) {
      setFormError('Title, description and category are required.');
      return;
    }
    if (form.category === 'other' && !form.customCategoryName.trim()) {
      setFormError("Please name the skill category since it isn't in the list.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/skill-listings', {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        customCategoryName: form.category === 'other' ? form.customCategoryName.trim() : undefined,
      });
      setForm(EMPTY_FORM);
      setFormSuccess('Skill listing created.');
      addToast('Skill listing created successfully!', 'success');
      loadAll();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create listing. Please try again.';
      setFormError(msg);
      addToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Edit ─────────────────────────────────────────────────────────────────

  const startEdit = listing => {
    setEditingId(listing._id);
    setRowError('');
    setEditForm({
      title: listing.title,
      description: listing.description,
      category: listing.category,
      customCategoryName: listing.customCategoryName || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setRowError('');
  };

  const handleEditChange = e => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const saveEdit = async id => {
    setRowError('');
    if (!editForm.title.trim() || !editForm.description.trim() || !editForm.category) {
      setRowError('Title, description and category are required.');
      return;
    }
    if (editForm.category === 'other' && !editForm.customCategoryName.trim()) {
      setRowError("Please name the skill category since it isn't in the list.");
      return;
    }

    setBusyId(id);
    try {
      await api.patch(`/skill-listings/${id}`, {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        category: editForm.category,
        customCategoryName: editForm.category === 'other' ? editForm.customCategoryName.trim() : undefined,
      });
      setEditingId(null);
      addToast('Skill listing updated successfully!', 'success');
      loadAll();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update listing.';
      setRowError(msg);
      addToast(msg, 'error');
    } finally {
      setBusyId(null);
    }
  };

  // ─── Status toggle / delete ─────────────────────────────────────────────

  const toggleStatus = async listing => {
    setRowError('');
    setBusyId(listing._id);
    const nextStatus = listing.status === 'active' ? 'inactive' : 'active';
    try {
      await api.patch(`/skill-listings/${listing._id}`, {
        status: nextStatus,
      });
      addToast(`Listing status updated to ${nextStatus}`, 'info');
      loadAll();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update listing status.';
      setRowError(msg);
      addToast(msg, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const deleteListing = async listing => {
    if (!window.confirm(`Delete "${listing.title}"? This can't be undone.`)) return;

    setRowError('');
    setBusyId(listing._id);
    try {
      await api.delete(`/skill-listings/${listing._id}`);
      addToast('Listing deleted successfully', 'info');
      loadAll();
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete listing.';
      setRowError(msg);
      addToast(msg, 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <span className="eyebrow mb-2">Skill Listing Profiles</span>
        <h1 className="text-3xl font-semibold text-slate-950">My Skills</h1>
        <p className="mt-2 text-sm text-steel-600">
          List the skills you offer. Prices shown live are set by the Dynamic Valuation Engine based on
          current supply and demand for each category.
        </p>
      </div>

      {/* ── Create Form ─────────────────────────────────────────────── */}
      <Card className="p-5 sm:p-6">
        <h2 className="text-base font-semibold text-slate-950">Add a new skill</h2>

        {formError && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {formError}
          </div>
        )}
        {formSuccess && (
          <div className="mt-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {formSuccess}
          </div>
        )}

        <form className="mt-4 space-y-4" onSubmit={handleCreateSubmit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="listing-title" className="mb-1.5 block text-sm font-medium text-steel-700">
                Title
              </label>
              <input
                id="listing-title"
                name="title"
                type="text"
                placeholder="e.g. Algebra Tutoring"
                className="input-base"
                value={form.title}
                onChange={handleFormChange}
                maxLength={100}
                required
              />
            </div>

            <div>
              <label htmlFor="listing-category" className="mb-1.5 block text-sm font-medium text-steel-700">
                Category
              </label>
              <CategorySelect
                id="listing-category"
                categories={categories}
                value={form.category}
                onChange={handleFormChange}
              />
            </div>
          </div>

          {form.category === 'other' && (
            <div>
              <label htmlFor="listing-custom-category" className="mb-1.5 block text-sm font-medium text-steel-700">
                Skill name (since it isn't in the list)
              </label>
              <input
                id="listing-custom-category"
                name="customCategoryName"
                type="text"
                placeholder="e.g. Falconry"
                className="input-base"
                value={form.customCategoryName}
                onChange={handleFormChange}
                maxLength={100}
                required
              />
            </div>
          )}

          <div>
            <label htmlFor="listing-description" className="mb-1.5 block text-sm font-medium text-steel-700">
              Description
            </label>
            <textarea
              id="listing-description"
              name="description"
              rows={3}
              placeholder="What do you offer? Any relevant experience?"
              className="input-base"
              value={form.description}
              onChange={handleFormChange}
              maxLength={1000}
              required
            />
          </div>

          <Button id="listing-submit-btn" type="submit" disabled={submitting}>
            {submitting ? 'Adding…' : 'Add Skill Listing'}
          </Button>
        </form>
      </Card>

      {/* ── Listings ─────────────────────────────────────────────────── */}
      <section className="surface-card overflow-hidden">
        <div className="border-b border-concrete-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-950">Your Listings</h2>
          <p className="mt-1 text-sm text-steel-600">Active listings count as supply in the valuation engine.</p>
        </div>

        {rowError && (
          <div className="mx-5 mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {rowError}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-steel-500">Loading listings…</div>
        ) : listings.length === 0 ? (
          <div className="py-16 text-center text-sm text-steel-500">
            You haven't listed any skills yet — add one above.
          </div>
        ) : (
          <div className="divide-y divide-concrete-200">
            {listings.map(listing => {
              const isEditing = editingId === listing._id;
              const isBusy = busyId === listing._id;

              if (isEditing) {
                return (
                  <div key={listing._id} className="space-y-4 px-5 py-5">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <input
                        name="title"
                        type="text"
                        className="input-base"
                        value={editForm.title}
                        onChange={handleEditChange}
                        maxLength={100}
                      />
                      <CategorySelect
                        id={`edit-category-${listing._id}`}
                        categories={categories}
                        value={editForm.category}
                        onChange={handleEditChange}
                      />
                    </div>
                    {editForm.category === 'other' && (
                      <input
                        name="customCategoryName"
                        type="text"
                        placeholder="Skill name"
                        className="input-base"
                        value={editForm.customCategoryName}
                        onChange={handleEditChange}
                        maxLength={100}
                      />
                    )}
                    <textarea
                      name="description"
                      rows={3}
                      className="input-base"
                      value={editForm.description}
                      onChange={handleEditChange}
                      maxLength={1000}
                    />
                    <div className="flex gap-3">
                      <Button size="sm" disabled={isBusy} onClick={() => saveEdit(listing._id)}>
                        {isBusy ? 'Saving…' : 'Save'}
                      </Button>
                      <Button size="sm" variant="ghost" disabled={isBusy} onClick={cancelEdit}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={listing._id}
                  className="grid gap-4 px-5 py-4 md:grid-cols-[1.6fr_1fr_auto] md:items-center"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-950">{listing.title}</p>
                      <StatusBadge status={listing.status} />
                      <Badge color="gray">{categoryName(listing.category)}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-steel-600 line-clamp-2">{listing.description}</p>
                    <p className="mt-1 text-xs text-steel-400">Listed {formatDate(listing.createdAt)}</p>
                  </div>

                  <div>
                    <p className="text-sm text-steel-600">
                      Live rate:{' '}
                      {listing.currentPriceBDT != null ? (
                        <span className="font-semibold text-navy-900">{formatCurrency(listing.currentPriceBDT)}</span>
                      ) : (
                        <span className="text-steel-400">not tracked yet</span>
                      )}
                    </p>
                    <p className="mt-1 text-xs text-steel-400">
                      {listing.currentPriceBDT != null
                        ? 'Set by the Dynamic Valuation Engine'
                        : "This category isn't priced by the valuation engine"}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <Button size="sm" variant="outline" disabled={isBusy} onClick={() => startEdit(listing)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" disabled={isBusy} onClick={() => toggleStatus(listing)}>
                      {listing.status === 'active' ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button size="sm" variant="danger" disabled={isBusy} onClick={() => deleteListing(listing)}>
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Wants (Multi-Party Trade Chains) ────────────────────────────── */}
      <div>
        <span className="eyebrow mb-2">Multi-Party Trade Chains</span>
        <h2 className="text-2xl font-semibold text-slate-950">What I'm Looking For</h2>
        <p className="mt-2 text-sm text-steel-600">
          Add categories you'd like in return. When a direct trade isn't available,{' '}
          <Link to={ROUTES.TRADE_CHAINS} className="font-semibold text-navy-800 hover:underline">
            search for a trade chain
          </Link>{' '}
          that closes the loop through other members.
        </p>
      </div>

      <Card className="p-5 sm:p-6">
        <h3 className="text-base font-semibold text-slate-950">Add something you're looking for</h3>

        {wantFormError && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {wantFormError}
          </div>
        )}

        <form className="mt-4 space-y-4" onSubmit={handleWantSubmit}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="want-category" className="mb-1.5 block text-sm font-medium text-steel-700">
                Category
              </label>
              <CategorySelect
                id="want-category"
                categories={categories}
                value={wantForm.category}
                onChange={handleWantFormChange}
              />
            </div>

            {wantForm.category === 'other' && (
              <div>
                <label htmlFor="want-custom-category" className="mb-1.5 block text-sm font-medium text-steel-700">
                  Skill name (since it isn't in the list)
                </label>
                <input
                  id="want-custom-category"
                  name="customCategoryName"
                  type="text"
                  placeholder="e.g. Falconry"
                  className="input-base"
                  value={wantForm.customCategoryName}
                  onChange={handleWantFormChange}
                  maxLength={100}
                  required
                />
              </div>
            )}
          </div>

          <div>
            <label htmlFor="want-notes" className="mb-1.5 block text-sm font-medium text-steel-700">
              Notes <span className="text-xs text-steel-400">(optional)</span>
            </label>
            <input
              id="want-notes"
              name="notes"
              type="text"
              placeholder="Any specifics about what you're looking for"
              className="input-base"
              value={wantForm.notes}
              onChange={handleWantFormChange}
              maxLength={500}
            />
          </div>

          <Button id="want-submit-btn" type="submit" disabled={wantSubmitting}>
            {wantSubmitting ? 'Adding…' : 'Add to My Wants'}
          </Button>
        </form>
      </Card>

      <section className="surface-card overflow-hidden">
        <div className="border-b border-concrete-200 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-950">What You're Looking For</h3>
        </div>

        {wantsLoading ? (
          <div className="flex items-center justify-center py-10 text-sm text-steel-500">Loading…</div>
        ) : wants.length === 0 ? (
          <div className="py-10 text-center text-sm text-steel-500">
            Nothing added yet — add something above to start finding trade chains.
          </div>
        ) : (
          <div className="divide-y divide-concrete-200">
            {wants.map(want => (
              <div key={want._id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge color="gray">
                      {want.category === 'other' ? want.customCategoryName : categoryName(want.category)}
                    </Badge>
                    {want.notes && <span className="text-sm text-steel-600">{want.notes}</span>}
                  </div>
                  <p className="mt-1 text-xs text-steel-400">Added {formatDate(want.createdAt)}</p>
                </div>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={wantBusyId === want._id}
                  onClick={() => deleteWant(want)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default MySkills;
