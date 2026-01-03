/**
 * Formatter Driver Interface
 * Base interface for all formatter implementations
 */

export interface FormatterDriver {
  /**
   * Name of the formatter driver
   */
  name: string;

  /**
   * Required npm package names for this formatter
   */
  dependencies: string[];

  /**
   * Format files
   * @param options - Formatting options
   */
  format(options?: FormatOptions): Promise<void>;

  /**
   * Check if files are formatted
   * @param options - Formatting options
   */
  check?(options?: FormatOptions): Promise<void>;
}

/**
 * Formatter execution options
 */
export interface FormatOptions {
  /**
   * File or directory paths to format
   * Defaults to current directory if not provided
   */
  paths?: string[];

  /**
   * Whether to only check formatting without modifying files
   */
  check?: boolean;

  /**
   * Additional options specific to each formatter
   */
  [key: string]: any;
}
