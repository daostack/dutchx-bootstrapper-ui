import { bindable, containerless, customElement, autoinject, bindingMode } from 'aurelia-framework';
import { TokenService } from "../../../services/TokenService";
import { Address } from 'services/ArcService';

@autoinject
@containerless
@customElement("tokenbalance")
export class TokenBalance {

  @bindable({ defaultBindingMode: bindingMode.oneTime }) token: Address;

  private balance: string;
  private text: string;

  constructor(
    private tokenService: TokenService
  ) {
  }

  private events;

  attached() {
    this.readBalance();
  }

  detached() {
    if (this.events) {
      this.events.stopWatching();
      this.events = null;
    }
  }

  async readBalance() {

    const token = await this.tokenService.getStandardToken(this.token);

    if (token) {
      this.getBalance(token);

      this.events = token.contract.allEvents({ fromBlock: 'latest' });

      this.events.watch(() => {
        this.getBalance(token);
      });
    } else {
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
