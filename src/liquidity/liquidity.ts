import { AureliaConfiguration } from 'aurelia-configuration';
import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject } from 'aurelia-framework';
import { BaseNetworkPage } from 'baseNetworkPage';
import { SchemeInfo } from 'entities/SchemeInfo';
import { DaoService } from 'services/DaoService';
import { ITokenSpecification, LockService } from 'services/lockServices';
import { NetworkConnectionWizards } from 'services/networkConnectionWizards';
import { SchemeService } from 'services/SchemeService';
import { SortService } from 'services/SortService';
import { TokenService } from 'services/TokenService';
import { BigNumber, Web3Service } from 'services/Web3Service';
import {
  ArcService, WrapperService
} from '../services/ArcService';

@autoinject
export class Liquidity extends BaseNetworkPage {
  protected lockService: LockService;
  private noScheme: boolean = false;
  private tokens: Array<ITokenSpecificationX>;

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
      schemeInfo = this.getSchemeInfoFromName('LockingToken4Reputation');
      const tokenLockingWrapper = await WrapperService.factories.LockingToken4Reputation.at(schemeInfo.address);

      // make a copy because the original is used by the token locking dashboard
      const tokens = [...this.appConfig.get('lockableTokens')];

      for (const tokenSpec of tokens) {
        const price = await this.tokenService.getTokenPriceFactor(tokenSpec.address, tokenLockingWrapper);
        tokenSpec.isLiquid = !!price;
        tokenSpec.price = price;
      }

      this.tokens = [
        ...tokens
          .filter((tokenInfo: ITokenSpecificationX) => {
            return tokenInfo.isLiquid;
          })
          .sort((a: ITokenSpecificationX, b: ITokenSpecificationX) => {
            return SortService.evaluateString(a.symbol, b.symbol);
          }),
        ...tokens
          .filter((tokenInfo: ITokenSpecificationX) => {
            return !tokenInfo.isLiquid;
          })
          .sort((a: ITokenSpecificationX, b: ITokenSpecificationX) => {
            return SortService.evaluateString(a.symbol, b.symbol);
          }),
      ];
    } catch {
      this.noScheme = true;
    } finally {
      this.loading = false;
    }
  }
}

interface ITokenSpecificationX extends ITokenSpecification {
  isLiquid: boolean;
  price: BigNumber;
}
