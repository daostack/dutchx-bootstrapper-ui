import { autoinject, bindable, bindingMode, customElement } from 'aurelia-framework';
import { Web3Service } from '../../../services/Web3Service';

@autoinject
@customElement('etherscanlink')
export class EtherscanLink {

  @bindable({ defaultBindingMode: bindingMode.oneTime }) public address: string;

  @bindable({ defaultBindingMode: bindingMode.oneTime }) public text?: string;

  @bindable({ defaultBindingMode: bindingMode.oneTime }) public type: string;

  /**
   * set add classes on the text
   */
  @bindable({ defaultBindingMode: bindingMode.oneTime }) public css: string;

  /**
   * bootstrap config for a tooltip
   */
  @bindable({ defaultBindingMode: bindingMode.oneTime }) public tooltip?: any;

  public clipbutton: HTMLElement;

  public networkExplorerUri: string;

  public copyMessage: string;

  public internal: boolean = false;

  public coldElement: HTMLElement;
  public hotElement: HTMLElement;

  constructor(private web3: Web3Service) {
  }

  public attached() {
    let targetedNetwork = this.web3.networkName;
    if (targetedNetwork === 'Live') {
      targetedNetwork = '';
    }
    const isGanache = targetedNetwork === 'Ganache';
    if (this.type === 'tx') {
      this.copyMessage = 'Hash has been copied to the clipboard';
    } else {
      this.copyMessage = 'Address has been copied to the clipboard';
    }

    if (isGanache) {
      if (this.type === 'tx') {
        this.internal = true;
        this.networkExplorerUri = `/#/txInfo/${this.address}`;
      }
    } else {
      // go with etherscan
      this.networkExplorerUri =
      `http://${targetedNetwork}.etherscan.io/${this.type === 'tx' ? 'tx' : 'address'}/${this.address}`;
    }

    /** timeout so setting of this.networkExplorerUri takes effect in DOM */
    setTimeout(() => {
      if (this.tooltip) {
        ($(this.hotElement) as any).tooltip(this.tooltip);
        ($(this.coldElement) as any).tooltip(this.tooltip);
      }
    }, 0);
  }
}
