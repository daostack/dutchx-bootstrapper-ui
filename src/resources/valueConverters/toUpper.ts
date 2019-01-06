export class ToUpperValueConverter {
  public toView(value: string) {
    return (value || '').toUpperCase();
  }
  public fromView(value: string) {
    return (value || '').toUpperCase();
  }
}
