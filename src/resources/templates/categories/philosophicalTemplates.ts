/**
 * MCP Quotes Server - Philosophical Quote Templates
 * 
 * Pre-defined templates for philosophical quote requests
 */

import type { QuoteTemplate} from '../../../types/templates.js';
import { TemplateCategory, VariableType, OutputFormat } from '../../../types/templates.js';

/**
 * Ancient wisdom template
 */
export const ancientWisdomTemplate: QuoteTemplate = {
  metadata: {
    id: 'ancient-wisdom',
    name: 'Ancient Philosophical Wisdom',
    description: 'Timeless wisdom from ancient philosophers',
    category: TemplateCategory.PHILOSOPHICAL,
    tags: ['philosophy', 'ancient', 'wisdom', 'classical'],
    author: 'MCP Quotes Server',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: '1.0.0'
  },
  content: 'Discover {numberOfQuotes} profound quotes from {tradition} philosophers about {concept}.',
  variables: [
    {
      name: 'numberOfQuotes',
      displayName: 'Number of Quotes',
      description: 'How many quotes to retrieve',
      type: VariableType.NUMBER,
      required: true,
      defaultValue: 4,
      validation: {
        min: 1,
        max: 10
      }
    },
    {
      name: 'tradition',
      displayName: 'Philosophical Tradition',
      description: 'Which philosophical tradition to explore',
      type: VariableType.ENUM,
      required: true,
      enumValues: ['Greek', 'Roman', 'Chinese', 'Indian', 'Islamic', 'Buddhist', 'Any'],
      defaultValue: 'Greek',
      uiHints: {
        inputType: 'select',
        helpText: 'Choose a philosophical tradition'
      }
    },
    {
      name: 'concept',
      displayName: 'Philosophical Concept',
      description: 'The philosophical concept to explore',
      type: VariableType.STRING,
      required: true,
      defaultValue: 'the nature of wisdom',
      examples: [
        'virtue and ethics',
        'the meaning of life',
        'knowledge and truth',
        'happiness and fulfillment',
        'death and mortality',
        'justice and society'
      ],
      validation: {
        min: 3,
        max: 50
      }
    }
  ],
  outputFormat: {
    format: OutputFormat.MARKDOWN,
    options: {
      title: 'Ancient Wisdom',
      includeHeader: true
    }
  },
  components: [
    {
      id: 'tradition-header',
      type: 'conditional',
      condition: 'tradition !== "Any"',
      content: '🏛️ **{tradition} Philosophical Wisdom**\n\n',
      order: 1
    }
  ],
  examples: [
    {
      name: 'Greek Philosophy on Virtue',
      variables: {
        numberOfQuotes: 3,
        tradition: 'Greek',
        concept: 'virtue and ethics'
      },
      expectedOutput: '# Ancient Wisdom\n\n🏛️ **Greek Philosophical Wisdom**\n\n1. "Excellence is not a gift, but a skill that takes practice." - Aristotle\n2. "The unexamined life is not worth living." - Socrates\n3. "Wealth consists not in having great possessions, but in having few wants." - Epictetus'
    }
  ]
};

/**
 * Existential philosophy template
 */
