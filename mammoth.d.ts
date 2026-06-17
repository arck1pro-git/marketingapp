declare module 'mammoth' {
  interface ConversionResult {
    value: string;
    messages: unknown[];
  }
  interface Options {
    buffer?: Buffer;
    path?: string;
  }
  export function extractRawText(options: Options): Promise<ConversionResult>;
  export function convertToHtml(options: Options): Promise<ConversionResult>;
}
