import { DialogController } from 'aurelia-dialog';
import { autoinject } from 'aurelia-framework';
// import { AureliaConfiguration } from 'aurelia-configuration';

@autoinject
export class Alert {

  public model: IAlertModel;
  public okButton: HTMLElement;

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
