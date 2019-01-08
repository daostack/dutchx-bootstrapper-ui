import { DialogController } from 'aurelia-dialog';
import { autoinject } from 'aurelia-framework';

@autoinject
export class Alert {

  private model: IAlertModel;
  private okButton: HTMLElement;

  constructor(private controller: DialogController) { }

  public activate(model: IAlertModel) {
    this.model = model;
  }

  public attached() {
    // attach-focus doesn't work
    $(this.okButton).focus();
  }
}

interface IAlertModel {
  message: string;
}
