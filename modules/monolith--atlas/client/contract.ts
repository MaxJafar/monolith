export const contract = {
  workspaces: {
    method: 'get',
    description: 'List accessible workspaces',
    noAuth: false,
    encrypted: true,
    isDownloadable: false,
    media: null,
    input: {},
    output: {
      OK: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            owner_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            name: {
              type: 'string',
              maxLength: 160
            },
            icon: {
              type: 'string',
              maxLength: 80
            },
            profile: {
              type: 'string',
              enum: ['personal', 'collaborative', 'agents']
            },
            enabled_modules: {
              maxItems: 64,
              type: 'array',
              items: {
                type: 'string',
                maxLength: 80,
                pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$'
              }
            },
            description: {
              type: 'string'
            },
            is_default: {
              type: 'boolean'
            },
            native_imported: {
              type: 'boolean'
            },
            navigation: {
              anyOf: [
                {
                  anyOf: [
                    {
                      type: 'string'
                    },
                    {
                      type: 'number'
                    },
                    {
                      type: 'boolean'
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                {
                  type: 'object',
                  additionalProperties: {}
                },
                {
                  type: 'array',
                  items: {}
                }
              ]
            },
            created: {
              type: 'string',
              format: 'date-time'
            },
            updated: {
              type: 'string',
              format: 'date-time'
            },
            role: {
              type: 'string',
              enum: ['owner', 'editor', 'viewer']
            }
          },
          required: [
            'id',
            'owner_id',
            'name',
            'icon',
            'profile',
            'enabled_modules',
            'description',
            'is_default',
            'native_imported',
            'navigation',
            'created',
            'updated',
            'role'
          ],
          additionalProperties: false
        }
      }
    }
  },
  createPage: {
    method: 'post',
    description: 'Create a page in a workspace',
    noAuth: false,
    encrypted: true,
    isDownloadable: false,
    media: null,
    input: {
      query: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          workspace_id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          }
        },
        required: ['workspace_id'],
        additionalProperties: false
      },
      body: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          title: {
            type: 'string',
            minLength: 1,
            maxLength: 255
          },
          parent_id: {
            default: null,
            anyOf: [
              {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
              },
              {
                type: 'null'
              }
            ]
          }
        },
        required: ['title', 'parent_id'],
        additionalProperties: false
      }
    },
    output: {
      CREATED: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          },
          owner_id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          },
          workspace_id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          },
          parent_id: {
            anyOf: [
              {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
              },
              {
                type: 'null'
              }
            ]
          },
          route_key: {
            type: 'string',
            maxLength: 200
          },
          title: {
            type: 'string',
            maxLength: 255
          },
          icon: {
            type: 'string',
            maxLength: 80
          },
          body: {
            anyOf: [
              {
                anyOf: [
                  {
                    type: 'string'
                  },
                  {
                    type: 'number'
                  },
                  {
                    type: 'boolean'
                  },
                  {
                    type: 'null'
                  }
                ]
              },
              {
                type: 'object',
                additionalProperties: {}
              },
              {
                type: 'array',
                items: {}
              }
            ]
          },
          position: {
            type: 'integer',
            minimum: -2147483648,
            maximum: 2147483647
          },
          revision: {
            type: 'integer',
            minimum: -2147483648,
            maximum: 2147483647
          },
          created: {
            type: 'string',
            format: 'date-time'
          },
          updated: {
            type: 'string',
            format: 'date-time'
          }
        },
        required: [
          'id',
          'owner_id',
          'workspace_id',
          'parent_id',
          'route_key',
          'title',
          'icon',
          'body',
          'position',
          'revision',
          'created',
          'updated'
        ],
        additionalProperties: false
      }
    }
  },
  snapshot: {
    method: 'get',
    description:
      'Workspace page links, projects and database relations without duplicate module items',
    noAuth: false,
    encrypted: true,
    isDownloadable: false,
    media: null,
    input: {
      query: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          workspace_id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          }
        },
        required: ['workspace_id'],
        additionalProperties: false
      }
    },
    output: {
      OK: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          nodes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                key: {
                  type: 'string'
                },
                kind: {
                  type: 'string',
                  enum: ['document', 'record', 'note', 'redraw']
                },
                href: {
                  type: 'string'
                },
                title: {
                  type: 'string'
                },
                tags: {
                  type: 'array',
                  items: {
                    type: 'string'
                  }
                },
                context: {
                  type: 'string'
                },
                parent: {
                  anyOf: [
                    {
                      type: 'string'
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                excerpt: {
                  type: 'string'
                }
              },
              required: ['id', 'key', 'kind', 'title'],
              additionalProperties: false
            }
          },
          edges: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'string'
                },
                source: {
                  type: 'string'
                },
                target: {
                  type: 'string'
                },
                kind: {
                  type: 'string',
                  enum: ['mention', 'relation', 'related', 'parent']
                },
                label: {
                  type: 'string'
                }
              },
              required: ['id', 'source', 'target', 'kind', 'label'],
              additionalProperties: false
            }
          },
          unresolved: {
            type: 'integer',
            minimum: -9007199254740991,
            maximum: 9007199254740991
          },
          databases: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                title: {
                  type: 'string'
                },
                href: {
                  type: 'string'
                },
                recordIds: {
                  type: 'array',
                  items: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  }
                },
                embeddedIn: {
                  type: 'array',
                  items: {
                    type: 'string'
                  }
                }
              },
              required: ['id', 'title', 'href', 'recordIds', 'embeddedIn'],
              additionalProperties: false
            }
          }
        },
        required: ['nodes', 'edges', 'unresolved', 'databases'],
        additionalProperties: false
      }
    }
  },
  relate: {
    method: 'post',
    description: 'Connect workspace pages and records',
    noAuth: false,
    encrypted: true,
    isDownloadable: false,
    media: null,
    input: {
      query: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          workspace_id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          }
        },
        required: ['workspace_id'],
        additionalProperties: false
      },
      body: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          source: {
            type: 'object',
            properties: {
              kind: {
                type: 'string',
                enum: ['document', 'record', 'note', 'redraw']
              },
              id: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
              }
            },
            required: ['kind', 'id'],
            additionalProperties: false
          },
          target: {
            type: 'object',
            properties: {
              kind: {
                type: 'string',
                enum: ['document', 'record', 'note', 'redraw']
              },
              id: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
              }
            },
            required: ['kind', 'id'],
            additionalProperties: false
          },
          label: {
            type: 'string',
            minLength: 1,
            maxLength: 255
          }
        },
        required: ['source', 'target', 'label'],
        additionalProperties: false
      }
    },
    output: {
      NO_CONTENT: true
    }
  },
  unrelate: {
    method: 'post',
    description: 'Remove a workspace semantic relation',
    noAuth: false,
    encrypted: true,
    isDownloadable: false,
    media: null,
    input: {
      query: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          workspace_id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          },
          id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          }
        },
        required: ['workspace_id', 'id'],
        additionalProperties: false
      }
    },
    output: {
      NO_CONTENT: true
    }
  },
  preview: {
    method: 'get',
    description:
      'Read a bounded preview of an accessible canonical workspace page',
    noAuth: false,
    encrypted: true,
    isDownloadable: false,
    media: null,
    input: {
      query: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          workspace_id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          },
          kind: {
            type: 'string',
            enum: ['document', 'record', 'redraw']
          },
          id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          }
        },
        required: ['workspace_id', 'kind', 'id'],
        additionalProperties: false
      }
    },
    output: {
      OK: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          title: {
            type: 'string'
          },
          text: {
            type: 'string'
          },
          truncated: {
            type: 'boolean'
          },
          href: {
            type: 'string'
          },
          updated: {
            type: 'string'
          }
        },
        required: ['title', 'text', 'truncated', 'href', 'updated'],
        additionalProperties: false
      }
    }
  }
} as const

export default contract
