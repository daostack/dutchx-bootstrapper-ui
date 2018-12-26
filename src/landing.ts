import { autoinject } from 'aurelia-framework';
import { AureliaConfiguration } from "aurelia-configuration";
import { DateService } from "services/DateService";
import { App } from "app";

@autoinject
export class Landing {

  lockingPeriodEndDate: Date;
  lockingPeriodStartDate: Date;
  governanceStartDate: Date;
  intervalId: any;

  msUntilCanLockCountdown(): number {
    return this.lockingPeriodStartDate.getTime() - Date.now();
  }

  constructor(
    , private appConfig: AureliaConfiguration
    , private dateService: DateService
  ) {
     this.lockingPeriodEndDate = this.dateService.fromIsoString(this.appConfig.get("Landing.lockingPeriodEndDate"), App.timezone);
     this.lockingPeriodStartDate = this.dateService.fromIsoString(this.appConfig.get("Landing.lockingPeriodStartDate"), App.timezone);
     this.governanceStartDate = this.dateService.fromIsoString(this.appConfig.get("Landing.governanceStartDate"), App.timezone);
  }

  activate() {
    $("body").css("overflow", "auto");
  }
}
