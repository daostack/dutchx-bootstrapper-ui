import { AureliaConfiguration } from 'aurelia-configuration';
import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject } from 'aurelia-framework';
import { EventConfigException, EventConfigFailure, EventMessageType } from 'entities/GeneralEvents';
import { Locking4Reputation } from 'schemeDashboards/Locking4Reputation';
import { AureliaHelperService } from 'services/AureliaHelperService';
import { BalloonService } from 'services/balloonService';
import { ITokenSpecification } from 'services/lockServices';
import { SortService } from 'services/SortService';
import { TokenService } from 'services/TokenService';
import { Utils as UtilsInternal } from 'services/utils';
import { BigNumber, Web3Service } from 'services/Web3Service';
import {
  Address,
  ArcTransactionResult,
  Erc20Factory,
  Erc20Wrapper,
  LockInfo,
  LockingToken4ReputationWrapper,
  TokenLockingOptions,
  Utils
} from '../services/ArcService';

@autoinject
export class LockingToken4Reputation extends Locking4Reputation {
  protected wrapper: LockingToken4ReputationWrapper;

  private lockableTokens: Array<ITokenSpecificationX> = [];
  private selectedToken: ITokenSpecification = null;
  private selectedTokenIsLiquid: boolean = false;
  private dashboard: HTMLElement;

  constructor(
    appConfig: AureliaConfiguration,
    eventAggregator: EventAggregator,
    web3Service: Web3Service,
    private aureliaHelperService: AureliaHelperService,
    private tokenService: TokenService
  ) {
    super(appConfig, eventAggregator, web3Service);
  }

  protected async refresh() {
    await super.refresh();
    this.refreshing = true;
    try {
      const tokens: Array<ITokenSpecificationX> = this.lockService.lockableTokenSpecs;
      for (const tokenInfo of tokens) {
        await this.tokenService.getUserTokenBalance(tokenInfo.address)
          .then((balance: BigNumber) => {
            tokenInfo.balance = balance;
            /**
             * Whenever a balance changes, sort the array.
             */
            this.aureliaHelperService.createPropertyWatch(
              tokenInfo, 'balance', (newValue: BigNumber, oldValue: BigNumber) => {
                if ((!newValue && oldValue) ||
                  (newValue && !oldValue) ||
                  (newValue && oldValue && !newValue.eq(oldValue))) {
                  /**
                   * Trying not to trigger this too often.
                   */
                  this.lockableTokens = this.sortTokens(this.lockableTokens);
                }
              });
          });
      }
      this.lockableTokens = this.sortTokens(tokens);
    } finally {
      this.refreshing = false;
    }
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

        this.sending = true;
        await (await token.approve({
          amount: this.lockModel.amount,
          owner: this.lockModel.lockerAddress,
          spender: this.wrapper.address,
        })
          .then((tx: ArcTransactionResult) => {
            this.sending = false;
            return tx;
          }))
          .watchForTxMined();

        this.locking = false; // so will execute lock

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

  protected async getLockBlocker(_reason?: string): Promise<boolean> {
    let reason: string;
    if (this.lockModel.amount) {
      /**
       * get token value in ETH
       */
      const priceFactor = await this.getTokenPriceFactor((this.lockModel as TokenLockingOptions).tokenAddress);

      const ethValue = priceFactor.mul(this.lockModel.amount as BigNumber);

      if (ethValue.gt(this.web3Service.toWei(0.2))) {
        reason = `Demo lock cannot be for more than 0.2 ETH`;
      }
    }
    return super.getLockBlocker(reason);
  }

  protected getLockUnit(lockInfo: LockInfo): Promise<string> {
    return this.lockService.getLockedTokenSymbol(lockInfo);
  }

  private async getTokenIsLiquid(token: Address): Promise<boolean> {
    return (await this.getTokenPriceFactor(token)) !== null;
  }

  private async getTokenPriceFactor(token: Address): Promise<BigNumber | null> {
    const oracleAddress = await this.wrapper.getPriceOracleAddress();

    const oracle = (await Utils.requireContract('PriceOracleInterface')).at(oracleAddress);

    const price = (await oracle.getPrice(token)) as Array<BigNumber>;

    if (price && (price.length === 2) && price[0].gt(0) && price[1].gt(0)) {
      return price[0].div(price[1]);
    } else {
      return null;
    }
  }

  private async selectToken(tokenSpec: ITokenSpecification) {
    this.selectedTokenIsLiquid = await this.getTokenIsLiquid(tokenSpec.address);
    this.selectedToken = tokenSpec;
  }

  private sortTokens(tokens: Array<ITokenSpecificationX>): Array<ITokenSpecificationX> {
    /**
     * what we want here is the concatenation of two arrays, each sorted by symbol:
     * The first is the set of all zero balances, the second all the rest.
     */
    tokens = [
      ...tokens
        .filter((tokenInfo: ITokenSpecificationX) => {
          return tokenInfo.balance && !tokenInfo.balance.eq(0);
        })
        .sort((a: ITokenSpecificationX, b: ITokenSpecificationX) => {
          return SortService.evaluateString(a.symbol, b.symbol);
        }),
      ...tokens.filter((tokenInfo: ITokenSpecificationX) => {
        return !tokenInfo.balance || tokenInfo.balance.eq(0);
      })
        .sort((a: ITokenSpecificationX, b: ITokenSpecificationX) => {
          return SortService.evaluateString(a.symbol, b.symbol);
        }),
    ];
    return tokens;
  }
}

export interface ITokenSpecificationX extends ITokenSpecification {
  balance?: BigNumber;
}
