import { App } from 'app';
import { AureliaConfiguration } from 'aurelia-configuration';
import { autoinject } from 'aurelia-framework';
import { DateService } from 'services/DateService';

@autoinject
export class Landing {

  public lockingPeriodEndDate: Date;
  public lockingPeriodStartDate: Date;
  public governanceStartDate: Date;
  public intervalId: any;

  constructor(
    private appConfig: AureliaConfiguration
    , private dateService: DateService,
  ) {
     this.lockingPeriodEndDate = this.dateService.fromIsoString(this.appConfig.get('Landing.lockingPeriodEndDate'), App.timezone);
     this.lockingPeriodStartDate = this.dateService.fromIsoString(this.appConfig.get('Landing.lockingPeriodStartDate'), App.timezone);
     this.governanceStartDate = this.dateService.fromIsoString(this.appConfig.get('Landing.governanceStartDate'), App.timezone);
  }

  public msUntilCanLockCountdown(): number {
    return this.lockingPeriodStartDate.getTime() - Date.now();
  }

  public activate() {
    $('body').css('overflow', 'auto');
  }
}
