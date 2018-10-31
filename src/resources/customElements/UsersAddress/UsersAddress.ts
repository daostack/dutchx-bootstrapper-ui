import { bindable, containerless, customElement, autoinject, bindingMode } from 'aurelia-framework';
import { Web3Service } from "../../../services/Web3Service";
import { EventAggregator } from 'aurelia-event-aggregator';

@autoinject
@containerless
@customElement("usersaddress")
export class UsersAddress {

  /**
   * bootstrap config for a tooltip
   */
  @bindable({ defaultBindingMode: bindingMode.oneTime }) tooltip?: any;

  private usersAddress: string;

  constructor(private web3: Web3Service,
    private eventAggregator: EventAggregator) {
    this.eventAggregator.subscribe("Network.Changed.Account", () => { this.initialize(); });
    this.initialize();
  }

  initialize() {
    this.usersAddress = this.web3.defaultAccount;
  }
}
