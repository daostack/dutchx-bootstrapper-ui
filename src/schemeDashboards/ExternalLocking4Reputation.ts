import { AureliaConfiguration } from 'aurelia-configuration';
import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject } from 'aurelia-framework';
import { EventConfigFailure } from 'entities/GeneralEvents';
import { Locking4Reputation } from 'schemeDashboards/Locking4Reputation';
import { Address, ExternalLocking4ReputationWrapper, LockInfo } from 'services/ArcService';
import { BigNumber, Web3Service } from 'services/Web3Service';

@autoinject
export class ExternalLocking4ReputationDashboard extends Locking4Reputation {
  protected wrapper: ExternalLocking4ReputationWrapper;

  private alreadyLocked: boolean;

  constructor(
      appConfig: AureliaConfiguration
    , eventAggregator: EventAggregator
    , web3Service: Web3Service
  ) {
    super(appConfig, eventAggregator, web3Service);
    this.lockModel.amount = new BigNumber(0); // to avoid validation
    this.lockModel.period = 0; // to avoid validation
  }

  protected async accountChanged(account: Address) {
    this.alreadyLocked = await this.wrapper.getAccountHasLocked(account);
    return super.accountChanged(account);
  }

  protected async lock(): Promise<boolean> {

    if (!(await this.wrapper.hasMgnToActivate(this.lockModel.lockerAddress))) {
      this.eventAggregator.publish('handleFailure',
      new EventConfigFailure(`Can't activate: No MGN tokens reserved to claim`));
      return false;
    }

    const success = await super.lock();
    this.alreadyLocked = success;
    return success;
  }

  // just a stub
  protected getLockUnit(_lockInfo: LockInfo): Promise<string> { return Promise.resolve(''); }
}
