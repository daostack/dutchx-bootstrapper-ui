import { autoinject } from 'aurelia-framework';
import { EventConfigFailure, EventMessageType } from 'entities/GeneralEvents';
import { Locking4Reputation } from 'schemeDashboards/Locking4Reputation';
import { Address, LockInfo } from 'services/ArcService';
import { BalloonService } from 'services/balloonService';
import { Utils } from 'services/utils';
import { BigNumber } from 'services/Web3Service';

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

  // protected async getLockBlocker(_reason?: string): Promise<boolean> {
  //   let reason: string;
  //   if (this.lockModel.amount && (this.lockModel.amount as BigNumber).gt(this.web3Service.toWei(0.2))) {
  //     reason = `Demo lock cannot be for more than 0.2 ETH`;
  //   }
  //   return super.getLockBlocker(reason);
  // }
}
