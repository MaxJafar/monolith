export const contract = {
  calendarFeed: {
    method: 'get',
    description: 'Read filtered dated records from owned saved calendar views',
    noAuth: false,
    encrypted: true,
    isDownloadable: false,
    media: null,
    input: {
      query: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          today: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}-\\d{2}$'
          },
          time_zone: {
            type: 'string',
            maxLength: 100
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
          sources: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                source_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                view_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                base_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                name: {
                  type: 'string'
                },
                base_name: {
                  type: 'string'
                },
                unscheduled_count: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 9007199254740991
                }
              },
              required: [
                'source_id',
                'view_id',
                'base_id',
                'name',
                'base_name',
                'unscheduled_count'
              ],
              additionalProperties: false
            }
          },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'string'
                },
                record_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                title: {
                  type: 'string'
                },
                start: {
                  type: 'string',
                  pattern: '^\\d{4}-\\d{2}-\\d{2}$'
                },
                end: {
                  type: 'string',
                  pattern: '^\\d{4}-\\d{2}-\\d{2}$'
                },
                source_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                tags: {
                  type: 'array',
                  items: {
                    type: 'string'
                  }
                },
                owners: {
                  type: 'array',
                  items: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  }
                },
                href: {
                  type: 'string'
                },
                native_event_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                }
              },
              required: [
                'id',
                'record_id',
                'title',
                'start',
                'end',
                'source_id',
                'tags',
                'owners',
                'href'
              ],
              additionalProperties: false
            }
          }
        },
        required: ['sources', 'items'],
        additionalProperties: false
      }
    }
  },
  createBase: {
    method: 'post',
    description: 'Create a database with a saved table view',
    noAuth: false,
    encrypted: true,
    isDownloadable: false,
    media: null,
    input: {
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
            default: '',
            type: 'string',
            maxLength: 10000
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
          },
          owner_id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          },
          workspace_id: {
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
          source_type: {
            anyOf: [
              {
                type: 'string',
                maxLength: 20
              },
              {
                type: 'null'
              }
            ]
          },
          name: {
            type: 'string',
            maxLength: 255
          },
          description: {
            type: 'string'
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
          'source_type',
          'name',
          'description',
          'created',
          'updated'
        ],
        additionalProperties: false
      }
    }
  },
  createField: {
    method: 'post',
    description: 'Create a typed field or a reciprocal pair of relation fields',
    noAuth: false,
    encrypted: true,
    isDownloadable: false,
    media: null,
    input: {
      body: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          base_id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          },
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 255
          },
          kind: {
            type: 'string',
            enum: [
              'text',
              'number',
              'date',
              'checkbox',
              'select',
              'multi-select',
              'relation',
              'person'
            ]
          },
          options: {
            default: [],
            maxItems: 100,
            type: 'array',
            items: {
              type: 'string',
              minLength: 1,
              maxLength: 255
            }
          },
          target_base_id: {
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
          },
          reverse_name: {
            type: 'string',
            minLength: 1,
            maxLength: 255
          },
          cardinality: {
            default: 'many',
            type: 'string',
            enum: ['one', 'many']
          },
          reverse_cardinality: {
            default: 'many',
            type: 'string',
            enum: ['one', 'many']
          }
        },
        required: [
          'base_id',
          'name',
          'kind',
          'options',
          'target_base_id',
          'cardinality',
          'reverse_cardinality'
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
          },
          owner_id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          },
          base_id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          },
          name: {
            type: 'string',
            maxLength: 255
          },
          kind: {
            type: 'string',
            enum: [
              'text',
              'number',
              'date',
              'checkbox',
              'select',
              'multi-select',
              'relation',
              'person'
            ]
          },
          config: {
            type: 'object',
            properties: {
              options: {
                default: [],
                maxItems: 100,
                type: 'array',
                items: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 255
                }
              },
              cardinality: {
                default: 'many',
                type: 'string',
                enum: ['one', 'many']
              },
              reciprocal_field_id: {
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
            required: ['options', 'cardinality', 'reciprocal_field_id'],
            additionalProperties: false
          },
          target_base_id: {
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
          position: {
            type: 'integer',
            minimum: -2147483648,
            maximum: 2147483647
          }
        },
        required: [
          'id',
          'owner_id',
          'base_id',
          'name',
          'kind',
          'config',
          'target_base_id',
          'position'
        ],
        additionalProperties: false
      }
    }
  },
  createRecord: {
    method: 'post',
    description: 'Create a record content page with validated properties',
    noAuth: false,
    encrypted: true,
    isDownloadable: false,
    media: null,
    input: {
      body: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          title: {
            type: 'string',
            minLength: 1,
            maxLength: 1000000
          },
          content: {
            default: '',
            type: 'string',
            maxLength: 1000000
          },
          values: {
            default: {},
            type: 'object',
            additionalProperties: {
              anyOf: [
                {
                  type: 'string',
                  maxLength: 100000
                },
                {
                  type: 'number'
                },
                {
                  type: 'boolean'
                },
                {
                  maxItems: 500,
                  type: 'array',
                  items: {
                    type: 'string',
                    maxLength: 255
                  }
                },
                {
                  type: 'null'
                }
              ]
            }
          },
          item_type: {
            type: 'string',
            enum: ['page', 'task', 'note', 'project', 'event', 'post']
          },
          done: {
            type: 'boolean'
          },
          date: {
            anyOf: [
              {
                type: 'string',
                format: 'date-time',
                pattern:
                  '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$'
              },
              {
                type: 'null'
              }
            ]
          },
          end_date: {
            anyOf: [
              {
                type: 'string',
                format: 'date-time',
                pattern:
                  '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$'
              },
              {
                type: 'null'
              }
            ]
          },
          project_id: {
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
          base_id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          }
        },
        required: ['title', 'content', 'values', 'base_id'],
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
          base_id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          },
          title: {
            type: 'string'
          },
          item_type: {
            type: 'string',
            maxLength: 20
          },
          content: {
            type: 'string'
          },
          done: {
            type: 'boolean'
          },
          date: {
            anyOf: [
              {
                type: 'string',
                format: 'date-time'
              },
              {
                type: 'null'
              }
            ]
          },
          end_date: {
            anyOf: [
              {
                type: 'string',
                format: 'date-time'
              },
              {
                type: 'null'
              }
            ]
          },
          project_id: {
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
          values: {
            type: 'object',
            additionalProperties: {
              anyOf: [
                {
                  type: 'string',
                  maxLength: 100000
                },
                {
                  type: 'number'
                },
                {
                  type: 'boolean'
                },
                {
                  maxItems: 500,
                  type: 'array',
                  items: {
                    type: 'string',
                    maxLength: 255
                  }
                },
                {
                  type: 'null'
                }
              ]
            }
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
          'base_id',
          'title',
          'item_type',
          'content',
          'done',
          'date',
          'end_date',
          'project_id',
          'values',
          'created',
          'updated'
        ],
        additionalProperties: false
      }
    }
  },
  createView: {
    method: 'post',
    description:
      'Save a table, Kanban or calendar view with typed filters and sorting',
    noAuth: false,
    encrypted: true,
    isDownloadable: false,
    media: null,
    input: {
      body: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 255
          },
          mode: {
            type: 'string',
            enum: ['table', 'kanban', 'calendar']
          },
          group_field_id: {
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
          },
          config: {
            type: 'object',
            properties: {
              filters: {
                default: [],
                maxItems: 20,
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field_id: {
                      anyOf: [
                        {
                          type: 'string',
                          format: 'uuid',
                          pattern:
                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                        },
                        {
                          type: 'string',
                          enum: [
                            'title',
                            'item_type',
                            'done',
                            'date',
                            'end_date',
                            'project_id'
                          ]
                        }
                      ]
                    },
                    operator: {
                      type: 'string',
                      enum: [
                        'equals',
                        'not-equals',
                        'contains',
                        'empty',
                        'not-empty',
                        'greater',
                        'less',
                        'before',
                        'after',
                        'on-or-before',
                        'on-or-after',
                        'relative-date',
                        'includes',
                        'not-includes',
                        'includes-any',
                        'includes-all'
                      ]
                    },
                    value: {
                      anyOf: [
                        {
                          type: 'string',
                          maxLength: 100000
                        },
                        {
                          type: 'number'
                        },
                        {
                          type: 'boolean'
                        },
                        {
                          maxItems: 500,
                          type: 'array',
                          items: {
                            type: 'string',
                            maxLength: 255
                          }
                        },
                        {
                          type: 'null'
                        }
                      ]
                    }
                  },
                  required: ['field_id', 'operator'],
                  additionalProperties: false
                }
              },
              filter_groups: {
                default: [],
                maxItems: 5,
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    filter_logic: {
                      default: 'and',
                      type: 'string',
                      enum: ['and', 'or']
                    },
                    filters: {
                      default: [],
                      maxItems: 20,
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          field_id: {
                            anyOf: [
                              {
                                type: 'string',
                                format: 'uuid',
                                pattern:
                                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                              },
                              {
                                type: 'string',
                                enum: [
                                  'title',
                                  'item_type',
                                  'done',
                                  'date',
                                  'end_date',
                                  'project_id'
                                ]
                              }
                            ]
                          },
                          operator: {
                            type: 'string',
                            enum: [
                              'equals',
                              'not-equals',
                              'contains',
                              'empty',
                              'not-empty',
                              'greater',
                              'less',
                              'before',
                              'after',
                              'on-or-before',
                              'on-or-after',
                              'relative-date',
                              'includes',
                              'not-includes',
                              'includes-any',
                              'includes-all'
                            ]
                          },
                          value: {
                            anyOf: [
                              {
                                type: 'string',
                                maxLength: 100000
                              },
                              {
                                type: 'number'
                              },
                              {
                                type: 'boolean'
                              },
                              {
                                maxItems: 500,
                                type: 'array',
                                items: {
                                  type: 'string',
                                  maxLength: 255
                                }
                              },
                              {
                                type: 'null'
                              }
                            ]
                          }
                        },
                        required: ['field_id', 'operator'],
                        additionalProperties: false
                      }
                    }
                  },
                  required: ['filter_logic', 'filters'],
                  additionalProperties: false
                }
              },
              sorts: {
                default: [],
                maxItems: 10,
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field_id: {
                      anyOf: [
                        {
                          type: 'string',
                          format: 'uuid',
                          pattern:
                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                        },
                        {
                          type: 'string',
                          enum: [
                            'title',
                            'item_type',
                            'done',
                            'date',
                            'end_date',
                            'project_id'
                          ]
                        }
                      ]
                    },
                    direction: {
                      type: 'string',
                      enum: ['asc', 'desc']
                    }
                  },
                  required: ['field_id', 'direction'],
                  additionalProperties: false
                }
              },
              hidden_fields: {
                default: [],
                maxItems: 100,
                type: 'array',
                items: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                }
              },
              filter_logic: {
                default: 'and',
                type: 'string',
                enum: ['and', 'or']
              },
              group_property: {
                default: null,
                anyOf: [
                  {
                    type: 'string',
                    enum: ['item_type', 'done']
                  },
                  {
                    type: 'null'
                  }
                ]
              },
              date_field_id: {
                default: null,
                anyOf: [
                  {
                    anyOf: [
                      {
                        type: 'string',
                        format: 'uuid',
                        pattern:
                          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                      },
                      {
                        type: 'string',
                        enum: ['date', 'end_date']
                      }
                    ]
                  },
                  {
                    type: 'null'
                  }
                ]
              },
              end_date_field_id: {
                default: null,
                anyOf: [
                  {
                    anyOf: [
                      {
                        type: 'string',
                        format: 'uuid',
                        pattern:
                          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                      },
                      {
                        type: 'string',
                        enum: ['date', 'end_date']
                      }
                    ]
                  },
                  {
                    type: 'null'
                  }
                ]
              }
            },
            required: [
              'filters',
              'filter_groups',
              'sorts',
              'hidden_fields',
              'filter_logic',
              'group_property',
              'date_field_id',
              'end_date_field_id'
            ],
            additionalProperties: false
          },
          base_id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          }
        },
        required: ['name', 'mode', 'group_field_id', 'config', 'base_id'],
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
          base_id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          },
          name: {
            type: 'string',
            maxLength: 255
          },
          mode: {
            type: 'string',
            enum: ['table', 'kanban', 'calendar']
          },
          group_field_id: {
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
          config: {
            type: 'object',
            properties: {
              filters: {
                default: [],
                maxItems: 20,
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field_id: {
                      anyOf: [
                        {
                          type: 'string',
                          format: 'uuid',
                          pattern:
                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                        },
                        {
                          type: 'string',
                          enum: [
                            'title',
                            'item_type',
                            'done',
                            'date',
                            'end_date',
                            'project_id'
                          ]
                        }
                      ]
                    },
                    operator: {
                      type: 'string',
                      enum: [
                        'equals',
                        'not-equals',
                        'contains',
                        'empty',
                        'not-empty',
                        'greater',
                        'less',
                        'before',
                        'after',
                        'on-or-before',
                        'on-or-after',
                        'relative-date',
                        'includes',
                        'not-includes',
                        'includes-any',
                        'includes-all'
                      ]
                    },
                    value: {
                      anyOf: [
                        {
                          type: 'string',
                          maxLength: 100000
                        },
                        {
                          type: 'number'
                        },
                        {
                          type: 'boolean'
                        },
                        {
                          maxItems: 500,
                          type: 'array',
                          items: {
                            type: 'string',
                            maxLength: 255
                          }
                        },
                        {
                          type: 'null'
                        }
                      ]
                    }
                  },
                  required: ['field_id', 'operator'],
                  additionalProperties: false
                }
              },
              filter_groups: {
                default: [],
                maxItems: 5,
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    filter_logic: {
                      default: 'and',
                      type: 'string',
                      enum: ['and', 'or']
                    },
                    filters: {
                      default: [],
                      maxItems: 20,
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          field_id: {
                            anyOf: [
                              {
                                type: 'string',
                                format: 'uuid',
                                pattern:
                                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                              },
                              {
                                type: 'string',
                                enum: [
                                  'title',
                                  'item_type',
                                  'done',
                                  'date',
                                  'end_date',
                                  'project_id'
                                ]
                              }
                            ]
                          },
                          operator: {
                            type: 'string',
                            enum: [
                              'equals',
                              'not-equals',
                              'contains',
                              'empty',
                              'not-empty',
                              'greater',
                              'less',
                              'before',
                              'after',
                              'on-or-before',
                              'on-or-after',
                              'relative-date',
                              'includes',
                              'not-includes',
                              'includes-any',
                              'includes-all'
                            ]
                          },
                          value: {
                            anyOf: [
                              {
                                type: 'string',
                                maxLength: 100000
                              },
                              {
                                type: 'number'
                              },
                              {
                                type: 'boolean'
                              },
                              {
                                maxItems: 500,
                                type: 'array',
                                items: {
                                  type: 'string',
                                  maxLength: 255
                                }
                              },
                              {
                                type: 'null'
                              }
                            ]
                          }
                        },
                        required: ['field_id', 'operator'],
                        additionalProperties: false
                      }
                    }
                  },
                  required: ['filter_logic', 'filters'],
                  additionalProperties: false
                }
              },
              sorts: {
                default: [],
                maxItems: 10,
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field_id: {
                      anyOf: [
                        {
                          type: 'string',
                          format: 'uuid',
                          pattern:
                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                        },
                        {
                          type: 'string',
                          enum: [
                            'title',
                            'item_type',
                            'done',
                            'date',
                            'end_date',
                            'project_id'
                          ]
                        }
                      ]
                    },
                    direction: {
                      type: 'string',
                      enum: ['asc', 'desc']
                    }
                  },
                  required: ['field_id', 'direction'],
                  additionalProperties: false
                }
              },
              hidden_fields: {
                default: [],
                maxItems: 100,
                type: 'array',
                items: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                }
              },
              filter_logic: {
                default: 'and',
                type: 'string',
                enum: ['and', 'or']
              },
              group_property: {
                default: null,
                anyOf: [
                  {
                    type: 'string',
                    enum: ['item_type', 'done']
                  },
                  {
                    type: 'null'
                  }
                ]
              },
              date_field_id: {
                default: null,
                anyOf: [
                  {
                    anyOf: [
                      {
                        type: 'string',
                        format: 'uuid',
                        pattern:
                          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                      },
                      {
                        type: 'string',
                        enum: ['date', 'end_date']
                      }
                    ]
                  },
                  {
                    type: 'null'
                  }
                ]
              },
              end_date_field_id: {
                default: null,
                anyOf: [
                  {
                    anyOf: [
                      {
                        type: 'string',
                        format: 'uuid',
                        pattern:
                          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                      },
                      {
                        type: 'string',
                        enum: ['date', 'end_date']
                      }
                    ]
                  },
                  {
                    type: 'null'
                  }
                ]
              }
            },
            required: [
              'filters',
              'filter_groups',
              'sorts',
              'hidden_fields',
              'filter_logic',
              'group_property',
              'date_field_id',
              'end_date_field_id'
            ],
            additionalProperties: false
          }
        },
        required: [
          'id',
          'owner_id',
          'base_id',
          'name',
          'mode',
          'group_field_id',
          'config'
        ],
        additionalProperties: false
      }
    }
  },
  people: {
    method: 'get',
    description: 'Read the current account and owned workspace principals',
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
            label: {
              type: 'string'
            },
            kind: {
              type: 'string',
              enum: ['human', 'agent']
            },
            status: {
              type: 'string',
              enum: ['active', 'paused']
            }
          },
          required: ['id', 'label', 'kind'],
          additionalProperties: false
        }
      }
    }
  },
  removeBase: {
    method: 'post',
    description: 'Delete a database and incident relation definitions',
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
  removeField: {
    method: 'post',
    description:
      'Delete a field and its reciprocal definition, values and view references',
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
  removeRecord: {
    method: 'post',
    description: 'Delete a content page and all incoming/outgoing links',
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
  removeView: {
    method: 'post',
    description: 'Delete a saved view',
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
  setLinks: {
    method: 'post',
    description:
      'Atomically replace reciprocal relations with cardinality checks',
    noAuth: false,
    encrypted: true,
    isDownloadable: false,
    media: null,
    input: {
      body: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          field_id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          },
          record_id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          },
          target_ids: {
            maxItems: 500,
            type: 'array',
            items: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            }
          },
          expected_ids: {
            maxItems: 500,
            type: 'array',
            items: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            }
          }
        },
        required: ['field_id', 'record_id', 'target_ids'],
        additionalProperties: false
      }
    },
    output: {
      NO_CONTENT: true
    }
  },
  snapshot: {
    method: 'get',
    description: 'Read databases owned by the authenticated user',
    noAuth: false,
    encrypted: true,
    isDownloadable: false,
    media: null,
    input: {},
    output: {
      OK: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          bases: {
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
                workspace_id: {
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
                source_type: {
                  anyOf: [
                    {
                      type: 'string',
                      maxLength: 20
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                name: {
                  type: 'string',
                  maxLength: 255
                },
                description: {
                  type: 'string'
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
                'source_type',
                'name',
                'description',
                'created',
                'updated'
              ],
              additionalProperties: false
            }
          },
          fields: {
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
                base_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                name: {
                  type: 'string',
                  maxLength: 255
                },
                kind: {
                  type: 'string',
                  enum: [
                    'text',
                    'number',
                    'date',
                    'checkbox',
                    'select',
                    'multi-select',
                    'relation',
                    'person'
                  ]
                },
                config: {
                  type: 'object',
                  properties: {
                    options: {
                      default: [],
                      maxItems: 100,
                      type: 'array',
                      items: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 255
                      }
                    },
                    cardinality: {
                      default: 'many',
                      type: 'string',
                      enum: ['one', 'many']
                    },
                    reciprocal_field_id: {
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
                  required: ['options', 'cardinality', 'reciprocal_field_id'],
                  additionalProperties: false
                },
                target_base_id: {
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
                position: {
                  type: 'integer',
                  minimum: -2147483648,
                  maximum: 2147483647
                }
              },
              required: [
                'id',
                'owner_id',
                'base_id',
                'name',
                'kind',
                'config',
                'target_base_id',
                'position'
              ],
              additionalProperties: false
            }
          },
          records: {
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
                base_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                title: {
                  type: 'string'
                },
                item_type: {
                  type: 'string',
                  maxLength: 20
                },
                content: {
                  type: 'string'
                },
                done: {
                  type: 'boolean'
                },
                date: {
                  anyOf: [
                    {
                      type: 'string',
                      format: 'date-time'
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                end_date: {
                  anyOf: [
                    {
                      type: 'string',
                      format: 'date-time'
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                project_id: {
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
                values: {
                  type: 'object',
                  additionalProperties: {
                    anyOf: [
                      {
                        type: 'string',
                        maxLength: 100000
                      },
                      {
                        type: 'number'
                      },
                      {
                        type: 'boolean'
                      },
                      {
                        maxItems: 500,
                        type: 'array',
                        items: {
                          type: 'string',
                          maxLength: 255
                        }
                      },
                      {
                        type: 'null'
                      }
                    ]
                  }
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
                'base_id',
                'title',
                'item_type',
                'content',
                'done',
                'date',
                'end_date',
                'project_id',
                'values',
                'created',
                'updated'
              ],
              additionalProperties: false
            }
          },
          views: {
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
                base_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                name: {
                  type: 'string',
                  maxLength: 255
                },
                mode: {
                  type: 'string',
                  enum: ['table', 'kanban', 'calendar']
                },
                group_field_id: {
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
                config: {
                  type: 'object',
                  properties: {
                    filters: {
                      default: [],
                      maxItems: 20,
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          field_id: {
                            anyOf: [
                              {
                                type: 'string',
                                format: 'uuid',
                                pattern:
                                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                              },
                              {
                                type: 'string',
                                enum: [
                                  'title',
                                  'item_type',
                                  'done',
                                  'date',
                                  'end_date',
                                  'project_id'
                                ]
                              }
                            ]
                          },
                          operator: {
                            type: 'string',
                            enum: [
                              'equals',
                              'not-equals',
                              'contains',
                              'empty',
                              'not-empty',
                              'greater',
                              'less',
                              'before',
                              'after',
                              'on-or-before',
                              'on-or-after',
                              'relative-date',
                              'includes',
                              'not-includes',
                              'includes-any',
                              'includes-all'
                            ]
                          },
                          value: {
                            anyOf: [
                              {
                                type: 'string',
                                maxLength: 100000
                              },
                              {
                                type: 'number'
                              },
                              {
                                type: 'boolean'
                              },
                              {
                                maxItems: 500,
                                type: 'array',
                                items: {
                                  type: 'string',
                                  maxLength: 255
                                }
                              },
                              {
                                type: 'null'
                              }
                            ]
                          }
                        },
                        required: ['field_id', 'operator'],
                        additionalProperties: false
                      }
                    },
                    filter_groups: {
                      default: [],
                      maxItems: 5,
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          filter_logic: {
                            default: 'and',
                            type: 'string',
                            enum: ['and', 'or']
                          },
                          filters: {
                            default: [],
                            maxItems: 20,
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                field_id: {
                                  anyOf: [
                                    {
                                      type: 'string',
                                      format: 'uuid',
                                      pattern:
                                        '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                    },
                                    {
                                      type: 'string',
                                      enum: [
                                        'title',
                                        'item_type',
                                        'done',
                                        'date',
                                        'end_date',
                                        'project_id'
                                      ]
                                    }
                                  ]
                                },
                                operator: {
                                  type: 'string',
                                  enum: [
                                    'equals',
                                    'not-equals',
                                    'contains',
                                    'empty',
                                    'not-empty',
                                    'greater',
                                    'less',
                                    'before',
                                    'after',
                                    'on-or-before',
                                    'on-or-after',
                                    'relative-date',
                                    'includes',
                                    'not-includes',
                                    'includes-any',
                                    'includes-all'
                                  ]
                                },
                                value: {
                                  anyOf: [
                                    {
                                      type: 'string',
                                      maxLength: 100000
                                    },
                                    {
                                      type: 'number'
                                    },
                                    {
                                      type: 'boolean'
                                    },
                                    {
                                      maxItems: 500,
                                      type: 'array',
                                      items: {
                                        type: 'string',
                                        maxLength: 255
                                      }
                                    },
                                    {
                                      type: 'null'
                                    }
                                  ]
                                }
                              },
                              required: ['field_id', 'operator'],
                              additionalProperties: false
                            }
                          }
                        },
                        required: ['filter_logic', 'filters'],
                        additionalProperties: false
                      }
                    },
                    sorts: {
                      default: [],
                      maxItems: 10,
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          field_id: {
                            anyOf: [
                              {
                                type: 'string',
                                format: 'uuid',
                                pattern:
                                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                              },
                              {
                                type: 'string',
                                enum: [
                                  'title',
                                  'item_type',
                                  'done',
                                  'date',
                                  'end_date',
                                  'project_id'
                                ]
                              }
                            ]
                          },
                          direction: {
                            type: 'string',
                            enum: ['asc', 'desc']
                          }
                        },
                        required: ['field_id', 'direction'],
                        additionalProperties: false
                      }
                    },
                    hidden_fields: {
                      default: [],
                      maxItems: 100,
                      type: 'array',
                      items: {
                        type: 'string',
                        format: 'uuid',
                        pattern:
                          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                      }
                    },
                    filter_logic: {
                      default: 'and',
                      type: 'string',
                      enum: ['and', 'or']
                    },
                    group_property: {
                      default: null,
                      anyOf: [
                        {
                          type: 'string',
                          enum: ['item_type', 'done']
                        },
                        {
                          type: 'null'
                        }
                      ]
                    },
                    date_field_id: {
                      default: null,
                      anyOf: [
                        {
                          anyOf: [
                            {
                              type: 'string',
                              format: 'uuid',
                              pattern:
                                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                            },
                            {
                              type: 'string',
                              enum: ['date', 'end_date']
                            }
                          ]
                        },
                        {
                          type: 'null'
                        }
                      ]
                    },
                    end_date_field_id: {
                      default: null,
                      anyOf: [
                        {
                          anyOf: [
                            {
                              type: 'string',
                              format: 'uuid',
                              pattern:
                                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                            },
                            {
                              type: 'string',
                              enum: ['date', 'end_date']
                            }
                          ]
                        },
                        {
                          type: 'null'
                        }
                      ]
                    }
                  },
                  required: [
                    'filters',
                    'filter_groups',
                    'sorts',
                    'hidden_fields',
                    'filter_logic',
                    'group_property',
                    'date_field_id',
                    'end_date_field_id'
                  ],
                  additionalProperties: false
                }
              },
              required: [
                'id',
                'owner_id',
                'base_id',
                'name',
                'mode',
                'group_field_id',
                'config'
              ],
              additionalProperties: false
            }
          },
          links: {
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
                field_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                source_record_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                target_record_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                }
              },
              required: [
                'id',
                'owner_id',
                'field_id',
                'source_record_id',
                'target_record_id'
              ],
              additionalProperties: false
            }
          }
        },
        required: ['bases', 'fields', 'records', 'views', 'links'],
        additionalProperties: false
      }
    }
  },
  updateBase: {
    method: 'post',
    description: 'Rename or describe a database',
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
            maxLength: 255
          },
          description: {
            default: '',
            type: 'string',
            maxLength: 10000
          }
        },
        required: ['name', 'description'],
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
          owner_id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          },
          workspace_id: {
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
          source_type: {
            anyOf: [
              {
                type: 'string',
                maxLength: 20
              },
              {
                type: 'null'
              }
            ]
          },
          name: {
            type: 'string',
            maxLength: 255
          },
          description: {
            type: 'string'
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
          'source_type',
          'name',
          'description',
          'created',
          'updated'
        ],
        additionalProperties: false
      }
    }
  },
  updateField: {
    method: 'post',
    description:
      'Change a primitive field type without losing values or saved view settings',
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
            maxLength: 255
          },
          kind: {
            type: 'string',
            enum: [
              'text',
              'number',
              'date',
              'checkbox',
              'select',
              'multi-select',
              'relation',
              'person'
            ]
          },
          options: {
            maxItems: 100,
            type: 'array',
            items: {
              type: 'string',
              minLength: 1,
              maxLength: 255
            }
          }
        },
        required: ['name', 'options'],
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
          owner_id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          },
          base_id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          },
          name: {
            type: 'string',
            maxLength: 255
          },
          kind: {
            type: 'string',
            enum: [
              'text',
              'number',
              'date',
              'checkbox',
              'select',
              'multi-select',
              'relation',
              'person'
            ]
          },
          config: {
            type: 'object',
            properties: {
              options: {
                default: [],
                maxItems: 100,
                type: 'array',
                items: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 255
                }
              },
              cardinality: {
                default: 'many',
                type: 'string',
                enum: ['one', 'many']
              },
              reciprocal_field_id: {
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
            required: ['options', 'cardinality', 'reciprocal_field_id'],
            additionalProperties: false
          },
          target_base_id: {
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
          position: {
            type: 'integer',
            minimum: -2147483648,
            maximum: 2147483647
          }
        },
        required: [
          'id',
          'owner_id',
          'base_id',
          'name',
          'kind',
          'config',
          'target_base_id',
          'position'
        ],
        additionalProperties: false
      }
    }
  },
  updateRecord: {
    method: 'post',
    description: 'Save record content and typed properties',
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
          }
        },
        required: ['id'],
        additionalProperties: false
      },
      body: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          title: {
            type: 'string',
            minLength: 1,
            maxLength: 1000000
          },
          content: {
            default: '',
            type: 'string',
            maxLength: 1000000
          },
          values: {
            default: {},
            type: 'object',
            additionalProperties: {
              anyOf: [
                {
                  type: 'string',
                  maxLength: 100000
                },
                {
                  type: 'number'
                },
                {
                  type: 'boolean'
                },
                {
                  maxItems: 500,
                  type: 'array',
                  items: {
                    type: 'string',
                    maxLength: 255
                  }
                },
                {
                  type: 'null'
                }
              ]
            }
          },
          item_type: {
            type: 'string',
            enum: ['page', 'task', 'note', 'project', 'event', 'post']
          },
          done: {
            type: 'boolean'
          },
          date: {
            anyOf: [
              {
                type: 'string',
                format: 'date-time',
                pattern:
                  '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$'
              },
              {
                type: 'null'
              }
            ]
          },
          end_date: {
            anyOf: [
              {
                type: 'string',
                format: 'date-time',
                pattern:
                  '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$'
              },
              {
                type: 'null'
              }
            ]
          },
          project_id: {
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
          expected_updated: {
            type: 'string',
            format: 'date-time',
            pattern:
              '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$'
          }
        },
        required: ['title', 'content', 'values'],
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
          owner_id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          },
          base_id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          },
          title: {
            type: 'string'
          },
          item_type: {
            type: 'string',
            maxLength: 20
          },
          content: {
            type: 'string'
          },
          done: {
            type: 'boolean'
          },
          date: {
            anyOf: [
              {
                type: 'string',
                format: 'date-time'
              },
              {
                type: 'null'
              }
            ]
          },
          end_date: {
            anyOf: [
              {
                type: 'string',
                format: 'date-time'
              },
              {
                type: 'null'
              }
            ]
          },
          project_id: {
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
          values: {
            type: 'object',
            additionalProperties: {
              anyOf: [
                {
                  type: 'string',
                  maxLength: 100000
                },
                {
                  type: 'number'
                },
                {
                  type: 'boolean'
                },
                {
                  maxItems: 500,
                  type: 'array',
                  items: {
                    type: 'string',
                    maxLength: 255
                  }
                },
                {
                  type: 'null'
                }
              ]
            }
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
          'base_id',
          'title',
          'item_type',
          'content',
          'done',
          'date',
          'end_date',
          'project_id',
          'values',
          'created',
          'updated'
        ],
        additionalProperties: false
      }
    }
  },
  updateView: {
    method: 'post',
    description: 'Update a saved view',
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
            maxLength: 255
          },
          mode: {
            type: 'string',
            enum: ['table', 'kanban', 'calendar']
          },
          group_field_id: {
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
          },
          config: {
            type: 'object',
            properties: {
              filters: {
                default: [],
                maxItems: 20,
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field_id: {
                      anyOf: [
                        {
                          type: 'string',
                          format: 'uuid',
                          pattern:
                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                        },
                        {
                          type: 'string',
                          enum: [
                            'title',
                            'item_type',
                            'done',
                            'date',
                            'end_date',
                            'project_id'
                          ]
                        }
                      ]
                    },
                    operator: {
                      type: 'string',
                      enum: [
                        'equals',
                        'not-equals',
                        'contains',
                        'empty',
                        'not-empty',
                        'greater',
                        'less',
                        'before',
                        'after',
                        'on-or-before',
                        'on-or-after',
                        'relative-date',
                        'includes',
                        'not-includes',
                        'includes-any',
                        'includes-all'
                      ]
                    },
                    value: {
                      anyOf: [
                        {
                          type: 'string',
                          maxLength: 100000
                        },
                        {
                          type: 'number'
                        },
                        {
                          type: 'boolean'
                        },
                        {
                          maxItems: 500,
                          type: 'array',
                          items: {
                            type: 'string',
                            maxLength: 255
                          }
                        },
                        {
                          type: 'null'
                        }
                      ]
                    }
                  },
                  required: ['field_id', 'operator'],
                  additionalProperties: false
                }
              },
              filter_groups: {
                default: [],
                maxItems: 5,
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    filter_logic: {
                      default: 'and',
                      type: 'string',
                      enum: ['and', 'or']
                    },
                    filters: {
                      default: [],
                      maxItems: 20,
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          field_id: {
                            anyOf: [
                              {
                                type: 'string',
                                format: 'uuid',
                                pattern:
                                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                              },
                              {
                                type: 'string',
                                enum: [
                                  'title',
                                  'item_type',
                                  'done',
                                  'date',
                                  'end_date',
                                  'project_id'
                                ]
                              }
                            ]
                          },
                          operator: {
                            type: 'string',
                            enum: [
                              'equals',
                              'not-equals',
                              'contains',
                              'empty',
                              'not-empty',
                              'greater',
                              'less',
                              'before',
                              'after',
                              'on-or-before',
                              'on-or-after',
                              'relative-date',
                              'includes',
                              'not-includes',
                              'includes-any',
                              'includes-all'
                            ]
                          },
                          value: {
                            anyOf: [
                              {
                                type: 'string',
                                maxLength: 100000
                              },
                              {
                                type: 'number'
                              },
                              {
                                type: 'boolean'
                              },
                              {
                                maxItems: 500,
                                type: 'array',
                                items: {
                                  type: 'string',
                                  maxLength: 255
                                }
                              },
                              {
                                type: 'null'
                              }
                            ]
                          }
                        },
                        required: ['field_id', 'operator'],
                        additionalProperties: false
                      }
                    }
                  },
                  required: ['filter_logic', 'filters'],
                  additionalProperties: false
                }
              },
              sorts: {
                default: [],
                maxItems: 10,
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field_id: {
                      anyOf: [
                        {
                          type: 'string',
                          format: 'uuid',
                          pattern:
                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                        },
                        {
                          type: 'string',
                          enum: [
                            'title',
                            'item_type',
                            'done',
                            'date',
                            'end_date',
                            'project_id'
                          ]
                        }
                      ]
                    },
                    direction: {
                      type: 'string',
                      enum: ['asc', 'desc']
                    }
                  },
                  required: ['field_id', 'direction'],
                  additionalProperties: false
                }
              },
              hidden_fields: {
                default: [],
                maxItems: 100,
                type: 'array',
                items: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                }
              },
              filter_logic: {
                default: 'and',
                type: 'string',
                enum: ['and', 'or']
              },
              group_property: {
                default: null,
                anyOf: [
                  {
                    type: 'string',
                    enum: ['item_type', 'done']
                  },
                  {
                    type: 'null'
                  }
                ]
              },
              date_field_id: {
                default: null,
                anyOf: [
                  {
                    anyOf: [
                      {
                        type: 'string',
                        format: 'uuid',
                        pattern:
                          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                      },
                      {
                        type: 'string',
                        enum: ['date', 'end_date']
                      }
                    ]
                  },
                  {
                    type: 'null'
                  }
                ]
              },
              end_date_field_id: {
                default: null,
                anyOf: [
                  {
                    anyOf: [
                      {
                        type: 'string',
                        format: 'uuid',
                        pattern:
                          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                      },
                      {
                        type: 'string',
                        enum: ['date', 'end_date']
                      }
                    ]
                  },
                  {
                    type: 'null'
                  }
                ]
              }
            },
            required: [
              'filters',
              'filter_groups',
              'sorts',
              'hidden_fields',
              'filter_logic',
              'group_property',
              'date_field_id',
              'end_date_field_id'
            ],
            additionalProperties: false
          }
        },
        required: ['name', 'mode', 'group_field_id', 'config'],
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
          owner_id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          },
          base_id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          },
          name: {
            type: 'string',
            maxLength: 255
          },
          mode: {
            type: 'string',
            enum: ['table', 'kanban', 'calendar']
          },
          group_field_id: {
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
          config: {
            type: 'object',
            properties: {
              filters: {
                default: [],
                maxItems: 20,
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field_id: {
                      anyOf: [
                        {
                          type: 'string',
                          format: 'uuid',
                          pattern:
                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                        },
                        {
                          type: 'string',
                          enum: [
                            'title',
                            'item_type',
                            'done',
                            'date',
                            'end_date',
                            'project_id'
                          ]
                        }
                      ]
                    },
                    operator: {
                      type: 'string',
                      enum: [
                        'equals',
                        'not-equals',
                        'contains',
                        'empty',
                        'not-empty',
                        'greater',
                        'less',
                        'before',
                        'after',
                        'on-or-before',
                        'on-or-after',
                        'relative-date',
                        'includes',
                        'not-includes',
                        'includes-any',
                        'includes-all'
                      ]
                    },
                    value: {
                      anyOf: [
                        {
                          type: 'string',
                          maxLength: 100000
                        },
                        {
                          type: 'number'
                        },
                        {
                          type: 'boolean'
                        },
                        {
                          maxItems: 500,
                          type: 'array',
                          items: {
                            type: 'string',
                            maxLength: 255
                          }
                        },
                        {
                          type: 'null'
                        }
                      ]
                    }
                  },
                  required: ['field_id', 'operator'],
                  additionalProperties: false
                }
              },
              filter_groups: {
                default: [],
                maxItems: 5,
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    filter_logic: {
                      default: 'and',
                      type: 'string',
                      enum: ['and', 'or']
                    },
                    filters: {
                      default: [],
                      maxItems: 20,
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          field_id: {
                            anyOf: [
                              {
                                type: 'string',
                                format: 'uuid',
                                pattern:
                                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                              },
                              {
                                type: 'string',
                                enum: [
                                  'title',
                                  'item_type',
                                  'done',
                                  'date',
                                  'end_date',
                                  'project_id'
                                ]
                              }
                            ]
                          },
                          operator: {
                            type: 'string',
                            enum: [
                              'equals',
                              'not-equals',
                              'contains',
                              'empty',
                              'not-empty',
                              'greater',
                              'less',
                              'before',
                              'after',
                              'on-or-before',
                              'on-or-after',
                              'relative-date',
                              'includes',
                              'not-includes',
                              'includes-any',
                              'includes-all'
                            ]
                          },
                          value: {
                            anyOf: [
                              {
                                type: 'string',
                                maxLength: 100000
                              },
                              {
                                type: 'number'
                              },
                              {
                                type: 'boolean'
                              },
                              {
                                maxItems: 500,
                                type: 'array',
                                items: {
                                  type: 'string',
                                  maxLength: 255
                                }
                              },
                              {
                                type: 'null'
                              }
                            ]
                          }
                        },
                        required: ['field_id', 'operator'],
                        additionalProperties: false
                      }
                    }
                  },
                  required: ['filter_logic', 'filters'],
                  additionalProperties: false
                }
              },
              sorts: {
                default: [],
                maxItems: 10,
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field_id: {
                      anyOf: [
                        {
                          type: 'string',
                          format: 'uuid',
                          pattern:
                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                        },
                        {
                          type: 'string',
                          enum: [
                            'title',
                            'item_type',
                            'done',
                            'date',
                            'end_date',
                            'project_id'
                          ]
                        }
                      ]
                    },
                    direction: {
                      type: 'string',
                      enum: ['asc', 'desc']
                    }
                  },
                  required: ['field_id', 'direction'],
                  additionalProperties: false
                }
              },
              hidden_fields: {
                default: [],
                maxItems: 100,
                type: 'array',
                items: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                }
              },
              filter_logic: {
                default: 'and',
                type: 'string',
                enum: ['and', 'or']
              },
              group_property: {
                default: null,
                anyOf: [
                  {
                    type: 'string',
                    enum: ['item_type', 'done']
                  },
                  {
                    type: 'null'
                  }
                ]
              },
              date_field_id: {
                default: null,
                anyOf: [
                  {
                    anyOf: [
                      {
                        type: 'string',
                        format: 'uuid',
                        pattern:
                          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                      },
                      {
                        type: 'string',
                        enum: ['date', 'end_date']
                      }
                    ]
                  },
                  {
                    type: 'null'
                  }
                ]
              },
              end_date_field_id: {
                default: null,
                anyOf: [
                  {
                    anyOf: [
                      {
                        type: 'string',
                        format: 'uuid',
                        pattern:
                          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                      },
                      {
                        type: 'string',
                        enum: ['date', 'end_date']
                      }
                    ]
                  },
                  {
                    type: 'null'
                  }
                ]
              }
            },
            required: [
              'filters',
              'filter_groups',
              'sorts',
              'hidden_fields',
              'filter_logic',
              'group_property',
              'date_field_id',
              'end_date_field_id'
            ],
            additionalProperties: false
          }
        },
        required: [
          'id',
          'owner_id',
          'base_id',
          'name',
          'mode',
          'group_field_id',
          'config'
        ],
        additionalProperties: false
      }
    }
  },
  documents: {
    create: {
      method: 'post',
      description: 'Create a block document',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            title: {
              type: 'string',
              minLength: 1,
              maxLength: 255
            },
            content: {
              default: '',
              type: 'string',
              maxLength: 1000000
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
          required: ['title', 'content', 'parent_id'],
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
            title: {
              type: 'string',
              maxLength: 255
            },
            content: {
              type: 'string'
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
            'title',
            'content',
            'parent_id',
            'revision',
            'created',
            'updated'
          ],
          additionalProperties: false
        }
      }
    },
    list: {
      method: 'get',
      description: 'Read owned documents',
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
              title: {
                type: 'string',
                maxLength: 255
              },
              content: {
                type: 'string'
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
              'title',
              'content',
              'parent_id',
              'revision',
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
      description: 'Delete one document while preserving its children',
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
              minimum: 1,
              maximum: 9007199254740991
            }
          },
          required: ['expected_revision'],
          additionalProperties: false
        }
      },
      output: {
        NO_CONTENT: true
      }
    },
    update: {
      method: 'post',
      description: 'Save a document without overwriting newer revisions',
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
            }
          },
          required: ['id'],
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
            content: {
              default: '',
              type: 'string',
              maxLength: 1000000
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
            },
            expected_revision: {
              type: 'integer',
              minimum: 1,
              maximum: 9007199254740991
            }
          },
          required: ['title', 'content', 'parent_id', 'expected_revision'],
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
            owner_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            title: {
              type: 'string',
              maxLength: 255
            },
            content: {
              type: 'string'
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
            'title',
            'content',
            'parent_id',
            'revision',
            'created',
            'updated'
          ],
          additionalProperties: false
        }
      }
    }
  },
  knowledge: {
    relate: {
      method: 'post',
      description: 'Create a symmetric semantic link between owned pages',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            source: {
              type: 'object',
              properties: {
                kind: {
                  type: 'string',
                  enum: ['document', 'record', 'note']
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
                  enum: ['document', 'record', 'note']
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
              default: 'Related',
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
    snapshot: {
      method: 'get',
      description: 'Owned documents, notes, records and their live backlinks',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {},
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
                  kind: {
                    type: 'string',
                    enum: ['document', 'record', 'note']
                  },
                  id: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  key: {
                    type: 'string'
                  },
                  title: {
                    type: 'string'
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
                required: ['kind', 'id', 'key', 'title'],
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
            }
          },
          required: ['nodes', 'edges', 'unresolved'],
          additionalProperties: false
        }
      }
    },
    unrelate: {
      method: 'post',
      description: 'Remove an owned semantic link',
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
  knowledgeLibrary: {
    addSource: {
      method: 'post',
      description:
        'Import plain text/Markdown or link a current workspace page or record as a knowledge source',
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
          oneOf: [
            {
              type: 'object',
              properties: {
                collection_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                kind: {
                  type: 'string',
                  const: 'page'
                },
                source_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                }
              },
              required: ['collection_id', 'kind', 'source_id'],
              additionalProperties: false
            },
            {
              type: 'object',
              properties: {
                collection_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                kind: {
                  type: 'string',
                  const: 'record'
                },
                source_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                }
              },
              required: ['collection_id', 'kind', 'source_id'],
              additionalProperties: false
            },
            {
              type: 'object',
              properties: {
                collection_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                kind: {
                  type: 'string',
                  const: 'text'
                },
                title: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 255
                },
                content: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 200000
                },
                media_type: {
                  default: 'text/plain',
                  type: 'string',
                  enum: ['text/plain', 'text/markdown']
                }
              },
              required: [
                'collection_id',
                'kind',
                'title',
                'content',
                'media_type'
              ],
              additionalProperties: false
            }
          ]
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
            }
          },
          required: ['id'],
          additionalProperties: false
        }
      }
    },
    createCollection: {
      method: 'post',
      description: 'Create a knowledge collection in an editable workspace',
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
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 160
            },
            description: {
              default: '',
              type: 'string',
              maxLength: 2000
            }
          },
          required: ['name', 'description'],
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
            }
          },
          required: ['id'],
          additionalProperties: false
        }
      }
    },
    removeCollection: {
      method: 'post',
      description:
        'Remove a knowledge collection and its source references; canonical pages are preserved',
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
    removeSource: {
      method: 'post',
      description:
        'Remove a source from the knowledge library without deleting its canonical page',
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
    search: {
      method: 'post',
      description:
        'Retrieve ranked lexical evidence with citations; returns source excerpts rather than model-generated claims',
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
            query: {
              type: 'string',
              minLength: 1,
              maxLength: 1000
            },
            collection_ids: {
              maxItems: 100,
              type: 'array',
              items: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
              }
            },
            limit: {
              default: 8,
              type: 'integer',
              minimum: 1,
              maximum: 20
            }
          },
          required: ['query', 'limit'],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            query: {
              type: 'string'
            },
            engine: {
              type: 'string',
              const: 'lexical'
            },
            answer: {
              type: 'string'
            },
            citations: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string'
                  },
                  source_id: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  collection_id: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  title: {
                    type: 'string'
                  },
                  kind: {
                    type: 'string',
                    enum: ['page', 'record', 'text']
                  },
                  href: {
                    anyOf: [
                      {
                        type: 'string'
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  chunk_index: {
                    type: 'integer',
                    minimum: -9007199254740991,
                    maximum: 9007199254740991
                  },
                  text: {
                    type: 'string'
                  },
                  score: {
                    type: 'number'
                  },
                  updated: {
                    type: 'string'
                  }
                },
                required: [
                  'id',
                  'source_id',
                  'collection_id',
                  'title',
                  'kind',
                  'href',
                  'chunk_index',
                  'text',
                  'score',
                  'updated'
                ],
                additionalProperties: false
              }
            },
            searched_sources: {
              type: 'integer',
              minimum: -9007199254740991,
              maximum: 9007199254740991
            },
            total_chunks: {
              type: 'integer',
              minimum: -9007199254740991,
              maximum: 9007199254740991
            }
          },
          required: [
            'query',
            'engine',
            'answer',
            'citations',
            'searched_sources',
            'total_chunks'
          ],
          additionalProperties: false
        }
      }
    },
    snapshot: {
      method: 'get',
      description:
        'Workspace-scoped knowledge collections, imported text and live canonical page sources',
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
            collections: {
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
                  },
                  description: {
                    type: 'string'
                  },
                  source_count: {
                    type: 'integer',
                    minimum: -9007199254740991,
                    maximum: 9007199254740991
                  },
                  updated: {
                    type: 'string'
                  }
                },
                required: [
                  'id',
                  'name',
                  'description',
                  'source_count',
                  'updated'
                ],
                additionalProperties: false
              }
            },
            sources: {
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
                  collection_id: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  kind: {
                    type: 'string',
                    enum: ['page', 'record', 'text']
                  },
                  title: {
                    type: 'string'
                  },
                  source_id: {
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
                  media_type: {
                    anyOf: [
                      {
                        type: 'string',
                        enum: ['text/plain', 'text/markdown']
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  characters: {
                    type: 'integer',
                    minimum: -9007199254740991,
                    maximum: 9007199254740991
                  },
                  chunks: {
                    type: 'integer',
                    minimum: -9007199254740991,
                    maximum: 9007199254740991
                  },
                  updated: {
                    type: 'string'
                  },
                  href: {
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
                  'collection_id',
                  'kind',
                  'title',
                  'source_id',
                  'media_type',
                  'characters',
                  'chunks',
                  'updated',
                  'href'
                ],
                additionalProperties: false
              }
            },
            catalog: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  kind: {
                    type: 'string',
                    enum: ['page', 'record']
                  },
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
                  }
                },
                required: ['kind', 'id', 'title', 'href'],
                additionalProperties: false
              }
            },
            catalog_truncated: {
              type: 'boolean'
            },
            role: {
              type: 'string',
              enum: ['owner', 'editor', 'viewer']
            },
            engine: {
              type: 'string',
              const: 'lexical'
            }
          },
          required: [
            'collections',
            'sources',
            'catalog',
            'catalog_truncated',
            'role',
            'engine'
          ],
          additionalProperties: false
        }
      }
    },
    updateCollection: {
      method: 'post',
      description: 'Rename or describe a workspace knowledge collection',
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
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 160
            },
            description: {
              default: '',
              type: 'string',
              maxLength: 2000
            }
          },
          required: ['name', 'description'],
          additionalProperties: false
        }
      },
      output: {
        NO_CONTENT: true
      }
    }
  },
  workspaces: {
    create: {
      method: 'post',
      description: 'Create a configurable workspace',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 160
            },
            icon: {
              default: 'lucide:layers',
              type: 'string',
              pattern: '^lucide:[a-z0-9-]{1,60}$'
            },
            profile: {
              default: 'personal',
              type: 'string',
              enum: ['personal', 'collaborative', 'agents']
            },
            enabled_modules: {
              maxItems: 64,
              type: 'array',
              items: {
                type: 'string',
                enum: [
                  'projects',
                  'notes',
                  'calendar',
                  'blog',
                  'todo-list',
                  'agents',
                  'databases',
                  'wallet',
                  'gym',
                  'tech-lab',
                  'achievements',
                  'wishlist',
                  'code-time',
                  'flashcards',
                  'idea-box',
                  'pomodoro-timer'
                ]
              }
            },
            description: {
              default: '',
              type: 'string',
              maxLength: 10000
            }
          },
          required: [
            'name',
            'icon',
            'profile',
            'enabled_modules',
            'description'
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
                enum: [
                  'projects',
                  'notes',
                  'calendar',
                  'blog',
                  'todo-list',
                  'agents',
                  'databases',
                  'wallet',
                  'gym',
                  'tech-lab',
                  'achievements',
                  'wishlist',
                  'code-time',
                  'flashcards',
                  'idea-box',
                  'pomodoro-timer'
                ]
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
            'created',
            'updated',
            'role'
          ],
          additionalProperties: false
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
    getAreaPage: {
      method: 'get',
      description: 'Read workspace-specific area blocks',
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
            key: {
              type: 'string'
            }
          },
          required: ['workspace_id', 'key'],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            page: {
              anyOf: [
                {},
                {
                  type: 'null'
                }
              ]
            }
          },
          required: ['page'],
          additionalProperties: false
        }
      }
    },
    getPage: {
      method: 'get',
      description: 'Read a workspace page',
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
            page: {
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
            },
            role: {
              type: 'string',
              enum: ['owner', 'editor', 'viewer']
            }
          },
          required: ['page', 'role'],
          additionalProperties: false
        }
      }
    },
    list: {
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
                  enum: [
                    'projects',
                    'notes',
                    'calendar',
                    'blog',
                    'todo-list',
                    'agents',
                    'databases',
                    'wallet',
                    'gym',
                    'tech-lab',
                    'achievements',
                    'wishlist',
                    'code-time',
                    'flashcards',
                    'idea-box',
                    'pomodoro-timer'
                  ]
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
              'created',
              'updated',
              'role'
            ],
            additionalProperties: false
          }
        }
      }
    },
    members: {
      method: 'get',
      description: 'List workspace members',
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
              user_id: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
              },
              name: {
                type: 'string'
              },
              role: {
                type: 'string',
                enum: ['editor', 'viewer']
              }
            },
            required: ['id', 'user_id', 'name', 'role'],
            additionalProperties: false
          }
        }
      }
    },
    pages: {
      method: 'get',
      description: 'List workspace page hierarchy',
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
              position: {
                type: 'integer',
                minimum: -2147483648,
                maximum: 2147483647
              },
              revision: {
                type: 'integer',
                minimum: -2147483648,
                maximum: 2147483647
              }
            },
            required: [
              'id',
              'workspace_id',
              'parent_id',
              'route_key',
              'title',
              'icon',
              'position',
              'revision'
            ],
            additionalProperties: false
          }
        }
      }
    },
    removeMember: {
      method: 'post',
      description: 'Remove workspace access',
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
            user_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            }
          },
          required: ['workspace_id', 'user_id'],
          additionalProperties: false
        }
      },
      output: {
        NO_CONTENT: true
      }
    },
    saveAreaPage: {
      method: 'post',
      description:
        'Save workspace-specific area blocks with revision protection',
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
            key: {
              type: 'string'
            }
          },
          required: ['workspace_id', 'key'],
          additionalProperties: false
        },
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            page: {},
            expected_revision: {
              type: 'integer',
              minimum: 0,
              maximum: 9007199254740991
            }
          },
          required: ['page', 'expected_revision'],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            page: {}
          },
          required: ['page'],
          additionalProperties: false
        }
      }
    },
    savePage: {
      method: 'post',
      description: 'Save page blocks and parent with revision protection',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        body: {
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
            page: {},
            expected_revision: {
              type: 'integer',
              minimum: 0,
              maximum: 9007199254740991
            }
          },
          required: [
            'id',
            'workspace_id',
            'parent_id',
            'page',
            'expected_revision'
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
    setMember: {
      method: 'post',
      description: 'Set an existing account workspace role',
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
            email: {
              type: 'string',
              format: 'email',
              pattern:
                "^(?!\\.)(?!.*\\.\\.)([A-Za-z0-9_'+\\-\\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}$"
            },
            role: {
              type: 'string',
              enum: ['editor', 'viewer']
            }
          },
          required: ['email', 'role'],
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
            user_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            role: {
              type: 'string',
              maxLength: 20
            },
            created: {
              type: 'string',
              format: 'date-time'
            }
          },
          required: [
            'id',
            'owner_id',
            'workspace_id',
            'user_id',
            'role',
            'created'
          ],
          additionalProperties: false
        }
      }
    },
    update: {
      method: 'post',
      description: 'Configure workspace modules',
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
              maxLength: 160
            },
            icon: {
              default: 'lucide:layers',
              type: 'string',
              pattern: '^lucide:[a-z0-9-]{1,60}$'
            },
            profile: {
              default: 'personal',
              type: 'string',
              enum: ['personal', 'collaborative', 'agents']
            },
            enabled_modules: {
              maxItems: 64,
              type: 'array',
              items: {
                type: 'string',
                enum: [
                  'projects',
                  'notes',
                  'calendar',
                  'blog',
                  'todo-list',
                  'agents',
                  'databases',
                  'wallet',
                  'gym',
                  'tech-lab',
                  'achievements',
                  'wishlist',
                  'code-time',
                  'flashcards',
                  'idea-box',
                  'pomodoro-timer'
                ]
              }
            },
            description: {
              default: '',
              type: 'string',
              maxLength: 10000
            }
          },
          required: [
            'name',
            'icon',
            'profile',
            'enabled_modules',
            'description'
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
                enum: [
                  'projects',
                  'notes',
                  'calendar',
                  'blog',
                  'todo-list',
                  'agents',
                  'databases',
                  'wallet',
                  'gym',
                  'tech-lab',
                  'achievements',
                  'wishlist',
                  'code-time',
                  'flashcards',
                  'idea-box',
                  'pomodoro-timer'
                ]
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
            'created',
            'updated',
            'role'
          ],
          additionalProperties: false
        }
      }
    }
  },
  workspaceDatabases: {
    createBase: {
      method: 'post',
      description: 'Create a workspace database',
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
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 255
            },
            description: {
              default: '',
              type: 'string',
              maxLength: 10000
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
            },
            owner_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            workspace_id: {
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
            source_type: {
              anyOf: [
                {
                  type: 'string',
                  maxLength: 20
                },
                {
                  type: 'null'
                }
              ]
            },
            name: {
              type: 'string',
              maxLength: 255
            },
            description: {
              type: 'string'
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
            'source_type',
            'name',
            'description',
            'created',
            'updated'
          ],
          additionalProperties: false
        }
      }
    },
    createField: {
      method: 'post',
      description:
        'Workspace: Create a typed field or a reciprocal pair of relation fields',
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
            base_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 255
            },
            kind: {
              type: 'string',
              enum: [
                'text',
                'number',
                'date',
                'checkbox',
                'select',
                'multi-select',
                'relation',
                'person'
              ]
            },
            options: {
              default: [],
              maxItems: 100,
              type: 'array',
              items: {
                type: 'string',
                minLength: 1,
                maxLength: 255
              }
            },
            target_base_id: {
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
            },
            reverse_name: {
              type: 'string',
              minLength: 1,
              maxLength: 255
            },
            cardinality: {
              default: 'many',
              type: 'string',
              enum: ['one', 'many']
            },
            reverse_cardinality: {
              default: 'many',
              type: 'string',
              enum: ['one', 'many']
            }
          },
          required: [
            'base_id',
            'name',
            'kind',
            'options',
            'target_base_id',
            'cardinality',
            'reverse_cardinality'
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
            },
            owner_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            base_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            name: {
              type: 'string',
              maxLength: 255
            },
            kind: {
              type: 'string',
              enum: [
                'text',
                'number',
                'date',
                'checkbox',
                'select',
                'multi-select',
                'relation',
                'person'
              ]
            },
            config: {
              type: 'object',
              properties: {
                options: {
                  default: [],
                  maxItems: 100,
                  type: 'array',
                  items: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 255
                  }
                },
                cardinality: {
                  default: 'many',
                  type: 'string',
                  enum: ['one', 'many']
                },
                reciprocal_field_id: {
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
              required: ['options', 'cardinality', 'reciprocal_field_id'],
              additionalProperties: false
            },
            target_base_id: {
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
            position: {
              type: 'integer',
              minimum: -2147483648,
              maximum: 2147483647
            }
          },
          required: [
            'id',
            'owner_id',
            'base_id',
            'name',
            'kind',
            'config',
            'target_base_id',
            'position'
          ],
          additionalProperties: false
        }
      }
    },
    createRecord: {
      method: 'post',
      description:
        'Workspace: Create a record content page with validated properties',
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
              maxLength: 1000000
            },
            content: {
              default: '',
              type: 'string',
              maxLength: 1000000
            },
            values: {
              default: {},
              type: 'object',
              additionalProperties: {
                anyOf: [
                  {
                    type: 'string',
                    maxLength: 100000
                  },
                  {
                    type: 'number'
                  },
                  {
                    type: 'boolean'
                  },
                  {
                    maxItems: 500,
                    type: 'array',
                    items: {
                      type: 'string',
                      maxLength: 255
                    }
                  },
                  {
                    type: 'null'
                  }
                ]
              }
            },
            item_type: {
              type: 'string',
              enum: ['page', 'task', 'note', 'project', 'event', 'post']
            },
            done: {
              type: 'boolean'
            },
            date: {
              anyOf: [
                {
                  type: 'string',
                  format: 'date-time',
                  pattern:
                    '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$'
                },
                {
                  type: 'null'
                }
              ]
            },
            end_date: {
              anyOf: [
                {
                  type: 'string',
                  format: 'date-time',
                  pattern:
                    '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$'
                },
                {
                  type: 'null'
                }
              ]
            },
            project_id: {
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
            base_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            }
          },
          required: ['title', 'content', 'values', 'base_id'],
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
            base_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            title: {
              type: 'string'
            },
            item_type: {
              type: 'string',
              maxLength: 20
            },
            content: {
              type: 'string'
            },
            done: {
              type: 'boolean'
            },
            date: {
              anyOf: [
                {
                  type: 'string',
                  format: 'date-time'
                },
                {
                  type: 'null'
                }
              ]
            },
            end_date: {
              anyOf: [
                {
                  type: 'string',
                  format: 'date-time'
                },
                {
                  type: 'null'
                }
              ]
            },
            project_id: {
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
            values: {
              type: 'object',
              additionalProperties: {
                anyOf: [
                  {
                    type: 'string',
                    maxLength: 100000
                  },
                  {
                    type: 'number'
                  },
                  {
                    type: 'boolean'
                  },
                  {
                    maxItems: 500,
                    type: 'array',
                    items: {
                      type: 'string',
                      maxLength: 255
                    }
                  },
                  {
                    type: 'null'
                  }
                ]
              }
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
            'base_id',
            'title',
            'item_type',
            'content',
            'done',
            'date',
            'end_date',
            'project_id',
            'values',
            'created',
            'updated'
          ],
          additionalProperties: false
        }
      }
    },
    createView: {
      method: 'post',
      description:
        'Workspace: Save a table, Kanban or calendar view with typed filters and sorting',
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
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 255
            },
            mode: {
              type: 'string',
              enum: ['table', 'kanban', 'calendar']
            },
            group_field_id: {
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
            },
            config: {
              type: 'object',
              properties: {
                filters: {
                  default: [],
                  maxItems: 20,
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field_id: {
                        anyOf: [
                          {
                            type: 'string',
                            format: 'uuid',
                            pattern:
                              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                          },
                          {
                            type: 'string',
                            enum: [
                              'title',
                              'item_type',
                              'done',
                              'date',
                              'end_date',
                              'project_id'
                            ]
                          }
                        ]
                      },
                      operator: {
                        type: 'string',
                        enum: [
                          'equals',
                          'not-equals',
                          'contains',
                          'empty',
                          'not-empty',
                          'greater',
                          'less',
                          'before',
                          'after',
                          'on-or-before',
                          'on-or-after',
                          'relative-date',
                          'includes',
                          'not-includes',
                          'includes-any',
                          'includes-all'
                        ]
                      },
                      value: {
                        anyOf: [
                          {
                            type: 'string',
                            maxLength: 100000
                          },
                          {
                            type: 'number'
                          },
                          {
                            type: 'boolean'
                          },
                          {
                            maxItems: 500,
                            type: 'array',
                            items: {
                              type: 'string',
                              maxLength: 255
                            }
                          },
                          {
                            type: 'null'
                          }
                        ]
                      }
                    },
                    required: ['field_id', 'operator'],
                    additionalProperties: false
                  }
                },
                filter_groups: {
                  default: [],
                  maxItems: 5,
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      filter_logic: {
                        default: 'and',
                        type: 'string',
                        enum: ['and', 'or']
                      },
                      filters: {
                        default: [],
                        maxItems: 20,
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            field_id: {
                              anyOf: [
                                {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                {
                                  type: 'string',
                                  enum: [
                                    'title',
                                    'item_type',
                                    'done',
                                    'date',
                                    'end_date',
                                    'project_id'
                                  ]
                                }
                              ]
                            },
                            operator: {
                              type: 'string',
                              enum: [
                                'equals',
                                'not-equals',
                                'contains',
                                'empty',
                                'not-empty',
                                'greater',
                                'less',
                                'before',
                                'after',
                                'on-or-before',
                                'on-or-after',
                                'relative-date',
                                'includes',
                                'not-includes',
                                'includes-any',
                                'includes-all'
                              ]
                            },
                            value: {
                              anyOf: [
                                {
                                  type: 'string',
                                  maxLength: 100000
                                },
                                {
                                  type: 'number'
                                },
                                {
                                  type: 'boolean'
                                },
                                {
                                  maxItems: 500,
                                  type: 'array',
                                  items: {
                                    type: 'string',
                                    maxLength: 255
                                  }
                                },
                                {
                                  type: 'null'
                                }
                              ]
                            }
                          },
                          required: ['field_id', 'operator'],
                          additionalProperties: false
                        }
                      }
                    },
                    required: ['filter_logic', 'filters'],
                    additionalProperties: false
                  }
                },
                sorts: {
                  default: [],
                  maxItems: 10,
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field_id: {
                        anyOf: [
                          {
                            type: 'string',
                            format: 'uuid',
                            pattern:
                              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                          },
                          {
                            type: 'string',
                            enum: [
                              'title',
                              'item_type',
                              'done',
                              'date',
                              'end_date',
                              'project_id'
                            ]
                          }
                        ]
                      },
                      direction: {
                        type: 'string',
                        enum: ['asc', 'desc']
                      }
                    },
                    required: ['field_id', 'direction'],
                    additionalProperties: false
                  }
                },
                hidden_fields: {
                  default: [],
                  maxItems: 100,
                  type: 'array',
                  items: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  }
                },
                filter_logic: {
                  default: 'and',
                  type: 'string',
                  enum: ['and', 'or']
                },
                group_property: {
                  default: null,
                  anyOf: [
                    {
                      type: 'string',
                      enum: ['item_type', 'done']
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                date_field_id: {
                  default: null,
                  anyOf: [
                    {
                      anyOf: [
                        {
                          type: 'string',
                          format: 'uuid',
                          pattern:
                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                        },
                        {
                          type: 'string',
                          enum: ['date', 'end_date']
                        }
                      ]
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                end_date_field_id: {
                  default: null,
                  anyOf: [
                    {
                      anyOf: [
                        {
                          type: 'string',
                          format: 'uuid',
                          pattern:
                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                        },
                        {
                          type: 'string',
                          enum: ['date', 'end_date']
                        }
                      ]
                    },
                    {
                      type: 'null'
                    }
                  ]
                }
              },
              required: [
                'filters',
                'filter_groups',
                'sorts',
                'hidden_fields',
                'filter_logic',
                'group_property',
                'date_field_id',
                'end_date_field_id'
              ],
              additionalProperties: false
            },
            base_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            }
          },
          required: ['name', 'mode', 'group_field_id', 'config', 'base_id'],
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
            base_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            name: {
              type: 'string',
              maxLength: 255
            },
            mode: {
              type: 'string',
              enum: ['table', 'kanban', 'calendar']
            },
            group_field_id: {
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
            config: {
              type: 'object',
              properties: {
                filters: {
                  default: [],
                  maxItems: 20,
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field_id: {
                        anyOf: [
                          {
                            type: 'string',
                            format: 'uuid',
                            pattern:
                              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                          },
                          {
                            type: 'string',
                            enum: [
                              'title',
                              'item_type',
                              'done',
                              'date',
                              'end_date',
                              'project_id'
                            ]
                          }
                        ]
                      },
                      operator: {
                        type: 'string',
                        enum: [
                          'equals',
                          'not-equals',
                          'contains',
                          'empty',
                          'not-empty',
                          'greater',
                          'less',
                          'before',
                          'after',
                          'on-or-before',
                          'on-or-after',
                          'relative-date',
                          'includes',
                          'not-includes',
                          'includes-any',
                          'includes-all'
                        ]
                      },
                      value: {
                        anyOf: [
                          {
                            type: 'string',
                            maxLength: 100000
                          },
                          {
                            type: 'number'
                          },
                          {
                            type: 'boolean'
                          },
                          {
                            maxItems: 500,
                            type: 'array',
                            items: {
                              type: 'string',
                              maxLength: 255
                            }
                          },
                          {
                            type: 'null'
                          }
                        ]
                      }
                    },
                    required: ['field_id', 'operator'],
                    additionalProperties: false
                  }
                },
                filter_groups: {
                  default: [],
                  maxItems: 5,
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      filter_logic: {
                        default: 'and',
                        type: 'string',
                        enum: ['and', 'or']
                      },
                      filters: {
                        default: [],
                        maxItems: 20,
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            field_id: {
                              anyOf: [
                                {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                {
                                  type: 'string',
                                  enum: [
                                    'title',
                                    'item_type',
                                    'done',
                                    'date',
                                    'end_date',
                                    'project_id'
                                  ]
                                }
                              ]
                            },
                            operator: {
                              type: 'string',
                              enum: [
                                'equals',
                                'not-equals',
                                'contains',
                                'empty',
                                'not-empty',
                                'greater',
                                'less',
                                'before',
                                'after',
                                'on-or-before',
                                'on-or-after',
                                'relative-date',
                                'includes',
                                'not-includes',
                                'includes-any',
                                'includes-all'
                              ]
                            },
                            value: {
                              anyOf: [
                                {
                                  type: 'string',
                                  maxLength: 100000
                                },
                                {
                                  type: 'number'
                                },
                                {
                                  type: 'boolean'
                                },
                                {
                                  maxItems: 500,
                                  type: 'array',
                                  items: {
                                    type: 'string',
                                    maxLength: 255
                                  }
                                },
                                {
                                  type: 'null'
                                }
                              ]
                            }
                          },
                          required: ['field_id', 'operator'],
                          additionalProperties: false
                        }
                      }
                    },
                    required: ['filter_logic', 'filters'],
                    additionalProperties: false
                  }
                },
                sorts: {
                  default: [],
                  maxItems: 10,
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field_id: {
                        anyOf: [
                          {
                            type: 'string',
                            format: 'uuid',
                            pattern:
                              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                          },
                          {
                            type: 'string',
                            enum: [
                              'title',
                              'item_type',
                              'done',
                              'date',
                              'end_date',
                              'project_id'
                            ]
                          }
                        ]
                      },
                      direction: {
                        type: 'string',
                        enum: ['asc', 'desc']
                      }
                    },
                    required: ['field_id', 'direction'],
                    additionalProperties: false
                  }
                },
                hidden_fields: {
                  default: [],
                  maxItems: 100,
                  type: 'array',
                  items: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  }
                },
                filter_logic: {
                  default: 'and',
                  type: 'string',
                  enum: ['and', 'or']
                },
                group_property: {
                  default: null,
                  anyOf: [
                    {
                      type: 'string',
                      enum: ['item_type', 'done']
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                date_field_id: {
                  default: null,
                  anyOf: [
                    {
                      anyOf: [
                        {
                          type: 'string',
                          format: 'uuid',
                          pattern:
                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                        },
                        {
                          type: 'string',
                          enum: ['date', 'end_date']
                        }
                      ]
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                end_date_field_id: {
                  default: null,
                  anyOf: [
                    {
                      anyOf: [
                        {
                          type: 'string',
                          format: 'uuid',
                          pattern:
                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                        },
                        {
                          type: 'string',
                          enum: ['date', 'end_date']
                        }
                      ]
                    },
                    {
                      type: 'null'
                    }
                  ]
                }
              },
              required: [
                'filters',
                'filter_groups',
                'sorts',
                'hidden_fields',
                'filter_logic',
                'group_property',
                'date_field_id',
                'end_date_field_id'
              ],
              additionalProperties: false
            }
          },
          required: [
            'id',
            'owner_id',
            'base_id',
            'name',
            'mode',
            'group_field_id',
            'config'
          ],
          additionalProperties: false
        }
      }
    },
    people: {
      method: 'get',
      description: 'Read workspace members for owner properties',
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
              label: {
                type: 'string'
              },
              kind: {
                type: 'string',
                enum: ['human', 'agent']
              },
              status: {
                type: 'string',
                enum: ['active', 'paused']
              }
            },
            required: ['id', 'label', 'kind'],
            additionalProperties: false
          }
        }
      }
    },
    removeBase: {
      method: 'post',
      description:
        'Workspace: Delete a database and incident relation definitions',
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
          required: ['id', 'workspace_id'],
          additionalProperties: false
        }
      },
      output: {
        NO_CONTENT: true
      }
    },
    removeField: {
      method: 'post',
      description:
        'Workspace: Delete a field and its reciprocal definition, values and view references',
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
          required: ['id', 'workspace_id'],
          additionalProperties: false
        }
      },
      output: {
        NO_CONTENT: true
      }
    },
    removeRecord: {
      method: 'post',
      description:
        'Workspace: Delete a content page and all incoming/outgoing links',
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
          required: ['id', 'workspace_id'],
          additionalProperties: false
        }
      },
      output: {
        NO_CONTENT: true
      }
    },
    removeView: {
      method: 'post',
      description: 'Workspace: Delete a saved view',
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
          required: ['id', 'workspace_id'],
          additionalProperties: false
        }
      },
      output: {
        NO_CONTENT: true
      }
    },
    setLinks: {
      method: 'post',
      description:
        'Workspace: Atomically replace reciprocal relations with cardinality checks',
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
            field_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            record_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            target_ids: {
              maxItems: 500,
              type: 'array',
              items: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
              }
            },
            expected_ids: {
              maxItems: 500,
              type: 'array',
              items: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
              }
            }
          },
          required: ['field_id', 'record_id', 'target_ids'],
          additionalProperties: false
        }
      },
      output: {
        NO_CONTENT: true
      }
    },
    snapshot: {
      method: 'get',
      description: 'Read only databases in an accessible workspace',
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
            bases: {
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
                  workspace_id: {
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
                  source_type: {
                    anyOf: [
                      {
                        type: 'string',
                        maxLength: 20
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  name: {
                    type: 'string',
                    maxLength: 255
                  },
                  description: {
                    type: 'string'
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
                  'source_type',
                  'name',
                  'description',
                  'created',
                  'updated'
                ],
                additionalProperties: false
              }
            },
            fields: {
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
                  base_id: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  name: {
                    type: 'string',
                    maxLength: 255
                  },
                  kind: {
                    type: 'string',
                    enum: [
                      'text',
                      'number',
                      'date',
                      'checkbox',
                      'select',
                      'multi-select',
                      'relation',
                      'person'
                    ]
                  },
                  config: {
                    type: 'object',
                    properties: {
                      options: {
                        default: [],
                        maxItems: 100,
                        type: 'array',
                        items: {
                          type: 'string',
                          minLength: 1,
                          maxLength: 255
                        }
                      },
                      cardinality: {
                        default: 'many',
                        type: 'string',
                        enum: ['one', 'many']
                      },
                      reciprocal_field_id: {
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
                    required: ['options', 'cardinality', 'reciprocal_field_id'],
                    additionalProperties: false
                  },
                  target_base_id: {
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
                  position: {
                    type: 'integer',
                    minimum: -2147483648,
                    maximum: 2147483647
                  }
                },
                required: [
                  'id',
                  'owner_id',
                  'base_id',
                  'name',
                  'kind',
                  'config',
                  'target_base_id',
                  'position'
                ],
                additionalProperties: false
              }
            },
            records: {
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
                  base_id: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  title: {
                    type: 'string'
                  },
                  item_type: {
                    type: 'string',
                    maxLength: 20
                  },
                  content: {
                    type: 'string'
                  },
                  done: {
                    type: 'boolean'
                  },
                  date: {
                    anyOf: [
                      {
                        type: 'string',
                        format: 'date-time'
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  end_date: {
                    anyOf: [
                      {
                        type: 'string',
                        format: 'date-time'
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  project_id: {
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
                  values: {
                    type: 'object',
                    additionalProperties: {
                      anyOf: [
                        {
                          type: 'string',
                          maxLength: 100000
                        },
                        {
                          type: 'number'
                        },
                        {
                          type: 'boolean'
                        },
                        {
                          maxItems: 500,
                          type: 'array',
                          items: {
                            type: 'string',
                            maxLength: 255
                          }
                        },
                        {
                          type: 'null'
                        }
                      ]
                    }
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
                  'base_id',
                  'title',
                  'item_type',
                  'content',
                  'done',
                  'date',
                  'end_date',
                  'project_id',
                  'values',
                  'created',
                  'updated'
                ],
                additionalProperties: false
              }
            },
            views: {
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
                  base_id: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  name: {
                    type: 'string',
                    maxLength: 255
                  },
                  mode: {
                    type: 'string',
                    enum: ['table', 'kanban', 'calendar']
                  },
                  group_field_id: {
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
                  config: {
                    type: 'object',
                    properties: {
                      filters: {
                        default: [],
                        maxItems: 20,
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            field_id: {
                              anyOf: [
                                {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                {
                                  type: 'string',
                                  enum: [
                                    'title',
                                    'item_type',
                                    'done',
                                    'date',
                                    'end_date',
                                    'project_id'
                                  ]
                                }
                              ]
                            },
                            operator: {
                              type: 'string',
                              enum: [
                                'equals',
                                'not-equals',
                                'contains',
                                'empty',
                                'not-empty',
                                'greater',
                                'less',
                                'before',
                                'after',
                                'on-or-before',
                                'on-or-after',
                                'relative-date',
                                'includes',
                                'not-includes',
                                'includes-any',
                                'includes-all'
                              ]
                            },
                            value: {
                              anyOf: [
                                {
                                  type: 'string',
                                  maxLength: 100000
                                },
                                {
                                  type: 'number'
                                },
                                {
                                  type: 'boolean'
                                },
                                {
                                  maxItems: 500,
                                  type: 'array',
                                  items: {
                                    type: 'string',
                                    maxLength: 255
                                  }
                                },
                                {
                                  type: 'null'
                                }
                              ]
                            }
                          },
                          required: ['field_id', 'operator'],
                          additionalProperties: false
                        }
                      },
                      filter_groups: {
                        default: [],
                        maxItems: 5,
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            filter_logic: {
                              default: 'and',
                              type: 'string',
                              enum: ['and', 'or']
                            },
                            filters: {
                              default: [],
                              maxItems: 20,
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  field_id: {
                                    anyOf: [
                                      {
                                        type: 'string',
                                        format: 'uuid',
                                        pattern:
                                          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                      },
                                      {
                                        type: 'string',
                                        enum: [
                                          'title',
                                          'item_type',
                                          'done',
                                          'date',
                                          'end_date',
                                          'project_id'
                                        ]
                                      }
                                    ]
                                  },
                                  operator: {
                                    type: 'string',
                                    enum: [
                                      'equals',
                                      'not-equals',
                                      'contains',
                                      'empty',
                                      'not-empty',
                                      'greater',
                                      'less',
                                      'before',
                                      'after',
                                      'on-or-before',
                                      'on-or-after',
                                      'relative-date',
                                      'includes',
                                      'not-includes',
                                      'includes-any',
                                      'includes-all'
                                    ]
                                  },
                                  value: {
                                    anyOf: [
                                      {
                                        type: 'string',
                                        maxLength: 100000
                                      },
                                      {
                                        type: 'number'
                                      },
                                      {
                                        type: 'boolean'
                                      },
                                      {
                                        maxItems: 500,
                                        type: 'array',
                                        items: {
                                          type: 'string',
                                          maxLength: 255
                                        }
                                      },
                                      {
                                        type: 'null'
                                      }
                                    ]
                                  }
                                },
                                required: ['field_id', 'operator'],
                                additionalProperties: false
                              }
                            }
                          },
                          required: ['filter_logic', 'filters'],
                          additionalProperties: false
                        }
                      },
                      sorts: {
                        default: [],
                        maxItems: 10,
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            field_id: {
                              anyOf: [
                                {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                {
                                  type: 'string',
                                  enum: [
                                    'title',
                                    'item_type',
                                    'done',
                                    'date',
                                    'end_date',
                                    'project_id'
                                  ]
                                }
                              ]
                            },
                            direction: {
                              type: 'string',
                              enum: ['asc', 'desc']
                            }
                          },
                          required: ['field_id', 'direction'],
                          additionalProperties: false
                        }
                      },
                      hidden_fields: {
                        default: [],
                        maxItems: 100,
                        type: 'array',
                        items: {
                          type: 'string',
                          format: 'uuid',
                          pattern:
                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                        }
                      },
                      filter_logic: {
                        default: 'and',
                        type: 'string',
                        enum: ['and', 'or']
                      },
                      group_property: {
                        default: null,
                        anyOf: [
                          {
                            type: 'string',
                            enum: ['item_type', 'done']
                          },
                          {
                            type: 'null'
                          }
                        ]
                      },
                      date_field_id: {
                        default: null,
                        anyOf: [
                          {
                            anyOf: [
                              {
                                type: 'string',
                                format: 'uuid',
                                pattern:
                                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                              },
                              {
                                type: 'string',
                                enum: ['date', 'end_date']
                              }
                            ]
                          },
                          {
                            type: 'null'
                          }
                        ]
                      },
                      end_date_field_id: {
                        default: null,
                        anyOf: [
                          {
                            anyOf: [
                              {
                                type: 'string',
                                format: 'uuid',
                                pattern:
                                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                              },
                              {
                                type: 'string',
                                enum: ['date', 'end_date']
                              }
                            ]
                          },
                          {
                            type: 'null'
                          }
                        ]
                      }
                    },
                    required: [
                      'filters',
                      'filter_groups',
                      'sorts',
                      'hidden_fields',
                      'filter_logic',
                      'group_property',
                      'date_field_id',
                      'end_date_field_id'
                    ],
                    additionalProperties: false
                  }
                },
                required: [
                  'id',
                  'owner_id',
                  'base_id',
                  'name',
                  'mode',
                  'group_field_id',
                  'config'
                ],
                additionalProperties: false
              }
            },
            links: {
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
                  field_id: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  source_record_id: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  target_record_id: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  }
                },
                required: [
                  'id',
                  'owner_id',
                  'field_id',
                  'source_record_id',
                  'target_record_id'
                ],
                additionalProperties: false
              }
            }
          },
          required: ['bases', 'fields', 'records', 'views', 'links'],
          additionalProperties: false
        }
      }
    },
    updateBase: {
      method: 'post',
      description: 'Workspace: Rename or describe a database',
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
          required: ['id', 'workspace_id'],
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
              default: '',
              type: 'string',
              maxLength: 10000
            }
          },
          required: ['name', 'description'],
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
            owner_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            workspace_id: {
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
            source_type: {
              anyOf: [
                {
                  type: 'string',
                  maxLength: 20
                },
                {
                  type: 'null'
                }
              ]
            },
            name: {
              type: 'string',
              maxLength: 255
            },
            description: {
              type: 'string'
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
            'source_type',
            'name',
            'description',
            'created',
            'updated'
          ],
          additionalProperties: false
        }
      }
    },
    updateField: {
      method: 'post',
      description:
        'Workspace: Change a primitive field type without losing values or saved view settings',
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
          required: ['id', 'workspace_id'],
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
            kind: {
              type: 'string',
              enum: [
                'text',
                'number',
                'date',
                'checkbox',
                'select',
                'multi-select',
                'relation',
                'person'
              ]
            },
            options: {
              maxItems: 100,
              type: 'array',
              items: {
                type: 'string',
                minLength: 1,
                maxLength: 255
              }
            }
          },
          required: ['name', 'options'],
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
            owner_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            base_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            name: {
              type: 'string',
              maxLength: 255
            },
            kind: {
              type: 'string',
              enum: [
                'text',
                'number',
                'date',
                'checkbox',
                'select',
                'multi-select',
                'relation',
                'person'
              ]
            },
            config: {
              type: 'object',
              properties: {
                options: {
                  default: [],
                  maxItems: 100,
                  type: 'array',
                  items: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 255
                  }
                },
                cardinality: {
                  default: 'many',
                  type: 'string',
                  enum: ['one', 'many']
                },
                reciprocal_field_id: {
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
              required: ['options', 'cardinality', 'reciprocal_field_id'],
              additionalProperties: false
            },
            target_base_id: {
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
            position: {
              type: 'integer',
              minimum: -2147483648,
              maximum: 2147483647
            }
          },
          required: [
            'id',
            'owner_id',
            'base_id',
            'name',
            'kind',
            'config',
            'target_base_id',
            'position'
          ],
          additionalProperties: false
        }
      }
    },
    updateRecord: {
      method: 'post',
      description: 'Workspace: Save record content and typed properties',
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
          required: ['id', 'workspace_id'],
          additionalProperties: false
        },
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            title: {
              type: 'string',
              minLength: 1,
              maxLength: 1000000
            },
            content: {
              default: '',
              type: 'string',
              maxLength: 1000000
            },
            values: {
              default: {},
              type: 'object',
              additionalProperties: {
                anyOf: [
                  {
                    type: 'string',
                    maxLength: 100000
                  },
                  {
                    type: 'number'
                  },
                  {
                    type: 'boolean'
                  },
                  {
                    maxItems: 500,
                    type: 'array',
                    items: {
                      type: 'string',
                      maxLength: 255
                    }
                  },
                  {
                    type: 'null'
                  }
                ]
              }
            },
            item_type: {
              type: 'string',
              enum: ['page', 'task', 'note', 'project', 'event', 'post']
            },
            done: {
              type: 'boolean'
            },
            date: {
              anyOf: [
                {
                  type: 'string',
                  format: 'date-time',
                  pattern:
                    '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$'
                },
                {
                  type: 'null'
                }
              ]
            },
            end_date: {
              anyOf: [
                {
                  type: 'string',
                  format: 'date-time',
                  pattern:
                    '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$'
                },
                {
                  type: 'null'
                }
              ]
            },
            project_id: {
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
            expected_updated: {
              type: 'string',
              format: 'date-time',
              pattern:
                '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$'
            }
          },
          required: ['title', 'content', 'values'],
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
            owner_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            base_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            title: {
              type: 'string'
            },
            item_type: {
              type: 'string',
              maxLength: 20
            },
            content: {
              type: 'string'
            },
            done: {
              type: 'boolean'
            },
            date: {
              anyOf: [
                {
                  type: 'string',
                  format: 'date-time'
                },
                {
                  type: 'null'
                }
              ]
            },
            end_date: {
              anyOf: [
                {
                  type: 'string',
                  format: 'date-time'
                },
                {
                  type: 'null'
                }
              ]
            },
            project_id: {
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
            values: {
              type: 'object',
              additionalProperties: {
                anyOf: [
                  {
                    type: 'string',
                    maxLength: 100000
                  },
                  {
                    type: 'number'
                  },
                  {
                    type: 'boolean'
                  },
                  {
                    maxItems: 500,
                    type: 'array',
                    items: {
                      type: 'string',
                      maxLength: 255
                    }
                  },
                  {
                    type: 'null'
                  }
                ]
              }
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
            'base_id',
            'title',
            'item_type',
            'content',
            'done',
            'date',
            'end_date',
            'project_id',
            'values',
            'created',
            'updated'
          ],
          additionalProperties: false
        }
      }
    },
    updateView: {
      method: 'post',
      description: 'Workspace: Update a saved view',
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
          required: ['id', 'workspace_id'],
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
            mode: {
              type: 'string',
              enum: ['table', 'kanban', 'calendar']
            },
            group_field_id: {
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
            },
            config: {
              type: 'object',
              properties: {
                filters: {
                  default: [],
                  maxItems: 20,
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field_id: {
                        anyOf: [
                          {
                            type: 'string',
                            format: 'uuid',
                            pattern:
                              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                          },
                          {
                            type: 'string',
                            enum: [
                              'title',
                              'item_type',
                              'done',
                              'date',
                              'end_date',
                              'project_id'
                            ]
                          }
                        ]
                      },
                      operator: {
                        type: 'string',
                        enum: [
                          'equals',
                          'not-equals',
                          'contains',
                          'empty',
                          'not-empty',
                          'greater',
                          'less',
                          'before',
                          'after',
                          'on-or-before',
                          'on-or-after',
                          'relative-date',
                          'includes',
                          'not-includes',
                          'includes-any',
                          'includes-all'
                        ]
                      },
                      value: {
                        anyOf: [
                          {
                            type: 'string',
                            maxLength: 100000
                          },
                          {
                            type: 'number'
                          },
                          {
                            type: 'boolean'
                          },
                          {
                            maxItems: 500,
                            type: 'array',
                            items: {
                              type: 'string',
                              maxLength: 255
                            }
                          },
                          {
                            type: 'null'
                          }
                        ]
                      }
                    },
                    required: ['field_id', 'operator'],
                    additionalProperties: false
                  }
                },
                filter_groups: {
                  default: [],
                  maxItems: 5,
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      filter_logic: {
                        default: 'and',
                        type: 'string',
                        enum: ['and', 'or']
                      },
                      filters: {
                        default: [],
                        maxItems: 20,
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            field_id: {
                              anyOf: [
                                {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                {
                                  type: 'string',
                                  enum: [
                                    'title',
                                    'item_type',
                                    'done',
                                    'date',
                                    'end_date',
                                    'project_id'
                                  ]
                                }
                              ]
                            },
                            operator: {
                              type: 'string',
                              enum: [
                                'equals',
                                'not-equals',
                                'contains',
                                'empty',
                                'not-empty',
                                'greater',
                                'less',
                                'before',
                                'after',
                                'on-or-before',
                                'on-or-after',
                                'relative-date',
                                'includes',
                                'not-includes',
                                'includes-any',
                                'includes-all'
                              ]
                            },
                            value: {
                              anyOf: [
                                {
                                  type: 'string',
                                  maxLength: 100000
                                },
                                {
                                  type: 'number'
                                },
                                {
                                  type: 'boolean'
                                },
                                {
                                  maxItems: 500,
                                  type: 'array',
                                  items: {
                                    type: 'string',
                                    maxLength: 255
                                  }
                                },
                                {
                                  type: 'null'
                                }
                              ]
                            }
                          },
                          required: ['field_id', 'operator'],
                          additionalProperties: false
                        }
                      }
                    },
                    required: ['filter_logic', 'filters'],
                    additionalProperties: false
                  }
                },
                sorts: {
                  default: [],
                  maxItems: 10,
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field_id: {
                        anyOf: [
                          {
                            type: 'string',
                            format: 'uuid',
                            pattern:
                              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                          },
                          {
                            type: 'string',
                            enum: [
                              'title',
                              'item_type',
                              'done',
                              'date',
                              'end_date',
                              'project_id'
                            ]
                          }
                        ]
                      },
                      direction: {
                        type: 'string',
                        enum: ['asc', 'desc']
                      }
                    },
                    required: ['field_id', 'direction'],
                    additionalProperties: false
                  }
                },
                hidden_fields: {
                  default: [],
                  maxItems: 100,
                  type: 'array',
                  items: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  }
                },
                filter_logic: {
                  default: 'and',
                  type: 'string',
                  enum: ['and', 'or']
                },
                group_property: {
                  default: null,
                  anyOf: [
                    {
                      type: 'string',
                      enum: ['item_type', 'done']
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                date_field_id: {
                  default: null,
                  anyOf: [
                    {
                      anyOf: [
                        {
                          type: 'string',
                          format: 'uuid',
                          pattern:
                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                        },
                        {
                          type: 'string',
                          enum: ['date', 'end_date']
                        }
                      ]
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                end_date_field_id: {
                  default: null,
                  anyOf: [
                    {
                      anyOf: [
                        {
                          type: 'string',
                          format: 'uuid',
                          pattern:
                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                        },
                        {
                          type: 'string',
                          enum: ['date', 'end_date']
                        }
                      ]
                    },
                    {
                      type: 'null'
                    }
                  ]
                }
              },
              required: [
                'filters',
                'filter_groups',
                'sorts',
                'hidden_fields',
                'filter_logic',
                'group_property',
                'date_field_id',
                'end_date_field_id'
              ],
              additionalProperties: false
            }
          },
          required: ['name', 'mode', 'group_field_id', 'config'],
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
            owner_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            base_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            name: {
              type: 'string',
              maxLength: 255
            },
            mode: {
              type: 'string',
              enum: ['table', 'kanban', 'calendar']
            },
            group_field_id: {
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
            config: {
              type: 'object',
              properties: {
                filters: {
                  default: [],
                  maxItems: 20,
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field_id: {
                        anyOf: [
                          {
                            type: 'string',
                            format: 'uuid',
                            pattern:
                              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                          },
                          {
                            type: 'string',
                            enum: [
                              'title',
                              'item_type',
                              'done',
                              'date',
                              'end_date',
                              'project_id'
                            ]
                          }
                        ]
                      },
                      operator: {
                        type: 'string',
                        enum: [
                          'equals',
                          'not-equals',
                          'contains',
                          'empty',
                          'not-empty',
                          'greater',
                          'less',
                          'before',
                          'after',
                          'on-or-before',
                          'on-or-after',
                          'relative-date',
                          'includes',
                          'not-includes',
                          'includes-any',
                          'includes-all'
                        ]
                      },
                      value: {
                        anyOf: [
                          {
                            type: 'string',
                            maxLength: 100000
                          },
                          {
                            type: 'number'
                          },
                          {
                            type: 'boolean'
                          },
                          {
                            maxItems: 500,
                            type: 'array',
                            items: {
                              type: 'string',
                              maxLength: 255
                            }
                          },
                          {
                            type: 'null'
                          }
                        ]
                      }
                    },
                    required: ['field_id', 'operator'],
                    additionalProperties: false
                  }
                },
                filter_groups: {
                  default: [],
                  maxItems: 5,
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      filter_logic: {
                        default: 'and',
                        type: 'string',
                        enum: ['and', 'or']
                      },
                      filters: {
                        default: [],
                        maxItems: 20,
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            field_id: {
                              anyOf: [
                                {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                {
                                  type: 'string',
                                  enum: [
                                    'title',
                                    'item_type',
                                    'done',
                                    'date',
                                    'end_date',
                                    'project_id'
                                  ]
                                }
                              ]
                            },
                            operator: {
                              type: 'string',
                              enum: [
                                'equals',
                                'not-equals',
                                'contains',
                                'empty',
                                'not-empty',
                                'greater',
                                'less',
                                'before',
                                'after',
                                'on-or-before',
                                'on-or-after',
                                'relative-date',
                                'includes',
                                'not-includes',
                                'includes-any',
                                'includes-all'
                              ]
                            },
                            value: {
                              anyOf: [
                                {
                                  type: 'string',
                                  maxLength: 100000
                                },
                                {
                                  type: 'number'
                                },
                                {
                                  type: 'boolean'
                                },
                                {
                                  maxItems: 500,
                                  type: 'array',
                                  items: {
                                    type: 'string',
                                    maxLength: 255
                                  }
                                },
                                {
                                  type: 'null'
                                }
                              ]
                            }
                          },
                          required: ['field_id', 'operator'],
                          additionalProperties: false
                        }
                      }
                    },
                    required: ['filter_logic', 'filters'],
                    additionalProperties: false
                  }
                },
                sorts: {
                  default: [],
                  maxItems: 10,
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field_id: {
                        anyOf: [
                          {
                            type: 'string',
                            format: 'uuid',
                            pattern:
                              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                          },
                          {
                            type: 'string',
                            enum: [
                              'title',
                              'item_type',
                              'done',
                              'date',
                              'end_date',
                              'project_id'
                            ]
                          }
                        ]
                      },
                      direction: {
                        type: 'string',
                        enum: ['asc', 'desc']
                      }
                    },
                    required: ['field_id', 'direction'],
                    additionalProperties: false
                  }
                },
                hidden_fields: {
                  default: [],
                  maxItems: 100,
                  type: 'array',
                  items: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  }
                },
                filter_logic: {
                  default: 'and',
                  type: 'string',
                  enum: ['and', 'or']
                },
                group_property: {
                  default: null,
                  anyOf: [
                    {
                      type: 'string',
                      enum: ['item_type', 'done']
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                date_field_id: {
                  default: null,
                  anyOf: [
                    {
                      anyOf: [
                        {
                          type: 'string',
                          format: 'uuid',
                          pattern:
                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                        },
                        {
                          type: 'string',
                          enum: ['date', 'end_date']
                        }
                      ]
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                end_date_field_id: {
                  default: null,
                  anyOf: [
                    {
                      anyOf: [
                        {
                          type: 'string',
                          format: 'uuid',
                          pattern:
                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                        },
                        {
                          type: 'string',
                          enum: ['date', 'end_date']
                        }
                      ]
                    },
                    {
                      type: 'null'
                    }
                  ]
                }
              },
              required: [
                'filters',
                'filter_groups',
                'sorts',
                'hidden_fields',
                'filter_logic',
                'group_property',
                'date_field_id',
                'end_date_field_id'
              ],
              additionalProperties: false
            }
          },
          required: [
            'id',
            'owner_id',
            'base_id',
            'name',
            'mode',
            'group_field_id',
            'config'
          ],
          additionalProperties: false
        }
      }
    }
  },
  workspaceGraph: {
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
                  enum: ['document', 'record', 'note']
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
                  enum: ['document', 'record', 'note']
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
                    enum: ['document', 'record', 'note']
                  },
                  title: {
                    type: 'string'
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
            }
          },
          required: ['nodes', 'edges', 'unresolved'],
          additionalProperties: false
        }
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
    }
  }
} as const

export default contract
