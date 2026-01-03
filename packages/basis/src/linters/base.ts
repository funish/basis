/**
 * Linter Driver Interface
 * Base interface for all linter implementations
 */

export interface LinterDriver {
  /**
   * Name of the linter driver
   */
  name: string;

  /**
   * Required npm package names for this linter
   */
  dependencies: string[];

  /**
   * Run linting on files
   * @param options - Linting options
   */
  lint(options?: LinterOptions): Promise<void>;

  /**
   * Run linting with auto-fix
   * @param options - Linting options
   */
  fix?(options?: LinterOptions): Promise<void>;
}

/**
 * Linter execution options
 */
export interface LinterOptions {
  /**
   * File or directory paths to lint
   * Defaults to current directory if not provided
   */
  paths?: string[];

  /**
   * Whether to auto-fix issues
   */
  fix?: boolean;

  /**
   * Custom rules configuration
   */
  rules?: Record<string, any>;

  /**
   * Additional options specific to each linter
   */
  [key: string]: any;
}
