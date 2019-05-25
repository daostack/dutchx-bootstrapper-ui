import {
  autoinject,
  bindable,
  bindingMode,
  computedFrom,
  View
} from 'aurelia-framework';
import { NumberService } from 'services/numberService';
import { BigNumber } from 'services/Web3Service';

@autoinject
export class FloatingPointNumber {

  /**
   * how many significant digits we want to display
   */
  @bindable({ defaultBindingMode: bindingMode.toView }) public precision: number | string = 5;
  @bindable({ defaultBindingMode: bindingMode.toView }) public trailingZeroes?: number | string = 2;
  /**
   * Switch numbers to exponential notation at 3 spaces below the decimal,
   * and at the BigNumber default of 20 digits above (basically never goes exponential above).
   */
  @bindable({ defaultBindingMode: bindingMode.toView }) public exponentialAt: number | [number, number] = [-4, 20];
  @bindable({ defaultBindingMode: bindingMode.toView }) public value: number | string | BigNumber;
  @bindable({ defaultBindingMode: bindingMode.toView }) public placement: string = 'top';

  private text: string;
  private textElement: HTMLElement;
  private _value: BigNumber;

  constructor(private numberService: NumberService) {
  }

  public valueChanged() {
    if ((this.value === undefined) || (this.value === null)) {
      this.text = '';
      return;
    }

    this._value = new BigNumber(this.value);

    if (this.trailingZeroes) {
      this.trailingZeroes = Number(this.trailingZeroes);
    }

    if (this.precision) {
      this.precision = Number(this.precision);
    }

    let text = this.numberService.toFixedNumberString(
      this._value,
      this.precision as number,
      this.exponentialAt);

    if (text) {
      /**
       * Make sure there are no more than `trailingZeroes` zeroes.
       * There may be fewer than `trailingZeroes` zeroes if the number's precision demands it.
       * There may otherwise be more than `trailingZeroes` zeroes to maintain the number of digits
       * in the requested precision.  In the latter case, `trailingZeroes` limits the number of traling zeros.
       */
      if ((typeof this.trailingZeroes !== 'undefined')) {
        const regex = new RegExp(`\\.[0]{${this.trailingZeroes as number + 1},}$`);

        text = text.replace(regex, `.${'0'.repeat(this.trailingZeroes as number)}`)
          // removes zeroes trailing after non-zero digits below the decimal
          .replace(/(\.\d*?[1-9])0+$/g, '$1');

        /**
         * Don't be left with a trailing "." when trailingZeroes is 0
         */
        if ((this.trailingZeroes === 0) && text && (text[text.length - 1] === '.')) {
          text = text.slice(0, text.length - 1);
        }
      }
    }

    this.text = text;

    this.setTooltip();
  }

  public attached() {
    this.setTooltip();
  }

  public detached() {
    ($(this.textElement) as any).tooltip('dispose');
  }

  private setTooltip() {
    if (this.textElement && this.text) {
      ($(this.textElement) as any).tooltip('dispose');
      ($(this.textElement) as any).tooltip(
        {
          placement: this.placement,
          title: this._value.toString(10),
          toggle: 'tooltip',
          trigger: 'hover',
        }
      );
    }
  }
}
