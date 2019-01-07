import { AureliaConfiguration } from 'aurelia-configuration';
import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject } from 'aurelia-framework';
import { EventConfigException, EventConfigFailure } from 'entities/GeneralEvents';
import { Locking4Reputation } from 'schemeDashboards/Locking4Reputation';
import { ITokenSpecification } from 'services/lockServices';
import { Web3Service } from 'services/Web3Service';
import { Address,
        Erc20Factory,
        Erc20Wrapper,
        LockInfo,
        LockingToken4ReputationWrapper,
        TokenLockingOptions } from '../services/ArcService';

@autoinject
export class LockingToken4Reputation extends Locking4Reputation {
  protected wrapper: LockingToken4ReputationWrapper;

  private lockableTokens: Array<ITokenSpecification>;
  private selectedToken: ITokenSpecification = null;

  constructor(
      appConfig: AureliaConfiguration
    , eventAggregator: EventAggregator
    , web3Service: Web3Service
  ) {
    super(appConfig, eventAggregator, web3Service);
  }

  protected async refresh() {
    await super.refresh();
    this.lockableTokens = this.lockService.lockableTokenSpecs;
  }

  protected async accountChanged(account: Address) {
    await super.accountChanged(account);
    return this.getLocks();
  }

  protected async lock(): Promise<boolean> {

    if (!this.selectedToken) {
      this.eventAggregator.publish('handleFailure', new EventConfigFailure(`Please select a token`));
      return;
    }

    (this.lockModel as TokenLockingOptions).tokenAddress = this.selectedToken.address;

    try {

      this.locking = true;

      if (!(await this.getLockBlocker())) {

        const token = (await Erc20Factory.at(this.selectedToken.address)) as Erc20Wrapper;

        await (await token.approve({
          amount: this.lockModel.amount,
          owner: this.lockModel.lockerAddress,
          spender: this.wrapper.address,
        })).watchForTxMined();

        return super.lock(true);
      }
    } catch (ex) {
      this.eventAggregator.publish('handleException',
                                   new EventConfigException(`The token transfer could not be approved`, ex));
    }
    this.locking = false;
    return false;
  }

  protected getLockUnit(lockInfo: LockInfo): Promise<string> {
    return this.lockService.getLockedTokenSymbol(lockInfo);
  }

  private selectToken(tokenSpec: ITokenSpecification) {
    this.selectedToken = tokenSpec;
  }
}
