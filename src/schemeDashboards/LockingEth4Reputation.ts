import { autoinject } from 'aurelia-framework';
import { Locking4Reputation } from 'schemeDashboards/Locking4Reputation';
import { Address, LockInfo } from 'services/ArcService';
import { Utils } from 'services/utils';

@autoinject
export class LockingEth4ReputationDashboard extends Locking4Reputation {
  private dashboard: HTMLElement;

  protected getLockUnit(_lockInfo: LockInfo): Promise<string> { return Promise.resolve('ETH'); }

  protected async accountChanged(account: Address) {
    await super.accountChanged(account);
    return this.getLocks();
  }

  protected async lock(): Promise<boolean> {
    const success = await super.lock();
    if (success) {
      Utils.resetInputField(this.dashboard, 'lockAmount', null);
      Utils.resetInputField(this.dashboard, 'lockingPeriod', null);
    }
    return success;
  }
}
