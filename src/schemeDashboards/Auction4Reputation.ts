import { autoinject } from 'aurelia-framework';
import { DaoSchemeDashboard } from "./schemeDashboard"
import { EventAggregator } from 'aurelia-event-aggregator';
import { WrapperService, Address, Auction4ReputationWrapper, StandardTokenWrapper } from "../services/ArcService";
import { BigNumber, Web3Service } from '../services/Web3Service';
import { SchemeDashboardModel } from 'schemeDashboards/schemeDashboardModel';
import { EventConfigTransaction, EventConfigException, EventConfigFailure } from 'entities/GeneralEvents';
import { Utils } from 'services/utils';
import { DisposableCollection } from "services/DisposableCollection";

@autoinject
export class Auction4Reputation extends DaoSchemeDashboard {

  protected wrapper: Auction4ReputationWrapper;
  auctionPeriod: number;
  totalReputationRewardable: BigNumber;
  totalReputationRewardableLeft: BigNumber;
  auctionsStartTime: Date;
  auctionsEndTime: Date;
  numberOfAuctions: number;
  auctionReputationReward: BigNumber;
  walletAddress: Address;
  token: StandardTokenWrapper;
  auctionId: number = -1;
  auctionIsOver: boolean;
  auctionNotBegun: boolean;
  userHasBid: boolean = false;
  refreshing: boolean = false;
  refreshingLockers: boolean = false;
  loaded: boolean = false;
  subscriptions = new DisposableCollection();
  bidding: boolean = false;

  constructor(
    protected eventAggregator: EventAggregator
    , protected web3Service: Web3Service
  ) {
    super();
  }

  async activate(model: SchemeDashboardModel) {
    this.wrapper = await WrapperService.factories[model.name].at(model.address);
  }

  private getAuctionNotBegun(blockDate: Date): boolean {
    // return this.auctionNotBegun = false;
    return this.auctionNotBegun = (blockDate < this.auctionsStartTime);
  }

  private getAuctionIsOver(blockDate: Date): boolean {
    // return this.auctionIsOver = true;
    return this.auctionIsOver = (blockDate > this.auctionsEndTime);
  }

  attached() {
    this.subscriptions.push(this.eventAggregator.subscribe("secondPassed", async (blockDate: Date) => {
      this.getAuctionNotBegun(blockDate);
      this.getAuctionIsOver(blockDate);
    }));
    return this.refresh().then(() => { this.loaded = true; });
  }

  detached() {
    this.subscriptions.dispose();
  }

  protected async refresh() {
    this.refreshing = true;
    this.token = await this.wrapper.getToken();
    this.walletAddress = await this.wrapper.getWallet();
    this.auctionPeriod = await this.wrapper.getAuctionPeriod();
    this.totalReputationRewardable = await this.wrapper.getReputationReward();
    this.totalReputationRewardableLeft = await this.wrapper.getReputationRewardLeft();
    this.auctionsStartTime = await this.wrapper.getAuctionsStartTime();
    this.auctionsEndTime = await this.wrapper.getAuctionsEndTime();
    // this.numberOfAuctions = await this.wrapper.getNumberOfAuctions();
    this.refreshing = false;
  }

  protected async bid(amount: BigNumber): Promise<void> {

    const currentAccount = this.web3Service.defaultAccount;

    try {

      this.bidding = true;

      const reason = await this.wrapper.getBidBlocker({ amount });

      if (reason) {
        this.eventAggregator.publish("handleFailure", new EventConfigFailure(`Can't bid: ${reason}`));
      } else {

        await (await this.token.approve({
          owner: currentAccount,
          amount: amount,
          spender: this.wrapper.address
        })).watchForTxMined();

        let result = await (await this.wrapper.bid({ amount })).watchForTxMined();

        this.eventAggregator.publish("handleTransaction", new EventConfigTransaction(
          `The bid has been recorded`, result.transactionHash));
      }

    } catch (ex) {
      this.eventAggregator.publish("handleException", new EventConfigException(`The bid could not be recorded`, ex));
    }

    this.bidding = false;
  }

  // protected async redeem(auctionId: number, beneficiaryAddress: Address) {

  //   /**
  //    * TODO!!!:  will there be a problem with timezones here???
  //    * Should get this id from Arc, see: https://github.com/daostack/arc/issues/548
  //    * In any case, it can't be replired-upon that the current auction will not have changed between now and when
  //    * execution actually reached the contract.
  //    */
  //   // const currentAuctionId = Math.floor((Date.now() - this.auctionsStartTime.getTime()) / 1000 / this.auctionPeriod);
  //   // const amountMayRedeem = await this.wrapper.getBid(beneficiaryAddress, currentAuctionId);

  //   try {

  //     let result = await this.wrapper.redeem({ auctionId, beneficiaryAddress });

  //     this.eventAggregator.publish("handleTransaction", new EventConfigTransaction(
  //       `The reputation has beem redeemed`, result.tx));

  //     this.auctionId = -1;

  //   } catch (ex) {
  //     this.eventAggregator.publish("handleException", new EventConfigException(`The reputation could not be redeemed`, ex));
  //   }
  // }

  // async _userHasBid(auctionId: number): Promise<void> {
  //   this.userHasBid = (await this.wrapper.getBid(this.web3Service.defaultAccount, auctionId)).gt(0);
  // }

  // async _totalBids(auctionId: number): Promise<BigNumber> {
  //   let totalBids = new BigNumber(0);
  //   const numAuctions = await this.wrapper.getNumberOfAuctions();
  //   for (let auctionId = 0; auctionId < numAuctions; ++auctionId) {
  //     totalBids.add(await this.wrapper.getAuctionTotalBid(auctionId));
  //   }
  //   return totalBids;
  // }

  // private setAuctionId(auctionId: number): void {
  //   this.auctionId = auctionId;
  //   this._userHasBid(auctionId);
  // }
}
