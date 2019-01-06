﻿import { autoinject } from 'aurelia-framework';
import { BigNumber, Web3Service } from '../../services/Web3Service';

/**
 * Convert between Wei (as BigNumber) in viewmodel to eth (as string) in view.
 * Note that even if the viewmodel supplies a number, modified values are saved back
 * to the viewmodel as BigNumber.
 */
@autoinject
export class EthweiValueConverter {

  constructor(
    private web3: Web3Service) { }

  /**
   * ETH string to Wei BigNumber <==  NOTE you always end up with BigNumber in your model
   *
   * When the string cannot be converted to a number, this will return the original string.
   * This helps the user see the original mistake.  Validation will need to make sure that the
   * incorrect value is not persisted.
   * @param ethValue
   */
  public fromView(ethValue: string): BigNumber {
    if ((ethValue === undefined) || (ethValue === null)) {
      return ethValue as any;
    }

    // allow exceptions here so that corrupt data is less likely to make it into a model
    return this.web3.toBigNumber(this.web3.toWei(ethValue, 'ether'));
  }

  /**
   *  Wei BigNumber|number to ETH string
   * @param weiValue
   */
  public toView(weiValue: number | BigNumber, base: number = 10): string {
    try {
      if ((weiValue === undefined) || (weiValue === null)) {
        return '';
      }

      return this.web3.fromWei(weiValue, 'ether').toString(base);
    } catch (ex) {
      return weiValue.toString();
    }
  }
}
