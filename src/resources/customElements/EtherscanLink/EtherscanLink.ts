import { bindable, customElement, autoinject, bindingMode } from 'aurelia-framework';
import { Web3Service } from '../../../services/Web3Service';

@autoinject
@customElement("etherscanlink")
export class EtherscanLink {

  @bindable({ defaultBindingMode: bindingMode.oneTime }) address: string;

  @bindable({ defaultBindingMode: bindingMode.oneTime }) text?: string;

  @bindable({ defaultBindingMode: bindingMode.oneTime }) type: string;

  /**
   * set add classes on the text
   */
  @bindable({ defaultBindingMode: bindingMode.oneTime }) css: string;

  /**
   * bootstrap config for a tooltip
   */
  @bindable({ defaultBindingMode: bindingMode.oneTime }) tooltip?: any;

  clipbutton: HTMLElement;

  networkExplorerUri: string;

  copyMessage: string;

  internal: boolean = false;

  coldElement: HTMLElement;
  hotElement: HTMLElement;

  constructor(private web3: Web3Service) {
  }

  attached() {
    let targetedNetwork = this.web3.networkName;
    if (targetedNetwork === "Live") {
      targetedNetwork = "";
    }
    const isGanache = targetedNetwork === "Ganache";
    if (this.type == "tx") {
      this.copyMessage = "Hash has been copied to the clipboard";
    } else {
      this.copyMessage = "Address has been copied to the clipboard";
    }

    if (isGanache) {
      if (this.type === "tx") {
        this.internal = true;
        this.networkExplorerUri = `/#/txInfo/${this.address}`;
      }
    } else {
      // go with etherscan
      this.networkExplorerUri = `http://${targetedNetwork}.etherscan.io/${this.type === "tx" ? "tx" : "address"}/${this.address}`;
    }

    /** timeout so setting of this.networkExplorerUri takes effect in DOM */
    setTimeout(() => {
      if (this.tooltip) {
        (<any>$(this.hotElement)).tooltip(this.tooltip);
        (<any>$(this.coldElement)).tooltip(this.tooltip);
      }
    }, 0);
  }
}
