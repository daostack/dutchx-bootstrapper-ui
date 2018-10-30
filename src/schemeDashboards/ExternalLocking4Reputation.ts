import { autoinject } from 'aurelia-framework';
import { Locking4Reputation } from 'schemeDashboards/Locking4Reputation';
import { SchemeDashboardModel } from 'schemeDashboards/schemeDashboardModel';
import { ExternalLocking4ReputationWrapper } from '@daostack/arc.js';

@autoinject
export class ExternalLocking4ReputationDashboard extends Locking4Reputation {

  alreadyLocked: boolean;
  protected wrapper: ExternalLocking4ReputationWrapper;

  async accountChanged() {
    this.alreadyLocked = await this.wrapper.getAccountHasLocked(this.web3Service.defaultAccount);
    return super.accountChanged();
  }

  protected async lock(): Promise<boolean> {
    const success = await super.lock();
    this.alreadyLocked = success;
    return success;
  }

  protected async redeem(): Promise<boolean> {
    const success = await super.redeem();
    this.alreadyLocked = !success;
    return success;
  }

}
