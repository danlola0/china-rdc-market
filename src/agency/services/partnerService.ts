import { supabase } from '../../lib/supabase';
import { ShipmentMode, ShipmentStatus } from '../types';

/** Partenariat entre deux agences indépendantes */
export interface Partnership {
  id: string;
  status: 'pending' | 'accepted' | 'declined';
  /** outgoing = demande envoyée par mon agence ; incoming = demande reçue */
  direction: 'outgoing' | 'incoming';
  createdAt: string;
  respondedAt: string | null;
  agencyId: string;
  agencyName: string;
  agencyCity: string;
  agencyCountry: string;
  agencyPhone: string;
  agencyLogo: string;
}

/** Colis confié à mon agence par un partenaire (informations de livraison uniquement) */
export interface PartnerShipment {
  id: string;
  trackingRef: string;
  trackingToken: string;
  description: string;
  customerName: string;
  weightKg: number;
  volumeCbm: number;
  packages: number;
  mode: ShipmentMode;
  originCity: string;
  destinationCity: string;
  status: ShipmentStatus;
  createdAt: string;
  updatedAt: string;
  fromAgencyName: string;
  fromAgencyPhone: string;
  events: { status: ShipmentStatus; note: string; actorName: string; createdAt: string }[];
}

const check = <T,>(res: { data: T; error: any }): T => {
  if (res.error) throw res.error;
  return res.data;
};

export const listPartnerships = async (agencyId: string): Promise<Partnership[]> =>
  (check(await supabase.rpc('list_partnerships', { p_agency: agencyId })) as Partnership[]) || [];

export const requestPartnership = async (agencyId: string, code: string): Promise<string> =>
  check(await supabase.rpc('request_partnership', { p_agency: agencyId, p_code: code })) as string;

export const respondPartnership = async (id: string, accept: boolean) => {
  check(await supabase.rpc('respond_partnership', { p_id: id, p_accept: accept }));
};

export const endPartnership = async (id: string) => {
  check(await supabase.rpc('end_partnership', { p_id: id }));
};

export const listPartnerShipments = async (agencyId: string): Promise<PartnerShipment[]> =>
  (check(await supabase.rpc('partner_shipments', { p_agency: agencyId })) as PartnerShipment[]) || [];

export const partnerUpdateStatus = async (shipmentId: string, status: ShipmentStatus, note: string) => {
  check(await supabase.rpc('partner_update_shipment_status', { p_shipment: shipmentId, p_status: status, p_note: note }));
};