export const existentialPhilosophyTemplate: QuoteTemplate = {
  metadata: {
    id: 'existential-philosophy',
    name: 'Existential Philosophy',
    description: 'Quotes exploring existence, freedom, and meaning',
    category: TemplateCategory.PHILOSOPHICAL,
    tags: ['existentialism', 'philosophy', 'meaning', 'freedom'],
    author: 'MCP Quotes Server',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: '1.0.0'
  },
  content: 'Explore {numberOfQuotes} existential quotes about {theme} that challenge our understanding of {aspect}.',
  variables: [
    {
      name: 'numberOfQuotes',
      displayName: 'Number of Quotes',
      description: 'How many quotes to retrieve',
      type: VariableType.NUMBER,
      required: true,
      defaultValue: 5,
      validation: {
        min: 2,
        max: 10
      }
    },
    {
      name: 'theme',
      displayName: 'Existential Theme',
      description: 'Core existential theme to explore',
      type: VariableType.ENUM,
      required: true,
      enumValues: [
        'freedom and choice',
        'authenticity',
        'absurdity',
        'anxiety and dread',
        'meaning and purpose',
        'death and finitude',
        'alienation'
      ],
      defaultValue: 'meaning and purpose'
    },
    {
      name: 'aspect',
      displayName: 'Aspect of Life',
      description: 'Which aspect of life to examine',
      type: VariableType.STRING,
      required: true,
      defaultValue: 'human existence',
      examples: ['personal identity', 'social relationships', 'moral choices', 'daily life'],
      validation: {
        min: 3,
        max: 40
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
      content: '=== EXISTENTIAL REFLECTIONS ===\n\n',
      order: 1
    },
    {
      id: 'footer',
      type: 'suffix',
      content: '\n\n"Man is condemned to be free." - Jean-Paul Sartre',
      order: 2
    }
  ]
};

/**
 * Modern philosophy template
 */
export const modernPhilosophyTemplate: QuoteTemplate = {
  metadata: {
    id: 'modern-philosophy',
    name: 'Modern Philosophical Insights',
    description: 'Contemporary philosophical thoughts on current issues',
    category: TemplateCategory.PHILOSOPHICAL,
    tags: ['modern', 'contemporary', 'philosophy', 'current'],
    author: 'MCP Quotes Server',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: '1.0.0'
  },
  content: 'Gather {numberOfQuotes} modern philosophical insights about {topic} from {era} thinkers.',
  variables: [
    {
      name: 'numberOfQuotes',
      displayName: 'Number of Quotes',
      description: 'How many quotes to retrieve',
      type: VariableType.NUMBER,
      required: true,
      defaultValue: 4,
      validation: {
        min: 1,
        max: 8
      }
    },
    {
      name: 'topic',
      displayName: 'Philosophical Topic',
      description: 'Modern philosophical topic',
      type: VariableType.STRING,
      required: true,
      defaultValue: 'technology and humanity',
      examples: [
        'artificial intelligence',
        'environmental ethics',
        'social media and identity',
        'global justice',
        'consciousness and neuroscience',
        'postmodern reality'
      ],
      uiHints: {
        inputType: 'text',
        placeholder: 'e.g., digital age ethics'
      }
    },
    {
      name: 'era',
      displayName: 'Era',
      description: 'Time period of philosophers',
      type: VariableType.ENUM,
      required: true,
      enumValues: ['20th century', '21st century', 'contemporary', 'post-modern'],
      defaultValue: 'contemporary'
    }
  ],
  outputFormat: {
    format: OutputFormat.JSON,
    options: {
      includeTimestamp: true
    }
  },
  postProcessors: [
    {
      name: 'add-attribution',
      type: 'enricher',
      options: {
        text: 'Modern Philosophy Collection'
      }
    }
  ]
};

/**
 * Stoic philosophy template
 */
export const stoicPhilosophyTemplate: QuoteTemplate = {
  metadata: {
    id: 'stoic-philosophy',
    name: 'Stoic Philosophy',
    description: 'Practical wisdom from Stoic philosophers',
    category: TemplateCategory.PHILOSOPHICAL,
    tags: ['stoicism', 'philosophy', 'practical', 'wisdom', 'resilience'],
    author: 'MCP Quotes Server',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: '1.0.0'
  },
  content: 'Find {numberOfQuotes} Stoic quotes about {virtue} to help with {situation}.',
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
      name: 'virtue',
      displayName: 'Stoic Virtue',
      description: 'Which Stoic virtue to focus on',
      type: VariableType.ENUM,
      required: true,
      enumValues: ['wisdom', 'courage', 'justice', 'temperance', 'all virtues'],
      defaultValue: 'wisdom',
      uiHints: {
        helpText: 'The four cardinal Stoic virtues'
      }
    },
    {
      name: 'situation',
      displayName: 'Life Situation',
      description: 'Current life situation or challenge',
      type: VariableType.STRING,
      required: true,
      defaultValue: 'dealing with adversity',
      examples: [
        'facing uncertainty',
        'managing emotions',
        'making difficult decisions',
        'accepting what cannot be changed',
        'building character'
      ],
      validation: {
        min: 5,
        max: 60
      }
    }
  ],
  outputFormat: {
    format: OutputFormat.MARKDOWN,
    alternativeFormats: [OutputFormat.TEXT]
  },
  components: [
    {
      id: 'stoic-intro',
      type: 'prefix',
      content: '## 🏛️ Stoic Wisdom\n\n*"You have power over your mind - not outside events. Realize this, and you will find strength."* - Marcus Aurelius\n\n---\n\n',
      order: 1
    }
  ],
  examples: [
    {
      name: 'Stoic Wisdom for Adversity',
      variables: {
        numberOfQuotes: 3,
        virtue: 'courage',
        situation: 'facing a major life setback'
      },
      expectedOutput: '## 🏛️ Stoic Wisdom\n\n*"You have power over your mind - not outside events. Realize this, and you will find strength."* - Marcus Aurelius\n\n---\n\n1. "The impediment to action advances action. What stands in the way becomes the way." - Marcus Aurelius\n2. "Every new beginning comes from some other beginning’s end." - Seneca\n3. "How does it help to make troubles heavier by bemoaning them?" - Seneca'
    }
  ]
};

