import { autoinject, bindable } from "aurelia-framework";
import { DateService, TimespanResolution } from "../../services/DateService"

@autoinject
export class TimespanValueConverter {
  constructor(private dateService: DateService) {

  }
  /**
   * convert between milliseconds in the viewmodel and a string.
   */
  toView(value: number, resolution?: TimespanResolution): string | null {
    if (typeof resolution === "string") {
      resolution = TimespanResolution[resolution as string];
    }
    return this.dateService.ticksToTimeSpanString(value, resolution);
  }

  // fromView(value: string): number | null {
  //   return this.dateService.fromString(value, format);

  // }
}
