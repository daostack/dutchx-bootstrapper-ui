import { autoinject } from 'aurelia-framework';
import { NumberService, RoundingType } from '../../services/numberService';

/**
 * when a number is retrieved from the element to which it is bound, convert it from a string to a number.
 */
@autoinject
export class RoundValueConverter {

  constructor(private numberService: NumberService) { }

  public toView(value: number, decimals: number = 2, type: RoundingType = RoundingType.HalfUp): number {
    return this.numberService.round(value, decimals, type);
  }

  public fromView(value: string | number, decimals: number = 2, type: RoundingType = RoundingType.HalfUp): number {

    if (typeof value === 'string') {
      value = this.numberService.fromString(value as string);
    }

    return this.numberService.round(value as number, decimals, type);
  }
}
