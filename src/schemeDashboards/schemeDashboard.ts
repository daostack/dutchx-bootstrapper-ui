import { ISchemeDashboardModel } from 'schemeDashboards/schemeDashboardModel';
import { DaoEx } from 'services/DaoService';

export class DaoSchemeDashboard {
  protected address: string;
  protected orgAddress: string;
  /**
   * Pretty name
   */
  protected friendlyName: string;
  /**
   * short name (used by ArcService.getContract())
   */
  protected name: string;
  protected org: DaoEx;
  protected orgName: string;
  protected blockNumber: number;

  protected activate(model: ISchemeDashboardModel) {
    this.friendlyName = model.friendlyName;
    this.name = model.name;
    this.address = model.address;
    this.org = model.org;
    this.orgName = model.orgName;
    this.orgAddress = model.orgAddress;
    this.blockNumber = model.blockNumber;
  }
}
