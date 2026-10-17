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
  flows: {
    create: {
      method: 'post',
      description: 'Create a disabled workflow',
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
              maxLength: 120
            },
            description: {
              type: 'string',
              maxLength: 1000
            },
            graph: {
              type: 'object',
              properties: {
                version: {
                  type: 'number',
                  const: 1
                },
                nodes: {
                  minItems: 1,
                  maxItems: 100,
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 80
                      },
                      kind: {
                        type: 'string',
                        enum: [
                          'trigger',
                          'set',
                          'condition',
                          'http',
                          'delay',
                          'output'
                        ]
                      },
                      name: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 100
                      },
                      x: {
                        type: 'number',
                        minimum: 0,
                        maximum: 10000
                      },
                      y: {
                        type: 'number',
                        minimum: 0,
                        maximum: 10000
                      },
                      config: {
                        type: 'object',
                        additionalProperties: {}
                      }
                    },
                    required: ['id', 'kind', 'name', 'x', 'y', 'config'],
                    additionalProperties: false
                  }
                },
                edges: {
                  maxItems: 200,
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 80
                      },
                      source: {
                        type: 'string'
                      },
                      target: {
                        type: 'string'
                      },
                      port: {
                        type: 'string',
                        enum: ['main', 'true', 'false']
                      }
                    },
                    required: ['id', 'source', 'target', 'port'],
                    additionalProperties: false
                  }
                }
              },
              required: ['version', 'nodes', 'edges'],
              additionalProperties: false
            },
            interval_minutes: {
              type: 'integer',
              minimum: 0,
              maximum: 525600
            }
          },
          required: ['title', 'description', 'graph', 'interval_minutes'],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            id: {
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
            title: {
              type: 'string',
              minLength: 1,
              maxLength: 120
            },
            description: {
              type: 'string',
              maxLength: 1000
            },
            graph: {
              type: 'object',
              properties: {
                version: {
                  type: 'number',
                  const: 1
                },
                nodes: {
                  minItems: 1,
                  maxItems: 100,
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 80
                      },
                      kind: {
                        type: 'string',
                        enum: [
                          'trigger',
                          'set',
                          'condition',
                          'http',
                          'delay',
                          'output'
                        ]
                      },
                      name: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 100
                      },
                      x: {
                        type: 'number',
                        minimum: 0,
                        maximum: 10000
                      },
                      y: {
                        type: 'number',
                        minimum: 0,
                        maximum: 10000
                      },
                      config: {
                        type: 'object',
                        additionalProperties: {}
                      }
                    },
                    required: ['id', 'kind', 'name', 'x', 'y', 'config'],
                    additionalProperties: false
                  }
                },
                edges: {
                  maxItems: 200,
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 80
                      },
                      source: {
                        type: 'string'
                      },
                      target: {
                        type: 'string'
                      },
                      port: {
                        type: 'string',
                        enum: ['main', 'true', 'false']
                      }
                    },
                    required: ['id', 'source', 'target', 'port'],
                    additionalProperties: false
                  }
                }
              },
              required: ['version', 'nodes', 'edges'],
              additionalProperties: false
            },
            enabled: {
              type: 'boolean'
            },
            revision: {
              type: 'integer',
              exclusiveMinimum: 0,
              maximum: 9007199254740991
            },
            interval_minutes: {
              type: 'integer',
              minimum: 0,
              maximum: 525600
            },
            created: {
              type: 'string'
            },
            updated: {
              type: 'string'
            }
          },
          required: [
            'id',
            'workspace_id',
            'title',
            'description',
            'graph',
            'enabled',
            'revision',
            'interval_minutes',
            'created',
            'updated'
          ],
          additionalProperties: false
        }
      }
    },
    history: {
      method: 'get',
      description: 'Read the latest 50 workflow executions',
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
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'array',
          items: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                enum: ['success', 'error']
              },
              steps: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    node_id: {
                      type: 'string'
                    },
                    name: {
                      type: 'string'
                    },
                    status: {
                      type: 'string',
                      enum: ['success', 'error']
                    },
                    duration_ms: {
                      type: 'number'
                    },
                    input: {
                      type: 'object',
                      additionalProperties: {}
                    },
                    output: {
                      anyOf: [
                        {
                          type: 'object',
                          additionalProperties: {}
                        },
                        {
                          type: 'null'
                        }
                      ]
                    },
                    port: {
                      type: 'string'
                    },
                    error: {
                      type: 'string'
                    }
                  },
                  required: [
                    'node_id',
                    'name',
                    'status',
                    'duration_ms',
                    'input',
                    'output',
                    'port'
                  ],
                  additionalProperties: false
                }
              },
              output: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: {}
                }
              },
              duration_ms: {
                type: 'number'
              },
              error: {
                type: 'string'
              },
              id: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
              },
              workflow_id: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
              },
              revision: {
                type: 'number'
              },
              trigger: {
                type: 'string',
                enum: ['manual', 'schedule', 'event']
              },
              started: {
                type: 'string'
              }
            },
            required: [
              'status',
              'steps',
              'output',
              'duration_ms',
              'id',
              'workflow_id',
              'revision',
              'trigger',
              'started'
            ],
            additionalProperties: false
          }
        }
      }
    },
    list: {
      method: 'get',
      description: 'List workspace automations',
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
              workspace_id: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
              },
              title: {
                type: 'string',
                minLength: 1,
                maxLength: 120
              },
              description: {
                type: 'string',
                maxLength: 1000
              },
              graph: {
                type: 'object',
                properties: {
                  version: {
                    type: 'number',
                    const: 1
                  },
                  nodes: {
                    minItems: 1,
                    maxItems: 100,
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: {
                          type: 'string',
                          minLength: 1,
                          maxLength: 80
                        },
                        kind: {
                          type: 'string',
                          enum: [
                            'trigger',
                            'set',
                            'condition',
                            'http',
                            'delay',
                            'output'
                          ]
                        },
                        name: {
                          type: 'string',
                          minLength: 1,
                          maxLength: 100
                        },
                        x: {
                          type: 'number',
                          minimum: 0,
                          maximum: 10000
                        },
                        y: {
                          type: 'number',
                          minimum: 0,
                          maximum: 10000
                        },
                        config: {
                          type: 'object',
                          additionalProperties: {}
                        }
                      },
                      required: ['id', 'kind', 'name', 'x', 'y', 'config'],
                      additionalProperties: false
                    }
                  },
                  edges: {
                    maxItems: 200,
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: {
                          type: 'string',
                          minLength: 1,
                          maxLength: 80
                        },
                        source: {
                          type: 'string'
                        },
                        target: {
                          type: 'string'
                        },
                        port: {
                          type: 'string',
                          enum: ['main', 'true', 'false']
                        }
                      },
                      required: ['id', 'source', 'target', 'port'],
                      additionalProperties: false
                    }
                  }
                },
                required: ['version', 'nodes', 'edges'],
                additionalProperties: false
              },
              enabled: {
                type: 'boolean'
              },
              revision: {
                type: 'integer',
                exclusiveMinimum: 0,
                maximum: 9007199254740991
              },
              interval_minutes: {
                type: 'integer',
                minimum: 0,
                maximum: 525600
              },
              created: {
                type: 'string'
              },
              updated: {
                type: 'string'
              }
            },
            required: [
              'id',
              'workspace_id',
              'title',
              'description',
              'graph',
              'enabled',
              'revision',
              'interval_minutes',
              'created',
              'updated'
            ],
            additionalProperties: false
          }
        }
      }
    },
    remove: {
      method: 'post',
      description: 'Delete workflow and its execution history',
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
        },
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            expected_revision: {
              type: 'integer',
              exclusiveMinimum: 0,
              maximum: 9007199254740991
            }
          },
          required: ['expected_revision'],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'boolean'
        }
      }
    },
    run: {
      method: 'post',
      description:
        'Execute saved workflow with authenticated input; event runs require an enabled workflow',
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
        },
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            input: {
              type: 'object',
              additionalProperties: {}
            },
            trigger: {
              default: 'manual',
              type: 'string',
              enum: ['manual', 'event']
            },
            expected_revision: {
              type: 'integer',
              exclusiveMinimum: 0,
              maximum: 9007199254740991
            }
          },
          required: ['input', 'trigger', 'expected_revision'],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['success', 'error']
            },
            steps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  node_id: {
                    type: 'string'
                  },
                  name: {
                    type: 'string'
                  },
                  status: {
                    type: 'string',
                    enum: ['success', 'error']
                  },
                  duration_ms: {
                    type: 'number'
                  },
                  input: {
                    type: 'object',
                    additionalProperties: {}
                  },
                  output: {
                    anyOf: [
                      {
                        type: 'object',
                        additionalProperties: {}
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  port: {
                    type: 'string'
                  },
                  error: {
                    type: 'string'
                  }
                },
                required: [
                  'node_id',
                  'name',
                  'status',
                  'duration_ms',
                  'input',
                  'output',
                  'port'
                ],
                additionalProperties: false
              }
            },
            output: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: {}
              }
            },
            duration_ms: {
              type: 'number'
            },
            error: {
              type: 'string'
            },
            id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            workflow_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            revision: {
              type: 'number'
            },
            trigger: {
              type: 'string',
              enum: ['manual', 'schedule', 'event']
            },
            started: {
              type: 'string'
            }
          },
          required: [
            'status',
            'steps',
            'output',
            'duration_ms',
            'id',
            'workflow_id',
            'revision',
            'trigger',
            'started'
          ],
          additionalProperties: false
        }
      }
    },
    save: {
      method: 'post',
      description: 'Save a workflow at its current revision',
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
        },
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            title: {
              type: 'string',
              minLength: 1,
              maxLength: 120
            },
            description: {
              type: 'string',
              maxLength: 1000
            },
            graph: {
              type: 'object',
              properties: {
                version: {
                  type: 'number',
                  const: 1
                },
                nodes: {
                  minItems: 1,
                  maxItems: 100,
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 80
                      },
                      kind: {
                        type: 'string',
                        enum: [
                          'trigger',
                          'set',
                          'condition',
                          'http',
                          'delay',
                          'output'
                        ]
                      },
                      name: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 100
                      },
                      x: {
                        type: 'number',
                        minimum: 0,
                        maximum: 10000
                      },
                      y: {
                        type: 'number',
                        minimum: 0,
                        maximum: 10000
                      },
                      config: {
                        type: 'object',
                        additionalProperties: {}
                      }
                    },
                    required: ['id', 'kind', 'name', 'x', 'y', 'config'],
                    additionalProperties: false
                  }
                },
                edges: {
                  maxItems: 200,
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 80
                      },
                      source: {
                        type: 'string'
                      },
                      target: {
                        type: 'string'
                      },
                      port: {
                        type: 'string',
                        enum: ['main', 'true', 'false']
                      }
                    },
                    required: ['id', 'source', 'target', 'port'],
                    additionalProperties: false
                  }
                }
              },
              required: ['version', 'nodes', 'edges'],
              additionalProperties: false
            },
            interval_minutes: {
              type: 'integer',
              minimum: 0,
              maximum: 525600
            },
            expected_revision: {
              type: 'integer',
              exclusiveMinimum: 0,
              maximum: 9007199254740991
            },
            enabled: {
              type: 'boolean'
            }
          },
          required: [
            'title',
            'description',
            'graph',
            'interval_minutes',
            'expected_revision',
            'enabled'
          ],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            id: {
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
            title: {
              type: 'string',
              minLength: 1,
              maxLength: 120
            },
            description: {
              type: 'string',
              maxLength: 1000
            },
            graph: {
              type: 'object',
              properties: {
                version: {
                  type: 'number',
                  const: 1
                },
                nodes: {
                  minItems: 1,
                  maxItems: 100,
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 80
                      },
                      kind: {
                        type: 'string',
                        enum: [
                          'trigger',
                          'set',
                          'condition',
                          'http',
                          'delay',
                          'output'
                        ]
                      },
                      name: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 100
                      },
                      x: {
                        type: 'number',
                        minimum: 0,
                        maximum: 10000
                      },
                      y: {
                        type: 'number',
                        minimum: 0,
                        maximum: 10000
                      },
                      config: {
                        type: 'object',
                        additionalProperties: {}
                      }
                    },
                    required: ['id', 'kind', 'name', 'x', 'y', 'config'],
                    additionalProperties: false
                  }
                },
                edges: {
                  maxItems: 200,
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 80
                      },
                      source: {
                        type: 'string'
                      },
                      target: {
                        type: 'string'
                      },
                      port: {
                        type: 'string',
                        enum: ['main', 'true', 'false']
                      }
                    },
                    required: ['id', 'source', 'target', 'port'],
                    additionalProperties: false
                  }
                }
              },
              required: ['version', 'nodes', 'edges'],
              additionalProperties: false
            },
            enabled: {
              type: 'boolean'
            },
            revision: {
              type: 'integer',
              exclusiveMinimum: 0,
              maximum: 9007199254740991
            },
            interval_minutes: {
              type: 'integer',
              minimum: 0,
              maximum: 525600
            },
            created: {
              type: 'string'
            },
            updated: {
              type: 'string'
            }
          },
          required: [
            'id',
            'workspace_id',
            'title',
            'description',
            'graph',
            'enabled',
            'revision',
            'interval_minutes',
            'created',
            'updated'
          ],
          additionalProperties: false
        }
      }
    }
  }
} as const

export default contract
