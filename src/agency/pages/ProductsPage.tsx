import React, { useMemo, useState } from 'react';
import { NumberInput } from '../../components/common/NumberInput';
import { Link } from 'react-router-dom';
import { Eye, Package, Pencil, Plus, Search, Trash2, Upload } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CATEGORIES } from '../../data/referenceData';
import { Product } from '../../types';
import { useWorkspace } from '../AgencyWorkspaceContext';
import { Badge, btn, ConfirmDialog, EmptyState, Field, inputClass, Modal, PageHeader } from '../ui';
import { compressImage, formatMoney } from '../utils';
import { isInlineImage, uploadProductImage } from '../../lib/productImages';
import { errorMessage } from '../../lib/supabase';

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80';

const emptyForm = {
  name: '',
  category: CATEGORIES[1].id,
  priceMin: '',
  priceMax: '',
  moq: '1',
  unit: 'pièce',
  leadTimeDays: '7',
  description: '',
  image: '',
  inStock: true,
};

export const ProductsPage: React.FC = () => {
  const { addProduct, updateProduct, deleteProduct, addToast } = useApp();
  const { products, activeAgency, can, logActivity } = useWorkspace();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [editing, setEditing] = useState<Product | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [deleting, setDeleting] = useState<Product | null>(null);
  const [saving, setSaving] = useState('');

  const filtered = useMemo(
    () =>
      products.filter(
        (p) =>
          (category === 'all' || p.category === category) &&
          (p.name.toLowerCase().includes(query.toLowerCase()) || p.description.toLowerCase().includes(query.toLowerCase()))
      ),
    [products, query, category]
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name,
      category: p.category,
      priceMin: String(p.priceMin),
      priceMax: String(p.priceMax),
      moq: String(p.moq),
      unit: p.unit,
      leadTimeDays: String(p.leadTimeDays),
      description: p.description,
      image: p.images[0] || '',
      inStock: p.inStock,
    });
    setFormOpen(true);
  };

  const onImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImage(file, 800);
      setForm((f) => ({ ...f, image: dataUrl }));
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAgency || saving) return;
    const priceMin = parseFloat(form.priceMin) || 0;
    const priceMax = Math.max(priceMin, parseFloat(form.priceMax) || priceMin);
    const data: Partial<Product> = {
      name: form.name,
      category: form.category,
      priceMin,
      priceMax,
      moq: parseInt(form.moq) || 1,
      unit: form.unit,
      leadTimeDays: parseInt(form.leadTimeDays) || 7,
      description: form.description,
      shortDesc: form.description.slice(0, 80),
      images: [form.image || PLACEHOLDER_IMAGE],
      inStock: form.inStock,
    };
    if (editing ? !can('products', 'edit') : !can('products', 'create')) return;

    try {
      // La photo est envoyée dans l'espace de stockage d'images : l'article ne garde qu'une adresse courte
      if (form.image && isInlineImage(form.image)) {
        setSaving('Envoi de la photo…');
        data.images = [await uploadProductImage(activeAgency.id, form.image)];
      }
      setSaving(editing ? 'Enregistrement…' : 'Publication…');
      if (editing) {
        await updateProduct(editing.id, data);
        logActivity('products', `a modifié l’article « ${form.name} »`);
        setFormOpen(false);
      } else {
        const created = await addProduct({ ...data, agencyId: activeAgency.id, agencyName: activeAgency.name, agencyCity: activeAgency.city });
        if (created) {
          logActivity('products', `a publié l’article « ${form.name} »`);
          setFormOpen(false);
        }
      }
    } catch (err) {
      addToast(errorMessage(err), 'error');
    } finally {
      setSaving('');
    }
  };

  const toggleStock = (p: Product) => {
    updateProduct(p.id, { inStock: !p.inStock });
    logActivity('products', `a marqué « ${p.name} » ${p.inStock ? 'en rupture' : 'disponible'}`);
  };

  return (
    <>
      <PageHeader
        title="Articles"
        subtitle={`${products.length} article(s) publiés au catalogue de la marketplace`}
        actions={
          can('products', 'create') && (
            <button className={btn.primary} onClick={openCreate}>
              <Plus className="w-4 h-4" />
              Ajouter un article
            </button>
          )
        }
      />

      {activeAgency && activeAgency.verifiedStatus !== 'verified' && activeAgency.verifiedStatus !== 'gold' && (
        <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900">
          <strong>Vos articles sont enregistrés mais pas encore visibles par les acheteurs.</strong> Ils apparaîtront automatiquement dans le
          catalogue dès que votre agence sera validée par ASEP.
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input className={`${inputClass} pl-9`} placeholder="Rechercher un article" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className={`${inputClass} sm:w-64`} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Catégorie">
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title={products.length ? 'Aucun article ne correspond' : 'Aucun article publié'}
            text={products.length ? 'Modifiez la recherche ou le filtre.' : 'Publiez votre premier article pour qu’il apparaisse dans le catalogue.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="p-3 font-semibold">Article</th>
                  <th className="p-3 font-semibold hidden md:table-cell">Catégorie</th>
                  <th className="p-3 font-semibold">Prix FOB</th>
                  <th className="p-3 font-semibold hidden sm:table-cell">MOQ</th>
                  <th className="p-3 font-semibold">Disponibilité</th>
                  <th className="p-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <img src={p.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 truncate max-w-[220px]">{p.name}</div>
                          <div className="text-[11px] text-slate-400">Délai {p.leadTimeDays} j</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-slate-600 hidden md:table-cell">{CATEGORIES.find((c) => c.id === p.category)?.name || p.category}</td>
                    <td className="p-3 tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                      {formatMoney(p.priceMin)} – {formatMoney(p.priceMax)}
                    </td>
                    <td className="p-3 tabular-nums hidden sm:table-cell">
                      {p.moq} {p.unit}
                    </td>
                    <td className="p-3">
                      {can('products', 'edit') ? (
                        <button onClick={() => toggleStock(p)} className="cursor-pointer" title="Changer la disponibilité">
                          <Badge className={p.inStock ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'}>
                            {p.inStock ? 'En stock' : 'Rupture'}
                          </Badge>
                        </button>
                      ) : (
                        <Badge className={p.inStock ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'}>
                          {p.inStock ? 'En stock' : 'Rupture'}
                        </Badge>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <Link to={`/product/${p.id}`} className={btn.icon} title="Voir dans le catalogue">
                          <Eye className="w-4 h-4" />
                        </Link>
                        {can('products', 'edit') && (
                          <button className={btn.icon} onClick={() => openEdit(p)} title="Modifier">
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {can('products', 'delete') && (
                          <button className={btn.icon} onClick={() => setDeleting(p)} title="Supprimer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={formOpen}
        title={editing ? 'Modifier l’article' : 'Nouvel article'}
        onClose={() => setFormOpen(false)}
        size="lg"
        footer={
          <>
            <button className={btn.secondary} onClick={() => setFormOpen(false)}>
              Annuler
            </button>
            <button className={btn.primary} type="submit" form="product-form" disabled={!!saving}>
              {saving || (editing ? 'Enregistrer' : 'Publier l’article')}
            </button>
          </>
        }
      >
        <form id="product-form" onSubmit={submit} className="grid sm:grid-cols-2 gap-4">
          <Field label="Nom de l’article" required className="sm:col-span-2">
            <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Catégorie" required>
            <select className={inputClass} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Unité">
            <input className={inputClass} value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          </Field>
          <Field label="Prix minimum (USD)" required>
            <NumberInput className={inputClass} value={form.priceMin} onChange={(v) => setForm({ ...form, priceMin: v })} required />
          </Field>
          <Field label="Prix maximum (USD)">
            <NumberInput className={inputClass} value={form.priceMax} onChange={(v) => setForm({ ...form, priceMax: v })} />
          </Field>
          <Field label="Quantité minimum (MOQ)" required>
            <NumberInput decimals={false} className={inputClass} value={form.moq} onChange={(v) => setForm({ ...form, moq: v })} required />
          </Field>
          <Field label="Délai de production (jours)">
            <NumberInput decimals={false} className={inputClass} value={form.leadTimeDays} onChange={(v) => setForm({ ...form, leadTimeDays: v })} />
          </Field>
          <Field label="Description" required className="sm:col-span-2">
            <textarea rows={3} className={inputClass} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          </Field>
          <div className="sm:col-span-2 flex items-center gap-4">
            {form.image && <img src={form.image} alt="" className="w-16 h-16 rounded-lg object-cover border border-slate-200" />}
            <label className={`${btn.secondary} cursor-pointer`}>
              <Upload className="w-4 h-4" />
              {form.image ? 'Changer la photo' : 'Ajouter une photo'}
              <input type="file" accept="image/*" className="hidden" onChange={onImage} />
            </label>
            <label className="flex items-center gap-2 ml-auto">
              <input type="checkbox" checked={form.inStock} onChange={(e) => setForm({ ...form, inStock: e.target.checked })} className="accent-[#123B70]" />
              En stock
            </label>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Supprimer l’article"
        text={`« ${deleting?.name} » sera retiré du catalogue de la marketplace.`}
        onClose={() => setDeleting(null)}
        onConfirm={() => {
          if (!deleting) return;
          deleteProduct(deleting.id);
          logActivity('products', `a supprimé l’article « ${deleting.name} »`);
        }}
      />
    </>
  );
};
