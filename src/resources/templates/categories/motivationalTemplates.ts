/**
 * MCP Quotes Server - Motivational Quote Templates
 * 
 * Pre-defined templates for motivational quote requests
 */

import type { QuoteTemplate} from '../../../types/templates.js';
import { TemplateCategory, VariableType, OutputFormat } from '../../../types/templates.js';

/**
 * Morning motivation template
 */
export const morningMotivationTemplate: QuoteTemplate = {
  metadata: {
    id: 'morning-motivation',
    name: 'Morning Motivation',
    description: 'Start your day with powerful motivational quotes',
    category: TemplateCategory.MOTIVATIONAL,
    tags: ['morning', 'motivation', 'daily', 'routine'],
    author: 'MCP Quotes Server',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: '1.0.0'
  },
  content: 'Find {numberOfQuotes} powerful morning motivational quotes to inspire {audience} to {goal}.',
  variables: [
    {
      name: 'numberOfQuotes',
      displayName: 'Number of Quotes',
      description: 'How many quotes to retrieve',
      type: VariableType.NUMBER,
      required: true,
      defaultValue: 3,
      validation: {
        min: 1,
        max: 7,
        errorMessage: 'Please select between 1 and 7 quotes for morning motivation'
      },
      uiHints: {
        inputType: 'number',
        order: 1
      }
    },
    {
      name: 'audience',
      displayName: 'Target Audience',
      description: 'Who are these quotes for?',
      type: VariableType.ENUM,
      required: true,
      enumValues: ['entrepreneurs', 'students', 'athletes', 'professionals', 'everyone'],
      defaultValue: 'everyone',
      uiHints: {
        inputType: 'select',
        order: 2,
        helpText: 'Choose the audience for more targeted quotes'
      }
    },
    {
      name: 'goal',
      displayName: 'Daily Goal',
      description: 'What is the main goal for today?',
      type: VariableType.STRING,
      required: true,
      defaultValue: 'achieve their best',
      examples: ['start their business', 'ace their exams', 'reach new heights', 'overcome challenges'],
      uiHints: {
        inputType: 'text',
        placeholder: 'e.g., conquer their fears',
        order: 3
      }
    }
  ],
  outputFormat: {
    format: OutputFormat.MARKDOWN,
    options: {
      title: '☀️ Morning Motivation',
      includeHeader: true
    }
  },
  components: [
    {
      id: 'greeting',
      type: 'prefix',
      content: '🌅 **Good Morning!**\n\nHere are your motivational quotes to power through the day:\n\n',
      order: 1
    },
    {
      id: 'footer',
      type: 'suffix',
      content: '\n\n💪 **Remember**: Every morning is a new opportunity to be extraordinary!',
      order: 2
    }
  ],
  postProcessors: [
    {
      name: 'number-lines',
      type: 'transformer',
      order: 1
    }
  ],
  examples: [
    {
      name: 'Entrepreneur Morning',
      description: 'Morning quotes for entrepreneurs',
      variables: {
        numberOfQuotes: 3,
        audience: 'entrepreneurs',
        goal: 'build their dreams'
      },
      expectedOutput: '🌅 **Good Morning!**\n\nHere are your motivational quotes to power through the day:\n\n1. "The secret of getting ahead is getting started." - Mark Twain\n2. "Your time is limited, dont waste it living someone elses life." - Steve Jobs\n3. "The only way to do great work is to love what you do." - Steve Jobs\n\n💪 **Remember**: Every morning is a new opportunity to be extraordinary!'
    }
  ]
};

/**
 * Fitness motivation template
 */
export const fitnessMotivationTemplate: QuoteTemplate = {
  metadata: {
    id: 'fitness-motivation',
    name: 'Fitness Motivation',
    description: 'Motivational quotes for workout and fitness goals',
    category: TemplateCategory.MOTIVATIONAL,
    tags: ['fitness', 'workout', 'health', 'motivation', 'sports'],
    author: 'MCP Quotes Server',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: '1.0.0'
  },
  content: 'Gather {numberOfQuotes} intense fitness motivation quotes for {workoutType} training, emphasizing {focus}.',
  variables: [
    {
      name: 'numberOfQuotes',
      displayName: 'Number of Quotes',
      description: 'How many quotes to retrieve',
      type: VariableType.NUMBER,
      required: true,
      defaultValue: 5,
      validation: {
        min: 3,
        max: 10
      }
    },
    {
      name: 'workoutType',
      displayName: 'Workout Type',
      description: 'Type of workout or training',
      type: VariableType.ENUM,
      required: true,
      enumValues: ['strength', 'cardio', 'HIIT', 'yoga', 'crossfit', 'marathon', 'general'],
      defaultValue: 'general',
      uiHints: {
        inputType: 'select',
        helpText: 'Select your workout focus'
      }
    },
    {
      name: 'focus',
      displayName: 'Motivational Focus',
      description: 'What aspect to emphasize',
      type: VariableType.STRING,
      required: true,
      defaultValue: 'pushing beyond limits',
      examples: ['discipline and consistency', 'mental toughness', 'achieving personal records', 'never giving up'],
      validation: {
        min: 3,
        max: 50
      }
    }
  ],
  outputFormat: {
    format: OutputFormat.TEXT
  },
  components: [
    {
      id: 'header',
      type: 'prefix',
      content: '💪 FITNESS MOTIVATION 💪\n========================\n\n',
      order: 1
    },
    {
      id: 'intense-mode',
      type: 'conditional',
      condition: 'workoutType === "HIIT" || workoutType === "crossfit"',
      content: '🔥 BEAST MODE ACTIVATED! 🔥\n\n',
      order: 2
    }
  ]
};

