export const contract = {
  accessKeys: {
    create: {
      method: 'post',
      description:
        'Issue a scoped machine credential; plaintext is returned once',
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
          additionalProperties: false
        },
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            principal_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 120
            },
            days: {
              type: 'integer',
              minimum: 1,
              maximum: 30
            }
          },
          required: ['principal_id', 'name', 'days'],
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
            token: {
              type: 'string'
            },
            expires: {
              type: 'string'
            }
          },
          required: ['id', 'token', 'expires'],
          additionalProperties: false
        }
      }
    },
    revoke: {
      method: 'post',
      description: 'Revoke a machine credential immediately',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        query: {
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
            }
          },
          required: ['id'],
          additionalProperties: false
        }
      },
      output: {
        NO_CONTENT: true
      }
    }
  },
  metering: {
    list: {
      method: 'get',
      description:
        'Durable token and cost history with filtered aggregate totals',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        query: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            principal_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            month: {
              type: 'string',
              pattern: '^20\\d{2}-(0[1-9]|1[0-2])$'
            },
            offset: {
              default: 0,
              type: 'integer',
              minimum: 0,
              maximum: 1000000
            },
            limit: {
              default: 50,
              type: 'integer',
              minimum: 1,
              maximum: 100
            },
            workspace_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            }
          },
          required: ['offset', 'limit'],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            rows: {
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
                  original_run_id: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  run_id: {
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
                  principal_id: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  task_title: {
                    type: 'string'
                  },
                  adapter: {
                    type: 'string',
                    enum: ['planner', 'external', 'cli', 'codex', 'openclaw']
                  },
                  status: {
                    type: 'string',
                    enum: [
                      'queued',
                      'running',
                      'review',
                      'approved',
                      'rejected',
                      'failed',
                      'cancelled'
                    ]
                  },
                  provider: {
                    type: 'string'
                  },
                  model: {
                    type: 'string'
                  },
                  session_id: {
                    type: 'string'
                  },
                  input_tokens: {
                    anyOf: [
                      {
                        type: 'number'
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  cached_input_tokens: {
                    anyOf: [
                      {
                        type: 'number'
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  output_tokens: {
                    anyOf: [
                      {
                        type: 'number'
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  total_tokens: {
                    anyOf: [
                      {
                        type: 'number'
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  cost_cents: {
                    type: 'number'
                  },
                  reported_cost_cents: {
                    anyOf: [
                      {
                        type: 'number'
                      },
                      {
                        type: 'null'
                      }
                    ]
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
                  'original_run_id',
                  'run_id',
                  'principal_id',
                  'task_title',
                  'adapter',
                  'status',
                  'provider',
                  'model',
                  'session_id',
                  'input_tokens',
                  'cached_input_tokens',
                  'output_tokens',
                  'total_tokens',
                  'cost_cents',
                  'reported_cost_cents',
                  'created',
                  'updated'
                ],
                additionalProperties: false
              }
            },
            has_more: {
              type: 'boolean'
            },
            totals: {
              type: 'object',
              properties: {
                runs: {
                  type: 'number'
                },
                metered_runs: {
                  type: 'number'
                },
                input_tokens: {
                  type: 'number'
                },
                cached_input_tokens: {
                  type: 'number'
                },
                output_tokens: {
                  type: 'number'
                },
                total_tokens: {
                  type: 'number'
                },
                cost_cents: {
                  type: 'number'
                }
              },
              required: [
                'runs',
                'metered_runs',
                'input_tokens',
                'cached_input_tokens',
                'output_tokens',
                'total_tokens',
                'cost_cents'
              ],
              additionalProperties: false
            }
          },
          required: ['rows', 'has_more', 'totals'],
          additionalProperties: false
        }
      }
    }
  },
  people: {
    create: {
      method: 'post',
      description: 'Register an agent as a workspace principal',
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
          additionalProperties: false
        },
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 120
            },
            role: {
              type: 'string',
              enum: ['lead', 'contributor', 'observer']
            },
            adapter: {
              type: 'string',
              enum: ['planner', 'external', 'cli', 'codex', 'openclaw']
            },
            reports_to: {
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
            instructions: {
              type: 'string',
              maxLength: 20000
            },
            playbook_ids: {
              maxItems: 8,
              type: 'array',
              items: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
              }
            },
            budget_cents: {
              type: 'integer',
              minimum: 0,
              maximum: 100000000
            }
          },
          required: [
            'name',
            'role',
            'adapter',
            'reports_to',
            'instructions',
            'budget_cents'
          ],
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
            }
          },
          required: ['id'],
          additionalProperties: false
        }
      }
    },
    update: {
      method: 'post',
      description: 'Update an agent with revision protection',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        query: {
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
            }
          },
          required: ['id'],
          additionalProperties: false
        },
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 120
            },
            role: {
              type: 'string',
              enum: ['lead', 'contributor', 'observer']
            },
            adapter: {
              type: 'string',
              enum: ['planner', 'external', 'cli', 'codex', 'openclaw']
            },
            reports_to: {
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
            instructions: {
              type: 'string',
              maxLength: 20000
            },
            playbook_ids: {
              maxItems: 8,
              type: 'array',
              items: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
              }
            },
            budget_cents: {
              type: 'integer',
              minimum: 0,
              maximum: 100000000
            },
            expected_revision: {
              type: 'integer',
              exclusiveMinimum: 0,
              maximum: 9007199254740991
            },
            status: {
              type: 'string',
              enum: ['active', 'paused']
            }
          },
          required: [
            'name',
            'role',
            'adapter',
            'reports_to',
            'instructions',
            'budget_cents',
            'expected_revision',
            'status'
          ],
          additionalProperties: false
        }
      },
      output: {
        NO_CONTENT: true
      }
    }
  },
  playbook: {
    create: {
      method: 'post',
      description:
        'Create a reusable agent playbook with completion evidence requirements',
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
          additionalProperties: false
        },
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 120
            },
            description: {
              type: 'string',
              maxLength: 1000
            },
            instructions: {
              type: 'string',
              minLength: 1,
              maxLength: 6000
            },
            checks: {
              maxItems: 10,
              type: 'array',
              items: {
                type: 'string',
                minLength: 1,
                maxLength: 240
              }
            },
            require_review: {
              type: 'boolean'
            },
            archived: {
              default: false,
              type: 'boolean'
            }
          },
          required: [
            'name',
            'description',
            'instructions',
            'checks',
            'require_review',
            'archived'
          ],
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
            }
          },
          required: ['id'],
          additionalProperties: false
        }
      }
    },
    update: {
      method: 'post',
      description: 'Revise an owned playbook without changing dispatched runs',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        query: {
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
            }
          },
          required: ['id'],
          additionalProperties: false
        },
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 120
            },
            description: {
              type: 'string',
              maxLength: 1000
            },
            instructions: {
              type: 'string',
              minLength: 1,
              maxLength: 6000
            },
            checks: {
              maxItems: 10,
              type: 'array',
              items: {
                type: 'string',
                minLength: 1,
                maxLength: 240
              }
            },
            require_review: {
              type: 'boolean'
            },
            archived: {
              default: false,
              type: 'boolean'
            },
            expected_revision: {
              type: 'integer',
              exclusiveMinimum: 0,
              maximum: 9007199254740991
            }
          },
          required: [
            'name',
            'description',
            'instructions',
            'checks',
            'require_review',
            'archived',
            'expected_revision'
          ],
          additionalProperties: false
        }
      },
      output: {
        NO_CONTENT: true
      }
    }
  },
  project: {
    create: {
      method: 'post',
      description: 'Create a project in the shared Projects module',
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
          additionalProperties: false
        },
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 255
            },
            description: {
              type: 'string',
              maxLength: 100000
            }
          },
          required: ['name', 'description'],
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
            }
          },
          required: ['id'],
          additionalProperties: false
        }
      }
    },
    membership: {
      method: 'post',
      description: 'Grant, change or revoke project access for an agent',
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
          additionalProperties: false
        },
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            principal_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            role: {
              anyOf: [
                {
                  type: 'string',
                  enum: ['lead', 'contributor', 'observer']
                },
                {
                  type: 'null'
                }
              ]
            }
          },
          required: ['project_id', 'principal_id', 'role'],
          additionalProperties: false
        }
      },
      output: {
        NO_CONTENT: true
      }
    }
  },
  run: {
    get: {
      method: 'get',
      description: 'Read an owned run beyond the recent workspace snapshot',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        query: {
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
            }
          },
          required: ['id'],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            task_title: {
              type: 'string'
            },
            id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            task_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            principal_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            status: {
              type: 'string',
              enum: [
                'queued',
                'running',
                'review',
                'approved',
                'rejected',
                'failed',
                'cancelled'
              ]
            },
            estimated_cents: {
              type: 'number'
            },
            cost_cents: {
              type: 'number'
            },
            result: {
              type: 'string'
            },
            error: {
              type: 'string'
            },
            decision_note: {
              type: 'string'
            },
            created: {
              type: 'string'
            },
            heartbeat_at: {
              anyOf: [
                {
                  type: 'string'
                },
                {
                  type: 'null'
                }
              ]
            },
            lease_expires: {
              anyOf: [
                {
                  type: 'string'
                },
                {
                  type: 'null'
                }
              ]
            },
            adapter: {
              type: 'string',
              enum: ['planner', 'external', 'cli', 'codex', 'openclaw']
            },
            auto_approve: {
              type: 'boolean'
            },
            playbooks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 120
                  },
                  checks: {
                    maxItems: 10,
                    type: 'array',
                    items: {
                      type: 'string',
                      minLength: 1,
                      maxLength: 240
                    }
                  },
                  require_review: {
                    type: 'boolean'
                  },
                  id: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  revision: {
                    type: 'integer',
                    minimum: -9007199254740991,
                    maximum: 9007199254740991
                  }
                },
                required: [
                  'name',
                  'checks',
                  'require_review',
                  'id',
                  'revision'
                ],
                additionalProperties: false
              }
            },
            quality_report: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  check_id: {
                    type: 'string',
                    maxLength: 80
                  },
                  passed: {
                    type: 'boolean'
                  },
                  evidence: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 4000
                  }
                },
                required: ['check_id', 'passed', 'evidence'],
                additionalProperties: false
              }
            }
          },
          required: [
            'task_title',
            'id',
            'task_id',
            'principal_id',
            'status',
            'estimated_cents',
            'cost_cents',
            'result',
            'error',
            'decision_note',
            'created',
            'heartbeat_at',
            'lease_expires',
            'adapter',
            'auto_approve',
            'playbooks',
            'quality_report'
          ],
          additionalProperties: false
        }
      }
    },
    queue: {
      method: 'post',
      description: 'Dispatch an idempotent task run with budget reservation',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        query: {
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
            }
          },
          required: ['id'],
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
            },
            request_key: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            estimated_cents: {
              type: 'integer',
              minimum: 0,
              maximum: 10000000
            }
          },
          required: ['expected_revision', 'request_key', 'estimated_cents'],
          additionalProperties: false
        }
      },
      output: {
        CREATED: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            task_title: {
              type: 'string'
            },
            id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            task_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            principal_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            status: {
              type: 'string',
              enum: [
                'queued',
                'running',
                'review',
                'approved',
                'rejected',
                'failed',
                'cancelled'
              ]
            },
            estimated_cents: {
              type: 'number'
            },
            cost_cents: {
              type: 'number'
            },
            result: {
              type: 'string'
            },
            error: {
              type: 'string'
            },
            decision_note: {
              type: 'string'
            },
            created: {
              type: 'string'
            },
            heartbeat_at: {
              anyOf: [
                {
                  type: 'string'
                },
                {
                  type: 'null'
                }
              ]
            },
            lease_expires: {
              anyOf: [
                {
                  type: 'string'
                },
                {
                  type: 'null'
                }
              ]
            },
            adapter: {
              type: 'string',
              enum: ['planner', 'external', 'cli', 'codex', 'openclaw']
            },
            auto_approve: {
              type: 'boolean'
            },
            playbooks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 120
                  },
                  checks: {
                    maxItems: 10,
                    type: 'array',
                    items: {
                      type: 'string',
                      minLength: 1,
                      maxLength: 240
                    }
                  },
                  require_review: {
                    type: 'boolean'
                  },
                  id: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  revision: {
                    type: 'integer',
                    minimum: -9007199254740991,
                    maximum: 9007199254740991
                  }
                },
                required: [
                  'name',
                  'checks',
                  'require_review',
                  'id',
                  'revision'
                ],
                additionalProperties: false
              }
            },
            quality_report: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  check_id: {
                    type: 'string',
                    maxLength: 80
                  },
                  passed: {
                    type: 'boolean'
                  },
                  evidence: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 4000
                  }
                },
                required: ['check_id', 'passed', 'evidence'],
                additionalProperties: false
              }
            }
          },
          required: [
            'task_title',
            'id',
            'task_id',
            'principal_id',
            'status',
            'estimated_cents',
            'cost_cents',
            'result',
            'error',
            'decision_note',
            'created',
            'heartbeat_at',
            'lease_expires',
            'adapter',
            'auto_approve',
            'playbooks',
            'quality_report'
          ],
          additionalProperties: false
        }
      }
    },
    plan: {
      method: 'post',
      description: 'Execute the built-in deterministic workspace planner',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        query: {
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
            }
          },
          required: ['id'],
          additionalProperties: false
        }
      },
      output: {
        NO_CONTENT: true
      }
    },
    cancel: {
      method: 'post',
      description: 'Cancel an active run and invalidate its worker lease',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        query: {
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
            }
          },
          required: ['id'],
          additionalProperties: false
        }
      },
      output: {
        NO_CONTENT: true
      }
    },
    review: {
      method: 'post',
      description: 'Approve or reject an agent result as the human owner',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        query: {
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
            }
          },
          required: ['id'],
          additionalProperties: false
        },
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            approve: {
              type: 'boolean'
            },
            note: {
              type: 'string',
              maxLength: 8000
            }
          },
          required: ['approve', 'note'],
          additionalProperties: false
        }
      },
      output: {
        NO_CONTENT: true
      }
    }
  },
  snapshot: {
    method: 'get',
    description:
      'Workspace people, agents, project assignments and run activity',
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
        additionalProperties: false
      }
    },
    output: {
      OK: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          playbooks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 120
                },
                description: {
                  type: 'string',
                  maxLength: 1000
                },
                instructions: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 6000
                },
                checks: {
                  maxItems: 10,
                  type: 'array',
                  items: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 240
                  }
                },
                require_review: {
                  type: 'boolean'
                },
                archived: {
                  default: false,
                  type: 'boolean'
                },
                id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                revision: {
                  type: 'integer',
                  minimum: -9007199254740991,
                  maximum: 9007199254740991
                }
              },
              required: [
                'name',
                'description',
                'instructions',
                'checks',
                'require_review',
                'archived',
                'id',
                'revision'
              ],
              additionalProperties: false
            }
          },
          principals: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 120
                },
                role: {
                  type: 'string',
                  enum: ['lead', 'contributor', 'observer']
                },
                adapter: {
                  type: 'string',
                  enum: ['planner', 'external', 'cli', 'codex', 'openclaw']
                },
                reports_to: {
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
                instructions: {
                  type: 'string',
                  maxLength: 20000
                },
                playbook_ids: {
                  maxItems: 8,
                  type: 'array',
                  items: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  }
                },
                budget_cents: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 100000000
                },
                id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                kind: {
                  type: 'string',
                  enum: ['human', 'agent']
                },
                status: {
                  type: 'string',
                  enum: ['active', 'paused']
                },
                revision: {
                  type: 'integer',
                  minimum: -9007199254740991,
                  maximum: 9007199254740991
                }
              },
              required: [
                'name',
                'role',
                'adapter',
                'reports_to',
                'instructions',
                'budget_cents',
                'id',
                'kind',
                'status',
                'revision'
              ],
              additionalProperties: false
            }
          },
          projects: {
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
                name: {
                  type: 'string'
                }
              },
              required: ['id', 'name'],
              additionalProperties: false
            }
          },
          members: {
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
                principal_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                project_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                role: {
                  type: 'string',
                  enum: ['lead', 'contributor', 'observer']
                }
              },
              required: ['id', 'principal_id', 'project_id', 'role'],
              additionalProperties: false
            }
          },
          tasks: {
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
                task_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                project_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                title: {
                  type: 'string'
                },
                content: {
                  type: 'string'
                },
                completed: {
                  type: 'boolean'
                },
                assignee_id: {
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
                status: {
                  type: 'string',
                  enum: ['ready', 'running', 'review', 'blocked', 'done']
                },
                priority: {
                  type: 'string',
                  enum: ['low', 'medium', 'high']
                },
                revision: {
                  type: 'integer',
                  minimum: -9007199254740991,
                  maximum: 9007199254740991
                },
                blockers: {
                  type: 'array',
                  items: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  }
                },
                context: {
                  type: 'array',
                  items: {
                    type: 'string'
                  }
                },
                auto_dispatch: {
                  type: 'boolean'
                },
                run_budget_cents: {
                  type: 'number'
                },
                auto_approve: {
                  type: 'boolean'
                }
              },
              required: [
                'id',
                'task_id',
                'project_id',
                'title',
                'content',
                'completed',
                'assignee_id',
                'status',
                'priority',
                'revision',
                'blockers',
                'context',
                'auto_dispatch',
                'run_budget_cents',
                'auto_approve'
              ],
              additionalProperties: false
            }
          },
          runs: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                task_title: {
                  type: 'string'
                },
                id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                task_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                principal_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                status: {
                  type: 'string',
                  enum: [
                    'queued',
                    'running',
                    'review',
                    'approved',
                    'rejected',
                    'failed',
                    'cancelled'
                  ]
                },
                estimated_cents: {
                  type: 'number'
                },
                cost_cents: {
                  type: 'number'
                },
                result: {
                  type: 'string'
                },
                error: {
                  type: 'string'
                },
                decision_note: {
                  type: 'string'
                },
                created: {
                  type: 'string'
                },
                heartbeat_at: {
                  anyOf: [
                    {
                      type: 'string'
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                lease_expires: {
                  anyOf: [
                    {
                      type: 'string'
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                adapter: {
                  type: 'string',
                  enum: ['planner', 'external', 'cli', 'codex', 'openclaw']
                },
                auto_approve: {
                  type: 'boolean'
                },
                playbooks: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 120
                      },
                      checks: {
                        maxItems: 10,
                        type: 'array',
                        items: {
                          type: 'string',
                          minLength: 1,
                          maxLength: 240
                        }
                      },
                      require_review: {
                        type: 'boolean'
                      },
                      id: {
                        type: 'string',
                        format: 'uuid',
                        pattern:
                          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                      },
                      revision: {
                        type: 'integer',
                        minimum: -9007199254740991,
                        maximum: 9007199254740991
                      }
                    },
                    required: [
                      'name',
                      'checks',
                      'require_review',
                      'id',
                      'revision'
                    ],
                    additionalProperties: false
                  }
                },
                quality_report: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      check_id: {
                        type: 'string',
                        maxLength: 80
                      },
                      passed: {
                        type: 'boolean'
                      },
                      evidence: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 4000
                      }
                    },
                    required: ['check_id', 'passed', 'evidence'],
                    additionalProperties: false
                  }
                }
              },
              required: [
                'task_title',
                'id',
                'task_id',
                'principal_id',
                'status',
                'estimated_cents',
                'cost_cents',
                'result',
                'error',
                'decision_note',
                'created',
                'heartbeat_at',
                'lease_expires',
                'adapter',
                'auto_approve',
                'playbooks',
                'quality_report'
              ],
              additionalProperties: false
            }
          },
          activity: {
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
                actor_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                task_id: {
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
                run_id: {
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
                action: {
                  type: 'string'
                },
                message: {
                  type: 'string'
                },
                created: {
                  type: 'string'
                }
              },
              required: [
                'id',
                'actor_id',
                'task_id',
                'run_id',
                'action',
                'message',
                'created'
              ],
              additionalProperties: false
            }
          },
          credentials: {
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
                principal_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                name: {
                  type: 'string'
                },
                expires: {
                  type: 'string'
                },
                revoked: {
                  type: 'boolean'
                },
                last_used: {
                  anyOf: [
                    {
                      type: 'string'
                    },
                    {
                      type: 'null'
                    }
                  ]
                }
              },
              required: [
                'id',
                'principal_id',
                'name',
                'expires',
                'revoked',
                'last_used'
              ],
              additionalProperties: false
            }
          },
          pages: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                key: {
                  type: 'string'
                },
                title: {
                  type: 'string'
                },
                kind: {
                  type: 'string',
                  enum: ['document', 'record', 'note']
                }
              },
              required: ['key', 'title', 'kind'],
              additionalProperties: false
            }
          },
          usage: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                principal_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                spent_cents: {
                  type: 'integer',
                  minimum: -9007199254740991,
                  maximum: 9007199254740991
                },
                reserved_cents: {
                  type: 'integer',
                  minimum: -9007199254740991,
                  maximum: 9007199254740991
                }
              },
              required: ['principal_id', 'spent_cents', 'reserved_cents'],
              additionalProperties: false
            }
          }
        },
        required: [
          'playbooks',
          'principals',
          'projects',
          'members',
          'tasks',
          'runs',
          'activity',
          'credentials',
          'pages',
          'usage'
        ],
        additionalProperties: false
      }
    }
  },
  work: {
    create: {
      method: 'post',
      description: 'Create a shared project task',
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
          additionalProperties: false
        },
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            title: {
              type: 'string',
              minLength: 1,
              maxLength: 255
            },
            content: {
              type: 'string',
              maxLength: 100000
            }
          },
          required: ['project_id', 'title', 'content'],
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
            }
          },
          required: ['id'],
          additionalProperties: false
        }
      }
    },
    assign: {
      method: 'post',
      description:
        'Assign people or agents, dependencies and owned knowledge context',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        query: {
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
            }
          },
          required: ['id'],
          additionalProperties: false
        },
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            assignee_id: {
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
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high']
            },
            blockers: {
              maxItems: 40,
              type: 'array',
              items: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
              }
            },
            context: {
              maxItems: 40,
              type: 'array',
              items: {
                type: 'string',
                pattern: '^(document|record|note):[0-9a-f-]{36}$'
              }
            },
            expected_revision: {
              type: 'integer',
              minimum: 0,
              maximum: 9007199254740991
            },
            auto_dispatch: {
              default: false,
              type: 'boolean'
            },
            run_budget_cents: {
              default: 0,
              type: 'integer',
              minimum: 0,
              maximum: 10000000
            },
            auto_approve: {
              default: false,
              type: 'boolean'
            }
          },
          required: [
            'assignee_id',
            'priority',
            'blockers',
            'context',
            'expected_revision',
            'auto_dispatch',
            'run_budget_cents',
            'auto_approve'
          ],
          additionalProperties: false
        }
      },
      output: {
        NO_CONTENT: true
      }
    },
    comment: {
      method: 'post',
      description: 'Add an owner comment to task activity',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        query: {
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
            }
          },
          required: ['id'],
          additionalProperties: false
        },
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            message: {
              type: 'string',
              minLength: 1,
              maxLength: 8000
            }
          },
          required: ['message'],
          additionalProperties: false
        }
      },
      output: {
        NO_CONTENT: true
      }
    }
  },
  runtime: {
    claim: {
      method: 'post',
      description:
        'Claim one queued run exclusively and receive its bounded context',
      noAuth: false,
      encrypted: false,
      isDownloadable: false,
      media: null,
      input: {
        query: {
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
            }
          },
          required: ['id'],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema'
        }
      }
    },
    comment: {
      method: 'post',
      description: 'Append agent progress to the run activity',
      noAuth: false,
      encrypted: false,
      isDownloadable: false,
      media: null,
      input: {
        query: {
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
            }
          },
          required: ['id'],
          additionalProperties: false
        },
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            lease: {
              type: 'string',
              minLength: 32,
              maxLength: 100
            },
            message: {
              type: 'string',
              minLength: 1,
              maxLength: 8000
            }
          },
          required: ['lease', 'message'],
          additionalProperties: false
        }
      },
      output: {
        NO_CONTENT: true
      }
    },
    complete: {
      method: 'post',
      description: 'Submit a leased agent result for human review',
      noAuth: false,
      encrypted: false,
      isDownloadable: false,
      media: null,
      input: {
        query: {
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
            }
          },
          required: ['id'],
          additionalProperties: false
        },
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            lease: {
              type: 'string',
              minLength: 32,
              maxLength: 100
            },
            result: {
              type: 'string',
              minLength: 1,
              maxLength: 100000
            },
            cost_cents: {
              type: 'integer',
              minimum: 0,
              maximum: 10000000
            },
            usage: {
              type: 'object',
              properties: {
                provider: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 120
                },
                model: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 200
                },
                session_id: {
                  type: 'string',
                  maxLength: 200
                },
                input_tokens: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 1000000000000
                },
                cached_input_tokens: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 1000000000000
                },
                output_tokens: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 1000000000000
                },
                total_tokens: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 1000000000000
                },
                reported_cost_cents: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 1000000000
                }
              },
              required: [
                'provider',
                'model',
                'session_id',
                'input_tokens',
                'cached_input_tokens',
                'output_tokens',
                'total_tokens',
                'reported_cost_cents'
              ],
              additionalProperties: false
            },
            quality_report: {
              maxItems: 80,
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  check_id: {
                    type: 'string',
                    maxLength: 80
                  },
                  passed: {
                    type: 'boolean'
                  },
                  evidence: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 4000
                  }
                },
                required: ['check_id', 'passed', 'evidence'],
                additionalProperties: false
              }
            }
          },
          required: ['lease', 'result', 'cost_cents'],
          additionalProperties: false
        }
      },
      output: {
        NO_CONTENT: true
      }
    },
    fail: {
      method: 'post',
      description: 'Report a worker failure and release its lease',
      noAuth: false,
      encrypted: false,
      isDownloadable: false,
      media: null,
      input: {
        query: {
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
            }
          },
          required: ['id'],
          additionalProperties: false
        },
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            lease: {
              type: 'string',
              minLength: 32,
              maxLength: 100
            },
            error: {
              type: 'string',
              minLength: 1,
              maxLength: 8000
            },
            cost_cents: {
              type: 'integer',
              minimum: 0,
              maximum: 10000000
            },
            usage: {
              type: 'object',
              properties: {
                provider: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 120
                },
                model: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 200
                },
                session_id: {
                  type: 'string',
                  maxLength: 200
                },
                input_tokens: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 1000000000000
                },
                cached_input_tokens: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 1000000000000
                },
                output_tokens: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 1000000000000
                },
                total_tokens: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 1000000000000
                },
                reported_cost_cents: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 1000000000
                }
              },
              required: [
                'provider',
                'model',
                'session_id',
                'input_tokens',
                'cached_input_tokens',
                'output_tokens',
                'total_tokens',
                'reported_cost_cents'
              ],
              additionalProperties: false
            }
          },
          required: ['lease', 'error', 'cost_cents'],
          additionalProperties: false
        }
      },
      output: {
        NO_CONTENT: true
      }
    },
    heartbeat: {
      method: 'post',
      description: 'Renew a credential-bound run lease for two minutes',
      noAuth: false,
      encrypted: false,
      isDownloadable: false,
      media: null,
      input: {
        query: {
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
            }
          },
          required: ['id'],
          additionalProperties: false
        },
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            lease: {
              type: 'string',
              minLength: 32,
              maxLength: 100
            },
            usage: {
              type: 'object',
              properties: {
                provider: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 120
                },
                model: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 200
                },
                session_id: {
                  type: 'string',
                  maxLength: 200
                },
                input_tokens: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 1000000000000
                },
                cached_input_tokens: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 1000000000000
                },
                output_tokens: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 1000000000000
                },
                total_tokens: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 1000000000000
                },
                reported_cost_cents: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 1000000000
                }
              },
              required: [
                'provider',
                'model',
                'session_id',
                'input_tokens',
                'cached_input_tokens',
                'output_tokens',
                'total_tokens',
                'reported_cost_cents'
              ],
              additionalProperties: false
            }
          },
          required: ['lease'],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            lease_expires: {
              type: 'string'
            }
          },
          required: ['lease_expires'],
          additionalProperties: false
        }
      }
    },
    inbox: {
      method: 'get',
      description:
        'Only queued runs assigned to this agent with current project access',
      noAuth: false,
      encrypted: false,
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
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema'
        }
      }
    },
    me: {
      method: 'get',
      description: 'Current agent identity, project grants and budget',
      noAuth: false,
      encrypted: false,
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
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema'
        }
      }
    }
  }
} as const

export default contract
