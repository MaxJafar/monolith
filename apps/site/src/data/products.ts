export const repository = 'https://github.com/MaxJafar/monolith'

export const products = [
  {
    slug: 'workspace',
    name: 'Your workspace',
    icon: 'grid',
    label: 'A place for the whole picture',
    title: 'Your work. In one place.',
    description:
      'A calm home for your knowledge, projects and daily work. Shape Monolith around the way you think.',
    image: 'workspace',
    alt: 'Monolith dashboard with connected widgets and workspace navigation',
    guide: 'workspace',
    features: [
      [
        'A dashboard that is yours',
        'Arrange connected widgets, resize your layout and keep the things you check every day within reach.'
      ],
      [
        'Make the sidebar work for you',
        'Reorder Calendar, Projects, Actions, Rooms, Docs, Dashboard and Databases. Organize page groups and pin compact widgets.'
      ],
      [
        'Space for each part of your life',
        'Switch workspaces, choose light or dark appearance, and give pages their own icons and covers.'
      ],
      [
        'Work together, with clear roles',
        'Owner, editor and viewer roles keep the right controls available to each workspace member. Rooms bring conversations alongside your work.'
      ]
    ]
  },
  {
    slug: 'knowledge',
    name: 'Docs & knowledge',
    icon: 'book',
    label: 'Give your ideas a home',
    title: 'Think it. Write it. Connect it.',
    description:
      'Turn a blank page into a useful body of knowledge. Write with rich blocks, organize nested pages and follow the connections.',
    image: 'documents',
    alt: 'Monolith document with an inline database gallery',
    guide: 'pages',
    features: [
      [
        'A comfortable writing space',
        'Rich blocks, page references and flexible layouts let your notes grow from quick thoughts into living documents.'
      ],
      [
        'Your data belongs in the story',
        'Embed a database view alongside the text that gives it context. The records keep their original identities.'
      ],
      [
        'Connections you can follow',
        'Use linked pages and backlinks to move between related ideas. Add Atlas for a dedicated visual map.'
      ],
      [
        'Keep your changes intentional',
        'Revision checks detect conflicting saves. Review and recover changes instead of silently overwriting a newer document.'
      ]
    ]
  },
  {
    slug: 'projects',
    name: 'Projects & databases',
    icon: 'board',
    label: 'From an idea to what is next',
    title: 'See your work from every angle.',
    description:
      'Plan projects, organize records and bring dates into view. Connected data keeps the different parts of your workspace in step.',
    image: 'projects',
    alt: 'Monolith project board with grouped tasks',
    guide: 'databases',
    features: [
      [
        'Structure without starting over',
        'Use typed properties, relations and saved views to organize the information that matters to your workspace.'
      ],
      [
        'Choose your perspective',
        'Switch between tables, boards and calendars. Project views also offer lists, timelines and Gantt planning.'
      ],
      [
        'Know what needs attention',
        'Actions brings Today, Upcoming, High priority and Completed into a focused view of the underlying records.'
      ],
      [
        'Make time visible',
        'See dated records in Calendar, with month, week and agenda layouts. Connect native calendars, recurring events and ICS subscriptions.'
      ]
    ]
  },
  {
    slug: 'automations',
    name: 'Automations',
    icon: 'flow',
    label: 'Connect the repeatable parts',
    title: 'Less repetition. More momentum.',
    description:
      'Build visual workflows with triggers and actions. Follow each step from input to output, right inside your workspace.',
    image: 'addons',
    alt: 'Automations in the Monolith Addons and Widgets collection',
    guide: 'automations',
    features: [
      [
        'Build with connected steps',
        'Arrange nodes and connect actions in the visual workflow editor. Start with a manual run while you refine the flow.'
      ],
      [
        'A useful set of building blocks',
        'Assign fields, branch on conditions, make HTTP requests and add delays. Import or export workflow definitions.'
      ],
      [
        'See what happened',
        'Inspect run history and step outputs to understand how data moved through a workflow.'
      ],
      [
        'Run on your own host',
        'Enable the Automations addon where you need it. Scheduled execution uses the configured automation worker.'
      ]
    ]
  },
  {
    slug: 'agents',
    name: 'MCP & CLI',
    icon: 'terminal',
    label: 'Your workspace, agent accessible',
    title: 'Bring the agents you already use.',
    description:
      'Let Codex, Claude Code, OpenClaw and other MCP clients work with your Monolith pages, projects and databases.',
    image: 'documents',
    alt: 'Canonical Monolith documents and database records available through the agent bridge',
    guide: 'agents',
    features: [
      [
        'One bridge, familiar tools',
        'Connect a standard stdio MCP client or use the JSON CLI. Generate configuration for Codex, Claude Code, OpenClaw, Cursor and VS Code.'
      ],
      [
        'Start with discovery',
        'Read accessible workspaces, pages, records, projects and calendars. The running API supplies the tool schemas.'
      ],
      [
        'Choose when agents can write',
        'The bridge starts in read mode. Explicitly enable creation and editing, with a separate option for deletion. Account permissions still apply.'
      ],
      [
        'Use the same source of truth',
        'Agent actions use Monolith’s normal endpoints and document revision checks. Connect with a revocable device session.'
      ]
    ]
  },
  {
    slug: 'self-hosting',
    name: 'Self-hosting',
    icon: 'server',
    label: 'A workspace on your terms',
    title: 'Your server. Your space.',
    description:
      'Run Monolith on your own infrastructure. Connect your browser and native clients to one workspace host.',
    image: 'workspace',
    alt: 'Monolith workspace served by a self-hosted installation',
    guide: 'self-hosting',
    features: [
      [
        'A shared home for your clients',
        'The public Go gateway serves the browser app and connects the Windows and macOS clients to the same host.'
      ],
      [
        'A documented container stack',
        'PostgreSQL, a migration service, a private domain API and the gateway are defined in the repository’s Docker Compose setup.'
      ],
      [
        'Updates you can control',
        'Configured signed GitHub releases support update notifications, verified downloads and separate automatic installation settings.'
      ],
      [
        'Plan for recovery',
        'Keep backups of data and files. The update supervisor retains the previous compatible runtime and checks the new one before accepting it.'
      ]
    ]
  } ,
  {
    slug: 'journal', name: 'Journal', icon: 'book', label: 'A space to reflect',
    title: 'Make room for your own story.',
    description: 'Dated entries, writing activity and connected pages in the native Monolith workspace.',
    image: 'documents', alt: 'Monolith native page editor', guide: 'journal',
    features: [
      ['Write in context', 'Create a dated entry and continue in the native page editor.'],
      ['Find a past thought', 'Search titles and tags, filter by month and browse newest entries first.'],
      ['Keep one source', 'Entries remain workspace records, available in Docs and dated calendar views.']
    ]
  }
] as const

