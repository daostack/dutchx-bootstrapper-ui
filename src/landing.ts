import { autoinject } from 'aurelia-framework';
import { BindingSignaler } from 'aurelia-templating-resources';
import { App } from 'app';
import { TimespanResolution } from "./services/DateService";
import { Router } from 'aurelia-router';

@autoinject
export class Landing {

  msUntilCanLockCountdown(): number {
    return this.lockingPeriodStartDate.getTime() - Date.now();
  }

  lockingPeriodStartDate: Date;
  lockingPeriodEndDate: Date;
  governanceStartDate: Date;
  intervalId: any;

  constructor(
    private signaler: BindingSignaler,
    private router: Router
  ) {
  }

  activate() {
    this.lockingPeriodStartDate = App.lockingPeriodStartDate;
    this.lockingPeriodEndDate = App.lockingPeriodEndDate;
    this.governanceStartDate = App.governanceStartDate;
    $("body").css("overflow", "auto");
  }
}
