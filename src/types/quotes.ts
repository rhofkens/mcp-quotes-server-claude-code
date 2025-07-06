/**
 * Quote-related type definitions
 */

/**
 * Parameters for the getQuotes tool
 */
export interface IGetQuotesParams {
  /** The name of the person whose quotes to find */
  person: string;
  /** Number of quotes to return (1-10) */
  numberOfQuotes: number;
  /** Optional topic to filter quotes by */
  topic?: string;
}

/**
 * A single quote object
 */
export interface IQuote {
  /** The quote text */
  text: string;
  /** The person who said the quote */
  author: string;
  /** Source URL where the quote was found (if available) */
  source?: string;
}

/**
 * Response from the getQuotes tool
 */
export interface IGetQuotesResponse {
  /** Array of quotes found */
  quotes: IQuote[];
}

/**
 * Serper.dev API search result item
 */
export interface ISerperSearchResult {
  /** The snippet containing the quote */
  snippet: string;
  /** The source URL */
  link?: string;
  /** The title of the result */
  title?: string;
}

/**
 * Serper.dev API response
 */
export interface ISerperApiResponse {
  /** Organic search results */
  organic?: ISerperSearchResult[];
  /** Error message if request failed */
  error?: string;
}

/**
 * Prompt template variable definition
 */
export interface IPromptTemplateVariable {
  /** Description of the variable */
  description: string;
  /** Whether the variable is required */
  required: boolean;
  /** Type of the variable */
  type: 'string' | 'number' | 'array';
  /** Default value */
  default?: unknown;
  /** Example values */
  examples?: string[];
  /** Constraints for the variable */
  constraints?: {
    minimum?: number;
    maximum?: number;
    enum?: string[];
    pattern?: string;
  };
}

/**
 * Prompt template resource response
 */
export interface IPromptTemplateResponse {
  /** The template string */
  template: string;
  /** Variables used in the template */
  variables: Record<string, IPromptTemplateVariable>;
  /** Template metadata */
  metadata?: {
    version: string;
    name: string;
    description: string;
    created: string;
    lastModified: string;
    category: 'basic' | 'advanced' | 'research' | 'creative';
  };
  /** Usage instructions */
  instructions?: string;
  /** Example usages */
  examples?: Array<{
    name: string;
    description: string;
    request: string;
    expectedFormat: string;
  }>;
}