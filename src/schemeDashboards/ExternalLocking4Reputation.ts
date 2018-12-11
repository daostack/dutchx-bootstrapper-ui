import { autoinject } from 'aurelia-framework';
import { Locking4Reputation } from 'schemeDashboards/Locking4Reputation';
import { ExternalLocking4ReputationWrapper, LockInfo } from '@daostack/arc.js';
import { EventAggregator } from "aurelia-event-aggregator";
import { Web3Service } from "services/Web3Service";
import { AureliaConfiguration } from "aurelia-configuration";

@autoinject
export class ExternalLocking4ReputationDashboard extends Locking4Reputation {

  alreadyLocked: boolean;
  protected wrapper: ExternalLocking4ReputationWrapper;
  intervalId: any;

  constructor(
    appConfig: AureliaConfiguration
    , eventAggregator: EventAggregator
    , web3Service: Web3Service
  ) {
    super(appConfig, eventAggregator, web3Service);
  }

  async accountChanged() {
    this.alreadyLocked = await this.wrapper.getAccountHasLocked(this.web3Service.defaultAccount);
    return super.accountChanged();
  }

  protected async lock(): Promise<boolean> {
    const success = await super.lock();
    this.alreadyLocked = success;
    return success;
  }

  // not used
  protected getLockUnit(lockInfo: LockInfo): Promise<string> { return Promise.resolve(""); }

  // protected async redeem(): Promise<boolean> {
  //   const success = await super.redeem();
  //   this.alreadyLocked = !success;
  //   return success;
  // }

}
