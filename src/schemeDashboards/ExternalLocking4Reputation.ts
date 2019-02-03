import { App } from 'app';
import { AureliaConfiguration } from 'aurelia-configuration';
import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject } from 'aurelia-framework';
import { EventConfigException, EventConfigFailure, EventConfigTransaction } from 'entities/GeneralEvents';
import { Locking4Reputation } from 'schemeDashboards/Locking4Reputation';
import { Address, ArcTransactionResult, ExternalLocking4ReputationWrapper, LockInfo } from 'services/ArcService';
import { BigNumber, Web3Service } from 'services/Web3Service';

@autoinject
export class ExternalLocking4ReputationDashboard extends Locking4Reputation {

  protected wrapper: ExternalLocking4ReputationWrapper;

  private alreadyLocked: boolean = false;
  private alreadyRegistered: boolean = false;
  private registering: boolean = false;
  private globalPeriodHasStarted: boolean = false;
  private sendingRegister: boolean = false;

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
    this.subscriptions.push(this.eventAggregator.subscribe('DAO.loaded',
      () => {
        if (!this.globalPeriodHasStarted) {
          const globalPeriodStartDate = this.appConfig.get('lockingPeriodStartDate');
          if (this.lockingPeriodIsEnded) {
            this.globalPeriodHasStarted = true;
          } else {
            const globalPeriodSubscription = this.eventAggregator.subscribe('secondPassed', async (blockDate: Date) => {
              this.globalPeriodHasStarted = (blockDate >= globalPeriodStartDate);
              if (this.globalPeriodHasStarted) {
                globalPeriodSubscription.dispose();
              }
            });
          }
        }
      }));
  }

  protected async accountChanged(account: Address) {
    this.alreadyLocked = await this.wrapper.getAccountHasLocked(account);
    this.alreadyRegistered = await this.wrapper.isRegistered(this.web3Service.defaultAccount);
    return super.accountChanged(account);
  }

  protected async lock(): Promise<boolean> {

    if (!(await this.wrapper.hasTokenToActivate(this.lockModel.lockerAddress))) {
      this.eventAggregator.publish('handleFailure',
        new EventConfigFailure(`Can't activate: No MGN tokens reserved to register`));
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
    let success: boolean;

    try {

      this.sendingRegister = true;
      const result = await (await (this.wrapper as any).register()
        .then((tx: ArcTransactionResult) => {
          this.sendingRegister = false;
          return tx;
        }))
        .watchForTxMined();

      this.eventAggregator.publish('handleTransaction', new EventConfigTransaction(
        `Registration is complete`, result.transactionHash));

      success = true;
      this.alreadyRegistered = true;

    } catch (ex) {
      this.eventAggregator.publish('handleException',
        new EventConfigException(`The regisration was not recorded`, ex));
      success = false;
    } finally {
      this.registering = false;
      this.sendingRegister = false;
    }

    return success;
  }
}
