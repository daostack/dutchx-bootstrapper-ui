import { App } from 'app';
import { AureliaConfiguration } from 'aurelia-configuration';
import { autoinject } from 'aurelia-framework';
import { DateService } from 'services/DateService';

@autoinject
export class Landing {

  private lockingPeriodEndDate: Date;
  private lockingPeriodStartDate: Date;
  private governanceStartDate: Date;

  constructor(
      private appConfig: AureliaConfiguration
    , private dateService: DateService
  ) {
     this.lockingPeriodEndDate = this.dateService
          .fromIsoString(this.appConfig.get('Landing.lockingPeriodEndDate'), App.timezone);
     this.lockingPeriodStartDate = this.dateService
          .fromIsoString(this.appConfig.get('Landing.lockingPeriodStartDate'), App.timezone);
     this.governanceStartDate = this.dateService
          .fromIsoString(this.appConfig.get('Landing.governanceStartDate'), App.timezone);
  }

  public activate() {
    $('body').css('overflow', 'auto');
  }

  private msUntilCanLockCountdown(): number {
    return this.lockingPeriodStartDate.getTime() - Date.now();
  }
}
