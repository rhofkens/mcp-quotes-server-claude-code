/**
 * MCP Quotes Server - Template Validator
 *
 * Validates quote templates against schema and business rules
 */

import type {
  IQuoteTemplate,
  ITemplateValidationResult,
  ITemplateValidationError,
  ITemplateValidationWarning,
  ITemplateVariable,
} from '../../../types/templates.js'
import { VariableType, OutputFormat } from '../../../types/templates.js'

/**
 * Template validator class
 */
export class TemplateValidator {
  /**
   * Validate a complete template
   */
  static validate(template: IQuoteTemplate): ITemplateValidationResult {
    const errors: ITemplateValidationError[] = []
    const warnings: ITemplateValidationWarning[] = []

    // Validate metadata
    this.validateMetadata(template, errors, warnings)

    // Validate content
    this.validateContent(template, errors, warnings)

    // Validate variables
    this.validateVariables(template, errors, warnings)

    // Validate output format
    this.validateOutputFormat(template, errors, warnings)

    // Validate examples
    this.validateExamples(template, errors, warnings)

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    }
  }

  /**
   * Validate template metadata
   */
  private static validateMetadata(
    template: IQuoteTemplate,
    errors: ITemplateValidationError[],
    warnings: ITemplateValidationWarning[]
  ): void {
    const { metadata } = template

    // Required fields
    if (!metadata.id || metadata.id.trim() === '') {
      errors.push({
        code: 'MISSING_ID',
        message: 'Template ID is required',
        field: 'metadata.id',
      })
    }

    if (!metadata.name || metadata.name.trim() === '') {
      errors.push({
        code: 'MISSING_NAME',
        message: 'Template name is required',
        field: 'metadata.name',
      })
    }

    if (!metadata.version || !this.isValidVersion(metadata.version)) {
      errors.push({
        code: 'INVALID_VERSION',
        message: 'Template version must follow semantic versioning (e.g., 1.0.0)',
        field: 'metadata.version',
      })
    }

    // Warnings
    if (!metadata.description || metadata.description.trim() === '') {
      warnings.push({
        code: 'MISSING_DESCRIPTION',
        message: 'Template description is recommended',
        field: 'metadata.description',
      })
    }

    if (metadata.tags.length === 0) {
      warnings.push({
        code: 'NO_TAGS',
        message: 'Adding tags helps with template discovery',
        field: 'metadata.tags',
      })
    }

    if (metadata.deprecated && !metadata.deprecationMessage) {
      warnings.push({
        code: 'MISSING_DEPRECATION_MESSAGE',
        message: 'Deprecated templates should include a deprecation message',
        field: 'metadata.deprecationMessage',
      })
    }
  }

  /**
   * Validate template content
   */
  private static validateContent(
    template: IQuoteTemplate,
    errors: ITemplateValidationError[],
    warnings: ITemplateValidationWarning[]
  ): void {
    if (!template.content || template.content.trim() === '') {
      errors.push({
        code: 'MISSING_CONTENT',
        message: 'Template content is required',
        field: 'content',
      })
      return
    }

    // Extract variable placeholders from content
    const placeholders = this.extractPlaceholders(template.content)
    const definedVariables = new Set(template.variables.map((v: ITemplateVariable) => v.name))

    // Check for undefined variables
    placeholders.forEach((placeholder: string) => {
      if (!definedVariables.has(placeholder)) {
        errors.push({
          code: 'UNDEFINED_VARIABLE',
          message: `Variable "${placeholder}" used in template but not defined`,
          field: 'content',
        })
      }
    })

    // Check for unused variables
    template.variables.forEach((variable: ITemplateVariable) => {
      if (!placeholders.has(variable.name) && variable.required) {
        warnings.push({
          code: 'UNUSED_VARIABLE',
          message: `Required variable "${variable.name}" is defined but not used in template`,
          field: `variables.${variable.name}`,
        })
      }
    })
  }

  /**
   * Validate template variables
   */
  private static validateVariables(
    template: IQuoteTemplate,
    errors: ITemplateValidationError[],
    warnings: ITemplateValidationWarning[]
  ): void {
    const variableNames = new Set<string>()

    template.variables.forEach((variable: ITemplateVariable, index: number) => {
      // Check for duplicate variable names
      if (variableNames.has(variable.name)) {
        errors.push({
          code: 'DUPLICATE_VARIABLE',
          message: `Duplicate variable name: ${variable.name}`,
          field: `variables[${index}].name`,
        })
      }
      variableNames.add(variable.name)

      // Validate variable name format
      if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(variable.name)) {
        errors.push({
          code: 'INVALID_VARIABLE_NAME',
          message: `Invalid variable name: ${variable.name}. Must start with letter and contain only letters, numbers, and underscores`,
          field: `variables[${index}].name`,
        })
      }

      // Validate enum values
      if (
        variable.type === VariableType.ENUM &&
        (!variable.enumValues || variable.enumValues.length === 0)
      ) {
        errors.push({
          code: 'MISSING_ENUM_VALUES',
          message: `Enum variable "${variable.name}" must define enumValues`,
          field: `variables[${index}].enumValues`,
        })
      }

      // Validate default value type
      if (variable.defaultValue !== undefined) {
        const isValidDefault = this.validateVariableValue(variable, variable.defaultValue)
        if (!isValidDefault) {
          errors.push({
            code: 'INVALID_DEFAULT_VALUE',
            message: `Default value for "${variable.name}" does not match variable type ${variable.type}`,
            field: `variables[${index}].defaultValue`,
          })
        }
      }

      // Validate examples
      if (variable.examples) {
        variable.examples.forEach((example: any, exampleIndex: number) => {
          const isValidExample = this.validateVariableValue(variable, example)
          if (!isValidExample) {
            warnings.push({
              code: 'INVALID_EXAMPLE',
              message: `Example ${exampleIndex + 1} for "${variable.name}" does not match variable type ${variable.type}`,
              field: `variables[${index}].examples[${exampleIndex}]`,
            })
          }
        })
      }
    })
  }

  /**
   * Validate output format configuration
   */
  private static validateOutputFormat(
    template: IQuoteTemplate,
    errors: ITemplateValidationError[],
    _warnings: ITemplateValidationWarning[]
  ): void {
    if (!template.outputFormat || !template.outputFormat.format) {
      errors.push({
        code: 'MISSING_OUTPUT_FORMAT',
        message: 'Output format is required',
        field: 'outputFormat.format',
      })
    }

    // Validate alternative formats
    if (template.outputFormat.alternativeFormats) {
      const validFormats = Object.values(OutputFormat)
      template.outputFormat.alternativeFormats.forEach((format: OutputFormat, index: number) => {
        if (!validFormats.includes(format)) {
          errors.push({
            code: 'INVALID_ALTERNATIVE_FORMAT',
            message: `Invalid alternative format: ${format}`,
            field: `outputFormat.alternativeFormats[${index}]`,
          })
        }
      })
    }
  }

  /**
   * Validate template examples
   */
  private static validateExamples(
    template: IQuoteTemplate,
    errors: ITemplateValidationError[],
    warnings: ITemplateValidationWarning[]
  ): void {
    if (!template.examples || template.examples.length === 0) {
      warnings.push({
        code: 'NO_EXAMPLES',
        message: 'Including examples helps users understand template usage',
        field: 'examples',
      })
      return
    }

    const requiredVariables = template.variables
      .filter((v: ITemplateVariable) => v.required)
      .map((v: ITemplateVariable) => v.name)

    template.examples.forEach((example: any, index: number) => {
      // Check for missing required variables
      requiredVariables.forEach((varName: string) => {
        if (!(varName in example.variables)) {
          errors.push({
            code: 'MISSING_REQUIRED_VARIABLE_IN_EXAMPLE',
            message: `Example "${example.name}" missing required variable: ${varName}`,
            field: `examples[${index}].variables`,
          })
        }
      })

      // Validate variable values in examples
      Object.entries(example.variables).forEach(([varName, value]: [string, any]) => {
        const variable = template.variables.find((v: ITemplateVariable) => v.name === varName)
        if (!variable) {
          warnings.push({
            code: 'UNKNOWN_VARIABLE_IN_EXAMPLE',
            message: `Example "${example.name}" uses unknown variable: ${varName}`,
            field: `examples[${index}].variables.${varName}`,
          })
        } else if (!this.validateVariableValue(variable, value)) {
          errors.push({
            code: 'INVALID_VARIABLE_VALUE_IN_EXAMPLE',
            message: `Example "${example.name}" has invalid value for variable "${varName}"`,
            field: `examples[${index}].variables.${varName}`,
          })
        }
      })
    })
  }

  /**
   * Extract variable placeholders from template content
   */
  private static extractPlaceholders(content: string): Set<string> {
    const placeholders = new Set<string>()
    const regex = /\{([a-zA-Z][a-zA-Z0-9_]*)\}/g
    let match

    while ((match = regex.exec(content)) !== null) {
      if (match[1]) {
        placeholders.add(match[1])
      }
    }

    return placeholders
  }

  /**
   * Validate semantic version string
   */
  private static isValidVersion(version: string): boolean {
    const semverRegex = /^(\d+)\.(\d+)\.(\d+)(?:-(\w+(?:\.\w+)*))?(?:\+(\w+(?:\.\w+)*))?$/
    return semverRegex.test(version)
  }

  /**
   * Validate variable value against type
   */
  private static validateVariableValue(variable: ITemplateVariable, value: any): boolean {
    switch (variable.type) {
      case VariableType.STRING:
        return typeof value === 'string'

      case VariableType.NUMBER:
        return typeof value === 'number' && !isNaN(value)

      case VariableType.BOOLEAN:
        return typeof value === 'boolean'

      case VariableType.ENUM:
        return variable.enumValues?.includes(value) || false

      case VariableType.DATE:
        return value instanceof Date || !isNaN(Date.parse(value))

      case VariableType.ARRAY:
        return Array.isArray(value)

      case VariableType.OBJECT:
        return typeof value === 'object' && value !== null && !Array.isArray(value)

      default:
        return false
    }
  }

  /**
   * Validate variable value with validation rules
   */
  static validateVariableWithRules(
    variable: ITemplateVariable,
    value: any
  ): { isValid: boolean; error?: string } {
    // Type validation
    if (!this.validateVariableValue(variable, value)) {
      return {
        isValid: false,
        error: `Value must be of type ${variable.type}`,
      }
    }

    // Apply validation rules
    if (variable.validation) {
      const { min, max, pattern, errorMessage } = variable.validation

      if (variable.type === VariableType.STRING || variable.type === VariableType.ARRAY) {
        const length = variable.type === VariableType.STRING ? value.length : value.length

        if (min !== undefined && length < min) {
          return {
            isValid: false,
            error: errorMessage || `Length must be at least ${min}`,
          }
        }

        if (max !== undefined && length > max) {
          return {
            isValid: false,
            error: errorMessage || `Length must not exceed ${max}`,
          }
        }
      }

      if (variable.type === VariableType.NUMBER) {
        if (min !== undefined && value < min) {
          return {
            isValid: false,
            error: errorMessage || `Value must be at least ${min}`,
          }
        }

        if (max !== undefined && value > max) {
          return {
            isValid: false,
            error: errorMessage || `Value must not exceed ${max}`,
          }
        }
      }

      if (pattern && variable.type === VariableType.STRING) {
        const regex = new RegExp(pattern)
        if (!regex.test(value)) {
          return {
            isValid: false,
            error: errorMessage || `Value must match pattern: ${pattern}`,
          }
        }
      }
    }

    return { isValid: true }
  }
}
