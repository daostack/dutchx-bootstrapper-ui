import { AureliaConfiguration } from 'aurelia-configuration';
import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject } from 'aurelia-framework';
import { Address, Utils } from 'services/ArcService';

@autoinject
export class Footer {

  private genAddress: Address;

  constructor(
    private eventAggregator: EventAggregator
  ) {
    this.initialize();
    this.eventAggregator.subscribe('Network.Changed.Account', () => { this.initialize(); });
  }

  private async initialize() {
    this.genAddress = await Utils.getGenTokenAddress();
  }
}
