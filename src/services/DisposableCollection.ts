import { transient } from 'aurelia-framework';
import { IDisposable } from './IDisposable';

@transient()
export class DisposableCollection implements IDisposable {

  private _disposables: Array<IDisposable>;

  constructor() {
    this._disposables = new Array<IDisposable>();
  }

  public push(disposable: IDisposable): number {
    return this._disposables.push(disposable);
  }

  public dispose(disposable?: IDisposable): void {
    if (disposable) {
      this._dispose(disposable);
    } else {
      for (let disposable of this._disposables) {
        this._dispose(disposable);
      }
    }
  }

  private _dispose(disposable: IDisposable): void {
    disposable.dispose();
    this._disposables.splice(this._disposables.indexOf(disposable), 1);
  }
}
