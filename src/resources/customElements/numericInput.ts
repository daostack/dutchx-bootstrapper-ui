import {
  autoinject,
  bindable,
  bindingMode,
  computedFrom
} from 'aurelia-framework';
import { NumberService } from 'services/numberService';

@autoinject
export class NumericInput {

  @bindable({ defaultBindingMode: bindingMode.toView }) public decimal: boolean = true;
  @bindable({ defaultBindingMode: bindingMode.toView }) public css?: string;
  @bindable({ defaultBindingMode: bindingMode.toView }) public title: string = '';
  @bindable({ defaultBindingMode: bindingMode.toView }) public id?: string;
  @bindable({ defaultBindingMode: bindingMode.twoWay }) public value: number | string;
  @bindable public placeholder = '';

  private element: HTMLElement;

  private _innerValue: string;

  @computedFrom('_innerValue')
  private get innerValue() {
    return this._innerValue;
  }

  private set innerValue(newValue: string) {
    this._innerValue = newValue;
    const value = this.innerValue;
    /**
     * update value from input control
     */
    if ((value === null) || (typeof value === 'undefined') || (value.trim() === '')) {
      this.value = undefined;
      // else this.numberService.fromString would return 0
    } else {
      this.value = this.numberService.fromString(value);
    }
  }

  constructor(private numberService: NumberService) {
  }

  public attached() {
    $(this.element).on('keydown', (e) => { this.keydown(e); });
    /**
     * new value coming from the outside,
     * update input control from newValue
     */
    let newString: string;
    const value = this.value;
    if ((typeof value === 'string') && (value as string).match(/.*\.$/)) {
      newString = value;
      // numberService.toString would return '' for anything that ends in a '.'
    } else {
      newString = this.numberService.toString(value);
    }
    this.innerValue = newString;
  }

  public detached() {
    if (this.element) {
      $(this.element).off('keydown', (e) => { this.keydown(e); });
    }
  }

  // http://stackoverflow.com/a/995193/725866
  private isNavigationOrSelectionKey(e) {
    // Allow: backspace, delete, tab, escape, enter and .
    const currentValue = $(this.element).val() as string;
    if (
      ([46, 8, 9, 27, 13, 110].indexOf(e.keyCode) !== -1) ||
      // Allow: Ctrl+A/X/C/V, Command+A/X/C/V
      (([65, 67, 86, 88].indexOf(e.keyCode) !== -1) && (e.ctrlKey === true || e.metaKey === true)) ||
      // Allow: home, end, left, right, down, up
      (e.keyCode >= 35 && e.keyCode <= 40)
    ) {
      // let it happen, don't do anything
      return true;
    } else {
      /**
       * ecimals are allowed, is a decimal, and there is not already a decimal
       */
      if ((this.decimal && (e.keyCode === 190) &&
        (!currentValue || !currentValue.length || (currentValue.indexOf('.') === -1)))) {
        return true;
      }
    }
    return false;
  }

  // http://stackoverflow.com/a/995193/725866
  private keydown(e) {
    if (!this.isNavigationOrSelectionKey(e)) {
      // If it's not a number, prevent the keypress...
      if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
        e.preventDefault();
      }
    }
  }
}
