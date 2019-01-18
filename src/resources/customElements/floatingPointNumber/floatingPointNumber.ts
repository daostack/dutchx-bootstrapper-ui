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

  @bindable({ defaultBindingMode: bindingMode.toView }) public precision: number | string = 5;
  @bindable({ defaultBindingMode: bindingMode.toView }) public trailingZeroes?: number | string;
  @bindable({ defaultBindingMode: bindingMode.toView }) public value: number | BigNumber;
  @bindable({ defaultBindingMode: bindingMode.toView }) public placement: string = 'top';

  private text: string;
  private textElement: HTMLElement;

  constructor(private numberService: NumberService) {
  }

  public attached() {
    if (this.trailingZeroes) {
      this.trailingZeroes = Number(this.trailingZeroes);
    }

    if (this.precision) {
      this.precision = Number(this.precision);
    }

    let text = this.numberService.toFixedNumberString(this.value, this.precision as number);

    if (text) {
      /**
       * Make sure there are no more than `trailingZeroes` zeroes.
       * There may be fewer than `trailingZeroes` zeroes if the number's precision demands it.
       * There may otherwise be more than `trailingZeroes` zeroes to maintain the number of digits
       * in the requested precision.  In this case, `trailingZeroes` limits the number
       */
      if ((typeof this.trailingZeroes !== 'undefined')) {
        const regex = new RegExp(`\.[0]{${this.trailingZeroes as number + 1},}$`);

        text = text.replace(regex, `.${'0'.repeat(this.trailingZeroes as number)}`);
      }
    }

    this.text = text;

    if (this.text) {
      ($(this.textElement) as any).tooltip('dispose');
      ($(this.textElement) as any).tooltip(
        {
          placement: this.placement,
          title: (typeof this.value === 'number') ? this.value : this.value.toNumber(),
          toggle: 'tooltip',
          trigger: 'hover',
        }
      );
    }
  }

  public detached() {
    ($(this.textElement) as any).tooltip('dispose');
  }
}