/**
 * Eastern philosophy template
 */
export const easternPhilosophyTemplate: QuoteTemplate = {
  metadata: {
    id: 'eastern-philosophy',
    name: 'Eastern Philosophy',
    description: 'Wisdom from Eastern philosophical traditions',
    category: TemplateCategory.PHILOSOPHICAL,
    tags: ['eastern', 'philosophy', 'zen', 'tao', 'buddhism', 'wisdom'],
    author: 'MCP Quotes Server',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: '1.0.0'
  },
  content: 'Discover {numberOfQuotes} {tradition} philosophical quotes about {concept} for {purpose}.',
  variables: [
    {
      name: 'numberOfQuotes',
      displayName: 'Number of Quotes',
      description: 'How many quotes to retrieve',
      type: VariableType.NUMBER,
      required: true,
      defaultValue: 4,
      validation: {
        min: 1,
        max: 8
      }
    },
    {
      name: 'tradition',
      displayName: 'Eastern Tradition',
      description: 'Which Eastern philosophical tradition',
      type: VariableType.ENUM,
      required: true,
      enumValues: ['Zen', 'Taoist', 'Buddhist', 'Hindu', 'Confucian', 'Mixed Eastern'],
      defaultValue: 'Zen'
    },
    {
      name: 'concept',
      displayName: 'Core Concept',
      description: 'Central philosophical concept',
      type: VariableType.STRING,
      required: true,
      defaultValue: 'mindfulness and presence',
      examples: [
        'emptiness and form',
        'non-attachment',
        'the middle way',
        'harmony and balance',
        'enlightenment',
        'impermanence'
      ]
    },
    {
      name: 'purpose',
      displayName: 'Purpose',
      description: 'Why are you seeking this wisdom?',
      type: VariableType.STRING,
      required: true,
      defaultValue: 'inner peace',
      examples: ['meditation practice', 'life guidance', 'spiritual growth', 'understanding reality'],
      validation: {
        min: 3,
        max: 40
      }
    }
  ],
  outputFormat: {
    format: OutputFormat.MARKDOWN,
    options: {
      includeHeader: false
    }
  },
  components: [
    {
      id: 'zen-header',
      type: 'conditional',
      condition: 'tradition === "Zen"',
      content: '♒ **Zen Wisdom** ♒\n\n',
      order: 1
    },
    {
      id: 'tao-header',
      type: 'conditional',
      condition: 'tradition === "Taoist"',
      content: '☯ **Taoist Wisdom** ☯\n\n',
      order: 1
    }
  ],
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
 * Export all philosophical templates
 */
export const philosophicalTemplates: QuoteTemplate[] = [
  ancientWisdomTemplate,
  existentialPhilosophyTemplate,
  modernPhilosophyTemplate,
  stoicPhilosophyTemplate,
  easternPhilosophyTemplate
];