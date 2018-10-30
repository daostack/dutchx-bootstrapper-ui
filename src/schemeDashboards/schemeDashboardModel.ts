import { Address } from 'services/ArcService';
import { SchemeInfo } from 'services/SchemeService';
import { DaoEx } from 'services/DaoService';

export interface SchemeDashboardModel {
  friendlyName: string;
  name: string;
  address: Address;
  org: DaoEx;
  orgName: string;
  orgAddress: Address;
}
