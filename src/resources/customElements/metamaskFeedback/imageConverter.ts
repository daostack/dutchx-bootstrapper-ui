const imageContext = (require as any).context(
  '../../../../static',
  true,
  /^\.\/.*\.(jpe?g|png|gif|svg)$/i
);

export class ImageContextValueConverter {
  public toView(name: string) {
    const key = imageContext.keys().find((k: any) => k.includes(name));
    return imageContext(key);
  }
}
