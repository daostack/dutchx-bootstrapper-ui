import { autoinject, computedFrom } from 'aurelia-framework';
import { DaoSchemeDashboard } from "./schemeDashboard"
import { EventAggregator } from 'aurelia-event-aggregator';
import { WrapperService, LockingOptions, LockerInfo, LockInfo, Locking4ReputationWrapper, Address, ArcTransactionResult, TransactionReceiptTruffle } from "../services/ArcService";
import { EventConfigTransaction, EventConfigException, EventConfigFailure } from "../entities/GeneralEvents";
import { BigNumber, Web3Service } from '../services/Web3Service';
import { SchemeDashboardModel } from 'schemeDashboards/schemeDashboardModel';
import { Utils } from 'services/utils';
import { LockInfoX } from "resources/customElements/locksForReputation/locksForReputation";
import { DisposableCollection } from "services/DisposableCollection";
import { LockService } from "services/lockServices";
import { AureliaConfiguration } from "aurelia-configuration";
// import { App } from 'app';

@autoinject
export abstract class Locking4Reputation extends DaoSchemeDashboard {

  protected wrapper: Locking4ReputationWrapper;
  protected lockService: LockService;
  // totalLocked: BigNumber;
  // totalLockedLeft: BigNumber;
  // totalScore: BigNumber;
  // totalReputationRewardable: BigNumber;
  // totalReputationRewardableLeft: BigNumber;
  // lockCount: number;
  lockingStartTime: Date;
  lockingEndTime: Date;
  lockingPeriodHasNotStarted: boolean;
  lockingPeriodIsEnded: boolean;
  msUntilCanLockCountdown: number;
  msRemainingInPeriodCountdown: number;
  refreshing: boolean = false;
  loaded: boolean = false;
  maxLockingPeriod: number;
  lockerInfo: LockerInfo;
  userAddress: Address;
  subscriptions = new DisposableCollection();
  locks: Array<LockInfoX>;
  intervalId: any;
  locking: boolean = false;

  // @computedFrom("lockerInfo")
  // get userScore(): number { return this.lockerInfo ? this.web3Service.fromWei(this.lockerInfo.score).toNumber() : 0; }

  lockModel: LockingOptions = {
    lockerAddress: undefined,
    amount: undefined,
    period: undefined
  }

  constructor(
    protected appConfig: AureliaConfiguration
    , protected eventAggregator: EventAggregator
    , protected web3Service: Web3Service
  ) {
    super();
  }

  async activate(model: SchemeDashboardModel) {
    this.wrapper = await WrapperService.factories[model.name].at(model.address);
    this.lockService = new LockService(this.appConfig, this.wrapper, this.web3Service.defaultAccount);
    return super.activate(model);
  }

  async attached() {
    this.userAddress = this.web3Service.defaultAccount;

    await this.refresh();

    this.subscriptions.push(this.eventAggregator.subscribe("secondPassed", async (blockDate: Date) => {
      if (this.org) {
        this.getLockingPeriodIsEnded(blockDate);
        this.getLockingPeriodHasNotStarted(blockDate);
        this.getMsUntilCanLockCountdown();
        this.getMsRemainingInPeriodCountdown();
      }
    }));
  }

  detached() {
    this.subscriptions.dispose();
  }

  private getLockingPeriodHasNotStarted(blockDate: Date): boolean {
    // return this.lockingPeriodHasNotStarted = false;
    return this.lockingPeriodHasNotStarted = (blockDate < this.lockingStartTime);
  }

  private getLockingPeriodIsEnded(blockDate: Date): boolean {
    // return this.lockingPeriodIsEnded = true;
    return this.lockingPeriodIsEnded = (blockDate > this.lockingEndTime);
  }

  @computedFrom("lockingPeriodHasNotStarted", "lockingPeriodIsEnded")
  get inLockingPeriod(): boolean {
    return !this.lockingPeriodHasNotStarted && !this.lockingPeriodIsEnded;
  }

  private getMsUntilCanLockCountdown(): number {
    return this.msUntilCanLockCountdown = this.lockingStartTime.getTime() - Date.now();
  }

