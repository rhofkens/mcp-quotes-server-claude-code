/**
 * MCP Quotes Server - Template System Types
 *
 * Comprehensive type definitions for the quote prompt template system
 * Supporting categories, versioning, dynamic variables, and template composition
 */

/**
 * Supported template categories for different quote contexts
 */
export enum TemplateCategory {
  MOTIVATIONAL = 'motivational',
  INSPIRATIONAL = 'inspirational',
  BUSINESS = 'business',
  PHILOSOPHICAL = 'philosophical',
  LITERARY = 'literary',
  SCIENTIFIC = 'scientific',
  HISTORICAL = 'historical',
  HUMOR = 'humor',
  WISDOM = 'wisdom',
  LEADERSHIP = 'leadership',
  EDUCATION = 'education',
  TECHNOLOGY = 'technology',
  SPORTS = 'sports',
  CREATIVITY = 'creativity',
  CUSTOM = 'custom',
}

/**
 * Template variable types for validation
 */
export enum VariableType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  ENUM = 'enum',
  DATE = 'date',
  ARRAY = 'array',
  OBJECT = 'object',
}

/**
 * Template output formats
 */
export enum OutputFormat {
  TEXT = 'text',
  JSON = 'json',
  MARKDOWN = 'markdown',
  HTML = 'html',
  CSV = 'csv',
  XML = 'xml',
}

/**
 * Variable definition with enhanced metadata
 */
export interface ITemplateVariable {
  /** Variable name used in template */
  name: string
  /** Human-readable display name */
  displayName: string
  /** Detailed description */
  description: string
  /** Variable type for validation */
  type: VariableType
  /** Whether the variable is required */
  required: boolean
  /** Default value if not provided */
  defaultValue?: any
  /** Validation rules */
  validation?: IVariableValidation
  /** Example values */
  examples?: any[]
  /** For enum types, allowed values */
  enumValues?: string[]
  /** UI hints for rendering */
  uiHints?: IVariableUIHints
}

/**
 * Variable validation rules
 */
export interface IVariableValidation {
  /** Minimum value/length */
  min?: number
  /** Maximum value/length */
  max?: number
  /** Regular expression pattern */
  pattern?: string
  /** Custom validation function name */
  customValidator?: string
  /** Error message for validation failure */
  errorMessage?: string
}

/**
 * UI hints for variable rendering
 */
export interface IVariableUIHints {
  /** Input type hint */
  inputType?: 'text' | 'textarea' | 'select' | 'multiselect' | 'date' | 'number' | 'checkbox'
  /** Placeholder text */
  placeholder?: string
  /** Help text */
  helpText?: string
  /** Display order */
  order?: number
  /** Group name for organizing variables */
  group?: string
}

/**
 * Template metadata
 */
export interface ITemplateMetadata {
  /** Template unique identifier */
  id: string
  /** Template name */
  name: string
  /** Template description */
  description: string
  /** Template category */
  category: TemplateCategory
  /** Template tags for search/filtering */
  tags: string[]
  /** Template author */
  author: string
  /** Creation date */
  createdAt: Date
  /** Last update date */
  updatedAt: Date
  /** Template version */
  version: string
  /** Whether template is deprecated */
  deprecated?: boolean
  /** Deprecation message if deprecated */
  deprecationMessage?: string
  /** Usage statistics */
  usageStats?: ITemplateUsageStats
}

/**
 * Template usage statistics
 */
export interface ITemplateUsageStats {
  /** Total number of uses */
  totalUses: number
  /** Last used date */
  lastUsed?: Date
  /** Average rating */
  averageRating?: number
  /** Number of ratings */
  ratingCount?: number
}

/**
 * Complete template definition
 */
export interface IQuoteTemplate {
  /** Template metadata */
  metadata: ITemplateMetadata
  /** Template content with variable placeholders */
  content: string
  /** Variable definitions */
  variables: ITemplateVariable[]
  /** Output format configuration */
  outputFormat: IOutputFormatConfig
  /** Parent template ID for inheritance */
  extends?: string
  /** Template components for composition */
  components?: ITemplateComponent[]
  /** Post-processing steps */
  postProcessors?: IPostProcessor[]
  /** Example usage */
  examples?: ITemplateExample[]
}

/**
 * Output format configuration
 */
