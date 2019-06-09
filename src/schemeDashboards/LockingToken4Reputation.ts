import { AureliaConfiguration } from 'aurelia-configuration';
import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject, signalBindings } from 'aurelia-framework';
import {
  EventConfigException,
  EventConfigFailure,
  EventConfigTransaction,
  EventMessageType
} from 'entities/GeneralEvents';
import { Locking4Reputation } from 'schemeDashboards/Locking4Reputation';
import { BalloonService } from 'services/balloonService';
import { ITokenSpecification, LockService } from 'services/lockServices';
import { TokenService } from 'services/TokenService';
import { Utils as UtilsInternal } from 'services/utils';
import { BigNumber, Web3Service } from 'services/Web3Service';
import {
  Address,
  Erc20Factory,
  Erc20Wrapper,
  LockInfo,
  LockingToken4ReputationWrapper,
  TokenLockingOptions,
} from '../services/ArcService';

@autoinject
export class LockingToken4Reputation extends Locking4Reputation {
  protected wrapper: LockingToken4ReputationWrapper;

  private lockableTokens: Array<ITokenSpecificationX> = [];
  private selectedToken: ITokenSpecification = null;
  private selectedTokenIsLiquid: boolean = false;
  private dashboard: HTMLElement;
  private tokensInited = false;
  private approved: boolean = false;

  constructor(
    appConfig: AureliaConfiguration,
    eventAggregator: EventAggregator,
    web3Service: Web3Service,
    private tokenService: TokenService
  ) {
    super(appConfig, eventAggregator, web3Service);
  }

  protected async refresh() {
    await super.refresh();
    this.refreshing = true;
    /**
     * This will cause all of the TokenBalance elements to be created, attached and for them to set
     * their balances.
     */
    this.lockableTokens = this.lockService.lockableTokenSpecs;
    this.refreshing = false;
  }

  protected async accountChanged(account: Address) {
    /**
     * note: Tokens will update themselves with the new account balances
     */
    await super.accountChanged(account);
    return this.getLocks();
  }

  protected async approve(): Promise<boolean> {

    if (!this.selectedToken) {
      this.eventAggregator.publish('handleFailure', new EventConfigFailure(`Please select a token`));
      return;
    }

    (this.lockModel as TokenLockingOptions).tokenAddress = this.selectedToken.address;

    try {

      // const allowance = await this.tokenService.getTokenAllowance(
      //   this.selectedToken.address,
      //   this.web3Service.defaultAccount,
      //   this.address
      // );
      // this.approved = allowance.gte(this.lockModel.amount);

      this.approving = true;

      if (!(await this.getLockBlocker())) {

        const token = (await Erc20Factory.at(this.selectedToken.address)) as Erc20Wrapper;

        this.sending = true;

        const result = await (await token.approve({
          amount: LockService.maxTokenApprovalAmount,
          owner: this.lockModel.lockerAddress,
          spender: this.wrapper.address,
        })).watchForTxMined();

        this.eventAggregator.publish('handleTransaction', new EventConfigTransaction(
          `The token approval has been recorded`, result.transactionHash));

        return true;
      }
    } catch (ex) {
      this.eventAggregator.publish('handleException',
        new EventConfigException(`The token approval was not approved`, ex));
      await BalloonService.show({
        content: `The token approval was not approved`,
        eventMessageType: EventMessageType.Exception,
        originatingUiElement: this.approveButton,
      });
    } finally {
      this.approving = false;
      this.sending = false;
    }
    return false;
  }

  protected async lock(): Promise<boolean> {

    if (!this.selectedToken) {
      this.eventAggregator.publish('handleFailure', new EventConfigFailure(`Please select a token`));
      return;
    }

    (this.lockModel as TokenLockingOptions).tokenAddress = this.selectedToken.address;

    try {

      if (!(await this.getLockBlocker())) {

        this.sending = true;

        const success = await super.lock(true);
        if (success) {
          UtilsInternal.resetInputField(this.dashboard, 'lockAmount', null);
          UtilsInternal.resetInputField(this.dashboard, 'lockingPeriod', null);
        }
        return success;
      }
    } catch (ex) {
      this.eventAggregator.publish('handleException',
        new EventConfigException(`The token transfer was not approved`, ex));
      await BalloonService.show({
        content: `The token transfer was not approved`,
        eventMessageType: EventMessageType.Exception,
        originatingUiElement: this.lockButton,
      });
    } finally {
      this.locking = false;
      this.sending = false;
    }
    return false;
  }

  // protected async getLockBlocker(_reason?: string): Promise<boolean> {
  //   let reason: string;
  //   if (this.lockModel.amount) {
  //     /**
  //      * get token value in ETH
  //      */
  //     const priceFactor = await this.getTokenPriceFactor((this.lockModel as TokenLockingOptions).tokenAddress);

  //     const ethValue = priceFactor.mul(this.lockModel.amount as BigNumber);

  //     if (ethValue.gt(this.web3Service.toWei(0.2))) {
  //       reason = `Demo lock cannot be for more than 0.2 ETH`;
  //     }
  //   }
  //   return super.getLockBlocker(reason);
  // }

  protected getLockUnit(lockInfo: LockInfo): Promise<string> {
    return this.lockService.getLockedTokenSymbol(lockInfo);
  }

  private async getTokenIsLiquid(token: Address): Promise<boolean> {
    return this.tokenService.getTokenIsLiquid(token, this.wrapper);
  }

  private async selectToken(tokenSpec: ITokenSpecification) {
    this.selectedTokenIsLiquid = await this.getTokenIsLiquid(tokenSpec.address);
    this.selectedToken = tokenSpec;
  }

  private balanceChanged(isLast: boolean): void {

    /**
     * isLast is true when this is the last token in the list. We don't want to
     * invoke SortTokens during initial loading until we've reached the last token
     * in the list.  After that, we sort whenever there is a change.
     */
    if (isLast && !this.tokensInited) {
      this.tokensInited = true;
    }

    if (this.tokensInited) {
      signalBindings('token.changed');
    }
  }
}

export interface ITokenSpecificationX extends ITokenSpecification {
  balance?: BigNumber;
}
