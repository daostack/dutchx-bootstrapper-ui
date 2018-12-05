import { autoinject, computedFrom } from 'aurelia-framework';
import { Locking4Reputation } from 'schemeDashboards/Locking4Reputation';
import { SchemeDashboardModel } from 'schemeDashboards/schemeDashboardModel';
import { ExternalLocking4ReputationWrapper, LockInfo } from '@daostack/arc.js';
import { BindingSignaler } from "aurelia-templating-resources";
import { EventAggregator } from "aurelia-event-aggregator";
import { Web3Service } from "services/Web3Service";
import { App } from 'app';

@autoinject
export class ExternalLocking4ReputationDashboard extends Locking4Reputation {

  alreadyLocked: boolean;
  protected wrapper: ExternalLocking4ReputationWrapper;
  intervalId: any;
  msUntilCanLock: number;
  msCanStillLock: number;

  constructor(
    private signaler: BindingSignaler
    , eventAggregator: EventAggregator
    , web3Service: Web3Service
  ) {
    super(eventAggregator, web3Service);
  }

  async activate(model: SchemeDashboardModel) {
    this.intervalId = setInterval(() => { this.signaler.signal('mgnLockingCountdown'); }, 1000);
    return super.activate(model);
  }

  deactivate() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  protected async refresh() {
    return super.refresh().then(() => {
      // this.lockingStartTime = new Date(new Date().getTime() + 10000);
      // this.lockingEndTime = new Date(this.lockingStartTime.getTime() + 10000);
      this.msUntilCanLockCountdown();
      this.msRemainingInPeriodCountdown();
    });
  }

  @computedFrom("msUntilCanLock")
  get isYetToLock(): boolean {
    return this.msUntilCanLock > 0;
  }

  @computedFrom("isYetToLock", "msCanStillLock")
  get canLock(): boolean {
    return !this.isYetToLock && (this.msCanStillLock > 0);
  }

  msUntilCanLockCountdown(): number {
    return this.msUntilCanLock = this.lockingStartTime.getTime() - Date.now();
  }

  msRemainingInPeriodCountdown(): number {
    return this.msCanStillLock = this.lockingEndTime.getTime() - Date.now();
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