export const addons = [
  {
    slug: 'atlas',
    name: 'Atlas',
    icon: 'atlas',
    type: 'Addon',
    category: 'Knowledge',
    summary: 'See the connections between your ideas.',
    detail:
      'Explore pages, backlinks and connected records in a visual knowledge map. Atlas works with the same documents you write in the workspace.',
    features: [
      'Visual maps and connected page discovery',
      'Linked records and relationship context',
      'Opens the original workspace documents'
    ],
    guide: 'atlas'
  },
  {
    slug: 'automations',
    name: 'Automations',
    icon: 'flow',
    type: 'Addon',
    category: 'Productivity',
    summary: 'Turn repeatable work into connected flows.',
    detail:
      'Connect triggers and actions, run visual workflows and inspect each step. Scheduled execution requires an automation worker on your host.',
    features: [
      'Branching, HTTP requests and field assignment',
      'Step outputs and execution history',
      'Workflow import and export'
    ],
    guide: 'automations'
  },
  {
    slug: 'agents',
    name: 'Agents',
    icon: 'terminal',
    type: 'Addon',
    category: 'Productivity',
    summary: 'Bring people and agents into the same plan.',
    detail:
      'Create agent profiles, assign projects and review execution history. A configured local, OpenAI or CLI worker executes assigned tasks.',
    features: [
      'Profiles and reporting relationships',
      'Execution leases and review',
      'Usage and run history'
    ],
    guide: 'agents-addon'
  },
  {
    slug: 'redraw',
    name: 'Redraw',
    icon: 'pen',
    type: 'Addon',
    category: 'Creativity',
    summary: 'A visual space for the next big idea.',
    detail:
      'Work through designs, whiteboards and connected ideas in a visual studio that lives alongside your workspace content.',
    features: [
      'Visual design and whiteboard surfaces',
      'Connected workspace content',
      'Enable separately in each workspace'
    ],
    guide: 'addons'
  },
  {
    slug: 'gym',
    name: 'Gym',
    icon: 'gym',
    type: 'Addon',
    category: 'Personal',
    summary: 'Give your training a place to grow.',
    detail:
      'Organize training plans, record workout sessions and follow exercise history. Training widgets keep current activity visible.',
    features: [
      'Training plans and workout sessions',
      'Exercise and strength history',
      'Connected training widgets'
    ],
    guide: 'addons'
  },
  {
    slug: 'tech-lab',
    name: 'Tech Lab',
    icon: 'server',
    type: 'Addon',
    category: 'Productivity',
    summary: 'A home for the things you host.',
    detail:
      'Track devices, hosted services, game servers and observed health. Monitoring widgets use the collectors configured on your host.',
    features: [
      'Devices and service inventory',
      'Observed health and monitoring',
      'Homelab dashboard widgets'
    ],
    guide: 'addons'
  }
] as const
