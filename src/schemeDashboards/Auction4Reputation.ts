import { AureliaConfiguration } from 'aurelia-configuration';
import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject, computedFrom, View } from 'aurelia-framework';
import {
  EventConfigException,
  EventConfigFailure,
  EventConfigTransaction,
  EventMessageType
} from 'entities/GeneralEvents';
import { ISchemeDashboardModel } from 'schemeDashboards/schemeDashboardModel';
import { BalloonService } from 'services/balloonService';
import { DisposableCollection } from 'services/DisposableCollection';
import { TokenService } from 'services/TokenService';
import { Utils } from 'services/utils';
import { DecodedLogEntry } from 'web3';
import {
  Auction4ReputationBidEventResult,
  Auction4ReputationWrapper,
  Erc20Wrapper,
  WrapperService
} from '../services/ArcService';
import { BigNumber, Web3Service } from '../services/Web3Service';
import { DaoSchemeDashboard } from './schemeDashboard';

@autoinject
export class Auction4Reputation extends DaoSchemeDashboard {

  protected wrapper: Auction4ReputationWrapper;
  private auctionsStartTime: Date;
  private auctionsEndTime: Date;
  private token: Erc20Wrapper;
  private auctionIsOver: boolean;
  private auctionNotBegun: boolean;
  private refreshing: boolean = false;
  private loaded: boolean = false;
  private subscriptions = new DisposableCollection();
  private _bidding: boolean = false;
  private currentAuctionNumber: number;
  private auctionCount: number;
  private auctionEndTime: Date;
  private msRemainingInAuctionCountdown: number;
  private auctionPeriod: number;
  private bidAmount: BigNumber = undefined;
  private refreshingBids: boolean;
  private allBids = new Array<IAuctionBidInfo>();
  private _switchingAuctions = false;
  private dashboard: HTMLElement;
  private sendingBid: boolean = false;
  private myView: JQuery;
  private allowance = new BigNumber(0);
  private _approving: boolean = false;

  @computedFrom('_approving')
  protected get approving(): boolean {
    return this._approving;
  }

  protected set approving(val: boolean) {
    this._approving = val;
    setTimeout(() => this.eventAggregator.publish('dashboard.busy', val), 0);
  }

  private get approveButton(): HTMLElement {
    return this.myView.find('#approveButton')[0];
  }

  @computedFrom('allowance')
  private get noAllowance(): boolean {
    return this.allowance.eq('0');
  }

  @computedFrom('allowance', 'bidAmount')
  private get sufficientAllowance(): boolean {
    return this.allowance.gt('0') && this.allowance.gte(this.bidAmount || 0);
  }

  @computedFrom('allowance', 'bidAmount')
  private get hasPartialAllowance(): boolean {
    return this.allowance.gt('0') && this.allowance.lt(this.bidAmount || 0);
  }

  private get bidButton(): HTMLElement {
    return this.myView.find('#bidButton')[0];
  }

  @computedFrom('_bidding')
  protected get bidding(): boolean {
    return this._bidding;
  }

  protected set bidding(val: boolean) {
    this._bidding = val;
    setTimeout(() => this.eventAggregator.publish('dashboard.busy', val), 0);
  }

  @computedFrom('auctionNotBegun', 'auctionIsOver')
  private get inAuction() {
    return !this.auctionNotBegun && !this.auctionIsOver;
  }

  constructor(
    protected appConfig: AureliaConfiguration,
    protected eventAggregator: EventAggregator,
    protected web3Service: Web3Service,
    private tokenService: TokenService
  ) {
    super();
  }

  public created(owningView: View, _myView: View) {
    this.myView = $((owningView as any).firstChild);
  }

  public async activate(model: ISchemeDashboardModel) {
    this.wrapper = await WrapperService.factories[model.name].at(model.address);
    return super.activate(model);
  }

