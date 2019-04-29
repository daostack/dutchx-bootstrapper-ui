import { AureliaConfiguration } from 'aurelia-configuration';
import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject } from 'aurelia-framework';
import { BaseNetworkPage } from 'baseNetworkPage';
import { DaoService } from 'services/DaoService';
import { LockService } from 'services/lockServices';
import { NetworkConnectionWizards } from 'services/networkConnectionWizards';
import { SchemeInfo, SchemeService } from 'services/SchemeService';
import { SortService } from 'services/SortService';
import { TokenService } from 'services/TokenService';
import { BigNumber, Web3Service } from 'services/Web3Service';
import { DecodedLogEntry } from 'web3';
import {
  Address, ArcService, Locking4ReputationLockEventResult, LockingToken4ReputationWrapper, WrapperService
} from '../services/ArcService';

@autoinject
export class Status extends BaseNetworkPage {
  protected lockService: LockService;
  private tokens: Array<ITokenSpecification> = [];
  private auctions: Array<IAuctionSpecification> = [];
  private ethStaked: BigNumber = new BigNumber(0);
  private numEthStakers: number = 0;
  private tokenValueStaked: BigNumber = new BigNumber(0);
  private numTokenStakers: number = 0;
  private mgnRegistrations: number = 0;
  private mgnClaims: number = 0;
  private mgnValueClaimed: BigNumber = new BigNumber(0);
  private totalGenBid: BigNumber = new BigNumber(0);
  private genBidders: number = 0;

  constructor(
    web3: Web3Service,
    daoService: DaoService,
    schemeService: SchemeService,
    appConfig: AureliaConfiguration,
    private tokenService: TokenService,
    eventAggregator: EventAggregator,
    networkConnectionWizards: NetworkConnectionWizards,
    arcService: ArcService,
    web3Service: Web3Service
  ) {
    super(
      web3,
      schemeService,
      daoService,
      eventAggregator,
      appConfig,
      networkConnectionWizards,
      arcService,
      web3Service);
  }

  public async activate(options: any = {}): Promise<void> {

    this.subscriptions.push(this.eventAggregator
      .subscribe('DAO.loaded', () => this.load()));

    return super.activate(options);
  }

  public async attached() {
    $('body').css('overflow-y', 'auto');
  }

  public async load() {
    this.loading = true;
    let schemeInfo: SchemeInfo;
    /**
     * presumes the Dashboard page has previously been loaded
     */
    try {
      schemeInfo = this.getSchemeInfoFromName('LockingEth4Reputation');
      const ethLockingWrapper = await WrapperService.factories.LockingEth4Reputation.at(schemeInfo.address);

      this.ethStaked = await ethLockingWrapper.getTotalLocked();
      this.numEthStakers = await ethLockingWrapper.getLockCount();

      schemeInfo = this.getSchemeInfoFromName('LockingToken4Reputation');
      const tokenLockingWrapper = await WrapperService.factories.LockingToken4Reputation.at(schemeInfo.address);

      this.tokenValueStaked = await tokenLockingWrapper.getTotalLocked();
      this.numTokenStakers = await tokenLockingWrapper.getLockCount();

      // make a copy because the original is used by the token locking dashboard
      const tokens = [...this.appConfig.get('lockableTokens')];
      const tokenInfos = new Array<ITokenSpecification>();
      const locksEventFetcher = tokenLockingWrapper.Lock({}, { fromBlock: schemeInfo.blockNumber });
      const allLocks = await locksEventFetcher.get();

      for (const tokenSpec of tokens) {
        const tokenStakes = new Array<DecodedLogEntry<Locking4ReputationLockEventResult>>();
        for (const stake of allLocks) {
          const tokenAddress = await tokenLockingWrapper.contract.lockedTokens(stake.args._lockingId);
          if (tokenSpec.address === tokenAddress) {
            tokenStakes.push(stake);
          }
        }

        const stakedAmount = tokenStakes
          .map((stake) => stake.args._amount)
          .reduce((prev: BigNumber, curr: BigNumber): BigNumber => {
            return prev.add(curr);
          }, new BigNumber(0));

        tokenInfos.push({
          staked: stakedAmount,
          stakers: tokenStakes.length,
          symbol: tokenSpec.symbol,
        });
      }

      this.tokens = [
        ...tokenInfos
          .filter((tokenInfo: ITokenSpecification) => {
            return tokenInfo.stakers;
          })
          .sort((a: ITokenSpecification, b: ITokenSpecification) => {
            return SortService.evaluateString(a.symbol, b.symbol);
          }),
        ...tokenInfos
          .filter((tokenInfo: ITokenSpecification) => {
            return !tokenInfo.stakers;
          })
          .sort((a: ITokenSpecification, b: ITokenSpecification) => {
            return SortService.evaluateString(a.symbol, b.symbol);
          }),
      ];

      schemeInfo = this.getSchemeInfoFromName('ExternalLocking4Reputation');
      const mgnLockingWrapper = await WrapperService.factories.ExternalLocking4Reputation.at(schemeInfo.address);

      const registrationsEventFetcher = mgnLockingWrapper.Register({}, { fromBlock: schemeInfo.blockNumber });
      const allRegistrations = await registrationsEventFetcher.get();

      this.mgnRegistrations = allRegistrations.length;

      this.mgnValueClaimed = await mgnLockingWrapper.getTotalLocked();
      this.mgnClaims = await mgnLockingWrapper.getLockCount();

      schemeInfo = this.getSchemeInfoFromName('Auction4Reputation');
      const auctionWrapper = await WrapperService.factories.Auction4Reputation.at(schemeInfo.address);

      const numAuctions = await auctionWrapper.getNumberOfAuctions();
      const bids = await auctionWrapper.getBids(null);

      this.totalGenBid = bids
        .map((bid) => bid.amount)
        .reduce((prev: BigNumber, curr: BigNumber): BigNumber => {
          return prev.add(curr);
        }, new BigNumber(0));

      const bidders = new Set<Address>();
      bids.map((bid) => {
        bidders.add(bid.bidder);
      });

      this.genBidders = bidders.size;
      const auctions = new Array<IAuctionSpecification>();

      for (let auctionId = 0; auctionId < numAuctions; ++auctionId) {

        const auctionBids = bids.filter((bid) => bid.auctionId === auctionId);
        bidders.clear();

        auctionBids.map((bid) => {
          bidders.add(bid.bidder);
        });

        auctions.push({
          auction: auctionId,
          bid: auctionBids
            .map((bid) => bid.amount)
            .reduce((prev: BigNumber, curr: BigNumber): BigNumber => {
              return prev.add(curr);
            }, new BigNumber(0)),
          bidders: bidders.size,
        });
      }

      this.auctions = auctions;
    } finally {
      this.loading = false;
    }
  }
}

interface ITokenSpecification {
  staked: BigNumber;
  stakers: number;
  symbol: string;
}

interface IAuctionSpecification {
  auction: number;
  bidders: number;
  bid: BigNumber;
}