/**
 * Goal achievement template
 */
export const goalAchievementTemplate: QuoteTemplate = {
  metadata: {
    id: 'goal-achievement',
    name: 'Goal Achievement Motivation',
    description: 'Quotes to inspire goal setting and achievement',
    category: TemplateCategory.MOTIVATIONAL,
    tags: ['goals', 'achievement', 'success', 'motivation'],
    author: 'MCP Quotes Server',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: '1.0.0'
  },
  content: 'Collect {numberOfQuotes} motivational quotes about achieving {goalType} goals, specifically for someone who {currentSituation}.',
  variables: [
    {
      name: 'numberOfQuotes',
      displayName: 'Number of Quotes',
      description: 'How many quotes to retrieve',
      type: VariableType.NUMBER,
      required: true,
      defaultValue: 5,
      validation: {
        min: 1,
        max: 10
      }
    },
    {
      name: 'goalType',
      displayName: 'Type of Goal',
      description: 'What kind of goal are you pursuing?',
      type: VariableType.ENUM,
      required: true,
      enumValues: ['career', 'personal', 'financial', 'educational', 'creative', 'relationship'],
      defaultValue: 'personal'
    },
    {
      name: 'currentSituation',
      displayName: 'Current Situation',
      description: 'Describe your current situation',
      type: VariableType.STRING,
      required: true,
      defaultValue: 'is just starting their journey',
      examples: [
        'is facing obstacles',
        'needs to stay consistent',
        'is close to giving up',
        'has made good progress',
        'is starting from scratch'
      ],
      validation: {
        min: 5,
        max: 100
      },
      uiHints: {
        inputType: 'text',
        placeholder: 'e.g., is struggling with motivation',
        helpText: 'This helps personalize the quote selection'
      }
    }
  ],
  outputFormat: {
    format: OutputFormat.JSON,
    options: {
      includeMetadata: true
    }
  },
  postProcessors: [
    {
      name: 'add-metadata',
      type: 'enricher',
      options: {
        position: 'bottom'
      }
    }
  ]
};

/**
 * Overcome challenges template
 */
export const overcomeChallengesTemplate: QuoteTemplate = {
  metadata: {
    id: 'overcome-challenges',
    name: 'Overcome Challenges',
    description: 'Motivational quotes for overcoming obstacles and challenges',
    category: TemplateCategory.MOTIVATIONAL,
    tags: ['challenges', 'obstacles', 'resilience', 'strength', 'motivation'],
    author: 'MCP Quotes Server',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: '1.0.0'
  },
  content: 'Find {numberOfQuotes} powerful quotes about overcoming {challengeType} that inspire {desiredOutcome}.',
  variables: [
    {
      name: 'numberOfQuotes',
      displayName: 'Number of Quotes',
      description: 'How many quotes to retrieve',
      type: VariableType.NUMBER,
      required: true,
      defaultValue: 4,
      validation: {
        min: 2,
        max: 8
      }
    },
    {
      name: 'challengeType',
      displayName: 'Type of Challenge',
      description: 'What kind of challenge are you facing?',
      type: VariableType.STRING,
      required: true,
      defaultValue: 'difficult times',
      examples: ['failure', 'fear', 'self-doubt', 'setbacks', 'criticism', 'uncertainty'],
      uiHints: {
        inputType: 'text',
        group: 'Challenge Details'
      }
    },
    {
      name: 'desiredOutcome',
      displayName: 'Desired Outcome',
      description: 'What do you want to achieve?',
      type: VariableType.STRING,
      required: true,
      defaultValue: 'resilience and growth',
      examples: ['courage to continue', 'inner strength', 'renewed confidence', 'breakthrough'],
      uiHints: {
        inputType: 'text',
        group: 'Challenge Details'
      }
    }
  ],
  outputFormat: {
    format: OutputFormat.MARKDOWN,
    alternativeFormats: [OutputFormat.TEXT, OutputFormat.HTML]
  },
  components: [
    {
      id: 'intro',
      type: 'prefix',
      content: '## 🛡️ Strength Through Adversity\n\n',
      order: 1
    },
    {
      id: 'outro',
      type: 'suffix',
      content: '\n\n---\n*Remember: The strongest steel is forged in the hottest fire.*',
      order: 3
    }
  ]
};

/**
 * Export all motivational templates
 */
export const motivationalTemplates: QuoteTemplate[] = [
  morningMotivationTemplate,
  fitnessMotivationTemplate,
  goalAchievementTemplate,
  overcomeChallengesTemplate
];