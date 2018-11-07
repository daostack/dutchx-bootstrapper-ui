import { autoinject } from "aurelia-framework";
import {
  DialogService as AureliaDialogService,
  DialogSettings,
  DialogCancellableOpenResult,
  DialogOpenPromise
} from "aurelia-dialog";
import { Alert } from "../resources/dialogs/alert/alert";

@autoinject
export class DialogService {

  constructor(
    private dialogService: AureliaDialogService) {
  }

  public open(
    viewModule: any, // result of `import {view} from "path to module files"`
    model: any, // object that is given to the module's `activate` function
    settings: DialogSettings = {}): DialogOpenPromise<DialogCancellableOpenResult> {

    //    this.adjustScroll();

    return this.dialogService.open(
      Object.assign({
        model: model,
        viewModel: viewModule
      }, settings));
  };

  public alert(message: string): DialogOpenPromise<DialogCancellableOpenResult> {
    return this.open(Alert, { message }, { keyboard: true });
  }
}
