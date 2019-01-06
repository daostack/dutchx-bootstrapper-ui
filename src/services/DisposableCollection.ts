import { transient } from 'aurelia-framework';
import { IDisposable } from './IDisposable';

@transient()
export class DisposableCollection implements IDisposable {

  private disposables: Array<IDisposable>;

  constructor() {
    this.disposables = new Array<IDisposable>();
  }

  public push(disposable: IDisposable): number {
    return this.disposables.push(disposable);
  }

  public dispose(disposable?: IDisposable): void {
    if (disposable) {
      this._dispose(disposable);
    } else {
      for (let disposableElement of this.disposables) {
        this._dispose(disposableElement);
      }
    }
  }

  private _dispose(disposable: IDisposable): void {
    disposable.dispose();
    this._disposables.splice(this._disposables.indexOf(disposable), 1);
  }
}
