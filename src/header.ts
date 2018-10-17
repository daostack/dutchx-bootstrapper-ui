import { autoinject, bindingMode, bindable } from 'aurelia-framework';
import { AureliaConfiguration } from 'aurelia-configuration';
import { Address } from 'services/ArcService';

@autoinject
export class Header {

  @bindable({ defaultBindingMode: bindingMode.oneTime }) router;
  @bindable({ defaultBindingMode: bindingMode.oneWay }) network;

  private avatarAddress: Address;
  private avatarLink: HTMLElement;
  private avatarAddressTooptip = {
    toggle: "tooltip",
    placement: "bottom",
    title: "DutchX DAO Avatar Address",
    trigger: "hover"
  };

  constructor(
    appConfig: AureliaConfiguration
  ) {
    this.avatarAddress = appConfig.get("daoAddress");
  }

}
