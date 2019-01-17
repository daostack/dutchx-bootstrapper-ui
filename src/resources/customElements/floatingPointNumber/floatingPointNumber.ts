import {
  autoinject,
  bindable,
  bindingMode,
  computedFrom
} from 'aurelia-framework';
import { NumberService } from 'services/numberService';

@autoinject
export class FloatingPointNumber {

  @bindable({ defaultBindingMode: bindingMode.toView }) public decimals: number = 2;
  @bindable({ defaultBindingMode: bindingMode.toView }) public value: number;

  constructor(private numberService: NumberService) {
  }
}
