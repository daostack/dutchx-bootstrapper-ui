import { AureliaConfiguration } from 'aurelia-configuration';
import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject, computedFrom } from 'aurelia-framework';
import { LockInfoX } from 'resources/customElements/locksForReputation/locksForReputation';
import { ISchemeDashboardModel } from 'schemeDashboards/schemeDashboardModel';
import { DisposableCollection } from 'services/DisposableCollection';
import { LockService } from 'services/lockServices';
import { Utils } from 'services/utils';
import { EventConfigException, EventConfigFailure, EventConfigTransaction } from '../entities/GeneralEvents';
import { Address,
         ArcTransactionResult,
         LockerInfo,
         LockInfo,
         Locking4ReputationWrapper,
         LockingOptions,
         TransactionReceiptTruffle,
         WrapperService } from '../services/ArcService';
import { BigNumber, Web3Service } from '../services/Web3Service';
import { DaoSchemeDashboard } from './schemeDashboard';
// import { App } from 'app';

@autoinject
export abstract class Locking4Reputation extends DaoSchemeDashboard {

  @computedFrom('lockingPeriodHasNotStarted', 'lockingPeriodIsEnded')
  get inLockingPeriod(): boolean {
    return !this.lockingPeriodHasNotStarted && !this.lockingPeriodIsEnded;
  }
  public lockingStartTime: Date;
  public lockingEndTime: Date;
  public lockingPeriodHasNotStarted: boolean;
  public lockingPeriodIsEnded: boolean;
  public msUntilCanLockCountdown: number;
  public msRemainingInPeriodCountdown: number;
  public refreshing: boolean = false;
  public loaded: boolean = false;
  public lockerInfo: LockerInfo;
  public subscriptions = new DisposableCollection();
  public locks: Array<LockInfoX>;
  public intervalId: any;
  public locking: boolean = false;

  public lockModel: LockingOptions = {
    lockerAddress: undefined,
    amount: undefined,
    period: undefined,
  };

  protected wrapper: Locking4ReputationWrapper;
  protected lockService: LockService;

  constructor(
      protected appConfig: AureliaConfiguration
    , protected eventAggregator: EventAggregator
    , protected web3Service: Web3Service,
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
        this.getMsUntilCanLockCountdown();
        this.getMsRemainingInPeriodCountdown();
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

    try {
      this.locking = true;

      if (alreadyCheckedForBlock || !(await this.getLockBlocker())) {

        let result = await ((await (this.wrapper as any).lock(this.lockModel)) as ArcTransactionResult)
          .watchForTxMined()
          .then((tx: TransactionReceiptTruffle) => {
            this.getLocks();
            return tx;
          });

        this.eventAggregator.publish('handleTransaction', new EventConfigTransaction(
          `The lock has been recorded`, result.transactionHash));

        this.eventAggregator.publish('Lock.Submitted');

        this.locking = false;

        return true;
      }

    } catch (ex) {
      this.eventAggregator.publish('handleException', new EventConfigException(`The lock could not be recorded`, ex));
    }

    this.locking = false;
    return false;
  }

  protected async release(lock: { lock: LockInfo }): Promise<boolean> {
    const lockInfo = lock.lock;

    try {

      let result = await (await (this.wrapper as any).release(lockInfo)).watchForTxMined();

      this.eventAggregator.publish('handleTransaction',
      new EventConfigTransaction('The lock has been released', result.tx));

      this.eventAggregator.publish('Lock.Released');

      return true;

    } catch (ex) {
      this.eventAggregator.publish('handleException', \
      new EventConfigException(`The lock could not be released`, ex));
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
      (lock as LockInfoX).units = await this.getLockUnit(lock as LockInfo);
    }

    this.locks = locks as Array<LockInfoX>;
  }

  private getLockingPeriodHasNotStarted(blockDate: Date): boolean {
    return this.lockingPeriodHasNotStarted = (blockDate < this.lockingStartTime);
  }

  private getLockingPeriodIsEnded(blockDate: Date): boolean {
    return this.lockingPeriodIsEnded = (blockDate > this.lockingEndTime);
  }

  private getMsUntilCanLockCountdown(): number {
    return this.msUntilCanLockCountdown = this.lockingStartTime.getTime() - Date.now();
  }

  private getMsRemainingInPeriodCountdown(): number {
    return this.msRemainingInPeriodCountdown = this.lockingEndTime.getTime() - Date.now();
  }
}
