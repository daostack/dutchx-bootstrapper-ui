import { Address } from 'services/ArcService';
import { DaoEx } from 'services/DaoService';
import { SchemeInfo } from 'services/SchemeService';

export interface ISchemeDashboardModel {
  friendlyName: string;
  name: string;
  address: Address;
  org: DaoEx;
  orgName: string;
  orgAddress: Address;
}
