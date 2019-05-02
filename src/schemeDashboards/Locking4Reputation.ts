import { AureliaConfiguration } from 'aurelia-configuration';
import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject, computedFrom, View } from 'aurelia-framework';
import { ILocksTableInfo } from 'resources/customElements/locksForReputation/locksForReputation';
import { ISchemeDashboardModel } from 'schemeDashboards/schemeDashboardModel';
import { BalloonService } from 'services/balloonService';
import { DisposableCollection } from 'services/DisposableCollection';
import { LockService } from 'services/lockServices';
import { Utils } from 'services/utils';
import {
  EventConfigException,
  EventConfigFailure,
  EventConfigTransaction,
  EventMessageType
} from '../entities/GeneralEvents';
import {
  Address,
  LockerInfo,
  LockInfo,
  Locking4ReputationWrapper,
  LockingOptions,
  WrapperService
} from '../services/ArcService';
import { Web3Service } from '../services/Web3Service';
import { DaoSchemeDashboard } from './schemeDashboard';

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
  protected locks: Array<ILocksTableInfo>;
  protected _locking: boolean = false;
  protected _releasing: boolean = false;
  protected sending: boolean = false;
  protected myView: JQuery;

  @computedFrom('_locking')
  protected get locking(): boolean {
    return this._locking;
  }

  protected set locking(val: boolean) {
    this._locking = val;
    setTimeout(() => this.eventAggregator.publish('dashboard.busy', val), 0);
  }

  @computedFrom('_releasing')
  protected get releasing(): boolean {
    return this._releasing;
  }

  protected set releasing(val: boolean) {
    this._releasing = val;
    setTimeout(() => this.eventAggregator.publish('dashboard.busy', val), 0);
  }

  protected get lockButton(): HTMLElement {
    return this.myView.find('#lockButton')[0];
  }

  protected lockModel: LockingOptions = {
    amount: undefined,
    legalContractHash: undefined,
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

  public created(owningView: View, _myView: View) {
    this.myView = $((owningView as any).firstChild);
  }

  public async activate(model: ISchemeDashboardModel) {
    this.wrapper = await WrapperService.factories[model.name].at(model.address);
    return super.activate(model);
  }

  public async attached() {

    this.loaded = false;

    try {

      await this.refresh();

      this.subscriptions.push(this.eventAggregator.subscribe('Network.Changed.Account', (account: Address) => {
        this.accountChanged(account);
      }));

      this.subscriptions.push(this.eventAggregator.subscribe('secondPassed', async (blockDate: Date) => {
        this.refreshCounters(blockDate);
      }));
    } finally {
      this.loaded = true;
    }
  }

  public detached() {
    this.subscriptions.dispose();
  }

  protected async refresh() {
    this.refreshing = true;
    this.lockingStartTime = await this.wrapper.getLockingStartTime();
    this.lockingEndTime = await this.wrapper.getLockingEndTime();

    await this.accountChanged(this.web3Service.defaultAccount);
    await this.refreshCounters(await Utils.lastBlockDate(this.web3Service.web3));
    this.refreshing = false;
  }

  protected accountChanged(account: Address) {
    this.lockService = new LockService(this.wrapper, account, this.blockNumber);
    this.lockModel.lockerAddress = account;
  }

  protected refreshCounters(blockDate: Date): void {
    this.getLockingPeriodIsEnded(blockDate);
    this.getLockingPeriodHasNotStarted(blockDate);
    this.getMsUntilCanLockCountdown(blockDate);
    this.getMsRemainingInPeriodCountdown(blockDate);
  }

  protected async getLockBlocker(reason?: string): Promise<boolean> {

    if (!reason) {
      if (!Number.isInteger(this.lockModel.period)) {
        reason = 'The desired locking period is not expressed as a number of days';
      }
      // else {
      //   const maxLockingPeriodDays = this.appConfig.get('maxLockingPeriodDays');
      //   // convert days to seconds
      //   if (this.lockModel.period > (maxLockingPeriodDays * 86400)) {
      //     reason = `Locking period cannot be more than ${maxLockingPeriodDays} days`;
      //   }
      // }
    }

    if (!reason) {
      reason = await this.wrapper.getLockBlocker(this.lockModel);
    }

    if (reason) {
      this.eventAggregator.publish('handleFailure', new EventConfigFailure(`Can't lock: ${reason}`));
      await BalloonService.show({
        content: `Can't lock: ${reason}`,
        eventMessageType: EventMessageType.Failure,
        originatingUiElement: this.lockButton,
      });
      return true;
    }

    return false;
  }

  protected async lock(alreadyCheckedForBlock: boolean = false): Promise<boolean> {

    if (this.locking || this.releasing) {
      return false;
    }

    let success = false;

    try {
      this.locking = true;

      if (alreadyCheckedForBlock || !(await this.getLockBlocker())) {

        this.lockModel.legalContractHash = this.appConfig.get('legalContractHash');

        this.sending = true;

        const result = await (this.wrapper as any).lock(this.lockModel);

        this.sending = false;

        await result.watchForTxMined();

        await this.getLocks();

        this.eventAggregator.publish('handleTransaction', new EventConfigTransaction(
          `The lock has been recorded`, result.transactionHash));

        this.eventAggregator.publish('Lock.Submitted');

        success = true;
      }

    } catch (ex) {
      this.eventAggregator.publish('handleException', new EventConfigException(`The lock was not recorded`, ex));
      await BalloonService.show({
        content: `The lock was not recorded`,
        eventMessageType: EventMessageType.Exception,
        originatingUiElement: this.lockButton,
      });
    } finally {
      this.sending = false;
      this.locking = false;
    }

    return success;
  }

  protected async release(config: { lock: ILocksTableInfo, releaseButton: JQuery<EventTarget> }): Promise<boolean> {
    const lockInfo = config.lock;

    if (this.locking || this.releasing) {
      return false;
    }

    let success = false;

    try {

      this.releasing = lockInfo.sending = true;

      const result = await (this.wrapper as any).release(lockInfo);

      lockInfo.sending = false;

      await result.watchForTxMined();

      this.eventAggregator.publish('handleTransaction',
        new EventConfigTransaction('The lock has been released', result.transactionHash));

      lockInfo.released = true;

      this.eventAggregator.publish('Lock.Released');

      success = true;

    } catch (ex) {
      this.eventAggregator.publish('handleException',
        new EventConfigException(`The lock was not released`, ex));
      await BalloonService.show({
        content: `The lock was not released`,
        eventMessageType: EventMessageType.Exception,
        originatingUiElement: config.releaseButton,
      });
    } finally {
      this.releasing = lockInfo.sending = false;
    }
    return success;
  }

  protected abstract getLockUnit(lockInfo: LockInfo): Promise<string>;

  protected async getLocks(): Promise<void> {

    const locks = await this.lockService.getUserLocks();

    /**
     * The symbol is for the LocksForReputation table
     */
    for (const lock of locks) {
      const lockInfoX = lock as ILocksTableInfo;
      lockInfoX.units = await this.getLockUnit(lock as LockInfo);
      lockInfoX.sending = false;
    }

    this.locks = locks as Array<ILocksTableInfo>;
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
