import { EventAggregator } from 'aurelia-event-aggregator';
import { SchemeDashboardModel } from 'schemeDashboards/schemeDashboardModel';
import { DaoEx } from 'services/DaoService';
import { IDisposable } from 'services/IDisposable';
import { SchemeInfo } from '../services/SchemeService';

export class DaoSchemeDashboard {
  /**
   * ready-to-use TruffleContract
   */
  // contract: TruffleContract;
  public address: string;
  public orgAddress: string;
  /**
   * Pretty name
   */
  public friendlyName: string;
  /**
   * short name (used by ArcService.getContract())
   */
  public name: string;
  public org: DaoEx;
  public orgName: string;

  public activate(model: SchemeDashboardModel) {
    this.friendlyName = model.friendlyName;
    this.name = model.name;
    this.address = model.address;
    this.org = model.org;
    this.orgName = model.orgName;
    this.orgAddress = model.orgAddress;
  }
}
