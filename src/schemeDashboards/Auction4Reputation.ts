import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject, computedFrom } from 'aurelia-framework';
import { EventConfigException, EventConfigFailure, EventConfigTransaction } from 'entities/GeneralEvents';
import { ISchemeDashboardModel } from 'schemeDashboards/schemeDashboardModel';
import { DisposableCollection } from 'services/DisposableCollection';
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
  private bidding: boolean = false;
  private currentAuctionNumber: number;
  private auctionCount: number;
  private auctionEndTime: Date;
  private amountBid: BigNumber = new BigNumber(0);
  private totalAmountBid: BigNumber = new BigNumber(0);
  private msRemainingInAuctionCountdown: number;
  private auctionPeriod: number;
  private bidAmount: BigNumber = undefined;
  private refreshingBids: boolean;
  private allBids = new Array<IAuctionBidInfo>();
  private _switchingAuctions = false;

  @computedFrom('auctionNotBegun', 'auctionIsOver')
  private get inAuction() {
    return !this.auctionNotBegun && !this.auctionIsOver;
  }

  constructor(
    protected eventAggregator: EventAggregator,
    protected web3Service: Web3Service
  ) {
    super();
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
          this.switchingAuctions(true);
          await this.getCurrentAuctionNumber();
          await this.getCurrentAuctionEndTime();
        }

        this.getMsRemainingInAuctionCountdown();

        if (this.msRemainingInAuctionCountdown <= 0) {
          /**
           * then entering a new auction
           */
          newAuction = true;
          this.switchingAuctions(true);
          await this.getCurrentAuctionNumber();
          await this.getCurrentAuctionEndTime();
        }

        if (newAuction) {
          await this.getAmountBid(this.currentAuctionNumber - 1);
          await this.getTotalAmountBid(this.currentAuctionNumber - 1);
          await this.getAccountBids();
          this.switchingAuctions(false);
        }
      } else if (this.auctionIsOver) {
        this.subscriptions.dispose();
      }
    });

    this.subscriptions.push(sub);

    const watcher = this.wrapper.Bid({}, { fromBlock: 'latest' });

    watcher.watch(async (_error: Error, event: DecodedLogEntry<Auction4ReputationBidEventResult>) => {
      await this.getAmountBid(event.args._auctionId.toNumber());
      await this.getTotalAmountBid(event.args._auctionId.toNumber());
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
    if (this.inAuction) {
      await this.getAmountBid(this.currentAuctionNumber - 1);
      await this.getTotalAmountBid(this.currentAuctionNumber - 1);
    }
    if (!this.auctionNotBegun) {
      await this.getAccountBids();
    }
    this.refreshing = false;
  }

  protected async bid(): Promise<void> {

    if (this.bidding) {
      return;
    }

    const currentAccount = this.web3Service.defaultAccount;

    try {

      this.bidding = true;

      const reason = await this.wrapper.getBidBlocker({ amount: this.bidAmount });

      if (reason) {
        this.eventAggregator.publish('handleFailure', new EventConfigFailure(`Can't bid: ${reason}`));
      } else {

        await (await this.token.approve({
          amount: this.bidAmount,
          owner: currentAccount,
          spender: this.wrapper.address,
        })).watchForTxMined();

        const result = await (await this.wrapper.bid({ amount: this.bidAmount })).watchForTxMined();

        this.eventAggregator.publish('handleTransaction', new EventConfigTransaction(
          `The bid has been recorded`, result.transactionHash));

        Utils.resetInputField('bidAmount', null);
      }

    } catch (ex) {
      this.eventAggregator.publish('handleException', new EventConfigException(`The bid was not recorded`, ex));
    } finally {
      this.bidding = false;
    }
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

  private async getAmountBid(auctionId: number): Promise<BigNumber> {
    return this.amountBid = await this.wrapper.getBid(this.web3Service.defaultAccount, auctionId);
  }

  private async getTotalAmountBid(auctionId: number): Promise<BigNumber> {
    // or getBid for the current user
    return this.totalAmountBid = await this.wrapper.getAuctionTotalBid(auctionId);
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

        const bidAmount = await await this.wrapper.getBid(this.web3Service.defaultAccount, auctionNum - 1);
        const totalAuctionBidAmount = await this.wrapper.getAuctionTotalBid(auctionNum - 1);

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

  private switchingAuctions(onOff: boolean) {
    if (onOff) {
      const dashboardHeight = $('#auctionDashboardBody').innerHeight();
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