  public async attached() {
    this.refreshing = true;
    /**
     * gotta do these first
     */
    this.auctionsStartTime = await this.wrapper.getAuctionsStartTime();
    this.auctionsEndTime = await this.wrapper.getAuctionsEndTime();
    const blockDate = await Utils.lastBlockDate(this.web3Service.web3);
    this.getAuctionNotBegun(blockDate);
    this.getAuctionIsOver(blockDate);

    this.auctionPeriod = (await this.wrapper.getAuctionPeriod()) * 1000;
    this.auctionCount = await this.wrapper.getNumberOfAuctions();
    if (this.inAuction) {
      await this.getCurrentAuctionNumber();
      await this.getCurrentAuctionEndTime();
    }
    this.token = await this.wrapper.getToken();

    const sub = this.eventAggregator.subscribe('secondPassed', async (blockDateParam: Date) => {
      this.getAuctionNotBegun(blockDateParam);
      this.getAuctionIsOver(blockDateParam);
      if (this.inAuction) {
        let newAuction = false;
        /**
         * when entering first time
         */
        if (this.currentAuctionNumber === undefined) {
          /**
           * need these for getMsRemainingInAuctionCountdown
           */
          newAuction = true;
          this.switchingAuctions(true, true);
          await this.getCurrentAuctionNumber();
          await this.getCurrentAuctionEndTime();
        }

        this.getMsRemainingInAuctionCountdown();

        if (this.msRemainingInAuctionCountdown <= 0) {
          /**
           * then entering a new auction
           */
          newAuction = true;
          this.switchingAuctions(true, false);
          await this.getCurrentAuctionNumber();
          await this.getCurrentAuctionEndTime();
        }

        if (newAuction) {
          await this.getAccountBids();
          this.switchingAuctions(false);
        }
      } else if (this.auctionIsOver) {
        this.subscriptions.dispose();
      }
    });

    this.subscriptions.push(sub);

    const watcher = this.wrapper.Bid({}, { fromBlock: 'latest' });

    watcher.watch(async (_error: Error, _event: DecodedLogEntry<Auction4ReputationBidEventResult>) => {
      this.getAccountBids();
    });

    this.subscriptions.push({ dispose: () => watcher.stopWatchingAsync() });

    return this.refresh().then(() => { this.loaded = true; });
  }

  public detached() {
    this.subscriptions.dispose();
  }

  /**
   * account-specific stuff
   */
  protected async refresh() {
    this.refreshing = true;
    if (!this.auctionNotBegun) {
      await this.getAccountBids();
    }
    await this.getTokenAllowance();
    this.refreshing = false;
  }

  protected async bid(): Promise<void> {

    if (this.bidding) {
      return;
    }

    /**
     * just to be sure we're up-to-date
     */
    await this.getTokenAllowance();
    if (!this.sufficientAllowance) {
      return;
    }

    const currentAccount = this.web3Service.defaultAccount;

    try {

      this.bidding = true;
      let reason: string;

      /**
       * DEMO
       * if (this.bidAmount && this.bidAmount.gt(this.web3Service.toWei(50))) {
       *   reason = `Demo bid cannot be more than 50 GEN`;
       * }
       */

      if (!reason) {
        reason = await this.wrapper.getBidBlocker({
          amount: this.bidAmount,
          auctionId: this.currentAuctionNumber - 1,
          legalContractHash: this.appConfig.get('legalContractHash'),
        });
      }

      if (reason) {
        this.eventAggregator.publish('handleFailure', new EventConfigFailure(`Can't bid: ${reason}`));
        await BalloonService.show({
          content: `Can't bid: ${reason}`,
          eventMessageType: EventMessageType.Failure,
          originatingUiElement: this.bidButton,
        });
      } else {

        this.sendingBid = true;

        const result = await this.wrapper.bid({
          amount: this.bidAmount,
          auctionId: this.currentAuctionNumber - 1,
          legalContractHash: this.appConfig.get('legalContractHash'),
        });

        this.sendingBid = false;

        await result.watchForTxMined();

        this.eventAggregator.publish('handleTransaction', new EventConfigTransaction(
          `The bid has been recorded`, result.tx));

        Utils.resetInputField(this.dashboard, 'bidAmount', null);
      }

    } catch (ex) {
      this.eventAggregator.publish('handleException', new EventConfigException(`The bid was not recorded`, ex));

      await BalloonService.show({
        content: `The bid was not recorded`,
        eventMessageType: EventMessageType.Exception,
        originatingUiElement: this.bidButton,
      });

    } finally {
      await this.getTokenAllowance();
      this.sendingBid = false;
      this.bidding = false;
    }
  }

