import BigNumber from 'bignumber.js';
import * as numeral from 'numeral';

export class NumberService {

  /**
   * Note this will round up when needed and last displayed digit is .5 or higher.
   * @param value
   * @param format
   */
  public toString(value: number | string, format?: string): string | null | undefined {

    // this helps to display the erroneus value in the GUI
    if ((typeof value === 'string') || (value === null) || (typeof value === 'undefined')) {
      return value as any;
    }

    if (Number.isNaN(value)) {
      return null;
    }

    return numeral(value).format(format);
  }

  public toFixedNumberString(value: BigNumber | number, digits: number = 3): string | null | undefined {

    // this helps to display the erroneus value in the GUI
    if (typeof value === 'string') {
      return value as any;
    }

    if ((value === null) || (value === undefined)) {
      return value as any;
    }

    const isNum = typeof value === 'number';

    if (isNum) {
      if (Number.isNaN(value as number)) {
        return null;
      } else {
        value = new BigNumber(value);
      }
    } else {
      if ((value as BigNumber).isNaN()) {
        return null;
      }
    }

    return (value as BigNumber).toPrecision(digits);

    // if (str.length > digits) {
    //   /**
    //    * place the decimal
    //    */
    //   const ndxDecimalDigit = str.indexOf('.');
    //   let decimalDigits: number;
    //   if (ndxDecimalDigit === -1) {
    //     decimalDigits = Math.min(str.length, digits) - 1;
    //   } else {
    //     decimalDigits = Math.max(str.length - ndxDecimalDigit, ndxDecimalDigit);
    //     return (value as number).toExponential(digits - 1);
    //   } else {
    //     return str;
    //   }

    //   const power = 10 ** (digits + 1);
    //   const maxVal = power - 1; // default 999 (digits 3)
    //   const minVal = 1 / power;       // default .001
  }

  public fromString(value: string, decimalPlaces: number = 1000): number {

    // this helps to display the erroneus value in the GUI
    if (!this.stringIsNumber(value, decimalPlaces)) {
      return value as any;
    }

    if (value && value.match(/^\.0{0,}$/)) {
      /**
       * numeral returns `null` for stuff like '.', '.0', '.000', etc
       */
      return 0;
    } else {
      return numeral(value).value();
    }
  }

  /**
   * returns whether string represents a number.  can have commas and a decimal
   * (note decimal is not allowed if decimalPlaces is 0)
   * default number of decimmals is basically unlimited
   * @param value
   */
  public stringIsNumber(value?: string, decimalPlaces: number = 1000): boolean {

    if (typeof value === 'number') { return true; }

    if ((value === null) || (value === undefined)) { return false; }

    value = value.trim();

    const regex = new RegExp(this.getNumberRegexString(decimalPlaces));
    return regex.test(value);
  }

  private getNumberRegexString(decimalPlaces: number = 0) {
    return (decimalPlaces !== 0) ?
      // tslint:disable-next-line: max-line-length
      `^[+|-]?(((\\d{1,3}\\,)((\\d{3}\\,)?)(\\d{3}?(\\.\\d{0,${decimalPlaces}})?))|(\\d{1,})|(\\d{0,}(\\.\\d{0,${decimalPlaces}})))$` :
      `^[+|-]?(((\\d{1,3}\\,)((\\d{3}\\,)?)(\\d{3}))|(\\d{1,}))$`;
  }
}
