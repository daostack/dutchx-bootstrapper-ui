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
  @bindable({ defaultBindingMode: bindingMode.toView }) public title?: string;
  @bindable({ defaultBindingMode: bindingMode.toView }) public id?: string;
  @bindable({ defaultBindingMode: bindingMode.twoWay }) public value: number;
  @bindable public placeholder = '';

  private element: HTMLElement;

  private _innerValue: string;

  @computedFrom('_innerValue')
  private get innerValue() {
    return this._innerValue;
  }

  private set innerValue(newValue: string) {
    this._innerValue = newValue;
    this.value = this.numberService.fromString(newValue);
  }

  constructor(private numberService: NumberService) {
  }

  public attached() {
    this.element.addEventListener('keydown', (e) => { this.keydown(e); });
    this.innerValue = this.numberService.toString(this.value);
  }

  public detached() {
    if (this.element) {
      this.element.removeEventListener('keydown', (e) => { this.keydown(e); });
    }
  }

  // http://stackoverflow.com/a/995193/725866
  private isNavigationOrSelectionKey(e) {
    // Allow: backspace, delete, tab, escape, enter and .
    if (
      (this.decimal && (e.keyCode === 190) && (this.innerValue.indexOf('.') === -1)) ||
      ([46, 8, 9, 27, 13, 110].indexOf(e.keyCode) !== -1) ||
      // Allow: Ctrl+A/X/C/V, Command+A/X/C/V
      (([65, 67, 86, 88].indexOf(e.keyCode) !== -1) && (e.ctrlKey === true || e.metaKey === true))  ||
      // Allow: home, end, left, right, down, up
      (e.keyCode >= 35 && e.keyCode <= 40)
      ) {
      // let it happen, don't do anything
      return true;
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