  private async approve(): Promise<void> {

    if (this.sufficientAllowance) {
      /**
       * this shouldn't happen
       */
      this.eventAggregator.publish('handleFailure',
        new EventConfigFailure(`GEN already has sufficient allowance`));
      return;
    }

    try {

      this.approving = true;

      const totalSupply = await this.token.getTotalSupply();

      this.sendingBid = true;

      const result = await this.token.approve({
        amount: totalSupply,
        owner: this.web3Service.defaultAccount,
        spender: this.wrapper.address,
      });

      this.sendingBid = false;

      await result.watchForTxMined();

      this.eventAggregator.publish('handleTransaction', new EventConfigTransaction(
        `The GEN approval has been recorded`, result.tx));
    } catch (ex) {
      this.eventAggregator.publish('handleException',
        new EventConfigException(`The GEN approval was not accepted`, ex));
      await BalloonService.show({
        content: `The GEN approval was not accepted`,
        eventMessageType: EventMessageType.Exception,
        originatingUiElement: this.approveButton,
      });
    } finally {
      await this.getTokenAllowance();
      this.approving = false;
      this.sendingBid = false;
    }
  }

  private async getTokenAllowance() {
    this.allowance = await this.tokenService.getTokenAllowance(
      this.token.address,
      this.web3Service.defaultAccount,
      this.address
    );
  }

  private getAuctionNotBegun(blockDate: Date): boolean {
    return this.auctionNotBegun = (blockDate < this.auctionsStartTime);
  }

  private getAuctionIsOver(blockDate: Date): boolean {
    return this.auctionIsOver = (this.currentAuctionNumber > this.auctionCount) || (blockDate > this.auctionsEndTime);
  }

  private getMsRemainingInAuctionCountdown(): number {
    return this.msRemainingInAuctionCountdown = Math.max(0, this.auctionEndTime.getTime() - Date.now());
  }

  private async getCurrentAuctionNumber(): Promise<number> {
    return this.currentAuctionNumber = (await this.wrapper.getCurrentAuctionId()) + 1;
  }

  private getCurrentAuctionEndTime(): Date {
    const auctionDuration = this.auctionPeriod;
    const ms = this.auctionsStartTime.getTime() + (this.currentAuctionNumber * auctionDuration);
    return this.auctionEndTime = new Date(ms);
  }

  private async getAccountBids(): Promise<void> {
    this.refreshingBids = true;
    const bids = new Array<IAuctionBidInfo>();

    try {
      const numAuctions = this.auctionCount;
      for (let auctionNum = 1; auctionNum <= numAuctions; ++auctionNum) {

        let bidAmount = new BigNumber(0);
        let totalAuctionBidAmount = new BigNumber(0);

        if ((this.currentAuctionNumber === undefined) || (auctionNum <= this.currentAuctionNumber)) {
          bidAmount = await await this.wrapper.getBid(this.web3Service.defaultAccount, auctionNum - 1);
          totalAuctionBidAmount = await this.wrapper.getAuctionTotalBid(auctionNum - 1);

          if (bidAmount.eq(0)) {
            /**
             * see if it is 0 by result of the reputation being redeemed
             */
            const events = await this.wrapper.Bid(
              { _bidder: this.web3Service.defaultAccount, _auctionId: auctionNum - 1 },
              { fromBlock: this.blockNumber || 0 }).get();
            if (events.length) {
              if (events.length > 1) {
                throw new Error('unexpectedly received more than one Redeem event for the account');
              }
              bidAmount = events[0].args._amount;
            }
          }
        }

        const bidInfo = {
          auctionNum,
          auctionStatus:
            ((this.currentAuctionNumber === undefined) ||
              (this.currentAuctionNumber > auctionNum)) ? AuctionBidStatus.Complete :
              (this.currentAuctionNumber === auctionNum) ? AuctionBidStatus.Current :
                AuctionBidStatus.Waiting,
          bidAmount,
          totalAuctionBidAmount,
        };
        bids.push(bidInfo);
      }
    } catch (ex) {
      this.eventAggregator.publish('handleException', new EventConfigException(`Error fetching bids`, ex));
    } finally {
      this.refreshingBids = false;
    }
    this.allBids = bids;
  }

  private switchingAuctions(onOff: boolean, firstAuction?: boolean) {
    if (onOff && !firstAuction) {
      const dashboardHeight = $(this.dashboard).height();
      $('#auctionDashboardSwitchingSpinner').innerHeight(dashboardHeight);
    }
    this._switchingAuctions = onOff;
  }
}

interface IAuctionBidInfo {
  auctionNum: number;
  bidAmount: BigNumber;
  totalAuctionBidAmount: BigNumber;
  auctionStatus: string;
}

enum AuctionBidStatus {
  Complete = 'Ended',
  Current = 'Ongoing',
  Waiting = 'Waiting',
}
