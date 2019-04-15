import { AureliaConfiguration } from 'aurelia-configuration';
import { autoinject } from 'aurelia-framework';
import { SchemeInfo } from 'entities/SchemeInfo';
import { ITokenSpecification, LockService } from 'services/lockServices';
import { SortService } from 'services/SortService';
import { TokenService } from 'services/TokenService';
import { Dashboard } from '../organizations/dashboard';
import {
  LockingToken4ReputationWrapper, WrapperService
} from '../services/ArcService';

@autoinject
export class Liquidity {
  protected lockService: LockService;
  private noScheme: boolean = false;
  private tokens: Array<ITokenSpecificationX>;
  private loading = true;

  constructor(
    private appConfig: AureliaConfiguration,
    private tokenService: TokenService,
    private dashboard: Dashboard
  ) {
  }

  public async attached() {
    $('body').css('overflow-y', 'auto');

    let schemeInfo: SchemeInfo;
    /**
     * presumes the Dashboard page has previously been loaded
     */
    try {
      schemeInfo = this.dashboard.getSchemeInfoFromName('LockingToken4Reputation');
      const tokenLockingWrapper = await WrapperService.factories.LockingToken4Reputation.at(schemeInfo.address);

      // make a copy because the original is used by the token locking dashboard
      this.tokens = [...this.appConfig.get('lockableTokens')];

      for (const tokenSpec of this.tokens) {
        tokenSpec.isLiquid = await this.tokenService.getTokenIsLiquid(tokenSpec.address, tokenLockingWrapper);
      }

      this.tokens = [
        ...this.tokens
          .filter((tokenInfo: ITokenSpecificationX) => {
            return tokenInfo.isLiquid;
          })
          .sort((a: ITokenSpecificationX, b: ITokenSpecificationX) => {
            return SortService.evaluateString(a.symbol, b.symbol);
          }),
        ...this.tokens
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
}
