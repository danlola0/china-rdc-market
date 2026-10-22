import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, Check, ShoppingBag } from 'lucide-react';
import { LOGO_SRC } from './AuthCard';

const Choice: React.FC<{
  to: string;
  icon: React.ElementType;
  title: string;
  who: string;
  points: string[];
  note: string;
  cta: string;
  accent: string;
}> = ({ to, icon: Icon, title, who, points, note, cta, accent }) => (
  <Link
    to={to}
    className="group bg-white rounded-2xl border-2 border-slate-200 hover:border-[#123B70] p-6 flex flex-col transition-colors"
  >
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${accent}`}>
      <Icon className="w-6 h-6" />
    </div>
    <h2 className="mt-4 text-lg font-extrabold text-slate-900">{title}</h2>
    <p className="mt-1 text-xs text-slate-500">{who}</p>
    <ul className="mt-4 space-y-2 text-xs text-slate-700 flex-1">
      {points.map((p) => (
        <li key={p} className="flex gap-2">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" /> {p}
        </li>
      ))}
    </ul>
    <p className="mt-4 text-[11px] text-slate-500 p-2.5 bg-slate-50 rounded-lg">{note}</p>
    <span className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#123B70] group-hover:bg-[#0c274c] text-white text-sm font-semibold">
      {cta} <ArrowRight className="w-4 h-4" />
    </span>
  </Link>
);

/** Page de choix : compte acheteur ou compte agence */
export const RegisterChoicePage: React.FC = () => (
  <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
    <div className="text-center">
      <img src={LOGO_SRC} alt="ASEP" className="w-14 h-14 object-contain mx-auto rounded-xl border border-slate-100" />
      <h1 className="mt-3 text-2xl font-extrabold text-slate-900">Créer un compte</h1>
      <p className="mt-1 text-sm text-slate-500">Choisissez le type de compte qui vous correspond.</p>
    </div>

    <div className="mt-8 grid md:grid-cols-2 gap-4">
      <Choice
        to="/auth/register-buyer"
        icon={ShoppingBag}
        accent="bg-blue-50 text-[#123B70]"
        title="Je suis acheteur"
        who="Commerçant, importateur ou entreprise qui achète des produits venant de Chine."
        points={['Demander des devis aux agences', 'Suivre mes commandes jusqu’en RDC', 'Échanger avec les agences', 'Garder mes produits favoris']}
        note="Inscription simple et gratuite : nom, email et mot de passe."
        cta="Créer un compte acheteur"
      />
      <Choice
        to="/auth/register-agency"
        icon={Building2}
        accent="bg-amber-50 text-amber-700"
        title="Je suis une agence"
        who="Agence de sourcing, fournisseur ou transitaire qui vend aux acheteurs de RDC."
        points={['Publier mes articles dans le catalogue', 'Gérer clients, commandes et devis', 'Gérer le fret, les dépenses et mon équipe', 'Rapports et statistiques']}
        note="Inscription rapide. Le RCCM et les autres documents sont facultatifs : ils accélèrent la vérification. Visible après validation par ASEP."
        cta="Créer un compte agence"
      />
    </div>

    <p className="mt-8 text-center text-xs text-slate-500">
      Vous avez déjà un compte ?{' '}
      <Link to="/auth/login" className="font-semibold text-[#123B70] hover:underline">
        Se connecter
      </Link>
    </p>
  </div>
);
