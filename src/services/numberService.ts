import * as numeral from 'numeral';

export class NumberService {

  /**
   * Note this will round up when needed and last displayed digit is .5 or higher.
   * @param value
   * @param format
   */
  public toString(value: number, format?: string): string | null {

    // this helps to display the erroneus value in the GUI
    if (typeof value === 'string') {
      return value as any;
    }

    if (Number.isNaN(value)) {
      return null;
    }
    return numeral(value).format(format);
  }

  public fromString(value: string, decimalPlaces: number = 1000): number {

    // this helps to display the erroneus value in the GUI
    if (!this.stringIsNumber(value, decimalPlaces)) {
      return value as any;
    }

    return numeral(value).value();
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
      `^[+|-]?(((\\d{1,3}\\,)((\\d{3}\\,)?)(\\d{3}(\\.\\d{0,${decimalPlaces}})?))|
      (\\d{1,})|(\\d{0,}(\\.\\d{0,${decimalPlaces}})))$` :
      `^[+|-]?(((\\d{1,3}\\,)((\\d{3}\\,)?)(\\d{3}))|(\\d{1,}))$`;
  }
}
