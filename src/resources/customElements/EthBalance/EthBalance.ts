import { bindable, containerless, customElement, autoinject } from 'aurelia-framework';
import { Web3Service } from "../../../services/Web3Service";
import { EventAggregator } from 'aurelia-event-aggregator';

@autoinject
@containerless
@customElement("ethbalance")
export class EthBalance {

  private ethBalance: string = '';
  private rawBalance: string = '';
  private filter: any;
  private textElement: HTMLElement;

  constructor(private web3: Web3Service,
    eventAggregator: EventAggregator) {
    eventAggregator.subscribe("Network.Changed.Account", () => { this.initialize(); });
    eventAggregator.subscribe("Network.Changed.Id", () => { this.initialize(); });
  }

  text: string;

  initialize(): Promise<void> {
    this.stop();
    return this.readBalance().then(() => {
      (<any>$(this.textElement)).tooltip("dispose");
      (<any>$(this.textElement)).tooltip(
        {
          toggle: "tooltip",
          placement: "left",
          title: this.rawBalance,
          trigger: "hover"
        }
      )
    });
  }

  stop() {
    if (this.filter) {
      this.filter.stopWatching();
      this.filter = null;
    }
  }

  attached() {
    this.initialize();
  }

  detached() {
    this.stop();
  }

  async readBalance() {
    /**
     * this is supposed to fire whenever a new block is created
     */
    this.filter = this.web3.eth.filter({ fromBlock: 'latest' }).watch(() => {
      this.getBalance();
    });
    return this.getBalance();
  }

  async getBalance() {
    try {
      const ethAddress = this.web3.defaultAccount;
      const balance = this.web3.fromWei(await this.web3.getBalance(ethAddress));
      this.rawBalance = `${balance.toString(10)} ETH`;
      if (balance.eq(0) || (balance.lt(999)) && (balance.gt("0.001"))) {
        this.ethBalance = balance.toFixed(3);
      } else {
        this.ethBalance = balance.toExponential(2);
      }

      this.text = `${this.ethBalance} ETH`;
    } catch (ex) {
    }
  }
}
