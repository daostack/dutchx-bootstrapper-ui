import { autoinject } from 'aurelia-framework';
import { AureliaConfiguration } from 'aurelia-configuration';
import { Address, Utils } from 'services/ArcService';
import { EventAggregator } from 'aurelia-event-aggregator';

@autoinject
export class Footer {

  private gnoAddress: Address;
  private mgnAddress: Address;
  private genAddress: Address;

  constructor(
    private appConfig: AureliaConfiguration,
    private eventAggregator: EventAggregator
  ) {
    this.initialize();
    this.eventAggregator.subscribe("Network.Changed.Id", () => { this.initialize(); });
    this.eventAggregator.subscribe("Network.Changed.Account", () => { this.initialize(); });
  }

  async initialize() {
    this.genAddress = await Utils.getGenTokenAddress();
    this.gnoAddress = this.appConfig.get("gnoTokenAddress");
    this.mgnAddress = this.appConfig.get("mgnTokenAddress");
  }
}
