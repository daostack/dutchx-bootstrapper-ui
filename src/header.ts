import { autoinject, bindingMode, bindable } from 'aurelia-framework';
import { AureliaConfiguration } from 'aurelia-configuration';
import { Address } from 'services/ArcService';
import { EventAggregator } from 'aurelia-event-aggregator';

@autoinject
export class Header {

  @bindable({ defaultBindingMode: bindingMode.oneTime }) router;
  @bindable({ defaultBindingMode: bindingMode.toView }) network;

  private avatarAddress: Address;
  private avatarLink: HTMLElement;
  private avatarAddressTooptip = {
    toggle: "tooltip",
    placement: "bottom",
    title: "DutchX DAO Avatar Address",
    trigger: "hover"
  };

  constructor(
    private appConfig: AureliaConfiguration,
    eventAggregator: EventAggregator
  ) {
    this.initialize();
    eventAggregator.subscribe("Network.Changed.Id", () => { this.initialize(); });
  }

  initialize() {
    this.avatarAddress = this.appConfig.get("daoAddress");
  }
}
