import { autoinject } from 'aurelia-framework';
import { Locking4Reputation } from 'schemeDashboards/Locking4Reputation';
import { LockInfo, Address } from "services/ArcService";

@autoinject
export class LockingEth4ReputationDashboard extends Locking4Reputation {
  protected getLockUnit(lockInfo: LockInfo): Promise<string> { return Promise.resolve("ETH"); }

  protected async accountChanged(account: Address) {
    await super.accountChanged(account);
    return this.getLocks();
  }
}
