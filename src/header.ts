import { AureliaConfiguration } from 'aurelia-configuration';
import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject, bindable, bindingMode } from 'aurelia-framework';
import { Address } from 'services/ArcService';
import { Web3Service } from 'services/Web3Service';

@autoinject
export class Header {

  @bindable({ defaultBindingMode: bindingMode.toView }) public network;

  private connected: boolean;

  constructor(
    eventAggregator: EventAggregator,
    private web3Service: Web3Service
  ) {
    this.initialize();
    eventAggregator.subscribe('Network.Changed.Id', () => { this.initialize(); });
  }

  private initialize() {
    this.connected = this.web3Service.isConnected;
  }
}
