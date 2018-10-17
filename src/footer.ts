import { autoinject } from 'aurelia-framework';
import { AureliaConfiguration } from 'aurelia-configuration';
import { Address } from 'services/ArcService';

@autoinject
export class Footer {

  private gnoAddress: Address;
  private mgnAddress: Address;

  constructor(
    appConfig: AureliaConfiguration
  ) {
    this.gnoAddress = appConfig.get("gnoTokenAddress");
    this.mgnAddress = appConfig.get("mgnTokenAddress");
  }
}
