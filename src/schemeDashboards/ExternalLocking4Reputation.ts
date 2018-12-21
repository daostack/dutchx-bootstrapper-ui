import { autoinject } from 'aurelia-framework';
import { Locking4Reputation } from 'schemeDashboards/Locking4Reputation';
import { ExternalLocking4ReputationWrapper, LockInfo, Address, Utils } from 'services/ArcService';
import { EventAggregator } from "aurelia-event-aggregator";
import { Web3Service, BigNumber } from "services/Web3Service";
import { AureliaConfiguration } from "aurelia-configuration";
import { EventConfigFailure } from "entities/GeneralEvents";

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
    this.lockModel.amount = new BigNumber(0); // to avoid validation
    this.lockModel.period = 0; // to avoid validation
  }

  protected async accountChanged(account: Address) {
    this.alreadyLocked = await this.wrapper.getAccountHasLocked(account);
    return super.accountChanged(account);
  }

  protected async lock(): Promise<boolean> {

    if (!(await this.wrapper.hasMgnToActivate(this.lockModel.lockerAddress, this.appConfig.get("mgnTokenAddress")))) {
      this.eventAggregator.publish("handleFailure", new EventConfigFailure(`Can't activate: No MGN tokens reserved to claim`));
      return false;
    }

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
