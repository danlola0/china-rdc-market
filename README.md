# ASEP MARKET

Marketplace B2B de sourcing direct entre agences en Chine et acheteurs en République Démocratique du Congo.

## Installation en local

**Prérequis :** Node.js 20 ou plus récent.

1. Copiez `.env.example` en `.env.local` et renseignez l'URL et la clé anon du projet Supabase.
2. Installez et lancez :

```bash
npm install
npm run dev
```

L'application est ensuite disponible sur http://localhost:3000.

## Autres commandes

| Commande | Rôle |
|---|---|
| `npm run build` | Construit la version de production dans `dist/` |
| `npm run preview` | Sert localement la version construite |
| `npm run lint` | Vérifie les types TypeScript |
| `firebase deploy --only hosting` | Publie le site sur Firebase Hosting |

## Base de données (Supabase)

Toutes les données (comptes, agences, catalogue, devis, commandes, messagerie, favoris, espace agence)
sont stockées dans Supabase.

- Le schéma (tables, règles d'accès RLS, fonctions) est dans `supabase/migrations/`.
  Pour l'appliquer : `supabase link --project-ref <ref>` puis `supabase db push`.
- Les URL autorisées pour les emails de connexion sont dans `supabase/config.toml`
  (`supabase config push` pour les envoyer au projet).

**Administrateur de la plateforme** : créez votre compte sur le site, puis exécutez dans l'éditeur SQL de Supabase :

```sql
update public.profiles set is_admin = true where email = 'votre@email.com';
```

**Sécurité** : l'isolation entre agences et les permissions par rôle sont imposées par la base
(Row Level Security et fonctions de la migration), pas seulement par l'interface.

## Espace agence (multi-agences, multi-utilisateurs)

Code dans `src/agency/`, monté sous `/agency/*` :

| Fichier | Rôle |
|---|---|
| `types.ts` | Entités, une par table de la base |
| `permissions.ts` | Rôles, modules, actions et permissions par défaut |
| `services/agencyService.ts` | Accès aux tables de l'espace agence |
| `AgencyWorkspaceContext.tsx` | Agence active, membre connecté, permissions et actions |
| `AgencyLayout.tsx`, `pages/` | Barre latérale, sélecteur d'agence et les 11 rubriques |

Un employé invité rejoint l'agence automatiquement quand il se connecte avec l'adresse email de l'invitation.
