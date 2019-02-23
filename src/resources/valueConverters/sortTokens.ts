import { ITokenSpecificationX } from 'schemeDashboards/LockingToken4Reputation';
import { SortService } from 'services/SortService';

export class SortTokensValueConverter {
  public signals = ['token.changed'];
  public toView(tokens) {
    return [
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
  }
}
