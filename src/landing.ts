import { AureliaConfiguration } from 'aurelia-configuration';
import { autoinject } from 'aurelia-framework';
import { DateService } from 'services/DateService';

@autoinject
export class Landing {

  private lockingPeriodStartDate: Date;
  private governanceStartDate: Date;

  constructor(
    private appConfig: AureliaConfiguration,
    private dateService: DateService
  ) {
    this.lockingPeriodStartDate = this.dateService
      .fromIsoString(this.appConfig.get('Landing.lockingPeriodStartDate'));
    this.governanceStartDate = this.dateService
      .fromIsoString(this.appConfig.get('governanceStartDate'));
  }

  public activate() {
    setTimeout(() => $('body').css('overflow-y', 'scroll'), 0);
  }
}
