import { AureliaConfiguration } from 'aurelia-configuration';
import { EventAggregator } from 'aurelia-event-aggregator';
import { autoinject } from 'aurelia-framework';
import { Address, Utils } from 'services/ArcService';

@autoinject
export class Footer {

  private gnoAddress: Address;
  private mgnAddress: Address;
  private genAddress: Address;

  constructor(
    private appConfig: AureliaConfiguration,
    private eventAggregator: EventAggregator,
  ) {
    this.initialize();
    this.eventAggregator.subscribe('Network.Changed.Account', () => { this.initialize(); });
    this.eventAggregator.subscribe('DAO.loaded', () => { this.initialize(); });
  }

  public async initialize() {
    this.genAddress = await Utils.getGenTokenAddress();
    this.gnoAddress = this.appConfig.get('gnoTokenAddress');
    this.mgnAddress = this.appConfig.get('mgnTokenAddress');
  }
}
