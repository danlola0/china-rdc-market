import { fromRow, supabase, toRow } from '../../lib/supabase';
import {
  AgencyActivity,
  AgencyBranch,
  AgencyCustomer,
  AgencyExpense,
  AgencyIncome,
  AgencyInvoice,
  AgencyMember,
  AgencySettings,
  AgencyShipment,
  AgencyShipmentEvent,
} from '../types';

/**
 * Couche d'accès aux données de l'espace agence (Supabase).
 *
 * Le filtre par agencyId ci-dessous sert à charger la bonne agence ; la vraie barrière
 * est côté serveur : les règles RLS (supabase/migrations) refusent toute ligne d'une
 * agence dont l'utilisateur n'est pas membre, ou une action que son rôle n'autorise pas.
 */

export interface TableRowMap {
  agency_members: AgencyMember;
  agency_customers: AgencyCustomer;
  agency_expenses: AgencyExpense;
  agency_incomes: AgencyIncome;
  agency_invoices: AgencyInvoice;
  agency_shipments: AgencyShipment;
  agency_shipment_events: AgencyShipmentEvent;
  agency_settings: AgencySettings;
  agency_activity: AgencyActivity;
  agency_branches: AgencyBranch;
}

export type TableName = keyof TableRowMap;

export interface AgencyDataService {
  list<T extends TableName>(table: T, agencyId: string): Promise<TableRowMap[T][]>;
  listMembershipsForProfile(profileId: string): Promise<AgencyMember[]>;
  insert<T extends TableName>(table: T, row: TableRowMap[T]): Promise<TableRowMap[T]>;
  update<T extends TableName>(table: T, agencyId: string, id: string, patch: Partial<TableRowMap[T]>): Promise<TableRowMap[T]>;
  remove<T extends TableName>(table: T, agencyId: string, id: string): Promise<void>;
  createAgency(input: { name: string; city: string; email: string; phone: string; description: string; ownerName: string }): Promise<string>;
}

// agency_settings n'a pas de colonne id : sa clé est agency_id (le frontend expose id = agencyId)
const keyColumn = (table: TableName) => (table === 'agency_settings' ? 'agency_id' : 'id');

const toEntity = <T,>(table: TableName, row: Record<string, any>): T => {
  const entity = fromRow<any>(row);
  if (table === 'agency_settings') entity.id = entity.agencyId;
  return entity as T;
};

// Colonnes d'agency_settings modifiables uniquement par l'administrateur (fonction admin_set_subscription)
const SETTINGS_ADMIN_ONLY = ['id', 'plan', 'subscriptionStatus', 'subscriptionExpiresAt', 'subscriptionNote', 'subscriptionEndsAt', 'trialEndsAt'];

// Numéro et date de création d'une facture : attribués par la base, jamais envoyés
const INVOICE_READONLY = ['seq', 'number', 'createdAt'];

const toDbRow = (table: TableName, obj: Record<string, any>) =>
  toRow(obj, table === 'agency_settings' ? SETTINGS_ADMIN_ONLY : table === 'agency_invoices' ? INVOICE_READONLY : []);

const check = <T,>(res: { data: T; error: any }): T => {
  if (res.error) throw res.error;
  return res.data;
};

export const supabaseAgencyService: AgencyDataService = {
  async list(table, agencyId) {
    const rows = check(await supabase.from(table).select('*').eq('agency_id', agencyId));
    return (rows || []).map((r: any) => toEntity(table, r));
  },

  async listMembershipsForProfile(profileId) {
    const rows = check(await supabase.from('agency_members').select('*').eq('profile_id', profileId));
    return (rows || []).map((r: any) => toEntity<AgencyMember>('agency_members', r));
  },

  async insert(table, row) {
    const data: any = check(await supabase.from(table).insert(toDbRow(table, row as any)).select().single());
    return toEntity(table, data);
  },

  async update(table, agencyId, id, patch) {
    const data: any = check(
      await supabase
        .from(table)
        .update(toDbRow(table, { ...(patch as any), agencyId: undefined }))
        .eq(keyColumn(table), id)
        .eq('agency_id', agencyId)
        .select()
        .single()
    );
    return toEntity(table, data);
  },

  async remove(table, agencyId, id) {
    const { error, count } = await supabase
      .from(table)
      .delete({ count: 'exact' })
      .eq(keyColumn(table), id)
      .eq('agency_id', agencyId);
    if (error) throw error;
    if (count === 0) throw new Error('Suppression refusée ou élément introuvable.');
  },

  async createAgency(input) {
    const id = check(
      await supabase.rpc('create_agency', {
        p_name: input.name,
        p_city: input.city,
        p_email: input.email,
        p_phone: input.phone,
        p_description: input.description,
        p_owner_name: input.ownerName,
      })
    );
    return id as string;
  },
};

export const agencyService: AgencyDataService = supabaseAgencyService;

/** Identifiant unique (UUID, compatible avec les colonnes uuid de la base) */
export const newId = (_prefix?: string) => crypto.randomUUID();
