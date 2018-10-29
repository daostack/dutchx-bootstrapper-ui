import { bindable, containerless, customElement, autoinject, bindingMode } from 'aurelia-framework';
import { TokenService } from "../../../services/TokenService";
import { Address } from 'services/ArcService';
import { EventAggregator } from 'aurelia-event-aggregator';

@autoinject
@containerless
@customElement("tokenbalance")
export class TokenBalance {

  @bindable({ defaultBindingMode: bindingMode.toView }) token: Address;

  private balance: string;
  private text: string;

  constructor(
    private tokenService: TokenService,
    eventAggregator: EventAggregator
  ) {
    eventAggregator.subscribe("Network.Changed.Account", () => { this.initialize(); });
  }

  private events;

  initialize() {
    this.stop();
    this.readBalance();
  }

  attached() {
    this.initialize();
  }

  detached() {
    this.stop();
  }

  tokenChanged() {
    this.initialize();
  }

  stop() {
    if (this.events) {
      this.events.stopWatching();
      this.events = null;
    }
  }

  async readBalance() {

    if (this.token) {

      const token = await this.tokenService.getStandardToken(this.token);

      if (token) {
        this.getBalance(token);

        this.events = token.contract.allEvents({ fromBlock: 'latest' });

        this.events.watch(() => {
          this.getBalance(token);
        });
      }
    }

    if (!this.events) {
      this.text = `N/A`;
    }
  }
  async getBalance(token) {
    try {
      this.balance = (await this.tokenService.getUserStandardTokenBalance(token, true)).toFixed(2);
      this.text = this.balance.toString();
    } catch {
    }
  }
}
