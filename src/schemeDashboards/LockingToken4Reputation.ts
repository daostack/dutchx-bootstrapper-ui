import { autoinject } from 'aurelia-framework';
import { LockingToken4ReputationWrapper, StandardTokenFactory, StandardTokenWrapper, TokenLockingOptions, LockInfo } from "../services/ArcService";
import { Locking4Reputation } from 'schemeDashboards/Locking4Reputation';
import { EventAggregator } from "aurelia-event-aggregator";
import { Web3Service } from "services/Web3Service";
import { EventConfigFailure, EventConfigException } from "entities/GeneralEvents";
import { AureliaConfiguration } from "aurelia-configuration";
import { TokenSpecification } from "services/lockServices";
import { SchemeDashboardModel } from "schemeDashboards/schemeDashboardModel";

@autoinject
export class LockingToken4Reputation extends Locking4Reputation {

  private lockableTokens: Array<TokenSpecification>;

  constructor(
    appConfig: AureliaConfiguration
    , eventAggregator: EventAggregator
    , web3Service: Web3Service
  ) {
    super(appConfig, eventAggregator, web3Service);
  }

  private selectedToken: TokenSpecification = null;
  protected wrapper: LockingToken4ReputationWrapper;

  protected async refresh() {
    await super.refresh();
    this.lockableTokens = await this.lockService.lockableTokenSpecs;
  }

  protected async lock(): Promise<boolean> {

    if (!this.selectedToken) {
      this.eventAggregator.publish("handleFailure", new EventConfigFailure(`Please select a token`));
      return;
    }

    (<TokenLockingOptions>this.lockModel).tokenAddress = this.selectedToken.address;

    try {

      this.locking = true;

      if (!(await this.getLockBlocker())) {

        const token = (await StandardTokenFactory.at(this.selectedToken.address)) as StandardTokenWrapper;

        await (await token.approve({
          owner: this.lockModel.lockerAddress,
          amount: this.lockModel.amount,
          spender: this.wrapper.address
        })).watchForTxMined();

        return super.lock(true);
      }
    }
    catch (ex) {
      this.eventAggregator.publish("handleException", new EventConfigException(`The token transfer could not be approved`, ex));
    }
    this.locking = false;
    return false;
  }

  selectToken(tokenSpec: TokenSpecification) {
    this.selectedToken = tokenSpec;
  }

  protected getLockUnit(lockInfo: LockInfo): Promise<string> {
    return this.lockService.getLockedTokenSymbol(lockInfo);
  }

}
