import { AureliaConfiguration } from 'aurelia-configuration';
import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject, computedFrom } from 'aurelia-framework';
import { ILockInfoX } from 'resources/customElements/locksForReputation/locksForReputation';
import { ISchemeDashboardModel } from 'schemeDashboards/schemeDashboardModel';
import { DisposableCollection } from 'services/DisposableCollection';
import { LockService } from 'services/lockServices';
import { EventConfigException, EventConfigFailure, EventConfigTransaction } from '../entities/GeneralEvents';
import {
  Address,
  ArcTransactionResult,
  LockerInfo,
  LockInfo,
  Locking4ReputationWrapper,
  LockingOptions,
  TransactionReceiptTruffle,
  WrapperService
} from '../services/ArcService';
import { Web3Service } from '../services/Web3Service';
import { DaoSchemeDashboard } from './schemeDashboard';
// import { App } from 'app';

@autoinject
export abstract class Locking4Reputation extends DaoSchemeDashboard {

  @computedFrom('lockingPeriodHasNotStarted', 'lockingPeriodIsEnded')
  protected get inLockingPeriod(): boolean {
    return !this.lockingPeriodHasNotStarted && !this.lockingPeriodIsEnded;
  }
  protected lockingStartTime: Date;
  protected lockingEndTime: Date;
  protected lockingPeriodHasNotStarted: boolean;
  protected lockingPeriodIsEnded: boolean;
  protected msUntilCanLockCountdown: number;
  protected msRemainingInPeriodCountdown: number;
  protected refreshing: boolean = false;
  protected loaded: boolean = false;
  protected lockerInfo: LockerInfo;
  protected subscriptions = new DisposableCollection();
  protected locks: Array<ILockInfoX>;
  protected locking: boolean = false;
  protected releasing: boolean = false;
  protected sending: boolean = false;

  protected lockModel: LockingOptions = {
    amount: undefined,
    lockerAddress: undefined,
    period: undefined,
  };

  protected wrapper: Locking4ReputationWrapper;
  protected lockService: LockService;

  constructor(
    protected appConfig: AureliaConfiguration,
    protected eventAggregator: EventAggregator,
    protected web3Service: Web3Service
  ) {
    super();
  }

  public async activate(model: ISchemeDashboardModel) {
    this.wrapper = await WrapperService.factories[model.name].at(model.address);
    return super.activate(model);
  }

  public async attached() {

    await this.refresh();

    this.subscriptions.push(this.eventAggregator.subscribe('Network.Changed.Account', (account: Address) => {
      this.accountChanged(account);
    }));

    this.subscriptions.push(this.eventAggregator.subscribe('secondPassed', async (blockDate: Date) => {
      if (this.org) {
        this.getLockingPeriodIsEnded(blockDate);
        this.getLockingPeriodHasNotStarted(blockDate);
        this.getMsUntilCanLockCountdown(blockDate);
        this.getMsRemainingInPeriodCountdown(blockDate);
      }
    }));
  }

  public detached() {
    this.subscriptions.dispose();
  }

  protected async refresh() {
    this.refreshing = true;
    this.loaded = false;

    this.lockingStartTime = await this.wrapper.getLockingStartTime();
    this.lockingEndTime = await this.wrapper.getLockingEndTime();

    await this.accountChanged(this.web3Service.defaultAccount);
    this.refreshing = false;
    this.loaded = true;
  }

  protected accountChanged(account: Address) {
    this.lockService = new LockService(this.appConfig, this.wrapper, account);
    this.lockModel.lockerAddress = account;
  }

  protected async getLockBlocker(): Promise<boolean> {

    let reason;

    if (!Number.isInteger(this.lockModel.period)) {
      reason = 'The desired locking period is not expressed as a number of days';
    }

    if (!reason) {
      reason = await this.wrapper.getLockBlocker(this.lockModel);
    }

    if (reason) {
      this.eventAggregator.publish('handleFailure', new EventConfigFailure(`Can't lock: ${reason}`));
      return true;
    }

    return false;
  }

  protected async lock(alreadyCheckedForBlock: boolean = false): Promise<boolean> {

    if (this.locking || this.releasing) {
      return false;
    }

    try {
      this.locking = true;

      if (alreadyCheckedForBlock || !(await this.getLockBlocker())) {

        this.sending = true;
        const result = await (await (this.wrapper as any).lock(this.lockModel)
          .then((tx: ArcTransactionResult) => {
            this.sending = false;
            return tx;
          }))
          .watchForTxMined()
          .then((tx: TransactionReceiptTruffle) => {
            this.getLocks();
            return tx;
          });

        this.eventAggregator.publish('handleTransaction', new EventConfigTransaction(
          `The lock has been recorded`, result.transactionHash));

        this.eventAggregator.publish('Lock.Submitted');

        return true;
      }

    } catch (ex) {
      this.eventAggregator.publish('handleException', new EventConfigException(`The lock was not recorded`, ex));
    } finally {
      this.locking = false;
      this.sending = false;
    }

    return false;
  }

  protected async release(lock: { lock: LockInfo }): Promise<boolean> {
    const lockInfo = lock.lock;

    if (this.locking || this.releasing) {
      return false;
    }

    try {

      this.releasing = true;

      const result = await (await (this.wrapper as any).release(lockInfo)).watchForTxMined();

      this.eventAggregator.publish('handleTransaction',
        new EventConfigTransaction('The lock has been released', result.transactionHash));

      lockInfo.released = true;

      this.eventAggregator.publish('Lock.Released');

      return true;

    } catch (ex) {
      this.eventAggregator.publish('handleException',
        new EventConfigException(`The lock was not released`, ex));
    } finally {
      this.releasing = false;
    }
    return false;
  }

  protected abstract getLockUnit(lockInfo: LockInfo): Promise<string>;

  protected async getLocks(): Promise<void> {

    const locks = await this.lockService.getUserLocks();

    /**
     * The symbol is for the LocksForReputation table
     */
    for (const lock of locks) {
      (lock as ILockInfoX).units = await this.getLockUnit(lock as LockInfo);
    }

    this.locks = locks as Array<ILockInfoX>;
  }

  private getLockingPeriodHasNotStarted(blockDate: Date): boolean {
    return this.lockingPeriodHasNotStarted = (blockDate < this.lockingStartTime);
  }

  private getLockingPeriodIsEnded(blockDate: Date): boolean {
    return this.lockingPeriodIsEnded = (blockDate > this.lockingEndTime);
  }

  private getMsUntilCanLockCountdown(_blockDate: Date): number {
    return this.msUntilCanLockCountdown = Math.max(this.lockingStartTime.getTime() - Date.now(), 0);
  }

  private getMsRemainingInPeriodCountdown(_blockDate: Date): number {
    return this.msRemainingInPeriodCountdown = Math.max(this.lockingEndTime.getTime() - Date.now(), 0);
  }
}
