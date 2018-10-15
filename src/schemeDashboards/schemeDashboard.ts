import { SchemeInfo } from "../services/SchemeService";
import { SchemeDashboardModel } from 'schemeDashboards/schemeDashboardModel';
import { DaoEx } from 'services/DaoService';

export class DaoSchemeDashboard {
  /**
   * ready-to-use TruffleContract
   */
  // contract: TruffleContract;
  address: string;
  orgAddress: string;
  /**
   * Pretty name
   */
  friendlyName: string;
  /**
   * short name (used by ArcService.getContract())
   */
  name: string;
  org: DaoEx;
  orgName: string;
  allSchemes: Array<SchemeInfo>;

  activate(model: SchemeDashboardModel) {
    this.friendlyName = model.friendlyName;
    this.name = model.name;
    this.address = model.address;
    this.org = model.org;
    this.orgName = model.orgName;
    this.orgAddress = model.orgAddress;
    this.allSchemes = model.allSchemes;
  }
}
