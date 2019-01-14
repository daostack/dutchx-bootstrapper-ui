import { autoinject } from 'aurelia-framework';
import { Locking4Reputation } from 'schemeDashboards/Locking4Reputation';
import { Address, LockInfo } from 'services/ArcService';
import { Utils } from 'services/utils';

@autoinject
export class LockingEth4ReputationDashboard extends Locking4Reputation {
  protected getLockUnit(_lockInfo: LockInfo): Promise<string> { return Promise.resolve('ETH'); }

  protected async accountChanged(account: Address) {
    await super.accountChanged(account);
    return this.getLocks();
  }

  protected async lock(): Promise<boolean> {
    const success = await super.lock();
    if (success) {
      this.lockModel.amount = this.lockModel.period = null;
      Utils.resetInputField('lockAmount');
      Utils.resetInputField('lockingPeriod');
    }
    return success;
  }
}