export interface IOutputFormatConfig {
  /** Primary output format */
  format: OutputFormat
  /** Format-specific options */
  options?: Record<string, unknown>
  /** Alternative formats supported */
  alternativeFormats?: OutputFormat[]
}

/**
 * Template component for composition
 */
export interface ITemplateComponent {
  /** Component ID */
  id: string
  /** Component type */
  type: 'prefix' | 'suffix' | 'wrapper' | 'conditional'
  /** Component content or template reference */
  content: string
  /** Condition for conditional components */
  condition?: string
  /** Order of application */
  order?: number
}

/**
 * Post-processor definition
 */
export interface IPostProcessor {
  /** Processor name */
  name: string
  /** Processor type */
  type: 'formatter' | 'validator' | 'transformer' | 'enricher'
  /** Processor options */
  options?: Record<string, unknown>
  /** Order of execution */
  order?: number
}

/**
 * Template example
 */
export interface ITemplateExample {
  /** Example name */
  name: string
  /** Example description */
  description?: string
  /** Variable values */
  variables: Record<string, any>
  /** Expected output */
  expectedOutput: string
}

/**
 * Template version information
 */
export interface ITemplateVersion {
  /** Version number */
  version: string
  /** Template content at this version */
  template: IQuoteTemplate
  /** Change description */
  changeDescription: string
  /** Version author */
  author: string
  /** Version date */
  date: Date
  /** Whether this is the current version */
  isCurrent: boolean
}

/**
 * Template repository interface
 */
export interface ITemplateRepository {
  /** Get template by ID */
  getTemplate(id: string, version?: string): Promise<IQuoteTemplate | null>
  /** List templates by category */
  listByCategory(category: TemplateCategory): Promise<IQuoteTemplate[]>
  /** Search templates */
  searchTemplates(query: ITemplateSearchQuery): Promise<IQuoteTemplate[]>
  /** Save template */
  saveTemplate(template: IQuoteTemplate): Promise<void>
  /** Get template versions */
  getVersionHistory(id: string): Promise<ITemplateVersion[]>
}

/**
 * Template search query
 */
export interface ITemplateSearchQuery {
  /** Search text */
  text?: string
  /** Filter by categories */
  categories?: TemplateCategory[]
  /** Filter by tags */
  tags?: string[]
  /** Filter by author */
  author?: string
  /** Include deprecated templates */
  includeDeprecated?: boolean
  /** Sort order */
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'usage'
  /** Sort direction */
  sortDirection?: 'asc' | 'desc'
  /** Pagination */
  limit?: number
  offset?: number
}

/**
 * Template validation result
 */
export interface ITemplateValidationResult {
  /** Whether template is valid */
  isValid: boolean
  /** Validation errors */
  errors: ITemplateValidationError[]
  /** Validation warnings */
  warnings: ITemplateValidationWarning[]
}

/**
 * Template validation error
 */
export interface ITemplateValidationError {
  /** Error code */
  code: string
  /** Error message */
  message: string
  /** Field/path where error occurred */
  field?: string
}

/**
 * Template validation warning
 */
export interface ITemplateValidationWarning {
  /** Warning code */
  code: string
  /** Warning message */
  message: string
  /** Field/path where warning occurred */
  field?: string
}

/**
 * Template generator configuration
 */
export interface ITemplateGeneratorConfig {
  /** Base template to extend */
  baseTemplate?: string
  /** Category for generated template */
  category: TemplateCategory
  /** Variables to include */
  variables: ITemplateVariable[]
  /** Output format */
  outputFormat: OutputFormat
  /** Additional options */
  options?: Record<string, unknown>
}

/**
 * Template rendering context
 */
export interface ITemplateRenderContext {
  /** Variable values */
  variables: Record<string, any>
  /** Rendering options */
  options?: ITemplateRenderOptions
  /** User context */
  userContext?: Record<string, any>
}

/**
 * Template rendering options
 */
export interface ITemplateRenderOptions {
  /** Output format override */
  outputFormat?: OutputFormat
  /** Strict mode - fail on missing variables */
  strict?: boolean
  /** Include metadata in output */
  includeMetadata?: boolean
  /** Custom formatters */
  formatters?: Record<string, (value: any) => string>
}

/**
 * Template render result
 */
export interface ITemplateRenderResult {
  /** Rendered output */
  output: string
  /** Output format used */
  format: OutputFormat
  /** Metadata if requested */
  metadata?: Record<string, any>
  /** Rendering warnings */
  warnings?: string[]
}
