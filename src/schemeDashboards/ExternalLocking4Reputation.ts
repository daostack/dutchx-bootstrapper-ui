import { AureliaConfiguration } from 'aurelia-configuration';
import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject, computedFrom } from 'aurelia-framework';
import {
  EventConfigException,
  EventConfigFailure,
  EventConfigTransaction,
  EventMessageType
} from 'entities/GeneralEvents';
import { Locking4Reputation } from 'schemeDashboards/Locking4Reputation';
import { Address, ArcTransactionResult, ExternalLocking4ReputationWrapper, LockInfo } from 'services/ArcService';
import { BalloonService } from 'services/balloonService';
import { BigNumber, Web3Service } from 'services/Web3Service';

@autoinject
export class ExternalLocking4ReputationDashboard extends Locking4Reputation {

  protected wrapper: ExternalLocking4ReputationWrapper;

  private alreadyLocked: boolean = false;
  private alreadyRegistered: boolean = false;
  private _registering: boolean = false;
  private globalPeriodHasStarted: boolean = false;
  private sendingRegister: boolean = false;
  private get registerButton(): HTMLElement {
    return this.myView.find('#registerButton')[0];
  }

  @computedFrom('_registering')
  protected get registering(): boolean {
    return this._registering;
  }

  protected set registering(val: boolean) {
    this._registering = val;
    setTimeout(() => this.eventAggregator.publish('dashboard.busy', val), 0);
  }

  constructor(
    appConfig: AureliaConfiguration,
    eventAggregator: EventAggregator,
    web3Service: Web3Service
  ) {
    super(appConfig, eventAggregator, web3Service);
    this.lockModel.amount = new BigNumber(0); // to avoid validation
    this.lockModel.period = 0; // to avoid validation
  }

  public async attached() {
    await super.attached();
    const globalPeriodStartDate = this.appConfig.get('lockingPeriodStartDate');
    const globalPeriodSubscription = this.eventAggregator.subscribe('secondPassed', async (blockDate: Date) => {
      this.globalPeriodHasStarted = (blockDate >= globalPeriodStartDate);
      if (this.globalPeriodHasStarted) {
        globalPeriodSubscription.dispose();
      }
    });

    if (!this.lockingPeriodIsEnded && !this.alreadyLocked) {
      /**
       * if we find ourself in the locking period, watch for this account to be locked by bot
       */
      const inLockingPeriodSubscription = this.eventAggregator.subscribe('secondPassed', () => {
        if (this.inLockingPeriod) {
          inLockingPeriodSubscription.dispose();
          /**
           * Watch for Lock, most notably by bot.
           * This should only be called if we are in the locking period.
           * Note alreadyRegistered can still theoretically change at the contract level
           * even if we're in the locking period, so we watch even if it is false at this point.
           * Doesn't matter what is the source of the Lock we catch here.
           */
          if (!this.alreadyLocked) {
            const fetcher = this.wrapper.getLocks()(
              { _locker: this.web3Service.defaultAccount },
              { fromBlock: this.blockNumber });
            fetcher.watch(
              () => {
                fetcher.stopWatchingAsync();
                this.alreadyLocked = true;
              });
          }
        }
      });
    }
  }

  protected async accountChanged(account: Address) {
    this.alreadyRegistered = await this.wrapper.isRegistered(this.web3Service.defaultAccount);
    this.alreadyLocked = await this.wrapper.getAccountHasLocked(account);
    return super.accountChanged(account);
  }

  protected async lock(): Promise<boolean> {
    if (!(await this.wrapper.hasTokenToActivate(this.lockModel.lockerAddress))) {
      this.eventAggregator.publish('handleFailure',
        new EventConfigFailure(`Can't activate: No MGN tokens reserved to register`));

      await BalloonService.show({
        content: `Can't activate: No MGN tokens reserved to register`,
        eventMessageType: EventMessageType.Failure,
        originatingUiElement: this.lockButton,
      });
      return false;
    }

    const success = await super.lock();
    this.alreadyLocked = success;
    return success;
  }

  // just a stub
  protected getLockUnit(_lockInfo: LockInfo): Promise<string> { return Promise.resolve(''); }

  protected async register(): Promise<boolean> {
    this.registering = true;
    let success = false;

    try {

      this.sendingRegister = true;

      const result = await (await (this.wrapper as any).register(
        {
          legalContractHash: this.appConfig.get('legalContractHash'),
        }
      )
        .then((tx: ArcTransactionResult) => {
          this.sendingRegister = false;
          return tx;
        }))
        .watchForTxMined();

      this.eventAggregator.publish('handleTransaction', new EventConfigTransaction(
        `Registration is complete`, result.transactionHash));

      this.eventAggregator.publish('MgnRegistered');

      this.alreadyRegistered = true;
      success = true;
    } catch (ex) {
      this.eventAggregator.publish('handleException',
        new EventConfigException(`The regisration was not recorded`, ex));

      await BalloonService.show({
        content: `The regisration was not recorded`,
        eventMessageType: EventMessageType.Exception,
        originatingUiElement: this.registerButton,
      });
    } finally {
      this.registering = false;
      this.sendingRegister = false;
    }

    return success;
  }
}
