import React, { useRef, useState } from 'react';
import { Copy, ImagePlus, Plus, X } from 'lucide-react';
import { NumberInput } from '../../components/common/NumberInput';
import { useApp } from '../../context/AppContext';
import { CATEGORIES } from '../../data/referenceData';
import { isInlineImage, uploadProductImage } from '../../lib/productImages';
import { errorMessage } from '../../lib/supabase';
import { useWorkspace } from '../AgencyWorkspaceContext';
import { btn, inputClass, Modal } from '../ui';
import { compressImage } from '../utils';

const PLACEHOLDER_IMAGE = 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80';

interface Row {
  key: number;
  name: string;
  category: string;
  priceMin: string;
  priceMax: string;
  moq: string;
  unit: string;
  description: string;
  image: string;
}

let nextKey = 1;
const newRow = (base?: Partial<Row>): Row => ({
  name: '',
  category: CATEGORIES[1].id,
  priceMin: '',
  priceMax: '',
  moq: '1',
  unit: 'pièce',
  description: '',
  image: '',
  ...base,
  // Identifiant toujours nouveau (même pour une ligne dupliquée)
  key: nextKey++,
});

/** Ajout de plusieurs articles en une seule fois (une ligne = un article) */
export const BulkProductsModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { addProduct, addToast } = useApp();
  const { activeAgency, logActivity } = useWorkspace();
  const [rows, setRows] = useState<Row[]>(() => [newRow(), newRow(), newRow()]);
  const [progress, setProgress] = useState('');
  const fileInputs = useRef<Record<number, HTMLInputElement | null>>({});

  React.useEffect(() => {
    if (open) setRows([newRow(), newRow(), newRow()]);
  }, [open]);

  const set = (key: number, patch: Partial<Row>) => setRows((cur) => cur.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const filled = rows.filter((r) => r.name.trim());

  const onImage = async (key: number, file?: File) => {
    if (!file) return;
    try {
      set(key, { image: await compressImage(file, 800) });
    } catch (err: any) {
      addToast(err.message, 'error');
    }
  };

  const publish = async () => {
    if (!activeAgency || !filled.length || progress) return;
    let ok = 0;
    const failed: string[] = [];
    for (const [i, r] of filled.entries()) {
      setProgress(`Publication ${i + 1} / ${filled.length}…`);
      try {
        const priceMin = parseFloat(r.priceMin) || 0;
        const priceMax = Math.max(priceMin, parseFloat(r.priceMax) || priceMin);
        const image = r.image && isInlineImage(r.image) ? await uploadProductImage(activeAgency.id, r.image) : r.image || PLACEHOLDER_IMAGE;
        const created = await addProduct(
          {
            name: r.name.trim(),
            category: r.category,
            priceMin,
            priceMax,
            moq: parseInt(r.moq) || 1,
            unit: r.unit || 'pièce',
            description: r.description,
            shortDesc: r.description.slice(0, 80),
            images: [image],
            agencyId: activeAgency.id,
            agencyName: activeAgency.name,
            agencyCity: activeAgency.city,
          },
          { silent: true }
        );
        if (created) ok++;
        else failed.push(r.name);
      } catch (err) {
        failed.push(`${r.name} (${errorMessage(err)})`);
      }
    }
    setProgress('');
    if (ok) {
      logActivity('products', `a publié ${ok} article(s) en une fois`);
      addToast(`${ok} article(s) publié(s) au catalogue.`, 'success');
    }
    if (failed.length) {
      addToast(`Non publié(s) : ${failed.join(', ')}`, 'error');
      // On garde à l'écran les lignes qui ont échoué
      setRows((cur) => cur.filter((r) => failed.some((f) => f.startsWith(r.name))));
    } else {
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      title="Ajouter plusieurs articles"
      onClose={onClose}
      size="xl"
      footer={
        <>
          <span className="mr-auto self-center text-[11px] text-slate-500">{filled.length} article(s) prêt(s) — seules les lignes avec un nom sont publiées</span>
          <button className={btn.secondary} onClick={onClose} disabled={!!progress}>
            Annuler
          </button>
          <button className={btn.primary} onClick={publish} disabled={!filled.length || !!progress}>
            {progress || `Publier ${filled.length || ''} article(s)`}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={r.key} className="rounded-xl border border-slate-200 p-3 grid grid-cols-[64px_1fr] gap-3">
            {/* Photo */}
            <button
              type="button"
              onClick={() => fileInputs.current[r.key]?.click()}
              className="w-16 h-16 rounded-lg border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center overflow-hidden cursor-pointer hover:border-[#123B70]"
              title="Ajouter une photo"
            >
              {r.image ? <img src={r.image} alt="" className="w-full h-full object-cover" /> : <ImagePlus className="w-5 h-5 text-slate-400" />}
            </button>
            <input
              ref={(el) => {
                fileInputs.current[r.key] = el;
              }}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                onImage(r.key, e.target.files?.[0]);
                e.target.value = '';
              }}
            />

            <div className="space-y-2 min-w-0">
              <div className="flex gap-2">
                <input
                  className={`${inputClass} flex-1 min-w-0 font-semibold`}
                  value={r.name}
                  onChange={(e) => set(r.key, { name: e.target.value })}
                  placeholder={`Article ${i + 1} : nom`}
                  aria-label={`Nom de l’article ${i + 1}`}
                />
                <button type="button" className={btn.icon} title="Dupliquer la ligne" onClick={() => setRows((cur) => [...cur.slice(0, i + 1), newRow({ ...r, name: '' }), ...cur.slice(i + 1)])}>
                  <Copy className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  className={btn.icon}
                  title="Retirer la ligne"
                  onClick={() => setRows((cur) => (cur.length > 1 ? cur.filter((x) => x.key !== r.key) : [newRow()]))}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <select className={`${inputClass} col-span-2`} value={r.category} onChange={(e) => set(r.key, { category: e.target.value })} aria-label="Catégorie">
                  {CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <NumberInput className={inputClass} value={r.priceMin} onChange={(v) => set(r.key, { priceMin: v })} placeholder="Prix min $" aria-label="Prix minimum (USD)" />
                <NumberInput className={inputClass} value={r.priceMax} onChange={(v) => set(r.key, { priceMax: v })} placeholder="Prix max $" aria-label="Prix maximum (USD)" />
                <div className="flex gap-1">
                  <NumberInput decimals={false} className={`${inputClass} w-16`} value={r.moq} onChange={(v) => set(r.key, { moq: v })} placeholder="MOQ" aria-label="Quantité minimum" />
                  <input className={`${inputClass} min-w-0`} value={r.unit} onChange={(e) => set(r.key, { unit: e.target.value })} placeholder="unité" aria-label="Unité" />
                </div>
              </div>
              <input className={inputClass} value={r.description} onChange={(e) => set(r.key, { description: e.target.value })} placeholder="Description (facultatif)" aria-label="Description" />
            </div>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btn.secondary} onClick={() => setRows((cur) => [...cur, newRow()])}>
            <Plus className="w-4 h-4" /> Ajouter une ligne
          </button>
          <button type="button" className={btn.secondary} onClick={() => setRows((cur) => [...cur, newRow(), newRow(), newRow(), newRow(), newRow()])}>
            <Plus className="w-4 h-4" /> 5 lignes de plus
          </button>
        </div>
        <p className="text-[11px] text-slate-500">
          Astuce : « Dupliquer » recopie la catégorie, les prix et l’unité d’une ligne — pratique pour plusieurs variantes d’un même produit. Vous pourrez compléter chaque article ensuite
          avec « Modifier ».
        </p>
      </div>
    </Modal>
  );
};
