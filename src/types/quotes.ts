/**
 * Quote-related type definitions
 */

/**
 * Parameters for the getQuotes tool
 */
export interface GetQuotesParams {
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
export interface Quote {
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
export interface GetQuotesResponse {
  /** Array of quotes found */
  quotes: Quote[];
}

/**
 * Serper.dev API search result item
 */
export interface SerperSearchResult {
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
export interface SerperApiResponse {
  /** Organic search results */
  organic?: SerperSearchResult[];
  /** Error message if request failed */
  error?: string;
}

/**
 * Prompt template variable definition
 */
export interface PromptTemplateVariable {
  /** Variable name */
  name: string;
  /** Description of the variable */
  description: string;
  /** Whether the variable is required */
  required: boolean;
}

/**
 * Prompt template resource response
 */
export interface PromptTemplateResponse {
  /** The template string */
  template: string;
  /** Variables used in the template */
  variables: PromptTemplateVariable[];
}