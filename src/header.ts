import { autoinject, bindingMode, bindable } from 'aurelia-framework';
import { AureliaConfiguration } from 'aurelia-configuration';
import { Address } from 'services/ArcService';
import { EventAggregator } from 'aurelia-event-aggregator';
import { Web3Service } from "services/Web3Service";

@autoinject
export class Header {

  @bindable({ defaultBindingMode: bindingMode.toView }) network;

  private avatarAddress: Address;
  private connected: boolean;

  constructor(
    private appConfig: AureliaConfiguration
    , eventAggregator: EventAggregator
    , private web3Service: Web3Service
  ) {
    this.initialize();
    eventAggregator.subscribe("Network.Changed.Id", () => { this.initialize(); });
  }

  initialize() {
    this.avatarAddress = this.appConfig.get("daoAddress");
    this.connected = this.web3Service.isConnected;
  }
}
