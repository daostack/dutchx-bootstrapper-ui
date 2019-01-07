import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject, bindable, bindingMode, containerless, customElement } from 'aurelia-framework';
import { Web3Service } from '../../../services/Web3Service';

@autoinject
@containerless
@customElement('usersaddress')
export class UsersAddress {

  /**
   * bootstrap config for a tooltip
   */
  @bindable({ defaultBindingMode: bindingMode.oneTime }) public tooltip?: any;

  private usersAddress: string;

  constructor(private web3: Web3Service,
              private eventAggregator: EventAggregator) {
    this.eventAggregator.subscribe('Network.Changed.Account', () => { this.initialize(); });
    this.initialize();
  }

  private initialize() {
    this.usersAddress = this.web3.defaultAccount;
  }
}
