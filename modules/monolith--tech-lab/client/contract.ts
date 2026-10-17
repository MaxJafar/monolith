export const contract = {
  checks: {
    run: {
      method: 'post',
      description:
        'Run an enabled owned monitor, or a bounded batch of due monitors',
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
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            checks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    enum: ['up', 'down', 'error']
                  },
                  latency_ms: {
                    anyOf: [
                      {
                        type: 'number',
                        minimum: 0
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  http_status: {
                    anyOf: [
                      {
                        type: 'integer',
                        minimum: 100,
                        maximum: 599
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  message: {
                    type: 'string',
                    maxLength: 2000
                  },
                  details: {
                    type: 'object',
                    properties: {
                      players_online: {
                        type: 'integer',
                        minimum: 0,
                        maximum: 9007199254740991
                      },
                      players_max: {
                        type: 'integer',
                        minimum: 0,
                        maximum: 9007199254740991
                      },
                      version: {
                        type: 'string',
                        maxLength: 500
                      }
                    },
                    additionalProperties: false
                  },
                  id: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  service_id: {
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
                  original_service_id: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  service_name: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 160
                  },
                  monitor_kind: {
                    type: 'string',
                    enum: ['none', 'http', 'tcp', 'minecraft']
                  },
                  monitor_target: {
                    type: 'string'
                  },
                  monitor_port: {
                    anyOf: [
                      {
                        type: 'integer',
                        minimum: -9007199254740991,
                        maximum: 9007199254740991
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  monitor_revision: {
                    type: 'integer',
                    exclusiveMinimum: 0,
                    maximum: 9007199254740991
                  },
                  checked_at: {
                    type: 'string',
                    format: 'date-time',
                    pattern:
                      '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$'
                  }
                },
                required: [
                  'status',
                  'latency_ms',
                  'http_status',
                  'message',
                  'id',
                  'service_id',
                  'original_service_id',
                  'service_name',
                  'monitor_kind',
                  'monitor_target',
                  'monitor_port',
                  'monitor_revision',
                  'checked_at'
                ],
                additionalProperties: false
              }
            },
            skipped: {
              type: 'integer',
              minimum: 0,
              maximum: 9007199254740991
            }
          },
          required: ['checks', 'skipped'],
          additionalProperties: false
        }
      }
    }
  },
  devices: {
    save: {
      method: 'post',
      description: 'Create or update an owned device with a stale-edit guard',
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
            kind: {
              default: 'server',
              type: 'string',
              minLength: 1,
              maxLength: 80
            },
            host: {
              default: '',
              type: 'string',
              maxLength: 500
            },
            os: {
              default: '',
              type: 'string',
              maxLength: 500
            },
            cpu: {
              default: '',
              type: 'string',
              maxLength: 500
            },
            gpu: {
              default: '',
              type: 'string',
              maxLength: 500
            },
            ram_gb: {
              default: null,
              anyOf: [
                {
                  type: 'number',
                  minimum: 0,
                  maximum: 1000000
                },
                {
                  type: 'null'
                }
              ]
            },
            storage: {
              default: '',
              type: 'string',
              maxLength: 500
            },
            location: {
              default: '',
              type: 'string',
              maxLength: 500
            },
            management_url: {
              default: '',
              type: 'string',
              maxLength: 2048
            },
            glances_url: {
              default: '',
              type: 'string',
              maxLength: 2048
            },
            notes: {
              default: '',
              type: 'string',
              maxLength: 20000
            },
            tags: {
              default: [],
              maxItems: 50,
              type: 'array',
              items: {
                type: 'string',
                minLength: 1,
                maxLength: 80
              }
            },
            source_key: {
              default: null,
              anyOf: [
                {
                  type: 'string',
                  minLength: 1,
                  maxLength: 200
                },
                {
                  type: 'null'
                }
              ]
            },
            id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            expected_updated: {
              type: 'string',
              format: 'date-time',
              pattern:
                '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$'
            }
          },
          required: [
            'name',
            'kind',
            'host',
            'os',
            'cpu',
            'gpu',
            'ram_gb',
            'storage',
            'location',
            'management_url',
            'glances_url',
            'notes',
            'tags',
            'source_key'
          ],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 160
            },
            kind: {
              default: 'server',
              type: 'string',
              minLength: 1,
              maxLength: 80
            },
            host: {
              default: '',
              type: 'string',
              maxLength: 500
            },
            os: {
              default: '',
              type: 'string',
              maxLength: 500
            },
            cpu: {
              default: '',
              type: 'string',
              maxLength: 500
            },
            gpu: {
              default: '',
              type: 'string',
              maxLength: 500
            },
            ram_gb: {
              default: null,
              anyOf: [
                {
                  type: 'number',
                  minimum: 0,
                  maximum: 1000000
                },
                {
                  type: 'null'
                }
              ]
            },
            storage: {
              default: '',
              type: 'string',
              maxLength: 500
            },
            location: {
              default: '',
              type: 'string',
              maxLength: 500
            },
            management_url: {
              default: '',
              type: 'string',
              maxLength: 2048
            },
            glances_url: {
              default: '',
              type: 'string',
              maxLength: 2048
            },
            notes: {
              default: '',
              type: 'string',
              maxLength: 20000
            },
            tags: {
              default: [],
              maxItems: 50,
              type: 'array',
              items: {
                type: 'string',
                minLength: 1,
                maxLength: 80
              }
            },
            source_key: {
              default: null,
              anyOf: [
                {
                  type: 'string',
                  minLength: 1,
                  maxLength: 200
                },
                {
                  type: 'null'
                }
              ]
            },
            id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            created: {
              type: 'string',
              format: 'date-time',
              pattern:
                '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$'
            },
            updated: {
              type: 'string',
              format: 'date-time',
              pattern:
                '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$'
            }
          },
          required: [
            'name',
            'kind',
            'host',
            'os',
            'cpu',
            'gpu',
            'ram_gb',
            'storage',
            'location',
            'management_url',
            'glances_url',
            'notes',
            'tags',
            'source_key',
            'id',
            'created',
            'updated'
          ],
          additionalProperties: false
        }
      }
    },
    delete: {
      method: 'post',
      description: 'Delete an owned device and detach its hosted services',
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
            expected_updated: {
              type: 'string',
              format: 'date-time',
              pattern:
                '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$'
            }
          },
          required: ['id', 'expected_updated'],
          additionalProperties: false
        }
      },
      output: {
        NO_CONTENT: true
      }
    },
    telemetry: {
      method: 'get',
      description: 'Read actual Glances telemetry from an owned device',
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
            status: {
              type: 'string',
              enum: ['up', 'error', 'disabled']
            },
            message: {
              type: 'string',
              maxLength: 2000
            },
            captured_at: {
              type: 'string',
              format: 'date-time',
              pattern:
                '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$'
            },
            cpu_percent: {
              anyOf: [
                {
                  type: 'number',
                  minimum: 0,
                  maximum: 100
                },
                {
                  type: 'null'
                }
              ]
            },
            ram_used_bytes: {
              anyOf: [
                {
                  type: 'number',
                  minimum: 0
                },
                {
                  type: 'null'
                }
              ]
            },
            ram_total_bytes: {
              anyOf: [
                {
                  type: 'number',
                  minimum: 0
                },
                {
                  type: 'null'
                }
              ]
            },
            uptime_seconds: {
              anyOf: [
                {
                  type: 'number',
                  minimum: 0
                },
                {
                  type: 'null'
                }
              ]
            },
            filesystems: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string'
                  },
                  used_bytes: {
                    type: 'number',
                    minimum: 0
                  },
                  total_bytes: {
                    type: 'number',
                    minimum: 0
                  }
                },
                required: ['name', 'used_bytes', 'total_bytes'],
                additionalProperties: false
              }
            }
          },
          required: [
            'status',
            'message',
            'captured_at',
            'cpu_percent',
            'ram_used_bytes',
            'ram_total_bytes',
            'uptime_seconds',
            'filesystems'
          ],
          additionalProperties: false
        }
      }
    }
  },
  exportData: {
    method: 'get',
    description:
      'Export owned inventory and settings without monitor history or credentials',
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
          format: {
            type: 'string',
            const: 'zillion-tech-lab'
          },
          version: {
            type: 'number',
            const: 1
          },
          exported_at: {
            type: 'string',
            format: 'date-time',
            pattern:
              '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$'
          },
          devices: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 160
                },
                kind: {
                  default: 'server',
                  type: 'string',
                  minLength: 1,
                  maxLength: 80
                },
                host: {
                  default: '',
                  type: 'string',
                  maxLength: 500
                },
                os: {
                  default: '',
                  type: 'string',
                  maxLength: 500
                },
                cpu: {
                  default: '',
                  type: 'string',
                  maxLength: 500
                },
                gpu: {
                  default: '',
                  type: 'string',
                  maxLength: 500
                },
                ram_gb: {
                  default: null,
                  anyOf: [
                    {
                      type: 'number',
                      minimum: 0,
                      maximum: 1000000
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                storage: {
                  default: '',
                  type: 'string',
                  maxLength: 500
                },
                location: {
                  default: '',
                  type: 'string',
                  maxLength: 500
                },
                management_url: {
                  default: '',
                  type: 'string',
                  maxLength: 2048
                },
                glances_url: {
                  default: '',
                  type: 'string',
                  maxLength: 2048
                },
                notes: {
                  default: '',
                  type: 'string',
                  maxLength: 20000
                },
                tags: {
                  default: [],
                  maxItems: 50,
                  type: 'array',
                  items: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 80
                  }
                },
                source_key: {
                  default: null,
                  anyOf: [
                    {
                      type: 'string',
                      minLength: 1,
                      maxLength: 200
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                created: {
                  type: 'string',
                  format: 'date-time',
                  pattern:
                    '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$'
                },
                updated: {
                  type: 'string',
                  format: 'date-time',
                  pattern:
                    '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$'
                }
              },
              required: [
                'name',
                'kind',
                'host',
                'os',
                'cpu',
                'gpu',
                'ram_gb',
                'storage',
                'location',
                'management_url',
                'glances_url',
                'notes',
                'tags',
                'source_key',
                'id',
                'created',
                'updated'
              ],
              additionalProperties: false
            }
          },
          services: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 160
                },
                kind: {
                  default: 'service',
                  type: 'string',
                  enum: ['service', 'game', 'link']
                },
                category: {
                  default: '',
                  type: 'string',
                  maxLength: 120
                },
                device_id: {
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
                url: {
                  default: '',
                  type: 'string',
                  maxLength: 2048
                },
                address: {
                  default: '',
                  type: 'string',
                  maxLength: 500
                },
                description: {
                  default: '',
                  type: 'string',
                  maxLength: 3000
                },
                notes: {
                  default: '',
                  type: 'string',
                  maxLength: 20000
                },
                tags: {
                  default: [],
                  maxItems: 50,
                  type: 'array',
                  items: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 80
                  }
                },
                monitor_kind: {
                  default: 'none',
                  type: 'string',
                  enum: ['none', 'http', 'tcp', 'minecraft']
                },
                monitor_target: {
                  default: '',
                  type: 'string',
                  maxLength: 2048
                },
                monitor_port: {
                  default: null,
                  anyOf: [
                    {
                      type: 'integer',
                      minimum: 1,
                      maximum: 65535
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                monitor_enabled: {
                  default: false,
                  type: 'boolean'
                },
                monitor_interval_seconds: {
                  default: 300,
                  type: 'integer',
                  minimum: 60,
                  maximum: 86400
                },
                source_key: {
                  default: null,
                  anyOf: [
                    {
                      type: 'string',
                      minLength: 1,
                      maxLength: 200
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                created: {
                  type: 'string',
                  format: 'date-time',
                  pattern:
                    '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$'
                },
                updated: {
                  type: 'string',
                  format: 'date-time',
                  pattern:
                    '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$'
                },
                monitor_revision: {
                  type: 'integer',
                  exclusiveMinimum: 0,
                  maximum: 9007199254740991
                }
              },
              required: [
                'name',
                'kind',
                'category',
                'device_id',
                'url',
                'address',
                'description',
                'notes',
                'tags',
                'monitor_kind',
                'monitor_target',
                'monitor_port',
                'monitor_enabled',
                'monitor_interval_seconds',
                'source_key',
                'id',
                'created',
                'updated',
                'monitor_revision'
              ],
              additionalProperties: false
            }
          },
          settings: {
            type: 'object',
            properties: {
              auto_refresh_seconds: {
                default: 30,
                type: 'integer',
                minimum: 15,
                maximum: 300
              },
              stale_after_multiplier: {
                default: 3,
                type: 'integer',
                minimum: 2,
                maximum: 10
              },
              history_retention_days: {
                default: 30,
                type: 'integer',
                minimum: 7,
                maximum: 90
              },
              updated: {
                type: 'string',
                format: 'date-time',
                pattern:
                  '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$'
              }
            },
            required: [
              'auto_refresh_seconds',
              'stale_after_multiplier',
              'history_retention_days',
              'updated'
            ],
            additionalProperties: false
          }
        },
        required: [
          'format',
          'version',
          'exported_at',
          'devices',
          'services',
          'settings'
        ],
        additionalProperties: false
      }
    }
  },
  history: {
    method: 'get',
    description: 'Read a bounded history of actual checks for an owned service',
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
          hours: {
            default: 24,
            type: 'integer',
            minimum: 1,
            maximum: 720
          }
        },
        required: ['id', 'hours'],
        additionalProperties: false
      }
    },
    output: {
      OK: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          checks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                status: {
                  type: 'string',
                  enum: ['up', 'down', 'error']
                },
                latency_ms: {
                  anyOf: [
                    {
                      type: 'number',
                      minimum: 0
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                http_status: {
                  anyOf: [
                    {
                      type: 'integer',
                      minimum: 100,
                      maximum: 599
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                message: {
                  type: 'string',
                  maxLength: 2000
                },
                details: {
                  type: 'object',
                  properties: {
                    players_online: {
                      type: 'integer',
                      minimum: 0,
                      maximum: 9007199254740991
                    },
                    players_max: {
                      type: 'integer',
                      minimum: 0,
                      maximum: 9007199254740991
                    },
                    version: {
                      type: 'string',
                      maxLength: 500
                    }
                  },
                  additionalProperties: false
                },
                id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                service_id: {
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
                original_service_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                service_name: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 160
                },
                monitor_kind: {
                  type: 'string',
                  enum: ['none', 'http', 'tcp', 'minecraft']
                },
                monitor_target: {
                  type: 'string'
                },
                monitor_port: {
                  anyOf: [
                    {
                      type: 'integer',
                      minimum: -9007199254740991,
                      maximum: 9007199254740991
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                monitor_revision: {
                  type: 'integer',
                  exclusiveMinimum: 0,
                  maximum: 9007199254740991
                },
                checked_at: {
                  type: 'string',
                  format: 'date-time',
                  pattern:
                    '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$'
                }
              },
              required: [
                'status',
                'latency_ms',
                'http_status',
                'message',
                'id',
                'service_id',
                'original_service_id',
                'service_name',
                'monitor_kind',
                'monitor_target',
                'monitor_port',
                'monitor_revision',
                'checked_at'
              ],
              additionalProperties: false
            }
          },
          truncated: {
            type: 'boolean'
          },
          hours: {
            type: 'integer',
            minimum: -9007199254740991,
            maximum: 9007199254740991
          },
          service: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                minLength: 1,
                maxLength: 160
              },
              kind: {
                default: 'service',
                type: 'string',
                enum: ['service', 'game', 'link']
              },
              category: {
                default: '',
                type: 'string',
                maxLength: 120
              },
              device_id: {
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
              url: {
                default: '',
                type: 'string',
                maxLength: 2048
              },
              address: {
                default: '',
                type: 'string',
                maxLength: 500
              },
              description: {
                default: '',
                type: 'string',
                maxLength: 3000
              },
              notes: {
                default: '',
                type: 'string',
                maxLength: 20000
              },
              tags: {
                default: [],
                maxItems: 50,
                type: 'array',
                items: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 80
                }
              },
              monitor_kind: {
                default: 'none',
                type: 'string',
                enum: ['none', 'http', 'tcp', 'minecraft']
              },
              monitor_target: {
                default: '',
                type: 'string',
                maxLength: 2048
              },
              monitor_port: {
                default: null,
                anyOf: [
                  {
                    type: 'integer',
                    minimum: 1,
                    maximum: 65535
                  },
                  {
                    type: 'null'
                  }
                ]
              },
              monitor_enabled: {
                default: false,
                type: 'boolean'
              },
              monitor_interval_seconds: {
                default: 300,
                type: 'integer',
                minimum: 60,
                maximum: 86400
              },
              source_key: {
                default: null,
                anyOf: [
                  {
                    type: 'string',
                    minLength: 1,
                    maxLength: 200
                  },
                  {
                    type: 'null'
                  }
                ]
              },
              id: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
              },
              created: {
                type: 'string',
                format: 'date-time',
                pattern:
                  '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$'
              },
              updated: {
                type: 'string',
                format: 'date-time',
                pattern:
                  '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$'
              },
              monitor_revision: {
                type: 'integer',
                exclusiveMinimum: 0,
                maximum: 9007199254740991
              }
            },
            required: [
              'name',
              'kind',
              'category',
              'device_id',
              'url',
              'address',
              'description',
              'notes',
              'tags',
              'monitor_kind',
              'monitor_target',
              'monitor_port',
              'monitor_enabled',
              'monitor_interval_seconds',
              'source_key',
              'id',
              'created',
              'updated',
              'monitor_revision'
            ],
            additionalProperties: false
          }
        },
        required: ['checks', 'truncated', 'hours', 'service'],
        additionalProperties: false
      }
    }
  },
  imports: {
    preview: {
      method: 'post',
      description:
        'Preview a bounded Homepage YAML or native inventory import without network requests',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            format: {
              type: 'string',
              enum: ['homepage-services', 'homepage-bookmarks', 'native-json']
            },
            text: {
              type: 'string',
              maxLength: 5000000
            }
          },
          required: ['format', 'text'],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                devices: {
                  maxItems: 500,
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 160
                      },
                      kind: {
                        default: 'server',
                        type: 'string',
                        minLength: 1,
                        maxLength: 80
                      },
                      host: {
                        default: '',
                        type: 'string',
                        maxLength: 500
                      },
                      os: {
                        default: '',
                        type: 'string',
                        maxLength: 500
                      },
                      cpu: {
                        default: '',
                        type: 'string',
                        maxLength: 500
                      },
                      gpu: {
                        default: '',
                        type: 'string',
                        maxLength: 500
                      },
                      ram_gb: {
                        default: null,
                        anyOf: [
                          {
                            type: 'number',
                            minimum: 0,
                            maximum: 1000000
                          },
                          {
                            type: 'null'
                          }
                        ]
                      },
                      storage: {
                        default: '',
                        type: 'string',
                        maxLength: 500
                      },
                      location: {
                        default: '',
                        type: 'string',
                        maxLength: 500
                      },
                      management_url: {
                        default: '',
                        type: 'string',
                        maxLength: 2048
                      },
                      glances_url: {
                        default: '',
                        type: 'string',
                        maxLength: 2048
                      },
                      notes: {
                        default: '',
                        type: 'string',
                        maxLength: 20000
                      },
                      tags: {
                        default: [],
                        maxItems: 50,
                        type: 'array',
                        items: {
                          type: 'string',
                          minLength: 1,
                          maxLength: 80
                        }
                      },
                      source_key: {
                        default: null,
                        anyOf: [
                          {
                            type: 'string',
                            minLength: 1,
                            maxLength: 200
                          },
                          {
                            type: 'null'
                          }
                        ]
                      },
                      id: {
                        type: 'string',
                        format: 'uuid',
                        pattern:
                          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                      }
                    },
                    required: [
                      'name',
                      'kind',
                      'host',
                      'os',
                      'cpu',
                      'gpu',
                      'ram_gb',
                      'storage',
                      'location',
                      'management_url',
                      'glances_url',
                      'notes',
                      'tags',
                      'source_key'
                    ],
                    additionalProperties: false
                  }
                },
                services: {
                  maxItems: 2000,
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 160
                      },
                      kind: {
                        default: 'service',
                        type: 'string',
                        enum: ['service', 'game', 'link']
                      },
                      category: {
                        default: '',
                        type: 'string',
                        maxLength: 120
                      },
                      device_id: {
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
                      url: {
                        default: '',
                        type: 'string',
                        maxLength: 2048
                      },
                      address: {
                        default: '',
                        type: 'string',
                        maxLength: 500
                      },
                      description: {
                        default: '',
                        type: 'string',
                        maxLength: 3000
                      },
                      notes: {
                        default: '',
                        type: 'string',
                        maxLength: 20000
                      },
                      tags: {
                        default: [],
                        maxItems: 50,
                        type: 'array',
                        items: {
                          type: 'string',
                          minLength: 1,
                          maxLength: 80
                        }
                      },
                      monitor_kind: {
                        default: 'none',
                        type: 'string',
                        enum: ['none', 'http', 'tcp', 'minecraft']
                      },
                      monitor_target: {
                        default: '',
                        type: 'string',
                        maxLength: 2048
                      },
                      monitor_port: {
                        default: null,
                        anyOf: [
                          {
                            type: 'integer',
                            minimum: 1,
                            maximum: 65535
                          },
                          {
                            type: 'null'
                          }
                        ]
                      },
                      monitor_enabled: {
                        default: false,
                        type: 'boolean'
                      },
                      monitor_interval_seconds: {
                        default: 300,
                        type: 'integer',
                        minimum: 60,
                        maximum: 86400
                      },
                      source_key: {
                        default: null,
                        anyOf: [
                          {
                            type: 'string',
                            minLength: 1,
                            maxLength: 200
                          },
                          {
                            type: 'null'
                          }
                        ]
                      },
                      device_source_key: {
                        anyOf: [
                          {
                            type: 'string',
                            maxLength: 200
                          },
                          {
                            type: 'null'
                          }
                        ]
                      }
                    },
                    required: [
                      'name',
                      'kind',
                      'category',
                      'device_id',
                      'url',
                      'address',
                      'description',
                      'notes',
                      'tags',
                      'monitor_kind',
                      'monitor_target',
                      'monitor_port',
                      'monitor_enabled',
                      'monitor_interval_seconds',
                      'source_key'
                    ],
                    additionalProperties: false
                  }
                }
              },
              required: ['devices', 'services'],
              additionalProperties: false
            },
            counts: {
              type: 'object',
              properties: {
                devices: {
                  type: 'integer',
                  minimum: -9007199254740991,
                  maximum: 9007199254740991
                },
                services: {
                  type: 'integer',
                  minimum: -9007199254740991,
                  maximum: 9007199254740991
                },
                bookmarks: {
                  type: 'integer',
                  minimum: -9007199254740991,
                  maximum: 9007199254740991
                },
                duplicates: {
                  type: 'integer',
                  minimum: -9007199254740991,
                  maximum: 9007199254740991
                }
              },
              required: ['devices', 'services', 'bookmarks', 'duplicates'],
              additionalProperties: false
            },
            warnings: {
              type: 'array',
              items: {
                type: 'string'
              }
            }
          },
          required: ['data', 'counts', 'warnings'],
          additionalProperties: false
        }
      }
    },
    apply: {
      method: 'post',
      description:
        'Atomically merge inventory into your workspace with monitoring disabled',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            data: {
              type: 'object',
              properties: {
                devices: {
                  maxItems: 500,
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 160
                      },
                      kind: {
                        default: 'server',
                        type: 'string',
                        minLength: 1,
                        maxLength: 80
                      },
                      host: {
                        default: '',
                        type: 'string',
                        maxLength: 500
                      },
                      os: {
                        default: '',
                        type: 'string',
                        maxLength: 500
                      },
                      cpu: {
                        default: '',
                        type: 'string',
                        maxLength: 500
                      },
                      gpu: {
                        default: '',
                        type: 'string',
                        maxLength: 500
                      },
                      ram_gb: {
                        default: null,
                        anyOf: [
                          {
                            type: 'number',
                            minimum: 0,
                            maximum: 1000000
                          },
                          {
                            type: 'null'
                          }
                        ]
                      },
                      storage: {
                        default: '',
                        type: 'string',
                        maxLength: 500
                      },
                      location: {
                        default: '',
                        type: 'string',
                        maxLength: 500
                      },
                      management_url: {
                        default: '',
                        type: 'string',
                        maxLength: 2048
                      },
                      glances_url: {
                        default: '',
                        type: 'string',
                        maxLength: 2048
                      },
                      notes: {
                        default: '',
                        type: 'string',
                        maxLength: 20000
                      },
                      tags: {
                        default: [],
                        maxItems: 50,
                        type: 'array',
                        items: {
                          type: 'string',
                          minLength: 1,
                          maxLength: 80
                        }
                      },
                      source_key: {
                        default: null,
                        anyOf: [
                          {
                            type: 'string',
                            minLength: 1,
                            maxLength: 200
                          },
                          {
                            type: 'null'
                          }
                        ]
                      },
                      id: {
                        type: 'string',
                        format: 'uuid',
                        pattern:
                          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                      }
                    },
                    required: [
                      'name',
                      'kind',
                      'host',
                      'os',
                      'cpu',
                      'gpu',
                      'ram_gb',
                      'storage',
                      'location',
                      'management_url',
                      'glances_url',
                      'notes',
                      'tags',
                      'source_key'
                    ],
                    additionalProperties: false
                  }
                },
                services: {
                  maxItems: 2000,
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 160
                      },
                      kind: {
                        default: 'service',
                        type: 'string',
                        enum: ['service', 'game', 'link']
                      },
                      category: {
                        default: '',
                        type: 'string',
                        maxLength: 120
                      },
                      device_id: {
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
                      url: {
                        default: '',
                        type: 'string',
                        maxLength: 2048
                      },
                      address: {
                        default: '',
                        type: 'string',
                        maxLength: 500
                      },
                      description: {
                        default: '',
                        type: 'string',
                        maxLength: 3000
                      },
                      notes: {
                        default: '',
                        type: 'string',
                        maxLength: 20000
                      },
                      tags: {
                        default: [],
                        maxItems: 50,
                        type: 'array',
                        items: {
                          type: 'string',
                          minLength: 1,
                          maxLength: 80
                        }
                      },
                      monitor_kind: {
                        default: 'none',
                        type: 'string',
                        enum: ['none', 'http', 'tcp', 'minecraft']
                      },
                      monitor_target: {
                        default: '',
                        type: 'string',
                        maxLength: 2048
                      },
                      monitor_port: {
                        default: null,
                        anyOf: [
                          {
                            type: 'integer',
                            minimum: 1,
                            maximum: 65535
                          },
                          {
                            type: 'null'
                          }
                        ]
                      },
                      monitor_enabled: {
                        default: false,
                        type: 'boolean'
                      },
                      monitor_interval_seconds: {
                        default: 300,
                        type: 'integer',
                        minimum: 60,
                        maximum: 86400
                      },
                      source_key: {
                        default: null,
                        anyOf: [
                          {
                            type: 'string',
                            minLength: 1,
                            maxLength: 200
                          },
                          {
                            type: 'null'
                          }
                        ]
                      },
                      device_source_key: {
                        anyOf: [
                          {
                            type: 'string',
                            maxLength: 200
                          },
                          {
                            type: 'null'
                          }
                        ]
                      }
                    },
                    required: [
                      'name',
                      'kind',
                      'category',
                      'device_id',
                      'url',
                      'address',
                      'description',
                      'notes',
                      'tags',
                      'monitor_kind',
                      'monitor_target',
                      'monitor_port',
                      'monitor_enabled',
                      'monitor_interval_seconds',
                      'source_key'
                    ],
                    additionalProperties: false
                  }
                }
              },
              required: ['devices', 'services'],
              additionalProperties: false
            }
          },
          required: ['data'],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            created: {
              type: 'object',
              properties: {
                devices: {
                  type: 'integer',
                  minimum: -9007199254740991,
                  maximum: 9007199254740991
                },
                services: {
                  type: 'integer',
                  minimum: -9007199254740991,
                  maximum: 9007199254740991
                }
              },
              required: ['devices', 'services'],
              additionalProperties: false
            },
            skipped: {
              type: 'object',
              properties: {
                devices: {
                  type: 'integer',
                  minimum: -9007199254740991,
                  maximum: 9007199254740991
                },
                services: {
                  type: 'integer',
                  minimum: -9007199254740991,
                  maximum: 9007199254740991
                }
              },
              required: ['devices', 'services'],
              additionalProperties: false
            },
            warnings: {
              type: 'array',
              items: {
                type: 'string'
              }
            }
          },
          required: ['created', 'skipped', 'warnings'],
          additionalProperties: false
        }
      }
    }
  },
  services: {
    save: {
      method: 'post',
      description:
        'Create or update an owned service and its explicit monitor configuration',
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
            kind: {
              default: 'service',
              type: 'string',
              enum: ['service', 'game', 'link']
            },
            category: {
              default: '',
              type: 'string',
              maxLength: 120
            },
            device_id: {
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
            url: {
              default: '',
              type: 'string',
              maxLength: 2048
            },
            address: {
              default: '',
              type: 'string',
              maxLength: 500
            },
            description: {
              default: '',
              type: 'string',
              maxLength: 3000
            },
            notes: {
              default: '',
              type: 'string',
              maxLength: 20000
            },
            tags: {
              default: [],
              maxItems: 50,
              type: 'array',
              items: {
                type: 'string',
                minLength: 1,
                maxLength: 80
              }
            },
            monitor_kind: {
              default: 'none',
              type: 'string',
              enum: ['none', 'http', 'tcp', 'minecraft']
            },
            monitor_target: {
              default: '',
              type: 'string',
              maxLength: 2048
            },
            monitor_port: {
              default: null,
              anyOf: [
                {
                  type: 'integer',
                  minimum: 1,
                  maximum: 65535
                },
                {
                  type: 'null'
                }
              ]
            },
            monitor_enabled: {
              default: false,
              type: 'boolean'
            },
            monitor_interval_seconds: {
              default: 300,
              type: 'integer',
              minimum: 60,
              maximum: 86400
            },
            source_key: {
              default: null,
              anyOf: [
                {
                  type: 'string',
                  minLength: 1,
                  maxLength: 200
                },
                {
                  type: 'null'
                }
              ]
            },
            id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            expected_updated: {
              type: 'string',
              format: 'date-time',
              pattern:
                '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$'
            }
          },
          required: [
            'name',
            'kind',
            'category',
            'device_id',
            'url',
            'address',
            'description',
            'notes',
            'tags',
            'monitor_kind',
            'monitor_target',
            'monitor_port',
            'monitor_enabled',
            'monitor_interval_seconds',
            'source_key'
          ],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 160
            },
            kind: {
              default: 'service',
              type: 'string',
              enum: ['service', 'game', 'link']
            },
            category: {
              default: '',
              type: 'string',
              maxLength: 120
            },
            device_id: {
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
            url: {
              default: '',
              type: 'string',
              maxLength: 2048
            },
            address: {
              default: '',
              type: 'string',
              maxLength: 500
            },
            description: {
              default: '',
              type: 'string',
              maxLength: 3000
            },
            notes: {
              default: '',
              type: 'string',
              maxLength: 20000
            },
            tags: {
              default: [],
              maxItems: 50,
              type: 'array',
              items: {
                type: 'string',
                minLength: 1,
                maxLength: 80
              }
            },
            monitor_kind: {
              default: 'none',
              type: 'string',
              enum: ['none', 'http', 'tcp', 'minecraft']
            },
            monitor_target: {
              default: '',
              type: 'string',
              maxLength: 2048
            },
            monitor_port: {
              default: null,
              anyOf: [
                {
                  type: 'integer',
                  minimum: 1,
                  maximum: 65535
                },
                {
                  type: 'null'
                }
              ]
            },
            monitor_enabled: {
              default: false,
              type: 'boolean'
            },
            monitor_interval_seconds: {
              default: 300,
              type: 'integer',
              minimum: 60,
              maximum: 86400
            },
            source_key: {
              default: null,
              anyOf: [
                {
                  type: 'string',
                  minLength: 1,
                  maxLength: 200
                },
                {
                  type: 'null'
                }
              ]
            },
            id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            created: {
              type: 'string',
              format: 'date-time',
              pattern:
                '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$'
            },
            updated: {
              type: 'string',
              format: 'date-time',
              pattern:
                '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$'
            },
            monitor_revision: {
              type: 'integer',
              exclusiveMinimum: 0,
              maximum: 9007199254740991
            }
          },
          required: [
            'name',
            'kind',
            'category',
            'device_id',
            'url',
            'address',
            'description',
            'notes',
            'tags',
            'monitor_kind',
            'monitor_target',
            'monitor_port',
            'monitor_enabled',
            'monitor_interval_seconds',
            'source_key',
            'id',
            'created',
            'updated',
            'monitor_revision'
          ],
          additionalProperties: false
        }
      }
    },
    delete: {
      method: 'post',
      description:
        'Delete an owned service while retaining its historical check snapshots',
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
            expected_updated: {
              type: 'string',
              format: 'date-time',
              pattern:
                '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$'
            }
          },
          required: ['id', 'expected_updated'],
          additionalProperties: false
        }
      },
      output: {
        NO_CONTENT: true
      }
    }
  },
  settings: {
    get: {
      method: 'get',
      description: 'Read your Tech Lab settings',
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
            auto_refresh_seconds: {
              default: 30,
              type: 'integer',
              minimum: 15,
              maximum: 300
            },
            stale_after_multiplier: {
              default: 3,
              type: 'integer',
              minimum: 2,
              maximum: 10
            },
            history_retention_days: {
              default: 30,
              type: 'integer',
              minimum: 7,
              maximum: 90
            },
            updated: {
              type: 'string',
              format: 'date-time',
              pattern:
                '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$'
            }
          },
          required: [
            'auto_refresh_seconds',
            'stale_after_multiplier',
            'history_retention_days',
            'updated'
          ],
          additionalProperties: false
        }
      }
    },
    save: {
      method: 'post',
      description: 'Save Tech Lab settings with a stale-edit guard',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            auto_refresh_seconds: {
              default: 30,
              type: 'integer',
              minimum: 15,
              maximum: 300
            },
            stale_after_multiplier: {
              default: 3,
              type: 'integer',
              minimum: 2,
              maximum: 10
            },
            history_retention_days: {
              default: 30,
              type: 'integer',
              minimum: 7,
              maximum: 90
            },
            expected_updated: {
              type: 'string',
              format: 'date-time',
              pattern:
                '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$'
            }
          },
          required: [
            'auto_refresh_seconds',
            'stale_after_multiplier',
            'history_retention_days'
          ],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            auto_refresh_seconds: {
              default: 30,
              type: 'integer',
              minimum: 15,
              maximum: 300
            },
            stale_after_multiplier: {
              default: 3,
              type: 'integer',
              minimum: 2,
              maximum: 10
            },
            history_retention_days: {
              default: 30,
              type: 'integer',
              minimum: 7,
              maximum: 90
            },
            updated: {
              type: 'string',
              format: 'date-time',
              pattern:
                '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$'
            }
          },
          required: [
            'auto_refresh_seconds',
            'stale_after_multiplier',
            'history_retention_days',
            'updated'
          ],
          additionalProperties: false
        }
      }
    }
  },
  snapshot: {
    method: 'get',
    description: 'Read your devices, services and observed monitor health',
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
          devices: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 160
                },
                kind: {
                  default: 'server',
                  type: 'string',
                  minLength: 1,
                  maxLength: 80
                },
                host: {
                  default: '',
                  type: 'string',
                  maxLength: 500
                },
                os: {
                  default: '',
                  type: 'string',
                  maxLength: 500
                },
                cpu: {
                  default: '',
                  type: 'string',
                  maxLength: 500
                },
                gpu: {
                  default: '',
                  type: 'string',
                  maxLength: 500
                },
                ram_gb: {
                  default: null,
                  anyOf: [
                    {
                      type: 'number',
                      minimum: 0,
                      maximum: 1000000
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                storage: {
                  default: '',
                  type: 'string',
                  maxLength: 500
                },
                location: {
                  default: '',
                  type: 'string',
                  maxLength: 500
                },
                management_url: {
                  default: '',
                  type: 'string',
                  maxLength: 2048
                },
                glances_url: {
                  default: '',
                  type: 'string',
                  maxLength: 2048
                },
                notes: {
                  default: '',
                  type: 'string',
                  maxLength: 20000
                },
                tags: {
                  default: [],
                  maxItems: 50,
                  type: 'array',
                  items: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 80
                  }
                },
                source_key: {
                  default: null,
                  anyOf: [
                    {
                      type: 'string',
                      minLength: 1,
                      maxLength: 200
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                created: {
                  type: 'string',
                  format: 'date-time',
                  pattern:
                    '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$'
                },
                updated: {
                  type: 'string',
                  format: 'date-time',
                  pattern:
                    '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$'
                }
              },
              required: [
                'name',
                'kind',
                'host',
                'os',
                'cpu',
                'gpu',
                'ram_gb',
                'storage',
                'location',
                'management_url',
                'glances_url',
                'notes',
                'tags',
                'source_key',
                'id',
                'created',
                'updated'
              ],
              additionalProperties: false
            }
          },
          services: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 160
                },
                kind: {
                  default: 'service',
                  type: 'string',
                  enum: ['service', 'game', 'link']
                },
                category: {
                  default: '',
                  type: 'string',
                  maxLength: 120
                },
                device_id: {
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
                url: {
                  default: '',
                  type: 'string',
                  maxLength: 2048
                },
                address: {
                  default: '',
                  type: 'string',
                  maxLength: 500
                },
                description: {
                  default: '',
                  type: 'string',
                  maxLength: 3000
                },
                notes: {
                  default: '',
                  type: 'string',
                  maxLength: 20000
                },
                tags: {
                  default: [],
                  maxItems: 50,
                  type: 'array',
                  items: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 80
                  }
                },
                monitor_kind: {
                  default: 'none',
                  type: 'string',
                  enum: ['none', 'http', 'tcp', 'minecraft']
                },
                monitor_target: {
                  default: '',
                  type: 'string',
                  maxLength: 2048
                },
                monitor_port: {
                  default: null,
                  anyOf: [
                    {
                      type: 'integer',
                      minimum: 1,
                      maximum: 65535
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                monitor_enabled: {
                  default: false,
                  type: 'boolean'
                },
                monitor_interval_seconds: {
                  default: 300,
                  type: 'integer',
                  minimum: 60,
                  maximum: 86400
                },
                source_key: {
                  default: null,
                  anyOf: [
                    {
                      type: 'string',
                      minLength: 1,
                      maxLength: 200
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                created: {
                  type: 'string',
                  format: 'date-time',
                  pattern:
                    '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$'
                },
                updated: {
                  type: 'string',
                  format: 'date-time',
                  pattern:
                    '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$'
                },
                monitor_revision: {
                  type: 'integer',
                  exclusiveMinimum: 0,
                  maximum: 9007199254740991
                }
              },
              required: [
                'name',
                'kind',
                'category',
                'device_id',
                'url',
                'address',
                'description',
                'notes',
                'tags',
                'monitor_kind',
                'monitor_target',
                'monitor_port',
                'monitor_enabled',
                'monitor_interval_seconds',
                'source_key',
                'id',
                'created',
                'updated',
                'monitor_revision'
              ],
              additionalProperties: false
            }
          },
          health: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                service_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                status: {
                  type: 'string',
                  enum: ['unknown', 'disabled', 'stale', 'up', 'down', 'error']
                },
                latest: {
                  anyOf: [
                    {
                      type: 'object',
                      properties: {
                        status: {
                          type: 'string',
                          enum: ['up', 'down', 'error']
                        },
                        latency_ms: {
                          anyOf: [
                            {
                              type: 'number',
                              minimum: 0
                            },
                            {
                              type: 'null'
                            }
                          ]
                        },
                        http_status: {
                          anyOf: [
                            {
                              type: 'integer',
                              minimum: 100,
                              maximum: 599
                            },
                            {
                              type: 'null'
                            }
                          ]
                        },
                        message: {
                          type: 'string',
                          maxLength: 2000
                        },
                        details: {
                          type: 'object',
                          properties: {
                            players_online: {
                              type: 'integer',
                              minimum: 0,
                              maximum: 9007199254740991
                            },
                            players_max: {
                              type: 'integer',
                              minimum: 0,
                              maximum: 9007199254740991
                            },
                            version: {
                              type: 'string',
                              maxLength: 500
                            }
                          },
                          additionalProperties: false
                        },
                        id: {
                          type: 'string',
                          format: 'uuid',
                          pattern:
                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                        },
                        service_id: {
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
                        original_service_id: {
                          type: 'string',
                          format: 'uuid',
                          pattern:
                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                        },
                        service_name: {
                          type: 'string',
                          minLength: 1,
                          maxLength: 160
                        },
                        monitor_kind: {
                          type: 'string',
                          enum: ['none', 'http', 'tcp', 'minecraft']
                        },
                        monitor_target: {
                          type: 'string'
                        },
                        monitor_port: {
                          anyOf: [
                            {
                              type: 'integer',
                              minimum: -9007199254740991,
                              maximum: 9007199254740991
                            },
                            {
                              type: 'null'
                            }
                          ]
                        },
                        monitor_revision: {
                          type: 'integer',
                          exclusiveMinimum: 0,
                          maximum: 9007199254740991
                        },
                        checked_at: {
                          type: 'string',
                          format: 'date-time',
                          pattern:
                            '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$'
                        }
                      },
                      required: [
                        'status',
                        'latency_ms',
                        'http_status',
                        'message',
                        'id',
                        'service_id',
                        'original_service_id',
                        'service_name',
                        'monitor_kind',
                        'monitor_target',
                        'monitor_port',
                        'monitor_revision',
                        'checked_at'
                      ],
                      additionalProperties: false
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                observed_24h: {
                  type: 'object',
                  properties: {
                    up: {
                      type: 'integer',
                      minimum: 0,
                      maximum: 9007199254740991
                    },
                    down: {
                      type: 'integer',
                      minimum: 0,
                      maximum: 9007199254740991
                    },
                    error: {
                      type: 'integer',
                      minimum: 0,
                      maximum: 9007199254740991
                    },
                    total: {
                      type: 'integer',
                      minimum: 0,
                      maximum: 9007199254740991
                    },
                    up_percent: {
                      anyOf: [
                        {
                          type: 'number',
                          minimum: 0,
                          maximum: 100
                        },
                        {
                          type: 'null'
                        }
                      ]
                    }
                  },
                  required: ['up', 'down', 'error', 'total', 'up_percent'],
                  additionalProperties: false
                },
                next_check_at: {
                  anyOf: [
                    {
                      type: 'string',
                      format: 'date-time',
                      pattern:
                        '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$'
                    },
                    {
                      type: 'null'
                    }
                  ]
                }
              },
              required: [
                'service_id',
                'status',
                'latest',
                'observed_24h',
                'next_check_at'
              ],
              additionalProperties: false
            }
          },
          settings: {
            type: 'object',
            properties: {
              auto_refresh_seconds: {
                default: 30,
                type: 'integer',
                minimum: 15,
                maximum: 300
              },
              stale_after_multiplier: {
                default: 3,
                type: 'integer',
                minimum: 2,
                maximum: 10
              },
              history_retention_days: {
                default: 30,
                type: 'integer',
                minimum: 7,
                maximum: 90
              },
              updated: {
                type: 'string',
                format: 'date-time',
                pattern:
                  '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$'
              }
            },
            required: [
              'auto_refresh_seconds',
              'stale_after_multiplier',
              'history_retention_days',
              'updated'
            ],
            additionalProperties: false
          },
          checked_at: {
            type: 'string',
            format: 'date-time',
            pattern:
              '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$'
          }
        },
        required: ['devices', 'services', 'health', 'settings', 'checked_at'],
        additionalProperties: false
      }
    }
  }
} as const

export default contract