  private getMsRemainingInPeriodCountdown(): number {
    return this.msRemainingInPeriodCountdown = this.lockingEndTime.getTime() - Date.now();
  }

  protected async refresh() {
    this.refreshing = true;
    this.loaded = false;
    // this.totalLocked = await this.wrapper.getTotalLocked();
    // this.totalLockedLeft = await this.wrapper.getTotalLockedLeft();
    // this.totalScore = await this.wrapper.getTotalScore();
    // this.totalReputationRewardable = await this.wrapper.getReputationReward();
    // this.totalReputationRewardableLeft = await this.wrapper.getReputationRewardLeft();
    // this.lockCount = await this.wrapper.getLockCount();

    this.lockingStartTime = await this.wrapper.getLockingStartTime();
    this.lockingEndTime = await this.wrapper.getLockingEndTime();
    // this.lockingStartTime = new Date(new Date().getTime() + 1200000000);
    // this.lockingEndTime = new Date(this.lockingStartTime.getTime() + 1300000000);

    // this.bootstrappingPeriodStartDate = App.lockingPeriodStartDate;
    // this.bootstrappingPeriodEndDate = App.lockingPeriodEndDate;
    this.maxLockingPeriod = await this.wrapper.getMaxLockingPeriod();
    return this.accountChanged().then(() => {
      this.refreshing = false;
      this.loaded = true;
    });
  }

  async accountChanged() {
    this.lockModel.lockerAddress = this.userAddress;
    // this.lockerInfo = await this.getLockerInfo();
    return this.getLocks();
  }

  protected async getLockBlocker(): Promise<boolean> {
    const reason = await this.wrapper.getLockBlocker(this.lockModel);

    if (reason) {
      this.eventAggregator.publish("handleFailure", new EventConfigFailure(`Can't lock: ${reason}`));
      return true;
    }

    return false;
  }

  protected async lock(alreadyCheckedForBlock: boolean = false): Promise<boolean> {

    try {
      this.locking = true;

      if (alreadyCheckedForBlock || !(await this.getLockBlocker())) {

        let result = await (<ArcTransactionResult>(await (<any>this.wrapper).lock(this.lockModel))).watchForTxMined()
          .then((tx: TransactionReceiptTruffle) => {
            this.getLocks();
            return tx;
          });

        this.eventAggregator.publish("handleTransaction", new EventConfigTransaction(
          `The lock has been recorded`, result.transactionHash));

        this.locking = false;

        return true;
      }

    } catch (ex) {
      this.eventAggregator.publish("handleException", new EventConfigException(`The lock could not be recorded`, ex));
    }

    this.locking = false;
    return false;
  }

  protected async release(lock: { lock: LockInfo }): Promise<boolean> {
    const lockInfo = lock.lock;

    try {

      let result = await (<any>this.wrapper).release(lockInfo);

      lockInfo.amount = new BigNumber(0);

      this.eventAggregator.publish("handleTransaction", new EventConfigTransaction("The lock has been released", result.tx));

      return true;

    } catch (ex) {
      this.eventAggregator.publish("handleException", new EventConfigException(`The lock could not be released`, ex));
    }
    return false;
  }

  // protected async redeem(): Promise<boolean> {
  //   const lockInfo = { lockerAddress: this.userAddress } as LockInfo;

  //   try {

  //     let result = await this.wrapper.redeem(lockInfo);

  //     this.eventAggregator.publish("handleTransaction", new EventConfigTransaction(
  //       `The reputation has been redeemed`, result.tx));

  //     return true;

  //   } catch (ex) {
  //     this.eventAggregator.publish("handleException", new EventConfigException(`The reputation could not be redeemed`, ex));
  //   }
  //   return false;
  // }


  protected abstract getLockUnit(lockInfo: LockInfo): Promise<string>;

  private async getLocks(): Promise<void> {

    const locks = await this.lockService.getUserLocks();

    /**
     * The symbol is for the LocksForReputation table
     */
    for (const lock of locks) {
      (lock as LockInfoX).units = await this.getLockUnit(lock as LockInfo);
    }

    this.locks = locks as Array<LockInfoX>;
  }
}
