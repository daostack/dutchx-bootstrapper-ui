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
  Address, ArcService, Locking4ReputationLockEventResult, WrapperService
} from '../services/ArcService';

@autoinject
export class Status extends BaseNetworkPage {
  protected lockService: LockService;
  private tokens: Array<ITokenSpecification> = [];
  private auctions: Array<IAuctionSpecification> = [];
  private ethStaked: BigNumber = new BigNumber(0);
  private numEthStakes: number = 0;
  private ethStakers: Set<Address> = new Set();
  private tokenUnitsStaked: BigNumber = new BigNumber(0);
  private tokenEthStaked: BigNumber = new BigNumber(0);
  private numTokenStakes: number = 0;
  private tokenStakers: Set<Address> = new Set();
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

    if (this.loading) {
      return;
    }

    this.loading = true;
    let schemeInfo: SchemeInfo;
    /**
     * presumes the Dashboard page has previously been loaded
     */
    // tslint:disable: no-console
    console.time('entire process');
    try {
      schemeInfo = this.getSchemeInfoFromName('LockingEth4Reputation');
      const ethLockingWrapper = await WrapperService.factories.LockingEth4Reputation.at(schemeInfo.address);

      console.time('eth getTotalLocked');
      this.ethStaked = await ethLockingWrapper.getTotalLocked();
      console.timeEnd('eth getTotalLocked');
      console.time('eth getLockCount');
      this.numEthStakes = await ethLockingWrapper.getLockCount();
      console.timeEnd('eth getLockCount');

      console.time('get eth locks');

      const ethLocksEventFetcher = ethLockingWrapper.Lock({}, { fromBlock: schemeInfo.blockNumber });
      const allEthLocks = await ethLocksEventFetcher.get();
      for (const stake of allEthLocks) {
        this.ethStakers.add(stake.args._locker);
      }
      console.timeEnd('get eth locks');

      schemeInfo = this.getSchemeInfoFromName('LockingToken4Reputation');
      const tokenLockingWrapper = await WrapperService.factories.LockingToken4Reputation.at(schemeInfo.address);

      console.time('tokens getTotalLocked');
      this.tokenUnitsStaked = await tokenLockingWrapper.getTotalLocked();
      console.timeEnd('tokens getTotalLocked');
      console.time('tokens getLockCount');
      this.numTokenStakes = await tokenLockingWrapper.getLockCount();
      console.timeEnd('tokens getLockCount');

      // make a copy because the original is used by the token locking dashboard
      const tokens = [...this.appConfig.get('lockableTokens')];
      const tokenInfos = new Array<ITokenSpecification>();
      const tokenLocksEventFetcher = tokenLockingWrapper.Lock({}, { fromBlock: schemeInfo.blockNumber });
      const allTokenLocks = await tokenLocksEventFetcher.get();

      console.time('get LockToken events');
      const tokenLockTokenEventFetcher = tokenLockingWrapper.LockToken({}, { fromBlock: schemeInfo.blockNumber });
      const allTokenLockLocks = await tokenLockTokenEventFetcher.get();
      console.timeEnd('get LockToken events');

      for (const stake of allTokenLocks) {
        this.tokenStakers.add(stake.args._locker);
      }

      console.time('get tokens');

      for (const tokenSpec of tokens) {
        console.time('get lockedTokens');
        const tokenStakes = new Array<DecodedLogEntry<Locking4ReputationLockEventResult>>();
        const totalStakers = new Set();
        const price = await this.tokenService.getTokenPriceFactor(tokenSpec.address, tokenLockingWrapper);

        if (!!price) {
          for (const stake of allTokenLocks) {
            const tokenAddress = await tokenLockingWrapper.contract.lockedTokens(stake.args._lockingId);
            if (tokenSpec.address === tokenAddress) {
              totalStakers.add(stake.args._locker);
              tokenStakes.push(stake);
            }
          }
        }
        console.timeEnd('get lockedTokens');

        console.time('get tokenEthStaked');

        const stakedAmount = tokenStakes
          .map((stake) => stake.args._amount)
          .reduce((prev: BigNumber, curr: BigNumber): BigNumber => {
            return prev.add(curr);
          }, new BigNumber(0));

        const stakedEth = tokenStakes
          .map((stake) => {
            // there should always be exactly one LockToken even per Lock event
            const tokenLock = allTokenLockLocks.filter((tl) => tl.args._lockingId === stake.args._lockingId)[0];
            return stake.args._amount.mul(tokenLock.args._numerator).div(tokenLock.args._denominator);
          })
          .reduce((prev: BigNumber, curr: BigNumber): BigNumber => {
            return prev.add(curr);
          }, new BigNumber(0));

        this.tokenEthStaked = this.tokenEthStaked.add(stakedEth);
        console.timeEnd('get tokenEthStaked');

        tokenInfos.push({
          ethStaked: stakedEth,
          stakers: totalStakers.size,
          stakes: tokenStakes.length,
          symbol: tokenSpec.symbol,
          unitsStaked: stakedAmount,
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
      console.timeEnd('get tokens');

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
      console.timeEnd('entire process');
    }
  }
}

interface ITokenSpecification {
  ethStaked: BigNumber;
  stakers: number;
  stakes: number;
  symbol: string;
  unitsStaked: BigNumber;
}

interface IAuctionSpecification {
  auction: number;
  bidders: number;
  bid: BigNumber;
}
