import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject } from 'aurelia-framework';
import { EventConfigException, EventConfigFailure, EventConfigTransaction } from 'entities/GeneralEvents';
import { ISchemeDashboardModel } from 'schemeDashboards/schemeDashboardModel';
import { DisposableCollection } from 'services/DisposableCollection';
import { Utils } from 'services/utils';
import { DecodedLogEntry } from 'web3';
import { Auction4ReputationBidEventResult,
         Auction4ReputationWrapper,
         Erc20Wrapper,
         WrapperService } from '../services/ArcService';
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
  private amountBid: BigNumber;
  private totalAmountBid: BigNumber;
  private msRemainingInAuctionCountdown: number;
  private auctionPeriod: number;

  constructor(
      protected eventAggregator: EventAggregator
    , protected web3Service: Web3Service
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
    await this.getCurrentAuctionNumber();
    await this.getCurrentAuctionEndTime();

    this.token = await this.wrapper.getToken();

    const sub = this.eventAggregator.subscribe('secondPassed', async (blockDateParam: Date) => {
      this.getAuctionNotBegun(blockDateParam);
      this.getAuctionIsOver(blockDateParam);
      if (!this.auctionNotBegun && !this.auctionIsOver) {
        this.updateAuctionStatus();
      } else if (this.auctionIsOver) {
        this.subscriptions.dispose();
      }
    });

    this.subscriptions.push(sub);

    const watcher = this.wrapper.Bid({ }, { fromBlock: 'latest' });

    watcher.watch((_error: Error, event: DecodedLogEntry<Auction4ReputationBidEventResult>) => {
      this.getAmountBid(event.args._auctionId.toNumber());
      this.getTotalAmountBid(event.args._auctionId.toNumber());
    });

    this.subscriptions.push({ dispose: () => watcher.stopWatchingAsync() });

    return this.refresh().then(() => { this.loaded = true; });
  }

  public detached() {
    this.subscriptions.dispose();
  }

  protected async refresh() {
    this.refreshing = true;
    await this.getAmountBid(this.currentAuctionNumber - 1);
    await this.getTotalAmountBid(this.currentAuctionNumber - 1);
    this.refreshing = false;
  }

  protected async bid(amount: BigNumber): Promise<void> {

    const currentAccount = this.web3Service.defaultAccount;

    try {

      this.bidding = true;

      const reason = await this.wrapper.getBidBlocker({ amount });

      if (reason) {
        this.eventAggregator.publish('handleFailure', new EventConfigFailure(`Can't bid: ${reason}`));
      } else {

        await (await this.token.approve({
          amount,
          owner: currentAccount,
          spender: this.wrapper.address,
        })).watchForTxMined();

        const result = await (await this.wrapper.bid({ amount })).watchForTxMined();

        this.eventAggregator.publish('handleTransaction', new EventConfigTransaction(
          `The bid has been recorded`, result.transactionHash));
      }

    } catch (ex) {
      this.eventAggregator.publish('handleException', new EventConfigException(`The bid could not be recorded`, ex));
    }

    this.bidding = false;
  }

  private getAuctionNotBegun(blockDate: Date): boolean {
    return this.auctionNotBegun = (blockDate < this.auctionsStartTime);
  }

  private getAuctionIsOver(blockDate: Date): boolean {
    return this.auctionIsOver = (blockDate > this.auctionsEndTime);
  }

  private getMsRemainingInAuctionCountdown(): number {
    return this.msRemainingInAuctionCountdown = Math.max(0, this.auctionEndTime.getTime() - Date.now());
  }

  private async updateAuctionStatus(): Promise<void> {
    if (typeof this.currentAuctionNumber === 'undefined') {
      await this.getCurrentAuctionNumber();
      await this.getCurrentAuctionEndTime();
    }
    this.getMsRemainingInAuctionCountdown();
    if (this.msRemainingInAuctionCountdown === 0) {
      const currentAuctionNumber = this.currentAuctionNumber;
      await this.getCurrentAuctionNumber();
      if (this.currentAuctionNumber !== currentAuctionNumber) {
        this.getCurrentAuctionEndTime();
        this.getAmountBid(this.currentAuctionNumber - 1);
        this.getTotalAmountBid(this.currentAuctionNumber - 1);
      }
    }
  }

  private async getAmountBid(auctionId: number): Promise<BigNumber> {
    if (this.auctionNotBegun || this.auctionIsOver) {
      return new BigNumber(0);
    }
    return this.amountBid = await this.wrapper.getBid(this.web3Service.defaultAccount, auctionId);
  }

  private async getTotalAmountBid(auctionId: number): Promise<BigNumber> {
    if (this.auctionNotBegun || this.auctionIsOver) {
      return new BigNumber(0);
    }
    // or getBid for the current user
    return this.totalAmountBid = await this.wrapper.getAuctionTotalBid(auctionId);
  }

  private async getCurrentAuctionNumber(): Promise<number> {
    if (this.auctionNotBegun || this.auctionIsOver) {
      return -1;
    }
    return this.currentAuctionNumber = (await this.wrapper.getCurrentAuctionId()) + 1;
  }

  private getCurrentAuctionEndTime(): Date {
    const auctionDuration = this.auctionPeriod;
    const ms = this.auctionsStartTime.getTime() + (this.currentAuctionNumber * auctionDuration);
    return this.auctionEndTime = new Date(ms);
  }
}
