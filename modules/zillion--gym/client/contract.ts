export const contract = {
  archiveExercise: {
    method: 'post',
    description: 'Archive or restore an exercise without deleting its history',
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
            exclusiveMinimum: 0,
            maximum: 9007199254740991
          },
          archived: {
            default: true,
            type: 'boolean'
          }
        },
        required: ['expected_revision', 'archived'],
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
          mode: {
            default: 'reps',
            type: 'string',
            enum: ['reps', 'time', 'cardio']
          },
          muscle_group: {
            type: 'string',
            enum: [
              'chest',
              'back',
              'shoulders',
              'biceps',
              'triceps',
              'forearms',
              'quadriceps',
              'hamstrings',
              'glutes',
              'calves',
              'core',
              'cardio',
              'full-body'
            ]
          },
          secondary_muscles: {
            default: [],
            maxItems: 12,
            type: 'array',
            items: {
              type: 'string',
              enum: [
                'chest',
                'back',
                'shoulders',
                'biceps',
                'triceps',
                'forearms',
                'quadriceps',
                'hamstrings',
                'glutes',
                'calves',
                'core',
                'cardio',
                'full-body'
              ]
            }
          },
          equipment: {
            default: '',
            type: 'string',
            maxLength: 100
          },
          instructions: {
            default: '',
            type: 'string',
            maxLength: 10000
          },
          id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          },
          custom: {
            type: 'boolean'
          },
          archived: {
            type: 'boolean'
          },
          catalog_key: {
            anyOf: [
              {
                type: 'string'
              },
              {
                type: 'null'
              }
            ]
          },
          revision: {
            type: 'integer',
            exclusiveMinimum: 0,
            maximum: 9007199254740991
          }
        },
        required: [
          'name',
          'mode',
          'muscle_group',
          'secondary_muscles',
          'equipment',
          'instructions',
          'id',
          'custom',
          'archived',
          'catalog_key',
          'revision'
        ],
        additionalProperties: false
      }
    }
  },
  archiveRoutine: {
    method: 'post',
    description:
      'Archive or restore a routine while preserving finished workouts',
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
            exclusiveMinimum: 0,
            maximum: 9007199254740991
          },
          archived: {
            default: true,
            type: 'boolean'
          }
        },
        required: ['expected_revision', 'archived'],
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
          notes: {
            default: '',
            type: 'string',
            maxLength: 10000
          },
          progression: {
            default: 'linear',
            type: 'string',
            enum: ['off', 'linear', 'greyskull', 'double', 'time']
          },
          entries: {
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
                exercise_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                superset_group: {
                  default: null,
                  anyOf: [
                    {
                      type: 'string',
                      minLength: 1,
                      maxLength: 100
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                prescription: {
                  type: 'object',
                  properties: {
                    mode: {
                      default: 'reps',
                      type: 'string',
                      enum: ['reps', 'time', 'cardio']
                    },
                    sets: {
                      default: 3,
                      type: 'integer',
                      minimum: 1,
                      maximum: 50
                    },
                    reps: {
                      default: 10,
                      type: 'integer',
                      minimum: 1,
                      maximum: 1000
                    },
                    reps_min: {
                      default: 8,
                      type: 'integer',
                      minimum: 1,
                      maximum: 1000
                    },
                    weight_kg: {
                      default: 0,
                      type: 'number',
                      minimum: 0,
                      maximum: 10000
                    },
                    seconds: {
                      default: 45,
                      type: 'number',
                      minimum: 0,
                      maximum: 86400
                    },
                    minutes: {
                      default: 20,
                      type: 'number',
                      minimum: 0,
                      maximum: 1440
                    },
                    speed_kmh: {
                      default: 8,
                      type: 'number',
                      minimum: 0,
                      maximum: 200
                    },
                    rest_seconds: {
                      default: 90,
                      type: 'integer',
                      minimum: 0,
                      maximum: 3600
                    },
                    progression: {
                      default: null,
                      anyOf: [
                        {
                          type: 'string',
                          enum: ['off', 'linear', 'greyskull', 'double', 'time']
                        },
                        {
                          type: 'null'
                        }
                      ]
                    },
                    increment: {
                      default: null,
                      anyOf: [
                        {
                          type: 'number',
                          exclusiveMinimum: 0,
                          maximum: 1000
                        },
                        {
                          type: 'null'
                        }
                      ]
                    }
                  },
                  required: [
                    'mode',
                    'sets',
                    'reps',
                    'reps_min',
                    'weight_kg',
                    'seconds',
                    'minutes',
                    'speed_kmh',
                    'rest_seconds',
                    'progression',
                    'increment'
                  ],
                  additionalProperties: false
                },
                position: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 9007199254740991
                }
              },
              required: [
                'id',
                'exercise_id',
                'superset_group',
                'prescription',
                'position'
              ],
              additionalProperties: false
            }
          },
          id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          },
          revision: {
            type: 'integer',
            exclusiveMinimum: 0,
            maximum: 9007199254740991
          },
          archived: {
            type: 'boolean'
          }
        },
        required: [
          'name',
          'notes',
          'progression',
          'entries',
          'id',
          'revision',
          'archived'
        ],
        additionalProperties: false
      }
    }
  },
  completeWorkTimer: {
    method: 'post',
    description:
      'Stop a persisted work timer and record actual elapsed seconds once',
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
          command_id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          },
          expected_revision: {
            type: 'integer',
            exclusiveMinimum: 0,
            maximum: 9007199254740991
          }
        },
        required: ['command_id', 'expected_revision'],
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
          routine_id: {
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
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 160
          },
          date: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}-\\d{2}$'
          },
          status: {
            type: 'string',
            enum: ['active', 'completed', 'discarded']
          },
          started_at: {
            type: 'string',
            format: 'date-time',
            pattern:
              '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$'
          },
          finished_at: {
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
          notes: {
            type: 'string'
          },
          bodyweight_kg: {
            anyOf: [
              {
                type: 'number',
                exclusiveMinimum: 0
              },
              {
                type: 'null'
              }
            ]
          },
          revision: {
            type: 'integer',
            exclusiveMinimum: 0,
            maximum: 9007199254740991
          },
          current_entry_id: {
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
          rest_until: {
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
          work_timer: {
            default: null,
            anyOf: [
              {
                type: 'object',
                properties: {
                  entry_id: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  set_id: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  started_at: {
                    type: 'string',
                    format: 'date-time',
                    pattern:
                      '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$'
                  },
                  target_seconds: {
                    type: 'integer',
                    exclusiveMinimum: 0,
                    maximum: 86400
                  }
                },
                required: [
                  'entry_id',
                  'set_id',
                  'started_at',
                  'target_seconds'
                ],
                additionalProperties: false
              },
              {
                type: 'null'
              }
            ]
          },
          entries: {
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
                exercise_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                superset_group: {
                  default: null,
                  anyOf: [
                    {
                      type: 'string',
                      minLength: 1,
                      maxLength: 100
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                target: {
                  type: 'object',
                  properties: {
                    mode: {
                      default: 'reps',
                      type: 'string',
                      enum: ['reps', 'time', 'cardio']
                    },
                    sets: {
                      default: 3,
                      type: 'integer',
                      minimum: 1,
                      maximum: 50
                    },
                    reps: {
                      default: 10,
                      type: 'integer',
                      minimum: 1,
                      maximum: 1000
                    },
                    reps_min: {
                      default: 8,
                      type: 'integer',
                      minimum: 1,
                      maximum: 1000
                    },
                    weight_kg: {
                      default: 0,
                      type: 'number',
                      minimum: 0,
                      maximum: 10000
                    },
                    seconds: {
                      default: 45,
                      type: 'number',
                      minimum: 0,
                      maximum: 86400
                    },
                    minutes: {
                      default: 20,
                      type: 'number',
                      minimum: 0,
                      maximum: 1440
                    },
                    speed_kmh: {
                      default: 8,
                      type: 'number',
                      minimum: 0,
                      maximum: 200
                    },
                    rest_seconds: {
                      default: 90,
                      type: 'integer',
                      minimum: 0,
                      maximum: 3600
                    },
                    progression: {
                      default: null,
                      anyOf: [
                        {
                          type: 'string',
                          enum: ['off', 'linear', 'greyskull', 'double', 'time']
                        },
                        {
                          type: 'null'
                        }
                      ]
                    },
                    increment: {
                      default: null,
                      anyOf: [
                        {
                          type: 'number',
                          exclusiveMinimum: 0,
                          maximum: 1000
                        },
                        {
                          type: 'null'
                        }
                      ]
                    }
                  },
                  required: [
                    'mode',
                    'sets',
                    'reps',
                    'reps_min',
                    'weight_kg',
                    'seconds',
                    'minutes',
                    'speed_kmh',
                    'rest_seconds',
                    'progression',
                    'increment'
                  ],
                  additionalProperties: false
                },
                sets: {
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
                      weight_kg: {
                        default: 0,
                        type: 'number',
                        minimum: 0,
                        maximum: 10000
                      },
                      reps: {
                        default: 0,
                        type: 'integer',
                        minimum: 0,
                        maximum: 1000
                      },
                      seconds: {
                        default: 0,
                        type: 'number',
                        minimum: 0,
                        maximum: 86400
                      },
                      minutes: {
                        default: 0,
                        type: 'number',
                        minimum: 0,
                        maximum: 1440
                      },
                      speed_kmh: {
                        default: 0,
                        type: 'number',
                        minimum: 0,
                        maximum: 200
                      },
                      done: {
                        default: false,
                        type: 'boolean'
                      },
                      rir: {
                        default: null,
                        anyOf: [
                          {
                            type: 'number',
                            minimum: 0,
                            maximum: 10
                          },
                          {
                            type: 'null'
                          }
                        ]
                      },
                      rpe: {
                        default: null,
                        anyOf: [
                          {
                            type: 'number',
                            minimum: 0,
                            maximum: 10
                          },
                          {
                            type: 'null'
                          }
                        ]
                      },
                      position: {
                        type: 'integer',
                        minimum: 0,
                        maximum: 9007199254740991
                      }
                    },
                    required: [
                      'id',
                      'weight_kg',
                      'reps',
                      'seconds',
                      'minutes',
                      'speed_kmh',
                      'done',
                      'rir',
                      'rpe',
                      'position'
                    ],
                    additionalProperties: false
                  }
                },
                position: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 9007199254740991
                },
                exercise: {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string',
                      minLength: 1,
                      maxLength: 160
                    },
                    mode: {
                      default: 'reps',
                      type: 'string',
                      enum: ['reps', 'time', 'cardio']
                    },
                    muscle_group: {
                      type: 'string',
                      enum: [
                        'chest',
                        'back',
                        'shoulders',
                        'biceps',
                        'triceps',
                        'forearms',
                        'quadriceps',
                        'hamstrings',
                        'glutes',
                        'calves',
                        'core',
                        'cardio',
                        'full-body'
                      ]
                    },
                    secondary_muscles: {
                      default: [],
                      maxItems: 12,
                      type: 'array',
                      items: {
                        type: 'string',
                        enum: [
                          'chest',
                          'back',
                          'shoulders',
                          'biceps',
                          'triceps',
                          'forearms',
                          'quadriceps',
                          'hamstrings',
                          'glutes',
                          'calves',
                          'core',
                          'cardio',
                          'full-body'
                        ]
                      }
                    },
                    equipment: {
                      default: '',
                      type: 'string',
                      maxLength: 100
                    },
                    instructions: {
                      default: '',
                      type: 'string',
                      maxLength: 10000
                    }
                  },
                  required: [
                    'name',
                    'mode',
                    'muscle_group',
                    'secondary_muscles',
                    'equipment',
                    'instructions'
                  ],
                  additionalProperties: false
                },
                suggestion: {
                  type: 'object',
                  properties: {
                    policy: {
                      type: 'string',
                      enum: ['off', 'linear', 'greyskull', 'double', 'time']
                    },
                    kind: {
                      type: 'string',
                      enum: ['off', 'first', 'up', 'hold', 'deload']
                    },
                    reason: {
                      type: 'string',
                      enum: [
                        'disabled',
                        'baseline',
                        'success',
                        'bodyweight-success',
                        'bodyweight-hold',
                        'amrap-double',
                        'miss',
                        'stalled',
                        'rep-range'
                      ]
                    },
                    weight_kg: {
                      type: 'number',
                      minimum: 0,
                      maximum: 10000
                    },
                    reps: {
                      type: 'integer',
                      exclusiveMinimum: 0,
                      maximum: 9007199254740991
                    },
                    seconds: {
                      type: 'number',
                      minimum: 0,
                      maximum: 86400
                    },
                    misses: {
                      default: 0,
                      type: 'integer',
                      minimum: 0,
                      maximum: 9007199254740991
                    }
                  },
                  required: ['policy', 'kind', 'reason', 'misses'],
                  additionalProperties: false
                }
              },
              required: [
                'id',
                'exercise_id',
                'superset_group',
                'target',
                'sets',
                'position',
                'exercise',
                'suggestion'
              ],
              additionalProperties: false
            }
          }
        },
        required: [
          'id',
          'routine_id',
          'name',
          'date',
          'status',
          'started_at',
          'finished_at',
          'notes',
          'bodyweight_kg',
          'revision',
          'current_entry_id',
          'rest_until',
          'work_timer',
          'entries'
        ],
        additionalProperties: false
      }
    }
  },
  createExercise: {
    method: 'post',
    description: 'Create an owned custom exercise',
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
          mode: {
            default: 'reps',
            type: 'string',
            enum: ['reps', 'time', 'cardio']
          },
          muscle_group: {
            type: 'string',
            enum: [
              'chest',
              'back',
              'shoulders',
              'biceps',
              'triceps',
              'forearms',
              'quadriceps',
              'hamstrings',
              'glutes',
              'calves',
              'core',
              'cardio',
              'full-body'
            ]
          },
          secondary_muscles: {
            default: [],
            maxItems: 12,
            type: 'array',
            items: {
              type: 'string',
              enum: [
                'chest',
                'back',
                'shoulders',
                'biceps',
                'triceps',
                'forearms',
                'quadriceps',
                'hamstrings',
                'glutes',
                'calves',
                'core',
                'cardio',
                'full-body'
              ]
            }
          },
          equipment: {
            default: '',
            type: 'string',
            maxLength: 100
          },
          instructions: {
            default: '',
            type: 'string',
            maxLength: 10000
          }
        },
        required: [
          'name',
          'mode',
          'muscle_group',
          'secondary_muscles',
          'equipment',
          'instructions'
        ],
        additionalProperties: false
      }
    },
    output: {
      CREATED: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 160
          },
          mode: {
            default: 'reps',
            type: 'string',
            enum: ['reps', 'time', 'cardio']
          },
          muscle_group: {
            type: 'string',
            enum: [
              'chest',
              'back',
              'shoulders',
              'biceps',
              'triceps',
              'forearms',
              'quadriceps',
              'hamstrings',
              'glutes',
              'calves',
              'core',
              'cardio',
              'full-body'
            ]
          },
          secondary_muscles: {
            default: [],
            maxItems: 12,
            type: 'array',
            items: {
              type: 'string',
              enum: [
                'chest',
                'back',
                'shoulders',
                'biceps',
                'triceps',
                'forearms',
                'quadriceps',
                'hamstrings',
                'glutes',
                'calves',
                'core',
                'cardio',
                'full-body'
              ]
            }
          },
          equipment: {
            default: '',
            type: 'string',
            maxLength: 100
          },
          instructions: {
            default: '',
            type: 'string',
            maxLength: 10000
          },
          id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          },
          custom: {
            type: 'boolean'
          },
          archived: {
            type: 'boolean'
          },
          catalog_key: {
            anyOf: [
              {
                type: 'string'
              },
              {
                type: 'null'
              }
            ]
          },
          revision: {
            type: 'integer',
            exclusiveMinimum: 0,
            maximum: 9007199254740991
          }
        },
        required: [
          'name',
          'mode',
          'muscle_group',
          'secondary_muscles',
          'equipment',
          'instructions',
          'id',
          'custom',
          'archived',
          'catalog_key',
          'revision'
        ],
        additionalProperties: false
      }
    }
  },
  createRoutine: {
    method: 'post',
    description: 'Create a routine with ordered exercises and prescriptions',
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
          notes: {
            default: '',
            type: 'string',
            maxLength: 10000
          },
          progression: {
            default: 'linear',
            type: 'string',
            enum: ['off', 'linear', 'greyskull', 'double', 'time']
          },
          entries: {
            default: [],
            maxItems: 100,
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
                exercise_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                superset_group: {
                  default: null,
                  anyOf: [
                    {
                      type: 'string',
                      minLength: 1,
                      maxLength: 100
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                prescription: {
                  type: 'object',
                  properties: {
                    mode: {
                      default: 'reps',
                      type: 'string',
                      enum: ['reps', 'time', 'cardio']
                    },
                    sets: {
                      default: 3,
                      type: 'integer',
                      minimum: 1,
                      maximum: 50
                    },
                    reps: {
                      default: 10,
                      type: 'integer',
                      minimum: 1,
                      maximum: 1000
                    },
                    reps_min: {
                      default: 8,
                      type: 'integer',
                      minimum: 1,
                      maximum: 1000
                    },
                    weight_kg: {
                      default: 0,
                      type: 'number',
                      minimum: 0,
                      maximum: 10000
                    },
                    seconds: {
                      default: 45,
                      type: 'number',
                      minimum: 0,
                      maximum: 86400
                    },
                    minutes: {
                      default: 20,
                      type: 'number',
                      minimum: 0,
                      maximum: 1440
                    },
                    speed_kmh: {
                      default: 8,
                      type: 'number',
                      minimum: 0,
                      maximum: 200
                    },
                    rest_seconds: {
                      default: 90,
                      type: 'integer',
                      minimum: 0,
                      maximum: 3600
                    },
                    progression: {
                      default: null,
                      anyOf: [
                        {
                          type: 'string',
                          enum: ['off', 'linear', 'greyskull', 'double', 'time']
                        },
                        {
                          type: 'null'
                        }
                      ]
                    },
                    increment: {
                      default: null,
                      anyOf: [
                        {
                          type: 'number',
                          exclusiveMinimum: 0,
                          maximum: 1000
                        },
                        {
                          type: 'null'
                        }
                      ]
                    }
                  },
                  required: [
                    'mode',
                    'sets',
                    'reps',
                    'reps_min',
                    'weight_kg',
                    'seconds',
                    'minutes',
                    'speed_kmh',
                    'rest_seconds',
                    'progression',
                    'increment'
                  ],
                  additionalProperties: false
                }
              },
              required: ['id', 'exercise_id', 'superset_group', 'prescription'],
              additionalProperties: false
            }
          }
        },
        required: ['name', 'notes', 'progression', 'entries'],
        additionalProperties: false
      }
    },
    output: {
      CREATED: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 160
          },
          notes: {
            default: '',
            type: 'string',
            maxLength: 10000
          },
          progression: {
            default: 'linear',
            type: 'string',
            enum: ['off', 'linear', 'greyskull', 'double', 'time']
          },
          entries: {
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
                exercise_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                superset_group: {
                  default: null,
                  anyOf: [
                    {
                      type: 'string',
                      minLength: 1,
                      maxLength: 100
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                prescription: {
                  type: 'object',
                  properties: {
                    mode: {
                      default: 'reps',
                      type: 'string',
                      enum: ['reps', 'time', 'cardio']
                    },
                    sets: {
                      default: 3,
                      type: 'integer',
                      minimum: 1,
                      maximum: 50
                    },
                    reps: {
                      default: 10,
                      type: 'integer',
                      minimum: 1,
                      maximum: 1000
                    },
                    reps_min: {
                      default: 8,
                      type: 'integer',
                      minimum: 1,
                      maximum: 1000
                    },
                    weight_kg: {
                      default: 0,
                      type: 'number',
                      minimum: 0,
                      maximum: 10000
                    },
                    seconds: {
                      default: 45,
                      type: 'number',
                      minimum: 0,
                      maximum: 86400
                    },
                    minutes: {
                      default: 20,
                      type: 'number',
                      minimum: 0,
                      maximum: 1440
                    },
                    speed_kmh: {
                      default: 8,
                      type: 'number',
                      minimum: 0,
                      maximum: 200
                    },
                    rest_seconds: {
                      default: 90,
                      type: 'integer',
                      minimum: 0,
                      maximum: 3600
                    },
                    progression: {
                      default: null,
                      anyOf: [
                        {
                          type: 'string',
                          enum: ['off', 'linear', 'greyskull', 'double', 'time']
                        },
                        {
                          type: 'null'
                        }
                      ]
                    },
                    increment: {
                      default: null,
                      anyOf: [
                        {
                          type: 'number',
                          exclusiveMinimum: 0,
                          maximum: 1000
                        },
                        {
                          type: 'null'
                        }
                      ]
                    }
                  },
                  required: [
                    'mode',
                    'sets',
                    'reps',
                    'reps_min',
                    'weight_kg',
                    'seconds',
                    'minutes',
                    'speed_kmh',
                    'rest_seconds',
                    'progression',
                    'increment'
                  ],
                  additionalProperties: false
                },
                position: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 9007199254740991
                }
              },
              required: [
                'id',
                'exercise_id',
                'superset_group',
                'prescription',
                'position'
              ],
              additionalProperties: false
            }
          },
          id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          },
          revision: {
            type: 'integer',
            exclusiveMinimum: 0,
            maximum: 9007199254740991
          },
          archived: {
            type: 'boolean'
          }
        },
        required: [
          'name',
          'notes',
          'progression',
          'entries',
          'id',
          'revision',
          'archived'
        ],
        additionalProperties: false
      }
    }
  },
  deleteWorkout: {
    method: 'post',
    description:
      'Remove a completed workout from history and derived statistics',
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
          command_id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          },
          expected_revision: {
            type: 'integer',
            exclusiveMinimum: 0,
            maximum: 9007199254740991
          }
        },
        required: ['command_id', 'expected_revision'],
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
          routine_id: {
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
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 160
          },
          date: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}-\\d{2}$'
          },
          status: {
            type: 'string',
            enum: ['active', 'completed', 'discarded']
          },
          started_at: {
            type: 'string',
            format: 'date-time',
            pattern:
              '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$'
          },
          finished_at: {
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
          notes: {
            type: 'string'
          },
          bodyweight_kg: {
            anyOf: [
              {
                type: 'number',
                exclusiveMinimum: 0
              },
              {
                type: 'null'
              }
            ]
          },
          revision: {
            type: 'integer',
            exclusiveMinimum: 0,
            maximum: 9007199254740991
          },
          current_entry_id: {
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
          rest_until: {
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
          work_timer: {
            default: null,
            anyOf: [
              {
                type: 'object',
                properties: {
                  entry_id: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  set_id: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  started_at: {
                    type: 'string',
                    format: 'date-time',
                    pattern:
                      '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$'
                  },
                  target_seconds: {
                    type: 'integer',
                    exclusiveMinimum: 0,
                    maximum: 86400
                  }
                },
                required: [
                  'entry_id',
                  'set_id',
                  'started_at',
                  'target_seconds'
                ],
                additionalProperties: false
              },
              {
                type: 'null'
              }
            ]
          },
          entries: {
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
                exercise_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                superset_group: {
                  default: null,
                  anyOf: [
                    {
                      type: 'string',
                      minLength: 1,
                      maxLength: 100
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                target: {
                  type: 'object',
                  properties: {
                    mode: {
                      default: 'reps',
                      type: 'string',
                      enum: ['reps', 'time', 'cardio']
                    },
                    sets: {
                      default: 3,
                      type: 'integer',
                      minimum: 1,
                      maximum: 50
                    },
                    reps: {
                      default: 10,
                      type: 'integer',
                      minimum: 1,
                      maximum: 1000
                    },
                    reps_min: {
                      default: 8,
                      type: 'integer',
                      minimum: 1,
                      maximum: 1000
                    },
                    weight_kg: {
                      default: 0,
                      type: 'number',
                      minimum: 0,
                      maximum: 10000
                    },
                    seconds: {
                      default: 45,
                      type: 'number',
                      minimum: 0,
                      maximum: 86400
                    },
                    minutes: {
                      default: 20,
                      type: 'number',
                      minimum: 0,
                      maximum: 1440
                    },
                    speed_kmh: {
                      default: 8,
                      type: 'number',
                      minimum: 0,
                      maximum: 200
                    },
                    rest_seconds: {
                      default: 90,
                      type: 'integer',
                      minimum: 0,
                      maximum: 3600
                    },
                    progression: {
                      default: null,
                      anyOf: [
                        {
                          type: 'string',
                          enum: ['off', 'linear', 'greyskull', 'double', 'time']
                        },
                        {
                          type: 'null'
                        }
                      ]
                    },
                    increment: {
                      default: null,
                      anyOf: [
                        {
                          type: 'number',
                          exclusiveMinimum: 0,
                          maximum: 1000
                        },
                        {
                          type: 'null'
                        }
                      ]
                    }
                  },
                  required: [
                    'mode',
                    'sets',
                    'reps',
                    'reps_min',
                    'weight_kg',
                    'seconds',
                    'minutes',
                    'speed_kmh',
                    'rest_seconds',
                    'progression',
                    'increment'
                  ],
                  additionalProperties: false
                },
                sets: {
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
                      weight_kg: {
                        default: 0,
                        type: 'number',
                        minimum: 0,
                        maximum: 10000
                      },
                      reps: {
                        default: 0,
                        type: 'integer',
                        minimum: 0,
                        maximum: 1000
                      },
                      seconds: {
                        default: 0,
                        type: 'number',
                        minimum: 0,
                        maximum: 86400
                      },
                      minutes: {
                        default: 0,
                        type: 'number',
                        minimum: 0,
                        maximum: 1440
                      },
                      speed_kmh: {
                        default: 0,
                        type: 'number',
                        minimum: 0,
                        maximum: 200
                      },
                      done: {
                        default: false,
                        type: 'boolean'
                      },
                      rir: {
                        default: null,
                        anyOf: [
                          {
                            type: 'number',
                            minimum: 0,
                            maximum: 10
                          },
                          {
                            type: 'null'
                          }
                        ]
                      },
                      rpe: {
                        default: null,
                        anyOf: [
                          {
                            type: 'number',
                            minimum: 0,
                            maximum: 10
                          },
                          {
                            type: 'null'
                          }
                        ]
                      },
                      position: {
                        type: 'integer',
                        minimum: 0,
                        maximum: 9007199254740991
                      }
                    },
                    required: [
                      'id',
                      'weight_kg',
                      'reps',
                      'seconds',
                      'minutes',
                      'speed_kmh',
                      'done',
                      'rir',
                      'rpe',
                      'position'
                    ],
                    additionalProperties: false
                  }
                },
                position: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 9007199254740991
                },
                exercise: {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string',
                      minLength: 1,
                      maxLength: 160
                    },
                    mode: {
                      default: 'reps',
                      type: 'string',
                      enum: ['reps', 'time', 'cardio']
                    },
                    muscle_group: {
                      type: 'string',
                      enum: [
                        'chest',
                        'back',
                        'shoulders',
                        'biceps',
                        'triceps',
                        'forearms',
                        'quadriceps',
                        'hamstrings',
                        'glutes',
                        'calves',
                        'core',
                        'cardio',
                        'full-body'
                      ]
                    },
                    secondary_muscles: {
                      default: [],
                      maxItems: 12,
                      type: 'array',
                      items: {
                        type: 'string',
                        enum: [
                          'chest',
                          'back',
                          'shoulders',
                          'biceps',
                          'triceps',
                          'forearms',
                          'quadriceps',
                          'hamstrings',
                          'glutes',
                          'calves',
                          'core',
                          'cardio',
                          'full-body'
                        ]
                      }
                    },
                    equipment: {
                      default: '',
                      type: 'string',
                      maxLength: 100
                    },
                    instructions: {
                      default: '',
                      type: 'string',
                      maxLength: 10000
                    }
                  },
                  required: [
                    'name',
                    'mode',
                    'muscle_group',
                    'secondary_muscles',
                    'equipment',
                    'instructions'
                  ],
                  additionalProperties: false
                },
                suggestion: {
                  type: 'object',
                  properties: {
                    policy: {
                      type: 'string',
                      enum: ['off', 'linear', 'greyskull', 'double', 'time']
                    },
                    kind: {
                      type: 'string',
                      enum: ['off', 'first', 'up', 'hold', 'deload']
                    },
                    reason: {
                      type: 'string',
                      enum: [
                        'disabled',
                        'baseline',
                        'success',
                        'bodyweight-success',
                        'bodyweight-hold',
                        'amrap-double',
                        'miss',
                        'stalled',
                        'rep-range'
                      ]
                    },
                    weight_kg: {
                      type: 'number',
                      minimum: 0,
                      maximum: 10000
                    },
                    reps: {
                      type: 'integer',
                      exclusiveMinimum: 0,
                      maximum: 9007199254740991
                    },
                    seconds: {
                      type: 'number',
                      minimum: 0,
                      maximum: 86400
                    },
                    misses: {
                      default: 0,
                      type: 'integer',
                      minimum: 0,
                      maximum: 9007199254740991
                    }
                  },
                  required: ['policy', 'kind', 'reason', 'misses'],
                  additionalProperties: false
                }
              },
              required: [
                'id',
                'exercise_id',
                'superset_group',
                'target',
                'sets',
                'position',
                'exercise',
                'suggestion'
              ],
              additionalProperties: false
            }
          }
        },
        required: [
          'id',
          'routine_id',
          'name',
          'date',
          'status',
          'started_at',
          'finished_at',
          'notes',
          'bodyweight_kg',
          'revision',
          'current_entry_id',
          'rest_until',
          'work_timer',
          'entries'
        ],
        additionalProperties: false
      }
    }
  },
  discardWorkout: {
    method: 'post',
    description: 'Discard an active session without affecting other history',
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
          command_id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          },
          expected_revision: {
            type: 'integer',
            exclusiveMinimum: 0,
            maximum: 9007199254740991
          }
        },
        required: ['command_id', 'expected_revision'],
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
          routine_id: {
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
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 160
          },
          date: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}-\\d{2}$'
          },
          status: {
            type: 'string',
            enum: ['active', 'completed', 'discarded']
          },
          started_at: {
            type: 'string',
            format: 'date-time',
            pattern:
              '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$'
          },
          finished_at: {
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
          notes: {
            type: 'string'
          },
          bodyweight_kg: {
            anyOf: [
              {
                type: 'number',
                exclusiveMinimum: 0
              },
              {
                type: 'null'
              }
            ]
          },
          revision: {
            type: 'integer',
            exclusiveMinimum: 0,
            maximum: 9007199254740991
          },
          current_entry_id: {
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
          rest_until: {
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
          work_timer: {
            default: null,
            anyOf: [
              {
                type: 'object',
                properties: {
                  entry_id: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  set_id: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  started_at: {
                    type: 'string',
                    format: 'date-time',
                    pattern:
                      '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$'
                  },
                  target_seconds: {
                    type: 'integer',
                    exclusiveMinimum: 0,
                    maximum: 86400
                  }
                },
                required: [
                  'entry_id',
                  'set_id',
                  'started_at',
                  'target_seconds'
                ],
                additionalProperties: false
              },
              {
                type: 'null'
              }
            ]
          },
          entries: {
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
                exercise_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                superset_group: {
                  default: null,
                  anyOf: [
                    {
                      type: 'string',
                      minLength: 1,
                      maxLength: 100
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                target: {
                  type: 'object',
                  properties: {
                    mode: {
                      default: 'reps',
                      type: 'string',
                      enum: ['reps', 'time', 'cardio']
                    },
                    sets: {
                      default: 3,
                      type: 'integer',
                      minimum: 1,
                      maximum: 50
                    },
                    reps: {
                      default: 10,
                      type: 'integer',
                      minimum: 1,
                      maximum: 1000
                    },
                    reps_min: {
                      default: 8,
                      type: 'integer',
                      minimum: 1,
                      maximum: 1000
                    },
                    weight_kg: {
                      default: 0,
                      type: 'number',
                      minimum: 0,
                      maximum: 10000
                    },
                    seconds: {
                      default: 45,
                      type: 'number',
                      minimum: 0,
                      maximum: 86400
                    },
                    minutes: {
                      default: 20,
                      type: 'number',
                      minimum: 0,
                      maximum: 1440
                    },
                    speed_kmh: {
                      default: 8,
                      type: 'number',
                      minimum: 0,
                      maximum: 200
                    },
                    rest_seconds: {
                      default: 90,
                      type: 'integer',
                      minimum: 0,
                      maximum: 3600
                    },
                    progression: {
                      default: null,
                      anyOf: [
                        {
                          type: 'string',
                          enum: ['off', 'linear', 'greyskull', 'double', 'time']
                        },
                        {
                          type: 'null'
                        }
                      ]
                    },
                    increment: {
                      default: null,
                      anyOf: [
                        {
                          type: 'number',
                          exclusiveMinimum: 0,
                          maximum: 1000
                        },
                        {
                          type: 'null'
                        }
                      ]
                    }
                  },
                  required: [
                    'mode',
                    'sets',
                    'reps',
                    'reps_min',
                    'weight_kg',
                    'seconds',
                    'minutes',
                    'speed_kmh',
                    'rest_seconds',
                    'progression',
                    'increment'
                  ],
                  additionalProperties: false
                },
                sets: {
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
                      weight_kg: {
                        default: 0,
                        type: 'number',
                        minimum: 0,
                        maximum: 10000
                      },
                      reps: {
                        default: 0,
                        type: 'integer',
                        minimum: 0,
                        maximum: 1000
                      },
                      seconds: {
                        default: 0,
                        type: 'number',
                        minimum: 0,
                        maximum: 86400
                      },
                      minutes: {
                        default: 0,
                        type: 'number',
                        minimum: 0,
                        maximum: 1440
                      },
                      speed_kmh: {
                        default: 0,
                        type: 'number',
                        minimum: 0,
                        maximum: 200
                      },
                      done: {
                        default: false,
                        type: 'boolean'
                      },
                      rir: {
                        default: null,
                        anyOf: [
                          {
                            type: 'number',
                            minimum: 0,
                            maximum: 10
                          },
                          {
                            type: 'null'
                          }
                        ]
                      },
                      rpe: {
                        default: null,
                        anyOf: [
                          {
                            type: 'number',
                            minimum: 0,
                            maximum: 10
                          },
                          {
                            type: 'null'
                          }
                        ]
                      },
                      position: {
                        type: 'integer',
                        minimum: 0,
                        maximum: 9007199254740991
                      }
                    },
                    required: [
                      'id',
                      'weight_kg',
                      'reps',
                      'seconds',
                      'minutes',
                      'speed_kmh',
                      'done',
                      'rir',
                      'rpe',
                      'position'
                    ],
                    additionalProperties: false
                  }
                },
                position: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 9007199254740991
                },
                exercise: {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string',
                      minLength: 1,
                      maxLength: 160
                    },
                    mode: {
                      default: 'reps',
                      type: 'string',
                      enum: ['reps', 'time', 'cardio']
                    },
                    muscle_group: {
                      type: 'string',
                      enum: [
                        'chest',
                        'back',
                        'shoulders',
                        'biceps',
                        'triceps',
                        'forearms',
                        'quadriceps',
                        'hamstrings',
                        'glutes',
                        'calves',
                        'core',
                        'cardio',
                        'full-body'
                      ]
                    },
                    secondary_muscles: {
                      default: [],
                      maxItems: 12,
                      type: 'array',
                      items: {
                        type: 'string',
                        enum: [
                          'chest',
                          'back',
                          'shoulders',
                          'biceps',
                          'triceps',
                          'forearms',
                          'quadriceps',
                          'hamstrings',
                          'glutes',
                          'calves',
                          'core',
                          'cardio',
                          'full-body'
                        ]
                      }
                    },
                    equipment: {
                      default: '',
                      type: 'string',
                      maxLength: 100
                    },
                    instructions: {
                      default: '',
                      type: 'string',
                      maxLength: 10000
                    }
                  },
                  required: [
                    'name',
                    'mode',
                    'muscle_group',
                    'secondary_muscles',
                    'equipment',
                    'instructions'
                  ],
                  additionalProperties: false
                },
                suggestion: {
                  type: 'object',
                  properties: {
                    policy: {
                      type: 'string',
                      enum: ['off', 'linear', 'greyskull', 'double', 'time']
                    },
                    kind: {
                      type: 'string',
                      enum: ['off', 'first', 'up', 'hold', 'deload']
                    },
                    reason: {
                      type: 'string',
                      enum: [
                        'disabled',
                        'baseline',
                        'success',
                        'bodyweight-success',
                        'bodyweight-hold',
                        'amrap-double',
                        'miss',
                        'stalled',
                        'rep-range'
                      ]
                    },
                    weight_kg: {
                      type: 'number',
                      minimum: 0,
                      maximum: 10000
                    },
                    reps: {
                      type: 'integer',
                      exclusiveMinimum: 0,
                      maximum: 9007199254740991
                    },
                    seconds: {
                      type: 'number',
                      minimum: 0,
                      maximum: 86400
                    },
                    misses: {
                      default: 0,
                      type: 'integer',
                      minimum: 0,
                      maximum: 9007199254740991
                    }
                  },
                  required: ['policy', 'kind', 'reason', 'misses'],
                  additionalProperties: false
                }
              },
              required: [
                'id',
                'exercise_id',
                'superset_group',
                'target',
                'sets',
                'position',
                'exercise',
                'suggestion'
              ],
              additionalProperties: false
            }
          }
        },
        required: [
          'id',
          'routine_id',
          'name',
          'date',
          'status',
          'started_at',
          'finished_at',
          'notes',
          'bodyweight_kg',
          'revision',
          'current_entry_id',
          'rest_until',
          'work_timer',
          'entries'
        ],
        additionalProperties: false
      }
    }
  },
  duplicateRoutine: {
    method: 'post',
    description: 'Duplicate a routine with new stable entry identities',
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
            exclusiveMinimum: 0,
            maximum: 9007199254740991
          },
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 160
          }
        },
        required: ['expected_revision'],
        additionalProperties: false
      }
    },
    output: {
      CREATED: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 160
          },
          notes: {
            default: '',
            type: 'string',
            maxLength: 10000
          },
          progression: {
            default: 'linear',
            type: 'string',
            enum: ['off', 'linear', 'greyskull', 'double', 'time']
          },
          entries: {
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
                exercise_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                superset_group: {
                  default: null,
                  anyOf: [
                    {
                      type: 'string',
                      minLength: 1,
                      maxLength: 100
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                prescription: {
                  type: 'object',
                  properties: {
                    mode: {
                      default: 'reps',
                      type: 'string',
                      enum: ['reps', 'time', 'cardio']
                    },
                    sets: {
                      default: 3,
                      type: 'integer',
                      minimum: 1,
                      maximum: 50
                    },
                    reps: {
                      default: 10,
                      type: 'integer',
                      minimum: 1,
                      maximum: 1000
                    },
                    reps_min: {
                      default: 8,
                      type: 'integer',
                      minimum: 1,
                      maximum: 1000
                    },
                    weight_kg: {
                      default: 0,
                      type: 'number',
                      minimum: 0,
                      maximum: 10000
                    },
                    seconds: {
                      default: 45,
                      type: 'number',
                      minimum: 0,
                      maximum: 86400
                    },
                    minutes: {
                      default: 20,
                      type: 'number',
                      minimum: 0,
                      maximum: 1440
                    },
                    speed_kmh: {
                      default: 8,
                      type: 'number',
                      minimum: 0,
                      maximum: 200
                    },
                    rest_seconds: {
                      default: 90,
                      type: 'integer',
                      minimum: 0,
                      maximum: 3600
                    },
                    progression: {
                      default: null,
                      anyOf: [
                        {
                          type: 'string',
                          enum: ['off', 'linear', 'greyskull', 'double', 'time']
                        },
                        {
                          type: 'null'
                        }
                      ]
                    },
                    increment: {
                      default: null,
                      anyOf: [
                        {
                          type: 'number',
                          exclusiveMinimum: 0,
                          maximum: 1000
                        },
                        {
                          type: 'null'
                        }
                      ]
                    }
                  },
                  required: [
                    'mode',
                    'sets',
                    'reps',
                    'reps_min',
                    'weight_kg',
                    'seconds',
                    'minutes',
                    'speed_kmh',
                    'rest_seconds',
                    'progression',
                    'increment'
                  ],
                  additionalProperties: false
                },
                position: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 9007199254740991
                }
              },
              required: [
                'id',
                'exercise_id',
                'superset_group',
                'prescription',
                'position'
              ],
              additionalProperties: false
            }
          },
          id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          },
          revision: {
            type: 'integer',
            exclusiveMinimum: 0,
            maximum: 9007199254740991
          },
          archived: {
            type: 'boolean'
          }
        },
        required: [
          'name',
          'notes',
          'progression',
          'entries',
          'id',
          'revision',
          'archived'
        ],
        additionalProperties: false
      }
    }
  },
  exportData: {
    method: 'get',
    description:
      'Export a versioned native backup or a selected shareable training plan',
    noAuth: false,
    encrypted: true,
    isDownloadable: false,
    media: null,
    input: {
      query: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          scope: {
            default: 'all',
            type: 'string',
            enum: ['all', 'plan']
          },
          routine_id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          }
        },
        required: ['scope'],
        additionalProperties: false
      }
    },
    output: {
      OK: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          format: {
            type: 'string',
            const: 'zillion-gym'
          },
          version: {
            type: 'number',
            const: 1
          },
          exported_at: {
            type: 'string',
            format: 'date-time',
            pattern:
              '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$'
          },
          exercises: {
            maxItems: 5000,
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 160
                },
                mode: {
                  default: 'reps',
                  type: 'string',
                  enum: ['reps', 'time', 'cardio']
                },
                muscle_group: {
                  type: 'string',
                  enum: [
                    'chest',
                    'back',
                    'shoulders',
                    'biceps',
                    'triceps',
                    'forearms',
                    'quadriceps',
                    'hamstrings',
                    'glutes',
                    'calves',
                    'core',
                    'cardio',
                    'full-body'
                  ]
                },
                secondary_muscles: {
                  default: [],
                  maxItems: 12,
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: [
                      'chest',
                      'back',
                      'shoulders',
                      'biceps',
                      'triceps',
                      'forearms',
                      'quadriceps',
                      'hamstrings',
                      'glutes',
                      'calves',
                      'core',
                      'cardio',
                      'full-body'
                    ]
                  }
                },
                equipment: {
                  default: '',
                  type: 'string',
                  maxLength: 100
                },
                instructions: {
                  default: '',
                  type: 'string',
                  maxLength: 10000
                },
                id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                custom: {
                  type: 'boolean'
                },
                archived: {
                  type: 'boolean'
                },
                catalog_key: {
                  anyOf: [
                    {
                      type: 'string'
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                revision: {
                  type: 'integer',
                  exclusiveMinimum: 0,
                  maximum: 9007199254740991
                }
              },
              required: [
                'name',
                'mode',
                'muscle_group',
                'secondary_muscles',
                'equipment',
                'instructions',
                'id',
                'custom',
                'archived',
                'catalog_key',
                'revision'
              ],
              additionalProperties: false
            }
          },
          routines: {
            maxItems: 1000,
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 160
                },
                notes: {
                  default: '',
                  type: 'string',
                  maxLength: 10000
                },
                progression: {
                  default: 'linear',
                  type: 'string',
                  enum: ['off', 'linear', 'greyskull', 'double', 'time']
                },
                entries: {
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
                      exercise_id: {
                        type: 'string',
                        format: 'uuid',
                        pattern:
                          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                      },
                      superset_group: {
                        default: null,
                        anyOf: [
                          {
                            type: 'string',
                            minLength: 1,
                            maxLength: 100
                          },
                          {
                            type: 'null'
                          }
                        ]
                      },
                      prescription: {
                        type: 'object',
                        properties: {
                          mode: {
                            default: 'reps',
                            type: 'string',
                            enum: ['reps', 'time', 'cardio']
                          },
                          sets: {
                            default: 3,
                            type: 'integer',
                            minimum: 1,
                            maximum: 50
                          },
                          reps: {
                            default: 10,
                            type: 'integer',
                            minimum: 1,
                            maximum: 1000
                          },
                          reps_min: {
                            default: 8,
                            type: 'integer',
                            minimum: 1,
                            maximum: 1000
                          },
                          weight_kg: {
                            default: 0,
                            type: 'number',
                            minimum: 0,
                            maximum: 10000
                          },
                          seconds: {
                            default: 45,
                            type: 'number',
                            minimum: 0,
                            maximum: 86400
                          },
                          minutes: {
                            default: 20,
                            type: 'number',
                            minimum: 0,
                            maximum: 1440
                          },
                          speed_kmh: {
                            default: 8,
                            type: 'number',
                            minimum: 0,
                            maximum: 200
                          },
                          rest_seconds: {
                            default: 90,
                            type: 'integer',
                            minimum: 0,
                            maximum: 3600
                          },
                          progression: {
                            default: null,
                            anyOf: [
                              {
                                type: 'string',
                                enum: [
                                  'off',
                                  'linear',
                                  'greyskull',
                                  'double',
                                  'time'
                                ]
                              },
                              {
                                type: 'null'
                              }
                            ]
                          },
                          increment: {
                            default: null,
                            anyOf: [
                              {
                                type: 'number',
                                exclusiveMinimum: 0,
                                maximum: 1000
                              },
                              {
                                type: 'null'
                              }
                            ]
                          }
                        },
                        required: [
                          'mode',
                          'sets',
                          'reps',
                          'reps_min',
                          'weight_kg',
                          'seconds',
                          'minutes',
                          'speed_kmh',
                          'rest_seconds',
                          'progression',
                          'increment'
                        ],
                        additionalProperties: false
                      },
                      position: {
                        type: 'integer',
                        minimum: 0,
                        maximum: 9007199254740991
                      }
                    },
                    required: [
                      'id',
                      'exercise_id',
                      'superset_group',
                      'prescription',
                      'position'
                    ],
                    additionalProperties: false
                  }
                },
                id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                revision: {
                  type: 'integer',
                  exclusiveMinimum: 0,
                  maximum: 9007199254740991
                },
                archived: {
                  type: 'boolean'
                }
              },
              required: [
                'name',
                'notes',
                'progression',
                'entries',
                'id',
                'revision',
                'archived'
              ],
              additionalProperties: false
            }
          },
          schedule: {
            maxItems: 5000,
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
                weekday: {
                  anyOf: [
                    {
                      type: 'integer',
                      minimum: 0,
                      maximum: 6
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                date: {
                  anyOf: [
                    {
                      type: 'string',
                      pattern: '^\\d{4}-\\d{2}-\\d{2}$'
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                routine_id: {
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
              required: ['id', 'weekday', 'date', 'routine_id'],
              additionalProperties: false
            }
          },
          workouts: {
            maxItems: 10000,
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
                routine_id: {
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
                name: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 160
                },
                date: {
                  type: 'string',
                  pattern: '^\\d{4}-\\d{2}-\\d{2}$'
                },
                status: {
                  type: 'string',
                  enum: ['active', 'completed', 'discarded']
                },
                started_at: {
                  type: 'string',
                  format: 'date-time',
                  pattern:
                    '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$'
                },
                finished_at: {
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
                notes: {
                  type: 'string'
                },
                bodyweight_kg: {
                  anyOf: [
                    {
                      type: 'number',
                      exclusiveMinimum: 0
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                revision: {
                  type: 'integer',
                  exclusiveMinimum: 0,
                  maximum: 9007199254740991
                },
                current_entry_id: {
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
                rest_until: {
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
                work_timer: {
                  default: null,
                  anyOf: [
                    {
                      type: 'object',
                      properties: {
                        entry_id: {
                          type: 'string',
                          format: 'uuid',
                          pattern:
                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                        },
                        set_id: {
                          type: 'string',
                          format: 'uuid',
                          pattern:
                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                        },
                        started_at: {
                          type: 'string',
                          format: 'date-time',
                          pattern:
                            '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$'
                        },
                        target_seconds: {
                          type: 'integer',
                          exclusiveMinimum: 0,
                          maximum: 86400
                        }
                      },
                      required: [
                        'entry_id',
                        'set_id',
                        'started_at',
                        'target_seconds'
                      ],
                      additionalProperties: false
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                entries: {
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
                      exercise_id: {
                        type: 'string',
                        format: 'uuid',
                        pattern:
                          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                      },
                      superset_group: {
                        default: null,
                        anyOf: [
                          {
                            type: 'string',
                            minLength: 1,
                            maxLength: 100
                          },
                          {
                            type: 'null'
                          }
                        ]
                      },
                      target: {
                        type: 'object',
                        properties: {
                          mode: {
                            default: 'reps',
                            type: 'string',
                            enum: ['reps', 'time', 'cardio']
                          },
                          sets: {
                            default: 3,
                            type: 'integer',
                            minimum: 1,
                            maximum: 50
                          },
                          reps: {
                            default: 10,
                            type: 'integer',
                            minimum: 1,
                            maximum: 1000
                          },
                          reps_min: {
                            default: 8,
                            type: 'integer',
                            minimum: 1,
                            maximum: 1000
                          },
                          weight_kg: {
                            default: 0,
                            type: 'number',
                            minimum: 0,
                            maximum: 10000
                          },
                          seconds: {
                            default: 45,
                            type: 'number',
                            minimum: 0,
                            maximum: 86400
                          },
                          minutes: {
                            default: 20,
                            type: 'number',
                            minimum: 0,
                            maximum: 1440
                          },
                          speed_kmh: {
                            default: 8,
                            type: 'number',
                            minimum: 0,
                            maximum: 200
                          },
                          rest_seconds: {
                            default: 90,
                            type: 'integer',
                            minimum: 0,
                            maximum: 3600
                          },
                          progression: {
                            default: null,
                            anyOf: [
                              {
                                type: 'string',
                                enum: [
                                  'off',
                                  'linear',
                                  'greyskull',
                                  'double',
                                  'time'
                                ]
                              },
                              {
                                type: 'null'
                              }
                            ]
                          },
                          increment: {
                            default: null,
                            anyOf: [
                              {
                                type: 'number',
                                exclusiveMinimum: 0,
                                maximum: 1000
                              },
                              {
                                type: 'null'
                              }
                            ]
                          }
                        },
                        required: [
                          'mode',
                          'sets',
                          'reps',
                          'reps_min',
                          'weight_kg',
                          'seconds',
                          'minutes',
                          'speed_kmh',
                          'rest_seconds',
                          'progression',
                          'increment'
                        ],
                        additionalProperties: false
                      },
                      sets: {
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
                            weight_kg: {
                              default: 0,
                              type: 'number',
                              minimum: 0,
                              maximum: 10000
                            },
                            reps: {
                              default: 0,
                              type: 'integer',
                              minimum: 0,
                              maximum: 1000
                            },
                            seconds: {
                              default: 0,
                              type: 'number',
                              minimum: 0,
                              maximum: 86400
                            },
                            minutes: {
                              default: 0,
                              type: 'number',
                              minimum: 0,
                              maximum: 1440
                            },
                            speed_kmh: {
                              default: 0,
                              type: 'number',
                              minimum: 0,
                              maximum: 200
                            },
                            done: {
                              default: false,
                              type: 'boolean'
                            },
                            rir: {
                              default: null,
                              anyOf: [
                                {
                                  type: 'number',
                                  minimum: 0,
                                  maximum: 10
                                },
                                {
                                  type: 'null'
                                }
                              ]
                            },
                            rpe: {
                              default: null,
                              anyOf: [
                                {
                                  type: 'number',
                                  minimum: 0,
                                  maximum: 10
                                },
                                {
                                  type: 'null'
                                }
                              ]
                            },
                            position: {
                              type: 'integer',
                              minimum: 0,
                              maximum: 9007199254740991
                            }
                          },
                          required: [
                            'id',
                            'weight_kg',
                            'reps',
                            'seconds',
                            'minutes',
                            'speed_kmh',
                            'done',
                            'rir',
                            'rpe',
                            'position'
                          ],
                          additionalProperties: false
                        }
                      },
                      position: {
                        type: 'integer',
                        minimum: 0,
                        maximum: 9007199254740991
                      },
                      exercise: {
                        type: 'object',
                        properties: {
                          name: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 160
                          },
                          mode: {
                            default: 'reps',
                            type: 'string',
                            enum: ['reps', 'time', 'cardio']
                          },
                          muscle_group: {
                            type: 'string',
                            enum: [
                              'chest',
                              'back',
                              'shoulders',
                              'biceps',
                              'triceps',
                              'forearms',
                              'quadriceps',
                              'hamstrings',
                              'glutes',
                              'calves',
                              'core',
                              'cardio',
                              'full-body'
                            ]
                          },
                          secondary_muscles: {
                            default: [],
                            maxItems: 12,
                            type: 'array',
                            items: {
                              type: 'string',
                              enum: [
                                'chest',
                                'back',
                                'shoulders',
                                'biceps',
                                'triceps',
                                'forearms',
                                'quadriceps',
                                'hamstrings',
                                'glutes',
                                'calves',
                                'core',
                                'cardio',
                                'full-body'
                              ]
                            }
                          },
                          equipment: {
                            default: '',
                            type: 'string',
                            maxLength: 100
                          },
                          instructions: {
                            default: '',
                            type: 'string',
                            maxLength: 10000
                          }
                        },
                        required: [
                          'name',
                          'mode',
                          'muscle_group',
                          'secondary_muscles',
                          'equipment',
                          'instructions'
                        ],
                        additionalProperties: false
                      },
                      suggestion: {
                        type: 'object',
                        properties: {
                          policy: {
                            type: 'string',
                            enum: [
                              'off',
                              'linear',
                              'greyskull',
                              'double',
                              'time'
                            ]
                          },
                          kind: {
                            type: 'string',
                            enum: ['off', 'first', 'up', 'hold', 'deload']
                          },
                          reason: {
                            type: 'string',
                            enum: [
                              'disabled',
                              'baseline',
                              'success',
                              'bodyweight-success',
                              'bodyweight-hold',
                              'amrap-double',
                              'miss',
                              'stalled',
                              'rep-range'
                            ]
                          },
                          weight_kg: {
                            type: 'number',
                            minimum: 0,
                            maximum: 10000
                          },
                          reps: {
                            type: 'integer',
                            exclusiveMinimum: 0,
                            maximum: 9007199254740991
                          },
                          seconds: {
                            type: 'number',
                            minimum: 0,
                            maximum: 86400
                          },
                          misses: {
                            default: 0,
                            type: 'integer',
                            minimum: 0,
                            maximum: 9007199254740991
                          }
                        },
                        required: ['policy', 'kind', 'reason', 'misses'],
                        additionalProperties: false
                      }
                    },
                    required: [
                      'id',
                      'exercise_id',
                      'superset_group',
                      'target',
                      'sets',
                      'position',
                      'exercise',
                      'suggestion'
                    ],
                    additionalProperties: false
                  }
                }
              },
              required: [
                'id',
                'routine_id',
                'name',
                'date',
                'status',
                'started_at',
                'finished_at',
                'notes',
                'bodyweight_kg',
                'revision',
                'current_entry_id',
                'rest_until',
                'work_timer',
                'entries'
              ],
              additionalProperties: false
            }
          },
          bodyweight: {
            maxItems: 10000,
            type: 'array',
            items: {
              type: 'object',
              properties: {
                date: {
                  type: 'string',
                  pattern: '^\\d{4}-\\d{2}-\\d{2}$'
                },
                weight_kg: {
                  type: 'number',
                  exclusiveMinimum: 0,
                  maximum: 1000
                },
                notes: {
                  default: '',
                  type: 'string',
                  maxLength: 1000
                },
                id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                }
              },
              required: ['date', 'weight_kg', 'notes', 'id'],
              additionalProperties: false
            }
          },
          settings: {
            type: 'object',
            properties: {
              unit: {
                default: 'kg',
                type: 'string',
                enum: ['kg', 'lb']
              },
              rest_seconds: {
                default: 90,
                type: 'integer',
                minimum: 0,
                maximum: 3600
              },
              effort: {
                default: 'none',
                type: 'string',
                enum: ['none', 'rir', 'rpe']
              },
              sound: {
                default: true,
                type: 'boolean'
              },
              keep_awake: {
                default: true,
                type: 'boolean'
              },
              body_style: {
                default: 'male',
                type: 'string',
                enum: ['male', 'female']
              },
              target_weight_kg: {
                default: null,
                anyOf: [
                  {
                    type: 'number',
                    exclusiveMinimum: 0,
                    maximum: 1000
                  },
                  {
                    type: 'null'
                  }
                ]
              },
              weekly_workout_goal: {
                default: 3,
                type: 'integer',
                minimum: 0,
                maximum: 14
              },
              formula: {
                default: 'epley',
                type: 'string',
                enum: ['epley', 'brzycki', 'lombardi']
              },
              reminder_enabled: {
                default: false,
                type: 'boolean'
              },
              reminder_time: {
                default: '08:00',
                type: 'string',
                pattern: '^(?:[01]\\d|2[0-3]):[0-5]\\d$'
              },
              timezone: {
                default: 'UTC',
                type: 'string',
                minLength: 1,
                maxLength: 100
              },
              revision: {
                type: 'integer',
                exclusiveMinimum: 0,
                maximum: 9007199254740991
              }
            },
            required: [
              'unit',
              'rest_seconds',
              'effort',
              'sound',
              'keep_awake',
              'body_style',
              'target_weight_kg',
              'weekly_workout_goal',
              'formula',
              'reminder_enabled',
              'reminder_time',
              'timezone',
              'revision'
            ],
            additionalProperties: false
          }
        },
        required: [
          'format',
          'version',
          'exported_at',
          'exercises',
          'routines',
          'schedule',
          'workouts',
          'bodyweight'
        ],
        additionalProperties: false
      }
    }
  },
  finishWorkout: {
    method: 'post',
    description:
      'Finish a session once and retain missed sets in its prescription snapshot',
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
          command_id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          },
          expected_revision: {
            type: 'integer',
            exclusiveMinimum: 0,
            maximum: 9007199254740991
          }
        },
        required: ['command_id', 'expected_revision'],
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
          routine_id: {
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
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 160
          },
          date: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}-\\d{2}$'
          },
          status: {
            type: 'string',
            enum: ['active', 'completed', 'discarded']
          },
          started_at: {
            type: 'string',
            format: 'date-time',
            pattern:
              '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$'
          },
          finished_at: {
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
          notes: {
            type: 'string'
          },
          bodyweight_kg: {
            anyOf: [
              {
                type: 'number',
                exclusiveMinimum: 0
              },
              {
                type: 'null'
              }
            ]
          },
          revision: {
            type: 'integer',
            exclusiveMinimum: 0,
            maximum: 9007199254740991
          },
          current_entry_id: {
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
          rest_until: {
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
          work_timer: {
            default: null,
            anyOf: [
              {
                type: 'object',
                properties: {
                  entry_id: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  set_id: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  started_at: {
                    type: 'string',
                    format: 'date-time',
                    pattern:
                      '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$'
                  },
                  target_seconds: {
                    type: 'integer',
                    exclusiveMinimum: 0,
                    maximum: 86400
                  }
                },
                required: [
                  'entry_id',
                  'set_id',
                  'started_at',
                  'target_seconds'
                ],
                additionalProperties: false
              },
              {
                type: 'null'
              }
            ]
          },
          entries: {
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
                exercise_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                superset_group: {
                  default: null,
                  anyOf: [
                    {
                      type: 'string',
                      minLength: 1,
                      maxLength: 100
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                target: {
                  type: 'object',
                  properties: {
                    mode: {
                      default: 'reps',
                      type: 'string',
                      enum: ['reps', 'time', 'cardio']
                    },
                    sets: {
                      default: 3,
                      type: 'integer',
                      minimum: 1,
                      maximum: 50
                    },
                    reps: {
                      default: 10,
                      type: 'integer',
                      minimum: 1,
                      maximum: 1000
                    },
                    reps_min: {
                      default: 8,
                      type: 'integer',
                      minimum: 1,
                      maximum: 1000
                    },
                    weight_kg: {
                      default: 0,
                      type: 'number',
                      minimum: 0,
                      maximum: 10000
                    },
                    seconds: {
                      default: 45,
                      type: 'number',
                      minimum: 0,
                      maximum: 86400
                    },
                    minutes: {
                      default: 20,
                      type: 'number',
                      minimum: 0,
                      maximum: 1440
                    },
                    speed_kmh: {
                      default: 8,
                      type: 'number',
                      minimum: 0,
                      maximum: 200
                    },
                    rest_seconds: {
                      default: 90,
                      type: 'integer',
                      minimum: 0,
                      maximum: 3600
                    },
                    progression: {
                      default: null,
                      anyOf: [
                        {
                          type: 'string',
                          enum: ['off', 'linear', 'greyskull', 'double', 'time']
                        },
                        {
                          type: 'null'
                        }
                      ]
                    },
                    increment: {
                      default: null,
                      anyOf: [
                        {
                          type: 'number',
                          exclusiveMinimum: 0,
                          maximum: 1000
                        },
                        {
                          type: 'null'
                        }
                      ]
                    }
                  },
                  required: [
                    'mode',
                    'sets',
                    'reps',
                    'reps_min',
                    'weight_kg',
                    'seconds',
                    'minutes',
                    'speed_kmh',
                    'rest_seconds',
                    'progression',
                    'increment'
                  ],
                  additionalProperties: false
                },
                sets: {
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
                      weight_kg: {
                        default: 0,
                        type: 'number',
                        minimum: 0,
                        maximum: 10000
                      },
                      reps: {
                        default: 0,
                        type: 'integer',
                        minimum: 0,
                        maximum: 1000
                      },
                      seconds: {
                        default: 0,
                        type: 'number',
                        minimum: 0,
                        maximum: 86400
                      },
                      minutes: {
                        default: 0,
                        type: 'number',
                        minimum: 0,
                        maximum: 1440
                      },
                      speed_kmh: {
                        default: 0,
                        type: 'number',
                        minimum: 0,
                        maximum: 200
                      },
                      done: {
                        default: false,
                        type: 'boolean'
                      },
                      rir: {
                        default: null,
                        anyOf: [
                          {
                            type: 'number',
                            minimum: 0,
                            maximum: 10
                          },
                          {
                            type: 'null'
                          }
                        ]
                      },
                      rpe: {
                        default: null,
                        anyOf: [
                          {
                            type: 'number',
                            minimum: 0,
                            maximum: 10
                          },
                          {
                            type: 'null'
                          }
                        ]
                      },
                      position: {
                        type: 'integer',
                        minimum: 0,
                        maximum: 9007199254740991
                      }
                    },
                    required: [
                      'id',
                      'weight_kg',
                      'reps',
                      'seconds',
                      'minutes',
                      'speed_kmh',
                      'done',
                      'rir',
                      'rpe',
                      'position'
                    ],
                    additionalProperties: false
                  }
                },
                position: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 9007199254740991
                },
                exercise: {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string',
                      minLength: 1,
                      maxLength: 160
                    },
                    mode: {
                      default: 'reps',
                      type: 'string',
                      enum: ['reps', 'time', 'cardio']
                    },
                    muscle_group: {
                      type: 'string',
                      enum: [
                        'chest',
                        'back',
                        'shoulders',
                        'biceps',
                        'triceps',
                        'forearms',
                        'quadriceps',
                        'hamstrings',
                        'glutes',
                        'calves',
                        'core',
                        'cardio',
                        'full-body'
                      ]
                    },
                    secondary_muscles: {
                      default: [],
                      maxItems: 12,
                      type: 'array',
                      items: {
                        type: 'string',
                        enum: [
                          'chest',
                          'back',
                          'shoulders',
                          'biceps',
                          'triceps',
                          'forearms',
                          'quadriceps',
                          'hamstrings',
                          'glutes',
                          'calves',
                          'core',
                          'cardio',
                          'full-body'
                        ]
                      }
                    },
                    equipment: {
                      default: '',
                      type: 'string',
                      maxLength: 100
                    },
                    instructions: {
                      default: '',
                      type: 'string',
                      maxLength: 10000
                    }
                  },
                  required: [
                    'name',
                    'mode',
                    'muscle_group',
                    'secondary_muscles',
                    'equipment',
                    'instructions'
                  ],
                  additionalProperties: false
                },
                suggestion: {
                  type: 'object',
                  properties: {
                    policy: {
                      type: 'string',
                      enum: ['off', 'linear', 'greyskull', 'double', 'time']
                    },
                    kind: {
                      type: 'string',
                      enum: ['off', 'first', 'up', 'hold', 'deload']
                    },
                    reason: {
                      type: 'string',
                      enum: [
                        'disabled',
                        'baseline',
                        'success',
                        'bodyweight-success',
                        'bodyweight-hold',
                        'amrap-double',
                        'miss',
                        'stalled',
                        'rep-range'
                      ]
                    },
                    weight_kg: {
                      type: 'number',
                      minimum: 0,
                      maximum: 10000
                    },
                    reps: {
                      type: 'integer',
                      exclusiveMinimum: 0,
                      maximum: 9007199254740991
                    },
                    seconds: {
                      type: 'number',
                      minimum: 0,
                      maximum: 86400
                    },
                    misses: {
                      default: 0,
                      type: 'integer',
                      minimum: 0,
                      maximum: 9007199254740991
                    }
                  },
                  required: ['policy', 'kind', 'reason', 'misses'],
                  additionalProperties: false
                }
              },
              required: [
                'id',
                'exercise_id',
                'superset_group',
                'target',
                'sets',
                'position',
                'exercise',
                'suggestion'
              ],
              additionalProperties: false
            }
          }
        },
        required: [
          'id',
          'routine_id',
          'name',
          'date',
          'status',
          'started_at',
          'finished_at',
          'notes',
          'bodyweight_kg',
          'revision',
          'current_entry_id',
          'rest_until',
          'work_timer',
          'entries'
        ],
        additionalProperties: false
      }
    }
  },
  importData: {
    method: 'post',
    description:
      'Merge a validated native backup atomically, remap identities and preserve existing history',
    noAuth: false,
    encrypted: true,
    isDownloadable: false,
    media: null,
    input: {
      body: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          command_id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          },
          data: {
            type: 'object',
            properties: {
              format: {
                type: 'string',
                const: 'zillion-gym'
              },
              version: {
                type: 'number',
                const: 1
              },
              exported_at: {
                type: 'string',
                format: 'date-time',
                pattern:
                  '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$'
              },
              exercises: {
                maxItems: 5000,
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string',
                      minLength: 1,
                      maxLength: 160
                    },
                    mode: {
                      default: 'reps',
                      type: 'string',
                      enum: ['reps', 'time', 'cardio']
                    },
                    muscle_group: {
                      type: 'string',
                      enum: [
                        'chest',
                        'back',
                        'shoulders',
                        'biceps',
                        'triceps',
                        'forearms',
                        'quadriceps',
                        'hamstrings',
                        'glutes',
                        'calves',
                        'core',
                        'cardio',
                        'full-body'
                      ]
                    },
                    secondary_muscles: {
                      default: [],
                      maxItems: 12,
                      type: 'array',
                      items: {
                        type: 'string',
                        enum: [
                          'chest',
                          'back',
                          'shoulders',
                          'biceps',
                          'triceps',
                          'forearms',
                          'quadriceps',
                          'hamstrings',
                          'glutes',
                          'calves',
                          'core',
                          'cardio',
                          'full-body'
                        ]
                      }
                    },
                    equipment: {
                      default: '',
                      type: 'string',
                      maxLength: 100
                    },
                    instructions: {
                      default: '',
                      type: 'string',
                      maxLength: 10000
                    },
                    id: {
                      type: 'string',
                      format: 'uuid',
                      pattern:
                        '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                    },
                    custom: {
                      type: 'boolean'
                    },
                    archived: {
                      type: 'boolean'
                    },
                    catalog_key: {
                      anyOf: [
                        {
                          type: 'string'
                        },
                        {
                          type: 'null'
                        }
                      ]
                    },
                    revision: {
                      type: 'integer',
                      exclusiveMinimum: 0,
                      maximum: 9007199254740991
                    }
                  },
                  required: [
                    'name',
                    'mode',
                    'muscle_group',
                    'secondary_muscles',
                    'equipment',
                    'instructions',
                    'id',
                    'custom',
                    'archived',
                    'catalog_key',
                    'revision'
                  ],
                  additionalProperties: false
                }
              },
              routines: {
                maxItems: 1000,
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string',
                      minLength: 1,
                      maxLength: 160
                    },
                    notes: {
                      default: '',
                      type: 'string',
                      maxLength: 10000
                    },
                    progression: {
                      default: 'linear',
                      type: 'string',
                      enum: ['off', 'linear', 'greyskull', 'double', 'time']
                    },
                    entries: {
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
                          exercise_id: {
                            type: 'string',
                            format: 'uuid',
                            pattern:
                              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                          },
                          superset_group: {
                            default: null,
                            anyOf: [
                              {
                                type: 'string',
                                minLength: 1,
                                maxLength: 100
                              },
                              {
                                type: 'null'
                              }
                            ]
                          },
                          prescription: {
                            type: 'object',
                            properties: {
                              mode: {
                                default: 'reps',
                                type: 'string',
                                enum: ['reps', 'time', 'cardio']
                              },
                              sets: {
                                default: 3,
                                type: 'integer',
                                minimum: 1,
                                maximum: 50
                              },
                              reps: {
                                default: 10,
                                type: 'integer',
                                minimum: 1,
                                maximum: 1000
                              },
                              reps_min: {
                                default: 8,
                                type: 'integer',
                                minimum: 1,
                                maximum: 1000
                              },
                              weight_kg: {
                                default: 0,
                                type: 'number',
                                minimum: 0,
                                maximum: 10000
                              },
                              seconds: {
                                default: 45,
                                type: 'number',
                                minimum: 0,
                                maximum: 86400
                              },
                              minutes: {
                                default: 20,
                                type: 'number',
                                minimum: 0,
                                maximum: 1440
                              },
                              speed_kmh: {
                                default: 8,
                                type: 'number',
                                minimum: 0,
                                maximum: 200
                              },
                              rest_seconds: {
                                default: 90,
                                type: 'integer',
                                minimum: 0,
                                maximum: 3600
                              },
                              progression: {
                                default: null,
                                anyOf: [
                                  {
                                    type: 'string',
                                    enum: [
                                      'off',
                                      'linear',
                                      'greyskull',
                                      'double',
                                      'time'
                                    ]
                                  },
                                  {
                                    type: 'null'
                                  }
                                ]
                              },
                              increment: {
                                default: null,
                                anyOf: [
                                  {
                                    type: 'number',
                                    exclusiveMinimum: 0,
                                    maximum: 1000
                                  },
                                  {
                                    type: 'null'
                                  }
                                ]
                              }
                            },
                            required: [
                              'mode',
                              'sets',
                              'reps',
                              'reps_min',
                              'weight_kg',
                              'seconds',
                              'minutes',
                              'speed_kmh',
                              'rest_seconds',
                              'progression',
                              'increment'
                            ],
                            additionalProperties: false
                          },
                          position: {
                            type: 'integer',
                            minimum: 0,
                            maximum: 9007199254740991
                          }
                        },
                        required: [
                          'id',
                          'exercise_id',
                          'superset_group',
                          'prescription',
                          'position'
                        ],
                        additionalProperties: false
                      }
                    },
                    id: {
                      type: 'string',
                      format: 'uuid',
                      pattern:
                        '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                    },
                    revision: {
                      type: 'integer',
                      exclusiveMinimum: 0,
                      maximum: 9007199254740991
                    },
                    archived: {
                      type: 'boolean'
                    }
                  },
                  required: [
                    'name',
                    'notes',
                    'progression',
                    'entries',
                    'id',
                    'revision',
                    'archived'
                  ],
                  additionalProperties: false
                }
              },
              schedule: {
                maxItems: 5000,
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
                    weekday: {
                      anyOf: [
                        {
                          type: 'integer',
                          minimum: 0,
                          maximum: 6
                        },
                        {
                          type: 'null'
                        }
                      ]
                    },
                    date: {
                      anyOf: [
                        {
                          type: 'string',
                          pattern: '^\\d{4}-\\d{2}-\\d{2}$'
                        },
                        {
                          type: 'null'
                        }
                      ]
                    },
                    routine_id: {
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
                  required: ['id', 'weekday', 'date', 'routine_id'],
                  additionalProperties: false
                }
              },
              workouts: {
                maxItems: 10000,
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
                    routine_id: {
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
                    name: {
                      type: 'string',
                      minLength: 1,
                      maxLength: 160
                    },
                    date: {
                      type: 'string',
                      pattern: '^\\d{4}-\\d{2}-\\d{2}$'
                    },
                    status: {
                      type: 'string',
                      enum: ['active', 'completed', 'discarded']
                    },
                    started_at: {
                      type: 'string',
                      format: 'date-time',
                      pattern:
                        '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$'
                    },
                    finished_at: {
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
                    notes: {
                      type: 'string'
                    },
                    bodyweight_kg: {
                      anyOf: [
                        {
                          type: 'number',
                          exclusiveMinimum: 0
                        },
                        {
                          type: 'null'
                        }
                      ]
                    },
                    revision: {
                      type: 'integer',
                      exclusiveMinimum: 0,
                      maximum: 9007199254740991
                    },
                    current_entry_id: {
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
                    rest_until: {
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
                    work_timer: {
                      default: null,
                      anyOf: [
                        {
                          type: 'object',
                          properties: {
                            entry_id: {
                              type: 'string',
                              format: 'uuid',
                              pattern:
                                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                            },
                            set_id: {
                              type: 'string',
                              format: 'uuid',
                              pattern:
                                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                            },
                            started_at: {
                              type: 'string',
                              format: 'date-time',
                              pattern:
                                '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$'
                            },
                            target_seconds: {
                              type: 'integer',
                              exclusiveMinimum: 0,
                              maximum: 86400
                            }
                          },
                          required: [
                            'entry_id',
                            'set_id',
                            'started_at',
                            'target_seconds'
                          ],
                          additionalProperties: false
                        },
                        {
                          type: 'null'
                        }
                      ]
                    },
                    entries: {
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
                          exercise_id: {
                            type: 'string',
                            format: 'uuid',
                            pattern:
                              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                          },
                          superset_group: {
                            default: null,
                            anyOf: [
                              {
                                type: 'string',
                                minLength: 1,
                                maxLength: 100
                              },
                              {
                                type: 'null'
                              }
                            ]
                          },
                          target: {
                            type: 'object',
                            properties: {
                              mode: {
                                default: 'reps',
                                type: 'string',
                                enum: ['reps', 'time', 'cardio']
                              },
                              sets: {
                                default: 3,
                                type: 'integer',
                                minimum: 1,
                                maximum: 50
                              },
                              reps: {
                                default: 10,
                                type: 'integer',
                                minimum: 1,
                                maximum: 1000
                              },
                              reps_min: {
                                default: 8,
                                type: 'integer',
                                minimum: 1,
                                maximum: 1000
                              },
                              weight_kg: {
                                default: 0,
                                type: 'number',
                                minimum: 0,
                                maximum: 10000
                              },
                              seconds: {
                                default: 45,
                                type: 'number',
                                minimum: 0,
                                maximum: 86400
                              },
                              minutes: {
                                default: 20,
                                type: 'number',
                                minimum: 0,
                                maximum: 1440
                              },
                              speed_kmh: {
                                default: 8,
                                type: 'number',
                                minimum: 0,
                                maximum: 200
                              },
                              rest_seconds: {
                                default: 90,
                                type: 'integer',
                                minimum: 0,
                                maximum: 3600
                              },
                              progression: {
                                default: null,
                                anyOf: [
                                  {
                                    type: 'string',
                                    enum: [
                                      'off',
                                      'linear',
                                      'greyskull',
                                      'double',
                                      'time'
                                    ]
                                  },
                                  {
                                    type: 'null'
                                  }
                                ]
                              },
                              increment: {
                                default: null,
                                anyOf: [
                                  {
                                    type: 'number',
                                    exclusiveMinimum: 0,
                                    maximum: 1000
                                  },
                                  {
                                    type: 'null'
                                  }
                                ]
                              }
                            },
                            required: [
                              'mode',
                              'sets',
                              'reps',
                              'reps_min',
                              'weight_kg',
                              'seconds',
                              'minutes',
                              'speed_kmh',
                              'rest_seconds',
                              'progression',
                              'increment'
                            ],
                            additionalProperties: false
                          },
                          sets: {
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
                                weight_kg: {
                                  default: 0,
                                  type: 'number',
                                  minimum: 0,
                                  maximum: 10000
                                },
                                reps: {
                                  default: 0,
                                  type: 'integer',
                                  minimum: 0,
                                  maximum: 1000
                                },
                                seconds: {
                                  default: 0,
                                  type: 'number',
                                  minimum: 0,
                                  maximum: 86400
                                },
                                minutes: {
                                  default: 0,
                                  type: 'number',
                                  minimum: 0,
                                  maximum: 1440
                                },
                                speed_kmh: {
                                  default: 0,
                                  type: 'number',
                                  minimum: 0,
                                  maximum: 200
                                },
                                done: {
                                  default: false,
                                  type: 'boolean'
                                },
                                rir: {
                                  default: null,
                                  anyOf: [
                                    {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 10
                                    },
                                    {
                                      type: 'null'
                                    }
                                  ]
                                },
                                rpe: {
                                  default: null,
                                  anyOf: [
                                    {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 10
                                    },
                                    {
                                      type: 'null'
                                    }
                                  ]
                                },
                                position: {
                                  type: 'integer',
                                  minimum: 0,
                                  maximum: 9007199254740991
                                }
                              },
                              required: [
                                'id',
                                'weight_kg',
                                'reps',
                                'seconds',
                                'minutes',
                                'speed_kmh',
                                'done',
                                'rir',
                                'rpe',
                                'position'
                              ],
                              additionalProperties: false
                            }
                          },
                          position: {
                            type: 'integer',
                            minimum: 0,
                            maximum: 9007199254740991
                          },
                          exercise: {
                            type: 'object',
                            properties: {
                              name: {
                                type: 'string',
                                minLength: 1,
                                maxLength: 160
                              },
                              mode: {
                                default: 'reps',
                                type: 'string',
                                enum: ['reps', 'time', 'cardio']
                              },
                              muscle_group: {
                                type: 'string',
                                enum: [
                                  'chest',
                                  'back',
                                  'shoulders',
                                  'biceps',
                                  'triceps',
                                  'forearms',
                                  'quadriceps',
                                  'hamstrings',
                                  'glutes',
                                  'calves',
                                  'core',
                                  'cardio',
                                  'full-body'
                                ]
                              },
                              secondary_muscles: {
                                default: [],
                                maxItems: 12,
                                type: 'array',
                                items: {
                                  type: 'string',
                                  enum: [
                                    'chest',
                                    'back',
                                    'shoulders',
                                    'biceps',
                                    'triceps',
                                    'forearms',
                                    'quadriceps',
                                    'hamstrings',
                                    'glutes',
                                    'calves',
                                    'core',
                                    'cardio',
                                    'full-body'
                                  ]
                                }
                              },
                              equipment: {
                                default: '',
                                type: 'string',
                                maxLength: 100
                              },
                              instructions: {
                                default: '',
                                type: 'string',
                                maxLength: 10000
                              }
                            },
                            required: [
                              'name',
                              'mode',
                              'muscle_group',
                              'secondary_muscles',
                              'equipment',
                              'instructions'
                            ],
                            additionalProperties: false
                          },
                          suggestion: {
                            type: 'object',
                            properties: {
                              policy: {
                                type: 'string',
                                enum: [
                                  'off',
                                  'linear',
                                  'greyskull',
                                  'double',
                                  'time'
                                ]
                              },
                              kind: {
                                type: 'string',
                                enum: ['off', 'first', 'up', 'hold', 'deload']
                              },
                              reason: {
                                type: 'string',
                                enum: [
                                  'disabled',
                                  'baseline',
                                  'success',
                                  'bodyweight-success',
                                  'bodyweight-hold',
                                  'amrap-double',
                                  'miss',
                                  'stalled',
                                  'rep-range'
                                ]
                              },
                              weight_kg: {
                                type: 'number',
                                minimum: 0,
                                maximum: 10000
                              },
                              reps: {
                                type: 'integer',
                                exclusiveMinimum: 0,
                                maximum: 9007199254740991
                              },
                              seconds: {
                                type: 'number',
                                minimum: 0,
                                maximum: 86400
                              },
                              misses: {
                                default: 0,
                                type: 'integer',
                                minimum: 0,
                                maximum: 9007199254740991
                              }
                            },
                            required: ['policy', 'kind', 'reason', 'misses'],
                            additionalProperties: false
                          }
                        },
                        required: [
                          'id',
                          'exercise_id',
                          'superset_group',
                          'target',
                          'sets',
                          'position',
                          'exercise',
                          'suggestion'
                        ],
                        additionalProperties: false
                      }
                    }
                  },
                  required: [
                    'id',
                    'routine_id',
                    'name',
                    'date',
                    'status',
                    'started_at',
                    'finished_at',
                    'notes',
                    'bodyweight_kg',
                    'revision',
                    'current_entry_id',
                    'rest_until',
                    'work_timer',
                    'entries'
                  ],
                  additionalProperties: false
                }
              },
              bodyweight: {
                maxItems: 10000,
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    date: {
                      type: 'string',
                      pattern: '^\\d{4}-\\d{2}-\\d{2}$'
                    },
                    weight_kg: {
                      type: 'number',
                      exclusiveMinimum: 0,
                      maximum: 1000
                    },
                    notes: {
                      default: '',
                      type: 'string',
                      maxLength: 1000
                    },
                    id: {
                      type: 'string',
                      format: 'uuid',
                      pattern:
                        '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                    }
                  },
                  required: ['date', 'weight_kg', 'notes', 'id'],
                  additionalProperties: false
                }
              },
              settings: {
                type: 'object',
                properties: {
                  unit: {
                    default: 'kg',
                    type: 'string',
                    enum: ['kg', 'lb']
                  },
                  rest_seconds: {
                    default: 90,
                    type: 'integer',
                    minimum: 0,
                    maximum: 3600
                  },
                  effort: {
                    default: 'none',
                    type: 'string',
                    enum: ['none', 'rir', 'rpe']
                  },
                  sound: {
                    default: true,
                    type: 'boolean'
                  },
                  keep_awake: {
                    default: true,
                    type: 'boolean'
                  },
                  body_style: {
                    default: 'male',
                    type: 'string',
                    enum: ['male', 'female']
                  },
                  target_weight_kg: {
                    default: null,
                    anyOf: [
                      {
                        type: 'number',
                        exclusiveMinimum: 0,
                        maximum: 1000
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  weekly_workout_goal: {
                    default: 3,
                    type: 'integer',
                    minimum: 0,
                    maximum: 14
                  },
                  formula: {
                    default: 'epley',
                    type: 'string',
                    enum: ['epley', 'brzycki', 'lombardi']
                  },
                  reminder_enabled: {
                    default: false,
                    type: 'boolean'
                  },
                  reminder_time: {
                    default: '08:00',
                    type: 'string',
                    pattern: '^(?:[01]\\d|2[0-3]):[0-5]\\d$'
                  },
                  timezone: {
                    default: 'UTC',
                    type: 'string',
                    minLength: 1,
                    maxLength: 100
                  },
                  revision: {
                    type: 'integer',
                    exclusiveMinimum: 0,
                    maximum: 9007199254740991
                  }
                },
                required: [
                  'unit',
                  'rest_seconds',
                  'effort',
                  'sound',
                  'keep_awake',
                  'body_style',
                  'target_weight_kg',
                  'weekly_workout_goal',
                  'formula',
                  'reminder_enabled',
                  'reminder_time',
                  'timezone',
                  'revision'
                ],
                additionalProperties: false
              }
            },
            required: [
              'format',
              'version',
              'exported_at',
              'exercises',
              'routines',
              'schedule',
              'workouts',
              'bodyweight'
            ],
            additionalProperties: false
          },
          include_schedule: {
            default: false,
            type: 'boolean'
          },
          include_settings: {
            default: false,
            type: 'boolean'
          },
          mode: {
            default: 'merge',
            type: 'string',
            enum: ['merge', 'replace']
          },
          confirmation: {
            type: 'string',
            const: 'REPLACE GYM'
          }
        },
        required: [
          'command_id',
          'data',
          'include_schedule',
          'include_settings',
          'mode'
        ],
        additionalProperties: false
      }
    },
    output: {
      OK: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          exercises: {
            type: 'integer',
            minimum: 0,
            maximum: 9007199254740991
          },
          routines: {
            type: 'integer',
            minimum: 0,
            maximum: 9007199254740991
          },
          workouts: {
            type: 'integer',
            minimum: 0,
            maximum: 9007199254740991
          },
          bodyweight: {
            type: 'integer',
            minimum: 0,
            maximum: 9007199254740991
          },
          duplicates: {
            type: 'integer',
            minimum: 0,
            maximum: 9007199254740991
          }
        },
        required: [
          'exercises',
          'routines',
          'workouts',
          'bodyweight',
          'duplicates'
        ],
        additionalProperties: false
      }
    }
  },
  removeBodyweight: {
    method: 'post',
    description: 'Delete an owned bodyweight reading',
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
  removeSchedule: {
    method: 'post',
    description: 'Remove a weekday assignment or date override',
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
  reopenWorkout: {
    method: 'post',
    description: 'Reopen completed history as the single active session',
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
          command_id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          },
          expected_revision: {
            type: 'integer',
            exclusiveMinimum: 0,
            maximum: 9007199254740991
          }
        },
        required: ['command_id', 'expected_revision'],
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
          routine_id: {
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
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 160
          },
          date: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}-\\d{2}$'
          },
          status: {
            type: 'string',
            enum: ['active', 'completed', 'discarded']
          },
          started_at: {
            type: 'string',
            format: 'date-time',
            pattern:
              '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$'
          },
          finished_at: {
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
          notes: {
            type: 'string'
          },
          bodyweight_kg: {
            anyOf: [
              {
                type: 'number',
                exclusiveMinimum: 0
              },
              {
                type: 'null'
              }
            ]
          },
          revision: {
            type: 'integer',
            exclusiveMinimum: 0,
            maximum: 9007199254740991
          },
          current_entry_id: {
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
          rest_until: {
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
          work_timer: {
            default: null,
            anyOf: [
              {
                type: 'object',
                properties: {
                  entry_id: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  set_id: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  started_at: {
                    type: 'string',
                    format: 'date-time',
                    pattern:
                      '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$'
                  },
                  target_seconds: {
                    type: 'integer',
                    exclusiveMinimum: 0,
                    maximum: 86400
                  }
                },
                required: [
                  'entry_id',
                  'set_id',
                  'started_at',
                  'target_seconds'
                ],
                additionalProperties: false
              },
              {
                type: 'null'
              }
            ]
          },
          entries: {
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
                exercise_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                superset_group: {
                  default: null,
                  anyOf: [
                    {
                      type: 'string',
                      minLength: 1,
                      maxLength: 100
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                target: {
                  type: 'object',
                  properties: {
                    mode: {
                      default: 'reps',
                      type: 'string',
                      enum: ['reps', 'time', 'cardio']
                    },
                    sets: {
                      default: 3,
                      type: 'integer',
                      minimum: 1,
                      maximum: 50
                    },
                    reps: {
                      default: 10,
                      type: 'integer',
                      minimum: 1,
                      maximum: 1000
                    },
                    reps_min: {
                      default: 8,
                      type: 'integer',
                      minimum: 1,
                      maximum: 1000
                    },
                    weight_kg: {
                      default: 0,
                      type: 'number',
                      minimum: 0,
                      maximum: 10000
                    },
                    seconds: {
                      default: 45,
                      type: 'number',
                      minimum: 0,
                      maximum: 86400
                    },
                    minutes: {
                      default: 20,
                      type: 'number',
                      minimum: 0,
                      maximum: 1440
                    },
                    speed_kmh: {
                      default: 8,
                      type: 'number',
                      minimum: 0,
                      maximum: 200
                    },
                    rest_seconds: {
                      default: 90,
                      type: 'integer',
                      minimum: 0,
                      maximum: 3600
                    },
                    progression: {
                      default: null,
                      anyOf: [
                        {
                          type: 'string',
                          enum: ['off', 'linear', 'greyskull', 'double', 'time']
                        },
                        {
                          type: 'null'
                        }
                      ]
                    },
                    increment: {
                      default: null,
                      anyOf: [
                        {
                          type: 'number',
                          exclusiveMinimum: 0,
                          maximum: 1000
                        },
                        {
                          type: 'null'
                        }
                      ]
                    }
                  },
                  required: [
                    'mode',
                    'sets',
                    'reps',
                    'reps_min',
                    'weight_kg',
                    'seconds',
                    'minutes',
                    'speed_kmh',
                    'rest_seconds',
                    'progression',
                    'increment'
                  ],
                  additionalProperties: false
                },
                sets: {
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
                      weight_kg: {
                        default: 0,
                        type: 'number',
                        minimum: 0,
                        maximum: 10000
                      },
                      reps: {
                        default: 0,
                        type: 'integer',
                        minimum: 0,
                        maximum: 1000
                      },
                      seconds: {
                        default: 0,
                        type: 'number',
                        minimum: 0,
                        maximum: 86400
                      },
                      minutes: {
                        default: 0,
                        type: 'number',
                        minimum: 0,
                        maximum: 1440
                      },
                      speed_kmh: {
                        default: 0,
                        type: 'number',
                        minimum: 0,
                        maximum: 200
                      },
                      done: {
                        default: false,
                        type: 'boolean'
                      },
                      rir: {
                        default: null,
                        anyOf: [
                          {
                            type: 'number',
                            minimum: 0,
                            maximum: 10
                          },
                          {
                            type: 'null'
                          }
                        ]
                      },
                      rpe: {
                        default: null,
                        anyOf: [
                          {
                            type: 'number',
                            minimum: 0,
                            maximum: 10
                          },
                          {
                            type: 'null'
                          }
                        ]
                      },
                      position: {
                        type: 'integer',
                        minimum: 0,
                        maximum: 9007199254740991
                      }
                    },
                    required: [
                      'id',
                      'weight_kg',
                      'reps',
                      'seconds',
                      'minutes',
                      'speed_kmh',
                      'done',
                      'rir',
                      'rpe',
                      'position'
                    ],
                    additionalProperties: false
                  }
                },
                position: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 9007199254740991
                },
                exercise: {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string',
                      minLength: 1,
                      maxLength: 160
                    },
                    mode: {
                      default: 'reps',
                      type: 'string',
                      enum: ['reps', 'time', 'cardio']
                    },
                    muscle_group: {
                      type: 'string',
                      enum: [
                        'chest',
                        'back',
                        'shoulders',
                        'biceps',
                        'triceps',
                        'forearms',
                        'quadriceps',
                        'hamstrings',
                        'glutes',
                        'calves',
                        'core',
                        'cardio',
                        'full-body'
                      ]
                    },
                    secondary_muscles: {
                      default: [],
                      maxItems: 12,
                      type: 'array',
                      items: {
                        type: 'string',
                        enum: [
                          'chest',
                          'back',
                          'shoulders',
                          'biceps',
                          'triceps',
                          'forearms',
                          'quadriceps',
                          'hamstrings',
                          'glutes',
                          'calves',
                          'core',
                          'cardio',
                          'full-body'
                        ]
                      }
                    },
                    equipment: {
                      default: '',
                      type: 'string',
                      maxLength: 100
                    },
                    instructions: {
                      default: '',
                      type: 'string',
                      maxLength: 10000
                    }
                  },
                  required: [
                    'name',
                    'mode',
                    'muscle_group',
                    'secondary_muscles',
                    'equipment',
                    'instructions'
                  ],
                  additionalProperties: false
                },
                suggestion: {
                  type: 'object',
                  properties: {
                    policy: {
                      type: 'string',
                      enum: ['off', 'linear', 'greyskull', 'double', 'time']
                    },
                    kind: {
                      type: 'string',
                      enum: ['off', 'first', 'up', 'hold', 'deload']
                    },
                    reason: {
                      type: 'string',
                      enum: [
                        'disabled',
                        'baseline',
                        'success',
                        'bodyweight-success',
                        'bodyweight-hold',
                        'amrap-double',
                        'miss',
                        'stalled',
                        'rep-range'
                      ]
                    },
                    weight_kg: {
                      type: 'number',
                      minimum: 0,
                      maximum: 10000
                    },
                    reps: {
                      type: 'integer',
                      exclusiveMinimum: 0,
                      maximum: 9007199254740991
                    },
                    seconds: {
                      type: 'number',
                      minimum: 0,
                      maximum: 86400
                    },
                    misses: {
                      default: 0,
                      type: 'integer',
                      minimum: 0,
                      maximum: 9007199254740991
                    }
                  },
                  required: ['policy', 'kind', 'reason', 'misses'],
                  additionalProperties: false
                }
              },
              required: [
                'id',
                'exercise_id',
                'superset_group',
                'target',
                'sets',
                'position',
                'exercise',
                'suggestion'
              ],
              additionalProperties: false
            }
          }
        },
        required: [
          'id',
          'routine_id',
          'name',
          'date',
          'status',
          'started_at',
          'finished_at',
          'notes',
          'bodyweight_kg',
          'revision',
          'current_entry_id',
          'rest_until',
          'work_timer',
          'entries'
        ],
        additionalProperties: false
      }
    }
  },
  resetData: {
    method: 'post',
    description:
      'Reset your core Gym data while preserving command and coach audit records',
    noAuth: false,
    encrypted: true,
    isDownloadable: false,
    media: null,
    input: {
      body: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          command_id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          },
          confirmation: {
            type: 'string',
            const: 'RESET GYM'
          }
        },
        required: ['command_id', 'confirmation'],
        additionalProperties: false
      }
    },
    output: {
      OK: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          reset: {
            type: 'boolean',
            const: true
          }
        },
        required: ['reset'],
        additionalProperties: false
      }
    }
  },
  saveBodyweight: {
    method: 'post',
    description:
      'Save or edit one bodyweight reading per civil day in kilograms',
    noAuth: false,
    encrypted: true,
    isDownloadable: false,
    media: null,
    input: {
      body: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          date: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}-\\d{2}$'
          },
          weight_kg: {
            type: 'number',
            exclusiveMinimum: 0,
            maximum: 1000
          },
          notes: {
            default: '',
            type: 'string',
            maxLength: 1000
          },
          id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          }
        },
        required: ['date', 'weight_kg', 'notes'],
        additionalProperties: false
      }
    },
    output: {
      OK: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          date: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}-\\d{2}$'
          },
          weight_kg: {
            type: 'number',
            exclusiveMinimum: 0,
            maximum: 1000
          },
          notes: {
            default: '',
            type: 'string',
            maxLength: 1000
          },
          id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          }
        },
        required: ['date', 'weight_kg', 'notes', 'id'],
        additionalProperties: false
      }
    }
  },
  setSchedule: {
    method: 'post',
    description:
      'Assign a routine or explicit rest to a weekday or date override',
    noAuth: false,
    encrypted: true,
    isDownloadable: false,
    media: null,
    input: {
      body: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          weekday: {
            default: null,
            anyOf: [
              {
                type: 'integer',
                minimum: 0,
                maximum: 6
              },
              {
                type: 'null'
              }
            ]
          },
          date: {
            default: null,
            anyOf: [
              {
                type: 'string',
                pattern: '^\\d{4}-\\d{2}-\\d{2}$'
              },
              {
                type: 'null'
              }
            ]
          },
          routine_id: {
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
        required: ['weekday', 'date', 'routine_id'],
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
          weekday: {
            anyOf: [
              {
                type: 'integer',
                minimum: 0,
                maximum: 6
              },
              {
                type: 'null'
              }
            ]
          },
          date: {
            anyOf: [
              {
                type: 'string',
                pattern: '^\\d{4}-\\d{2}-\\d{2}$'
              },
              {
                type: 'null'
              }
            ]
          },
          routine_id: {
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
        required: ['id', 'weekday', 'date', 'routine_id'],
        additionalProperties: false
      }
    }
  },
  snapshot: {
    method: 'get',
    description:
      'Read your native exercise library, plans, active session and training history',
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
          exercises: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 160
                },
                mode: {
                  default: 'reps',
                  type: 'string',
                  enum: ['reps', 'time', 'cardio']
                },
                muscle_group: {
                  type: 'string',
                  enum: [
                    'chest',
                    'back',
                    'shoulders',
                    'biceps',
                    'triceps',
                    'forearms',
                    'quadriceps',
                    'hamstrings',
                    'glutes',
                    'calves',
                    'core',
                    'cardio',
                    'full-body'
                  ]
                },
                secondary_muscles: {
                  default: [],
                  maxItems: 12,
                  type: 'array',
                  items: {
                    type: 'string',
                    enum: [
                      'chest',
                      'back',
                      'shoulders',
                      'biceps',
                      'triceps',
                      'forearms',
                      'quadriceps',
                      'hamstrings',
                      'glutes',
                      'calves',
                      'core',
                      'cardio',
                      'full-body'
                    ]
                  }
                },
                equipment: {
                  default: '',
                  type: 'string',
                  maxLength: 100
                },
                instructions: {
                  default: '',
                  type: 'string',
                  maxLength: 10000
                },
                id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                custom: {
                  type: 'boolean'
                },
                archived: {
                  type: 'boolean'
                },
                catalog_key: {
                  anyOf: [
                    {
                      type: 'string'
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                revision: {
                  type: 'integer',
                  exclusiveMinimum: 0,
                  maximum: 9007199254740991
                }
              },
              required: [
                'name',
                'mode',
                'muscle_group',
                'secondary_muscles',
                'equipment',
                'instructions',
                'id',
                'custom',
                'archived',
                'catalog_key',
                'revision'
              ],
              additionalProperties: false
            }
          },
          routines: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 160
                },
                notes: {
                  default: '',
                  type: 'string',
                  maxLength: 10000
                },
                progression: {
                  default: 'linear',
                  type: 'string',
                  enum: ['off', 'linear', 'greyskull', 'double', 'time']
                },
                entries: {
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
                      exercise_id: {
                        type: 'string',
                        format: 'uuid',
                        pattern:
                          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                      },
                      superset_group: {
                        default: null,
                        anyOf: [
                          {
                            type: 'string',
                            minLength: 1,
                            maxLength: 100
                          },
                          {
                            type: 'null'
                          }
                        ]
                      },
                      prescription: {
                        type: 'object',
                        properties: {
                          mode: {
                            default: 'reps',
                            type: 'string',
                            enum: ['reps', 'time', 'cardio']
                          },
                          sets: {
                            default: 3,
                            type: 'integer',
                            minimum: 1,
                            maximum: 50
                          },
                          reps: {
                            default: 10,
                            type: 'integer',
                            minimum: 1,
                            maximum: 1000
                          },
                          reps_min: {
                            default: 8,
                            type: 'integer',
                            minimum: 1,
                            maximum: 1000
                          },
                          weight_kg: {
                            default: 0,
                            type: 'number',
                            minimum: 0,
                            maximum: 10000
                          },
                          seconds: {
                            default: 45,
                            type: 'number',
                            minimum: 0,
                            maximum: 86400
                          },
                          minutes: {
                            default: 20,
                            type: 'number',
                            minimum: 0,
                            maximum: 1440
                          },
                          speed_kmh: {
                            default: 8,
                            type: 'number',
                            minimum: 0,
                            maximum: 200
                          },
                          rest_seconds: {
                            default: 90,
                            type: 'integer',
                            minimum: 0,
                            maximum: 3600
                          },
                          progression: {
                            default: null,
                            anyOf: [
                              {
                                type: 'string',
                                enum: [
                                  'off',
                                  'linear',
                                  'greyskull',
                                  'double',
                                  'time'
                                ]
                              },
                              {
                                type: 'null'
                              }
                            ]
                          },
                          increment: {
                            default: null,
                            anyOf: [
                              {
                                type: 'number',
                                exclusiveMinimum: 0,
                                maximum: 1000
                              },
                              {
                                type: 'null'
                              }
                            ]
                          }
                        },
                        required: [
                          'mode',
                          'sets',
                          'reps',
                          'reps_min',
                          'weight_kg',
                          'seconds',
                          'minutes',
                          'speed_kmh',
                          'rest_seconds',
                          'progression',
                          'increment'
                        ],
                        additionalProperties: false
                      },
                      position: {
                        type: 'integer',
                        minimum: 0,
                        maximum: 9007199254740991
                      }
                    },
                    required: [
                      'id',
                      'exercise_id',
                      'superset_group',
                      'prescription',
                      'position'
                    ],
                    additionalProperties: false
                  }
                },
                id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                revision: {
                  type: 'integer',
                  exclusiveMinimum: 0,
                  maximum: 9007199254740991
                },
                archived: {
                  type: 'boolean'
                }
              },
              required: [
                'name',
                'notes',
                'progression',
                'entries',
                'id',
                'revision',
                'archived'
              ],
              additionalProperties: false
            }
          },
          schedule: {
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
                weekday: {
                  anyOf: [
                    {
                      type: 'integer',
                      minimum: 0,
                      maximum: 6
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                date: {
                  anyOf: [
                    {
                      type: 'string',
                      pattern: '^\\d{4}-\\d{2}-\\d{2}$'
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                routine_id: {
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
              required: ['id', 'weekday', 'date', 'routine_id'],
              additionalProperties: false
            }
          },
          workouts: {
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
                routine_id: {
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
                name: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 160
                },
                date: {
                  type: 'string',
                  pattern: '^\\d{4}-\\d{2}-\\d{2}$'
                },
                status: {
                  type: 'string',
                  enum: ['active', 'completed', 'discarded']
                },
                started_at: {
                  type: 'string',
                  format: 'date-time',
                  pattern:
                    '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$'
                },
                finished_at: {
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
                notes: {
                  type: 'string'
                },
                bodyweight_kg: {
                  anyOf: [
                    {
                      type: 'number',
                      exclusiveMinimum: 0
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                revision: {
                  type: 'integer',
                  exclusiveMinimum: 0,
                  maximum: 9007199254740991
                },
                current_entry_id: {
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
                rest_until: {
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
                work_timer: {
                  default: null,
                  anyOf: [
                    {
                      type: 'object',
                      properties: {
                        entry_id: {
                          type: 'string',
                          format: 'uuid',
                          pattern:
                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                        },
                        set_id: {
                          type: 'string',
                          format: 'uuid',
                          pattern:
                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                        },
                        started_at: {
                          type: 'string',
                          format: 'date-time',
                          pattern:
                            '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$'
                        },
                        target_seconds: {
                          type: 'integer',
                          exclusiveMinimum: 0,
                          maximum: 86400
                        }
                      },
                      required: [
                        'entry_id',
                        'set_id',
                        'started_at',
                        'target_seconds'
                      ],
                      additionalProperties: false
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                entries: {
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
                      exercise_id: {
                        type: 'string',
                        format: 'uuid',
                        pattern:
                          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                      },
                      superset_group: {
                        default: null,
                        anyOf: [
                          {
                            type: 'string',
                            minLength: 1,
                            maxLength: 100
                          },
                          {
                            type: 'null'
                          }
                        ]
                      },
                      target: {
                        type: 'object',
                        properties: {
                          mode: {
                            default: 'reps',
                            type: 'string',
                            enum: ['reps', 'time', 'cardio']
                          },
                          sets: {
                            default: 3,
                            type: 'integer',
                            minimum: 1,
                            maximum: 50
                          },
                          reps: {
                            default: 10,
                            type: 'integer',
                            minimum: 1,
                            maximum: 1000
                          },
                          reps_min: {
                            default: 8,
                            type: 'integer',
                            minimum: 1,
                            maximum: 1000
                          },
                          weight_kg: {
                            default: 0,
                            type: 'number',
                            minimum: 0,
                            maximum: 10000
                          },
                          seconds: {
                            default: 45,
                            type: 'number',
                            minimum: 0,
                            maximum: 86400
                          },
                          minutes: {
                            default: 20,
                            type: 'number',
                            minimum: 0,
                            maximum: 1440
                          },
                          speed_kmh: {
                            default: 8,
                            type: 'number',
                            minimum: 0,
                            maximum: 200
                          },
                          rest_seconds: {
                            default: 90,
                            type: 'integer',
                            minimum: 0,
                            maximum: 3600
                          },
                          progression: {
                            default: null,
                            anyOf: [
                              {
                                type: 'string',
                                enum: [
                                  'off',
                                  'linear',
                                  'greyskull',
                                  'double',
                                  'time'
                                ]
                              },
                              {
                                type: 'null'
                              }
                            ]
                          },
                          increment: {
                            default: null,
                            anyOf: [
                              {
                                type: 'number',
                                exclusiveMinimum: 0,
                                maximum: 1000
                              },
                              {
                                type: 'null'
                              }
                            ]
                          }
                        },
                        required: [
                          'mode',
                          'sets',
                          'reps',
                          'reps_min',
                          'weight_kg',
                          'seconds',
                          'minutes',
                          'speed_kmh',
                          'rest_seconds',
                          'progression',
                          'increment'
                        ],
                        additionalProperties: false
                      },
                      sets: {
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
                            weight_kg: {
                              default: 0,
                              type: 'number',
                              minimum: 0,
                              maximum: 10000
                            },
                            reps: {
                              default: 0,
                              type: 'integer',
                              minimum: 0,
                              maximum: 1000
                            },
                            seconds: {
                              default: 0,
                              type: 'number',
                              minimum: 0,
                              maximum: 86400
                            },
                            minutes: {
                              default: 0,
                              type: 'number',
                              minimum: 0,
                              maximum: 1440
                            },
                            speed_kmh: {
                              default: 0,
                              type: 'number',
                              minimum: 0,
                              maximum: 200
                            },
                            done: {
                              default: false,
                              type: 'boolean'
                            },
                            rir: {
                              default: null,
                              anyOf: [
                                {
                                  type: 'number',
                                  minimum: 0,
                                  maximum: 10
                                },
                                {
                                  type: 'null'
                                }
                              ]
                            },
                            rpe: {
                              default: null,
                              anyOf: [
                                {
                                  type: 'number',
                                  minimum: 0,
                                  maximum: 10
                                },
                                {
                                  type: 'null'
                                }
                              ]
                            },
                            position: {
                              type: 'integer',
                              minimum: 0,
                              maximum: 9007199254740991
                            }
                          },
                          required: [
                            'id',
                            'weight_kg',
                            'reps',
                            'seconds',
                            'minutes',
                            'speed_kmh',
                            'done',
                            'rir',
                            'rpe',
                            'position'
                          ],
                          additionalProperties: false
                        }
                      },
                      position: {
                        type: 'integer',
                        minimum: 0,
                        maximum: 9007199254740991
                      },
                      exercise: {
                        type: 'object',
                        properties: {
                          name: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 160
                          },
                          mode: {
                            default: 'reps',
                            type: 'string',
                            enum: ['reps', 'time', 'cardio']
                          },
                          muscle_group: {
                            type: 'string',
                            enum: [
                              'chest',
                              'back',
                              'shoulders',
                              'biceps',
                              'triceps',
                              'forearms',
                              'quadriceps',
                              'hamstrings',
                              'glutes',
                              'calves',
                              'core',
                              'cardio',
                              'full-body'
                            ]
                          },
                          secondary_muscles: {
                            default: [],
                            maxItems: 12,
                            type: 'array',
                            items: {
                              type: 'string',
                              enum: [
                                'chest',
                                'back',
                                'shoulders',
                                'biceps',
                                'triceps',
                                'forearms',
                                'quadriceps',
                                'hamstrings',
                                'glutes',
                                'calves',
                                'core',
                                'cardio',
                                'full-body'
                              ]
                            }
                          },
                          equipment: {
                            default: '',
                            type: 'string',
                            maxLength: 100
                          },
                          instructions: {
                            default: '',
                            type: 'string',
                            maxLength: 10000
                          }
                        },
                        required: [
                          'name',
                          'mode',
                          'muscle_group',
                          'secondary_muscles',
                          'equipment',
                          'instructions'
                        ],
                        additionalProperties: false
                      },
                      suggestion: {
                        type: 'object',
                        properties: {
                          policy: {
                            type: 'string',
                            enum: [
                              'off',
                              'linear',
                              'greyskull',
                              'double',
                              'time'
                            ]
                          },
                          kind: {
                            type: 'string',
                            enum: ['off', 'first', 'up', 'hold', 'deload']
                          },
                          reason: {
                            type: 'string',
                            enum: [
                              'disabled',
                              'baseline',
                              'success',
                              'bodyweight-success',
                              'bodyweight-hold',
                              'amrap-double',
                              'miss',
                              'stalled',
                              'rep-range'
                            ]
                          },
                          weight_kg: {
                            type: 'number',
                            minimum: 0,
                            maximum: 10000
                          },
                          reps: {
                            type: 'integer',
                            exclusiveMinimum: 0,
                            maximum: 9007199254740991
                          },
                          seconds: {
                            type: 'number',
                            minimum: 0,
                            maximum: 86400
                          },
                          misses: {
                            default: 0,
                            type: 'integer',
                            minimum: 0,
                            maximum: 9007199254740991
                          }
                        },
                        required: ['policy', 'kind', 'reason', 'misses'],
                        additionalProperties: false
                      }
                    },
                    required: [
                      'id',
                      'exercise_id',
                      'superset_group',
                      'target',
                      'sets',
                      'position',
                      'exercise',
                      'suggestion'
                    ],
                    additionalProperties: false
                  }
                }
              },
              required: [
                'id',
                'routine_id',
                'name',
                'date',
                'status',
                'started_at',
                'finished_at',
                'notes',
                'bodyweight_kg',
                'revision',
                'current_entry_id',
                'rest_until',
                'work_timer',
                'entries'
              ],
              additionalProperties: false
            }
          },
          active: {
            anyOf: [
              {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  routine_id: {
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
                  name: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 160
                  },
                  date: {
                    type: 'string',
                    pattern: '^\\d{4}-\\d{2}-\\d{2}$'
                  },
                  status: {
                    type: 'string',
                    enum: ['active', 'completed', 'discarded']
                  },
                  started_at: {
                    type: 'string',
                    format: 'date-time',
                    pattern:
                      '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$'
                  },
                  finished_at: {
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
                  notes: {
                    type: 'string'
                  },
                  bodyweight_kg: {
                    anyOf: [
                      {
                        type: 'number',
                        exclusiveMinimum: 0
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  revision: {
                    type: 'integer',
                    exclusiveMinimum: 0,
                    maximum: 9007199254740991
                  },
                  current_entry_id: {
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
                  rest_until: {
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
                  work_timer: {
                    default: null,
                    anyOf: [
                      {
                        type: 'object',
                        properties: {
                          entry_id: {
                            type: 'string',
                            format: 'uuid',
                            pattern:
                              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                          },
                          set_id: {
                            type: 'string',
                            format: 'uuid',
                            pattern:
                              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                          },
                          started_at: {
                            type: 'string',
                            format: 'date-time',
                            pattern:
                              '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$'
                          },
                          target_seconds: {
                            type: 'integer',
                            exclusiveMinimum: 0,
                            maximum: 86400
                          }
                        },
                        required: [
                          'entry_id',
                          'set_id',
                          'started_at',
                          'target_seconds'
                        ],
                        additionalProperties: false
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  entries: {
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
                        exercise_id: {
                          type: 'string',
                          format: 'uuid',
                          pattern:
                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                        },
                        superset_group: {
                          default: null,
                          anyOf: [
                            {
                              type: 'string',
                              minLength: 1,
                              maxLength: 100
                            },
                            {
                              type: 'null'
                            }
                          ]
                        },
                        target: {
                          type: 'object',
                          properties: {
                            mode: {
                              default: 'reps',
                              type: 'string',
                              enum: ['reps', 'time', 'cardio']
                            },
                            sets: {
                              default: 3,
                              type: 'integer',
                              minimum: 1,
                              maximum: 50
                            },
                            reps: {
                              default: 10,
                              type: 'integer',
                              minimum: 1,
                              maximum: 1000
                            },
                            reps_min: {
                              default: 8,
                              type: 'integer',
                              minimum: 1,
                              maximum: 1000
                            },
                            weight_kg: {
                              default: 0,
                              type: 'number',
                              minimum: 0,
                              maximum: 10000
                            },
                            seconds: {
                              default: 45,
                              type: 'number',
                              minimum: 0,
                              maximum: 86400
                            },
                            minutes: {
                              default: 20,
                              type: 'number',
                              minimum: 0,
                              maximum: 1440
                            },
                            speed_kmh: {
                              default: 8,
                              type: 'number',
                              minimum: 0,
                              maximum: 200
                            },
                            rest_seconds: {
                              default: 90,
                              type: 'integer',
                              minimum: 0,
                              maximum: 3600
                            },
                            progression: {
                              default: null,
                              anyOf: [
                                {
                                  type: 'string',
                                  enum: [
                                    'off',
                                    'linear',
                                    'greyskull',
                                    'double',
                                    'time'
                                  ]
                                },
                                {
                                  type: 'null'
                                }
                              ]
                            },
                            increment: {
                              default: null,
                              anyOf: [
                                {
                                  type: 'number',
                                  exclusiveMinimum: 0,
                                  maximum: 1000
                                },
                                {
                                  type: 'null'
                                }
                              ]
                            }
                          },
                          required: [
                            'mode',
                            'sets',
                            'reps',
                            'reps_min',
                            'weight_kg',
                            'seconds',
                            'minutes',
                            'speed_kmh',
                            'rest_seconds',
                            'progression',
                            'increment'
                          ],
                          additionalProperties: false
                        },
                        sets: {
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
                              weight_kg: {
                                default: 0,
                                type: 'number',
                                minimum: 0,
                                maximum: 10000
                              },
                              reps: {
                                default: 0,
                                type: 'integer',
                                minimum: 0,
                                maximum: 1000
                              },
                              seconds: {
                                default: 0,
                                type: 'number',
                                minimum: 0,
                                maximum: 86400
                              },
                              minutes: {
                                default: 0,
                                type: 'number',
                                minimum: 0,
                                maximum: 1440
                              },
                              speed_kmh: {
                                default: 0,
                                type: 'number',
                                minimum: 0,
                                maximum: 200
                              },
                              done: {
                                default: false,
                                type: 'boolean'
                              },
                              rir: {
                                default: null,
                                anyOf: [
                                  {
                                    type: 'number',
                                    minimum: 0,
                                    maximum: 10
                                  },
                                  {
                                    type: 'null'
                                  }
                                ]
                              },
                              rpe: {
                                default: null,
                                anyOf: [
                                  {
                                    type: 'number',
                                    minimum: 0,
                                    maximum: 10
                                  },
                                  {
                                    type: 'null'
                                  }
                                ]
                              },
                              position: {
                                type: 'integer',
                                minimum: 0,
                                maximum: 9007199254740991
                              }
                            },
                            required: [
                              'id',
                              'weight_kg',
                              'reps',
                              'seconds',
                              'minutes',
                              'speed_kmh',
                              'done',
                              'rir',
                              'rpe',
                              'position'
                            ],
                            additionalProperties: false
                          }
                        },
                        position: {
                          type: 'integer',
                          minimum: 0,
                          maximum: 9007199254740991
                        },
                        exercise: {
                          type: 'object',
                          properties: {
                            name: {
                              type: 'string',
                              minLength: 1,
                              maxLength: 160
                            },
                            mode: {
                              default: 'reps',
                              type: 'string',
                              enum: ['reps', 'time', 'cardio']
                            },
                            muscle_group: {
                              type: 'string',
                              enum: [
                                'chest',
                                'back',
                                'shoulders',
                                'biceps',
                                'triceps',
                                'forearms',
                                'quadriceps',
                                'hamstrings',
                                'glutes',
                                'calves',
                                'core',
                                'cardio',
                                'full-body'
                              ]
                            },
                            secondary_muscles: {
                              default: [],
                              maxItems: 12,
                              type: 'array',
                              items: {
                                type: 'string',
                                enum: [
                                  'chest',
                                  'back',
                                  'shoulders',
                                  'biceps',
                                  'triceps',
                                  'forearms',
                                  'quadriceps',
                                  'hamstrings',
                                  'glutes',
                                  'calves',
                                  'core',
                                  'cardio',
                                  'full-body'
                                ]
                              }
                            },
                            equipment: {
                              default: '',
                              type: 'string',
                              maxLength: 100
                            },
                            instructions: {
                              default: '',
                              type: 'string',
                              maxLength: 10000
                            }
                          },
                          required: [
                            'name',
                            'mode',
                            'muscle_group',
                            'secondary_muscles',
                            'equipment',
                            'instructions'
                          ],
                          additionalProperties: false
                        },
                        suggestion: {
                          type: 'object',
                          properties: {
                            policy: {
                              type: 'string',
                              enum: [
                                'off',
                                'linear',
                                'greyskull',
                                'double',
                                'time'
                              ]
                            },
                            kind: {
                              type: 'string',
                              enum: ['off', 'first', 'up', 'hold', 'deload']
                            },
                            reason: {
                              type: 'string',
                              enum: [
                                'disabled',
                                'baseline',
                                'success',
                                'bodyweight-success',
                                'bodyweight-hold',
                                'amrap-double',
                                'miss',
                                'stalled',
                                'rep-range'
                              ]
                            },
                            weight_kg: {
                              type: 'number',
                              minimum: 0,
                              maximum: 10000
                            },
                            reps: {
                              type: 'integer',
                              exclusiveMinimum: 0,
                              maximum: 9007199254740991
                            },
                            seconds: {
                              type: 'number',
                              minimum: 0,
                              maximum: 86400
                            },
                            misses: {
                              default: 0,
                              type: 'integer',
                              minimum: 0,
                              maximum: 9007199254740991
                            }
                          },
                          required: ['policy', 'kind', 'reason', 'misses'],
                          additionalProperties: false
                        }
                      },
                      required: [
                        'id',
                        'exercise_id',
                        'superset_group',
                        'target',
                        'sets',
                        'position',
                        'exercise',
                        'suggestion'
                      ],
                      additionalProperties: false
                    }
                  }
                },
                required: [
                  'id',
                  'routine_id',
                  'name',
                  'date',
                  'status',
                  'started_at',
                  'finished_at',
                  'notes',
                  'bodyweight_kg',
                  'revision',
                  'current_entry_id',
                  'rest_until',
                  'work_timer',
                  'entries'
                ],
                additionalProperties: false
              },
              {
                type: 'null'
              }
            ]
          },
          bodyweight: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                date: {
                  type: 'string',
                  pattern: '^\\d{4}-\\d{2}-\\d{2}$'
                },
                weight_kg: {
                  type: 'number',
                  exclusiveMinimum: 0,
                  maximum: 1000
                },
                notes: {
                  default: '',
                  type: 'string',
                  maxLength: 1000
                },
                id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                }
              },
              required: ['date', 'weight_kg', 'notes', 'id'],
              additionalProperties: false
            }
          },
          settings: {
            type: 'object',
            properties: {
              unit: {
                default: 'kg',
                type: 'string',
                enum: ['kg', 'lb']
              },
              rest_seconds: {
                default: 90,
                type: 'integer',
                minimum: 0,
                maximum: 3600
              },
              effort: {
                default: 'none',
                type: 'string',
                enum: ['none', 'rir', 'rpe']
              },
              sound: {
                default: true,
                type: 'boolean'
              },
              keep_awake: {
                default: true,
                type: 'boolean'
              },
              body_style: {
                default: 'male',
                type: 'string',
                enum: ['male', 'female']
              },
              target_weight_kg: {
                default: null,
                anyOf: [
                  {
                    type: 'number',
                    exclusiveMinimum: 0,
                    maximum: 1000
                  },
                  {
                    type: 'null'
                  }
                ]
              },
              weekly_workout_goal: {
                default: 3,
                type: 'integer',
                minimum: 0,
                maximum: 14
              },
              formula: {
                default: 'epley',
                type: 'string',
                enum: ['epley', 'brzycki', 'lombardi']
              },
              reminder_enabled: {
                default: false,
                type: 'boolean'
              },
              reminder_time: {
                default: '08:00',
                type: 'string',
                pattern: '^(?:[01]\\d|2[0-3]):[0-5]\\d$'
              },
              timezone: {
                default: 'UTC',
                type: 'string',
                minLength: 1,
                maxLength: 100
              },
              revision: {
                type: 'integer',
                exclusiveMinimum: 0,
                maximum: 9007199254740991
              }
            },
            required: [
              'unit',
              'rest_seconds',
              'effort',
              'sound',
              'keep_awake',
              'body_style',
              'target_weight_kg',
              'weekly_workout_goal',
              'formula',
              'reminder_enabled',
              'reminder_time',
              'timezone',
              'revision'
            ],
            additionalProperties: false
          },
          stats: {
            type: 'object',
            properties: {
              workouts: {
                type: 'integer',
                minimum: 0,
                maximum: 9007199254740991
              },
              completed_sets: {
                type: 'integer',
                minimum: 0,
                maximum: 9007199254740991
              },
              volume_kg: {
                type: 'number',
                minimum: 0
              },
              duration_seconds: {
                type: 'number',
                minimum: 0
              },
              streak_weeks: {
                type: 'integer',
                minimum: 0,
                maximum: 9007199254740991
              },
              heatmap: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    date: {
                      type: 'string',
                      pattern: '^\\d{4}-\\d{2}-\\d{2}$'
                    },
                    workouts: {
                      type: 'integer',
                      exclusiveMinimum: 0,
                      maximum: 9007199254740991
                    },
                    sets: {
                      type: 'integer',
                      minimum: 0,
                      maximum: 9007199254740991
                    },
                    volume_kg: {
                      type: 'number',
                      minimum: 0
                    }
                  },
                  required: ['date', 'workouts', 'sets', 'volume_kg'],
                  additionalProperties: false
                }
              },
              muscles: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    muscle_group: {
                      type: 'string',
                      enum: [
                        'chest',
                        'back',
                        'shoulders',
                        'biceps',
                        'triceps',
                        'forearms',
                        'quadriceps',
                        'hamstrings',
                        'glutes',
                        'calves',
                        'core',
                        'cardio',
                        'full-body'
                      ]
                    },
                    sets: {
                      type: 'number',
                      minimum: 0
                    },
                    hard_sets: {
                      type: 'number',
                      minimum: 0
                    }
                  },
                  required: ['muscle_group', 'sets', 'hard_sets'],
                  additionalProperties: false
                }
              },
              effort: {
                type: 'object',
                properties: {
                  rated_sets: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 9007199254740991
                  },
                  average_rir: {
                    anyOf: [
                      {
                        type: 'number'
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  hard_sets: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 9007199254740991
                  },
                  histogram: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        rir: {
                          type: 'number'
                        },
                        sets: {
                          type: 'integer',
                          minimum: 0,
                          maximum: 9007199254740991
                        }
                      },
                      required: ['rir', 'sets'],
                      additionalProperties: false
                    }
                  }
                },
                required: [
                  'rated_sets',
                  'average_rir',
                  'hard_sets',
                  'histogram'
                ],
                additionalProperties: false
              },
              records: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    exercise_id: {
                      type: 'string',
                      format: 'uuid',
                      pattern:
                        '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                    },
                    name: {
                      type: 'string'
                    },
                    estimate_kg: {
                      type: 'number',
                      exclusiveMinimum: 0
                    },
                    weight_kg: {
                      type: 'number',
                      exclusiveMinimum: 0
                    },
                    reps: {
                      type: 'integer',
                      exclusiveMinimum: 0,
                      maximum: 9007199254740991
                    },
                    date: {
                      type: 'string',
                      pattern: '^\\d{4}-\\d{2}-\\d{2}$'
                    },
                    workout_id: {
                      type: 'string',
                      format: 'uuid',
                      pattern:
                        '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                    }
                  },
                  required: [
                    'exercise_id',
                    'name',
                    'estimate_kg',
                    'weight_kg',
                    'reps',
                    'date',
                    'workout_id'
                  ],
                  additionalProperties: false
                }
              },
              exercise_trends: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    exercise_id: {
                      type: 'string',
                      format: 'uuid',
                      pattern:
                        '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                    },
                    date: {
                      type: 'string',
                      pattern: '^\\d{4}-\\d{2}-\\d{2}$'
                    },
                    workout_id: {
                      type: 'string',
                      format: 'uuid',
                      pattern:
                        '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                    },
                    volume_kg: {
                      type: 'number',
                      minimum: 0
                    },
                    best_weight_kg: {
                      type: 'number',
                      minimum: 0
                    },
                    estimate_kg: {
                      anyOf: [
                        {
                          type: 'number'
                        },
                        {
                          type: 'null'
                        }
                      ]
                    }
                  },
                  required: [
                    'exercise_id',
                    'date',
                    'workout_id',
                    'volume_kg',
                    'best_weight_kg',
                    'estimate_kg'
                  ],
                  additionalProperties: false
                }
              }
            },
            required: [
              'workouts',
              'completed_sets',
              'volume_kg',
              'duration_seconds',
              'streak_weeks',
              'heatmap',
              'muscles',
              'effort',
              'records',
              'exercise_trends'
            ],
            additionalProperties: false
          }
        },
        required: [
          'exercises',
          'routines',
          'schedule',
          'workouts',
          'active',
          'bodyweight',
          'settings',
          'stats'
        ],
        additionalProperties: false
      }
    }
  },
  startWorkout: {
    method: 'post',
    description:
      'Start one recoverable session with derived progression targets',
    noAuth: false,
    encrypted: true,
    isDownloadable: false,
    media: null,
    input: {
      body: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          command_id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          },
          routine_id: {
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
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 160
          },
          date: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}-\\d{2}$'
          },
          bodyweight_kg: {
            anyOf: [
              {
                type: 'number',
                exclusiveMinimum: 0,
                maximum: 1000
              },
              {
                type: 'null'
              }
            ]
          }
        },
        required: ['command_id'],
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
          routine_id: {
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
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 160
          },
          date: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}-\\d{2}$'
          },
          status: {
            type: 'string',
            enum: ['active', 'completed', 'discarded']
          },
          started_at: {
            type: 'string',
            format: 'date-time',
            pattern:
              '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$'
          },
          finished_at: {
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
          notes: {
            type: 'string'
          },
          bodyweight_kg: {
            anyOf: [
              {
                type: 'number',
                exclusiveMinimum: 0
              },
              {
                type: 'null'
              }
            ]
          },
          revision: {
            type: 'integer',
            exclusiveMinimum: 0,
            maximum: 9007199254740991
          },
          current_entry_id: {
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
          rest_until: {
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
          work_timer: {
            default: null,
            anyOf: [
              {
                type: 'object',
                properties: {
                  entry_id: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  set_id: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  started_at: {
                    type: 'string',
                    format: 'date-time',
                    pattern:
                      '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$'
                  },
                  target_seconds: {
                    type: 'integer',
                    exclusiveMinimum: 0,
                    maximum: 86400
                  }
                },
                required: [
                  'entry_id',
                  'set_id',
                  'started_at',
                  'target_seconds'
                ],
                additionalProperties: false
              },
              {
                type: 'null'
              }
            ]
          },
          entries: {
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
                exercise_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                superset_group: {
                  default: null,
                  anyOf: [
                    {
                      type: 'string',
                      minLength: 1,
                      maxLength: 100
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                target: {
                  type: 'object',
                  properties: {
                    mode: {
                      default: 'reps',
                      type: 'string',
                      enum: ['reps', 'time', 'cardio']
                    },
                    sets: {
                      default: 3,
                      type: 'integer',
                      minimum: 1,
                      maximum: 50
                    },
                    reps: {
                      default: 10,
                      type: 'integer',
                      minimum: 1,
                      maximum: 1000
                    },
                    reps_min: {
                      default: 8,
                      type: 'integer',
                      minimum: 1,
                      maximum: 1000
                    },
                    weight_kg: {
                      default: 0,
                      type: 'number',
                      minimum: 0,
                      maximum: 10000
                    },
                    seconds: {
                      default: 45,
                      type: 'number',
                      minimum: 0,
                      maximum: 86400
                    },
                    minutes: {
                      default: 20,
                      type: 'number',
                      minimum: 0,
                      maximum: 1440
                    },
                    speed_kmh: {
                      default: 8,
                      type: 'number',
                      minimum: 0,
                      maximum: 200
                    },
                    rest_seconds: {
                      default: 90,
                      type: 'integer',
                      minimum: 0,
                      maximum: 3600
                    },
                    progression: {
                      default: null,
                      anyOf: [
                        {
                          type: 'string',
                          enum: ['off', 'linear', 'greyskull', 'double', 'time']
                        },
                        {
                          type: 'null'
                        }
                      ]
                    },
                    increment: {
                      default: null,
                      anyOf: [
                        {
                          type: 'number',
                          exclusiveMinimum: 0,
                          maximum: 1000
                        },
                        {
                          type: 'null'
                        }
                      ]
                    }
                  },
                  required: [
                    'mode',
                    'sets',
                    'reps',
                    'reps_min',
                    'weight_kg',
                    'seconds',
                    'minutes',
                    'speed_kmh',
                    'rest_seconds',
                    'progression',
                    'increment'
                  ],
                  additionalProperties: false
                },
                sets: {
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
                      weight_kg: {
                        default: 0,
                        type: 'number',
                        minimum: 0,
                        maximum: 10000
                      },
                      reps: {
                        default: 0,
                        type: 'integer',
                        minimum: 0,
                        maximum: 1000
                      },
                      seconds: {
                        default: 0,
                        type: 'number',
                        minimum: 0,
                        maximum: 86400
                      },
                      minutes: {
                        default: 0,
                        type: 'number',
                        minimum: 0,
                        maximum: 1440
                      },
                      speed_kmh: {
                        default: 0,
                        type: 'number',
                        minimum: 0,
                        maximum: 200
                      },
                      done: {
                        default: false,
                        type: 'boolean'
                      },
                      rir: {
                        default: null,
                        anyOf: [
                          {
                            type: 'number',
                            minimum: 0,
                            maximum: 10
                          },
                          {
                            type: 'null'
                          }
                        ]
                      },
                      rpe: {
                        default: null,
                        anyOf: [
                          {
                            type: 'number',
                            minimum: 0,
                            maximum: 10
                          },
                          {
                            type: 'null'
                          }
                        ]
                      },
                      position: {
                        type: 'integer',
                        minimum: 0,
                        maximum: 9007199254740991
                      }
                    },
                    required: [
                      'id',
                      'weight_kg',
                      'reps',
                      'seconds',
                      'minutes',
                      'speed_kmh',
                      'done',
                      'rir',
                      'rpe',
                      'position'
                    ],
                    additionalProperties: false
                  }
                },
                position: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 9007199254740991
                },
                exercise: {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string',
                      minLength: 1,
                      maxLength: 160
                    },
                    mode: {
                      default: 'reps',
                      type: 'string',
                      enum: ['reps', 'time', 'cardio']
                    },
                    muscle_group: {
                      type: 'string',
                      enum: [
                        'chest',
                        'back',
                        'shoulders',
                        'biceps',
                        'triceps',
                        'forearms',
                        'quadriceps',
                        'hamstrings',
                        'glutes',
                        'calves',
                        'core',
                        'cardio',
                        'full-body'
                      ]
                    },
                    secondary_muscles: {
                      default: [],
                      maxItems: 12,
                      type: 'array',
                      items: {
                        type: 'string',
                        enum: [
                          'chest',
                          'back',
                          'shoulders',
                          'biceps',
                          'triceps',
                          'forearms',
                          'quadriceps',
                          'hamstrings',
                          'glutes',
                          'calves',
                          'core',
                          'cardio',
                          'full-body'
                        ]
                      }
                    },
                    equipment: {
                      default: '',
                      type: 'string',
                      maxLength: 100
                    },
                    instructions: {
                      default: '',
                      type: 'string',
                      maxLength: 10000
                    }
                  },
                  required: [
                    'name',
                    'mode',
                    'muscle_group',
                    'secondary_muscles',
                    'equipment',
                    'instructions'
                  ],
                  additionalProperties: false
                },
                suggestion: {
                  type: 'object',
                  properties: {
                    policy: {
                      type: 'string',
                      enum: ['off', 'linear', 'greyskull', 'double', 'time']
                    },
                    kind: {
                      type: 'string',
                      enum: ['off', 'first', 'up', 'hold', 'deload']
                    },
                    reason: {
                      type: 'string',
                      enum: [
                        'disabled',
                        'baseline',
                        'success',
                        'bodyweight-success',
                        'bodyweight-hold',
                        'amrap-double',
                        'miss',
                        'stalled',
                        'rep-range'
                      ]
                    },
                    weight_kg: {
                      type: 'number',
                      minimum: 0,
                      maximum: 10000
                    },
                    reps: {
                      type: 'integer',
                      exclusiveMinimum: 0,
                      maximum: 9007199254740991
                    },
                    seconds: {
                      type: 'number',
                      minimum: 0,
                      maximum: 86400
                    },
                    misses: {
                      default: 0,
                      type: 'integer',
                      minimum: 0,
                      maximum: 9007199254740991
                    }
                  },
                  required: ['policy', 'kind', 'reason', 'misses'],
                  additionalProperties: false
                }
              },
              required: [
                'id',
                'exercise_id',
                'superset_group',
                'target',
                'sets',
                'position',
                'exercise',
                'suggestion'
              ],
              additionalProperties: false
            }
          }
        },
        required: [
          'id',
          'routine_id',
          'name',
          'date',
          'status',
          'started_at',
          'finished_at',
          'notes',
          'bodyweight_kg',
          'revision',
          'current_entry_id',
          'rest_until',
          'work_timer',
          'entries'
        ],
        additionalProperties: false
      }
    }
  },
  starterPlan: {
    method: 'post',
    description:
      'Add a Push/Pull/Legs starter plan once without replacing current plans',
    noAuth: false,
    encrypted: true,
    isDownloadable: false,
    media: null,
    input: {
      body: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          command_id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          }
        },
        required: ['command_id'],
        additionalProperties: false
      }
    },
    output: {
      CREATED: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 160
            },
            notes: {
              default: '',
              type: 'string',
              maxLength: 10000
            },
            progression: {
              default: 'linear',
              type: 'string',
              enum: ['off', 'linear', 'greyskull', 'double', 'time']
            },
            entries: {
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
                  exercise_id: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  superset_group: {
                    default: null,
                    anyOf: [
                      {
                        type: 'string',
                        minLength: 1,
                        maxLength: 100
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  prescription: {
                    type: 'object',
                    properties: {
                      mode: {
                        default: 'reps',
                        type: 'string',
                        enum: ['reps', 'time', 'cardio']
                      },
                      sets: {
                        default: 3,
                        type: 'integer',
                        minimum: 1,
                        maximum: 50
                      },
                      reps: {
                        default: 10,
                        type: 'integer',
                        minimum: 1,
                        maximum: 1000
                      },
                      reps_min: {
                        default: 8,
                        type: 'integer',
                        minimum: 1,
                        maximum: 1000
                      },
                      weight_kg: {
                        default: 0,
                        type: 'number',
                        minimum: 0,
                        maximum: 10000
                      },
                      seconds: {
                        default: 45,
                        type: 'number',
                        minimum: 0,
                        maximum: 86400
                      },
                      minutes: {
                        default: 20,
                        type: 'number',
                        minimum: 0,
                        maximum: 1440
                      },
                      speed_kmh: {
                        default: 8,
                        type: 'number',
                        minimum: 0,
                        maximum: 200
                      },
                      rest_seconds: {
                        default: 90,
                        type: 'integer',
                        minimum: 0,
                        maximum: 3600
                      },
                      progression: {
                        default: null,
                        anyOf: [
                          {
                            type: 'string',
                            enum: [
                              'off',
                              'linear',
                              'greyskull',
                              'double',
                              'time'
                            ]
                          },
                          {
                            type: 'null'
                          }
                        ]
                      },
                      increment: {
                        default: null,
                        anyOf: [
                          {
                            type: 'number',
                            exclusiveMinimum: 0,
                            maximum: 1000
                          },
                          {
                            type: 'null'
                          }
                        ]
                      }
                    },
                    required: [
                      'mode',
                      'sets',
                      'reps',
                      'reps_min',
                      'weight_kg',
                      'seconds',
                      'minutes',
                      'speed_kmh',
                      'rest_seconds',
                      'progression',
                      'increment'
                    ],
                    additionalProperties: false
                  },
                  position: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 9007199254740991
                  }
                },
                required: [
                  'id',
                  'exercise_id',
                  'superset_group',
                  'prescription',
                  'position'
                ],
                additionalProperties: false
              }
            },
            id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            revision: {
              type: 'integer',
              exclusiveMinimum: 0,
              maximum: 9007199254740991
            },
            archived: {
              type: 'boolean'
            }
          },
          required: [
            'name',
            'notes',
            'progression',
            'entries',
            'id',
            'revision',
            'archived'
          ],
          additionalProperties: false
        }
      }
    }
  },
  updateExercise: {
    method: 'post',
    description: 'Edit exercise details while preserving workout snapshots',
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
          mode: {
            default: 'reps',
            type: 'string',
            enum: ['reps', 'time', 'cardio']
          },
          muscle_group: {
            type: 'string',
            enum: [
              'chest',
              'back',
              'shoulders',
              'biceps',
              'triceps',
              'forearms',
              'quadriceps',
              'hamstrings',
              'glutes',
              'calves',
              'core',
              'cardio',
              'full-body'
            ]
          },
          secondary_muscles: {
            default: [],
            maxItems: 12,
            type: 'array',
            items: {
              type: 'string',
              enum: [
                'chest',
                'back',
                'shoulders',
                'biceps',
                'triceps',
                'forearms',
                'quadriceps',
                'hamstrings',
                'glutes',
                'calves',
                'core',
                'cardio',
                'full-body'
              ]
            }
          },
          equipment: {
            default: '',
            type: 'string',
            maxLength: 100
          },
          instructions: {
            default: '',
            type: 'string',
            maxLength: 10000
          },
          expected_revision: {
            type: 'integer',
            exclusiveMinimum: 0,
            maximum: 9007199254740991
          }
        },
        required: [
          'name',
          'mode',
          'muscle_group',
          'secondary_muscles',
          'equipment',
          'instructions',
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
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 160
          },
          mode: {
            default: 'reps',
            type: 'string',
            enum: ['reps', 'time', 'cardio']
          },
          muscle_group: {
            type: 'string',
            enum: [
              'chest',
              'back',
              'shoulders',
              'biceps',
              'triceps',
              'forearms',
              'quadriceps',
              'hamstrings',
              'glutes',
              'calves',
              'core',
              'cardio',
              'full-body'
            ]
          },
          secondary_muscles: {
            default: [],
            maxItems: 12,
            type: 'array',
            items: {
              type: 'string',
              enum: [
                'chest',
                'back',
                'shoulders',
                'biceps',
                'triceps',
                'forearms',
                'quadriceps',
                'hamstrings',
                'glutes',
                'calves',
                'core',
                'cardio',
                'full-body'
              ]
            }
          },
          equipment: {
            default: '',
            type: 'string',
            maxLength: 100
          },
          instructions: {
            default: '',
            type: 'string',
            maxLength: 10000
          },
          id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          },
          custom: {
            type: 'boolean'
          },
          archived: {
            type: 'boolean'
          },
          catalog_key: {
            anyOf: [
              {
                type: 'string'
              },
              {
                type: 'null'
              }
            ]
          },
          revision: {
            type: 'integer',
            exclusiveMinimum: 0,
            maximum: 9007199254740991
          }
        },
        required: [
          'name',
          'mode',
          'muscle_group',
          'secondary_muscles',
          'equipment',
          'instructions',
          'id',
          'custom',
          'archived',
          'catalog_key',
          'revision'
        ],
        additionalProperties: false
      }
    }
  },
  updateRoutine: {
    method: 'post',
    description: 'Save a routine with optimistic revision protection',
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
          notes: {
            default: '',
            type: 'string',
            maxLength: 10000
          },
          progression: {
            default: 'linear',
            type: 'string',
            enum: ['off', 'linear', 'greyskull', 'double', 'time']
          },
          entries: {
            default: [],
            maxItems: 100,
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
                exercise_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                superset_group: {
                  default: null,
                  anyOf: [
                    {
                      type: 'string',
                      minLength: 1,
                      maxLength: 100
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                prescription: {
                  type: 'object',
                  properties: {
                    mode: {
                      default: 'reps',
                      type: 'string',
                      enum: ['reps', 'time', 'cardio']
                    },
                    sets: {
                      default: 3,
                      type: 'integer',
                      minimum: 1,
                      maximum: 50
                    },
                    reps: {
                      default: 10,
                      type: 'integer',
                      minimum: 1,
                      maximum: 1000
                    },
                    reps_min: {
                      default: 8,
                      type: 'integer',
                      minimum: 1,
                      maximum: 1000
                    },
                    weight_kg: {
                      default: 0,
                      type: 'number',
                      minimum: 0,
                      maximum: 10000
                    },
                    seconds: {
                      default: 45,
                      type: 'number',
                      minimum: 0,
                      maximum: 86400
                    },
                    minutes: {
                      default: 20,
                      type: 'number',
                      minimum: 0,
                      maximum: 1440
                    },
                    speed_kmh: {
                      default: 8,
                      type: 'number',
                      minimum: 0,
                      maximum: 200
                    },
                    rest_seconds: {
                      default: 90,
                      type: 'integer',
                      minimum: 0,
                      maximum: 3600
                    },
                    progression: {
                      default: null,
                      anyOf: [
                        {
                          type: 'string',
                          enum: ['off', 'linear', 'greyskull', 'double', 'time']
                        },
                        {
                          type: 'null'
                        }
                      ]
                    },
                    increment: {
                      default: null,
                      anyOf: [
                        {
                          type: 'number',
                          exclusiveMinimum: 0,
                          maximum: 1000
                        },
                        {
                          type: 'null'
                        }
                      ]
                    }
                  },
                  required: [
                    'mode',
                    'sets',
                    'reps',
                    'reps_min',
                    'weight_kg',
                    'seconds',
                    'minutes',
                    'speed_kmh',
                    'rest_seconds',
                    'progression',
                    'increment'
                  ],
                  additionalProperties: false
                }
              },
              required: ['id', 'exercise_id', 'superset_group', 'prescription'],
              additionalProperties: false
            }
          },
          expected_revision: {
            type: 'integer',
            exclusiveMinimum: 0,
            maximum: 9007199254740991
          }
        },
        required: [
          'name',
          'notes',
          'progression',
          'entries',
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
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 160
          },
          notes: {
            default: '',
            type: 'string',
            maxLength: 10000
          },
          progression: {
            default: 'linear',
            type: 'string',
            enum: ['off', 'linear', 'greyskull', 'double', 'time']
          },
          entries: {
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
                exercise_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                superset_group: {
                  default: null,
                  anyOf: [
                    {
                      type: 'string',
                      minLength: 1,
                      maxLength: 100
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                prescription: {
                  type: 'object',
                  properties: {
                    mode: {
                      default: 'reps',
                      type: 'string',
                      enum: ['reps', 'time', 'cardio']
                    },
                    sets: {
                      default: 3,
                      type: 'integer',
                      minimum: 1,
                      maximum: 50
                    },
                    reps: {
                      default: 10,
                      type: 'integer',
                      minimum: 1,
                      maximum: 1000
                    },
                    reps_min: {
                      default: 8,
                      type: 'integer',
                      minimum: 1,
                      maximum: 1000
                    },
                    weight_kg: {
                      default: 0,
                      type: 'number',
                      minimum: 0,
                      maximum: 10000
                    },
                    seconds: {
                      default: 45,
                      type: 'number',
                      minimum: 0,
                      maximum: 86400
                    },
                    minutes: {
                      default: 20,
                      type: 'number',
                      minimum: 0,
                      maximum: 1440
                    },
                    speed_kmh: {
                      default: 8,
                      type: 'number',
                      minimum: 0,
                      maximum: 200
                    },
                    rest_seconds: {
                      default: 90,
                      type: 'integer',
                      minimum: 0,
                      maximum: 3600
                    },
                    progression: {
                      default: null,
                      anyOf: [
                        {
                          type: 'string',
                          enum: ['off', 'linear', 'greyskull', 'double', 'time']
                        },
                        {
                          type: 'null'
                        }
                      ]
                    },
                    increment: {
                      default: null,
                      anyOf: [
                        {
                          type: 'number',
                          exclusiveMinimum: 0,
                          maximum: 1000
                        },
                        {
                          type: 'null'
                        }
                      ]
                    }
                  },
                  required: [
                    'mode',
                    'sets',
                    'reps',
                    'reps_min',
                    'weight_kg',
                    'seconds',
                    'minutes',
                    'speed_kmh',
                    'rest_seconds',
                    'progression',
                    'increment'
                  ],
                  additionalProperties: false
                },
                position: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 9007199254740991
                }
              },
              required: [
                'id',
                'exercise_id',
                'superset_group',
                'prescription',
                'position'
              ],
              additionalProperties: false
            }
          },
          id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          },
          revision: {
            type: 'integer',
            exclusiveMinimum: 0,
            maximum: 9007199254740991
          },
          archived: {
            type: 'boolean'
          }
        },
        required: [
          'name',
          'notes',
          'progression',
          'entries',
          'id',
          'revision',
          'archived'
        ],
        additionalProperties: false
      }
    }
  },
  updateSettings: {
    method: 'post',
    description:
      'Save display units, effort scale, goals and reminders without rewriting logged units',
    noAuth: false,
    encrypted: true,
    isDownloadable: false,
    media: null,
    input: {
      body: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          unit: {
            default: 'kg',
            type: 'string',
            enum: ['kg', 'lb']
          },
          rest_seconds: {
            default: 90,
            type: 'integer',
            minimum: 0,
            maximum: 3600
          },
          effort: {
            default: 'none',
            type: 'string',
            enum: ['none', 'rir', 'rpe']
          },
          sound: {
            default: true,
            type: 'boolean'
          },
          keep_awake: {
            default: true,
            type: 'boolean'
          },
          body_style: {
            default: 'male',
            type: 'string',
            enum: ['male', 'female']
          },
          target_weight_kg: {
            default: null,
            anyOf: [
              {
                type: 'number',
                exclusiveMinimum: 0,
                maximum: 1000
              },
              {
                type: 'null'
              }
            ]
          },
          weekly_workout_goal: {
            default: 3,
            type: 'integer',
            minimum: 0,
            maximum: 14
          },
          formula: {
            default: 'epley',
            type: 'string',
            enum: ['epley', 'brzycki', 'lombardi']
          },
          reminder_enabled: {
            default: false,
            type: 'boolean'
          },
          reminder_time: {
            default: '08:00',
            type: 'string',
            pattern: '^(?:[01]\\d|2[0-3]):[0-5]\\d$'
          },
          timezone: {
            default: 'UTC',
            type: 'string',
            minLength: 1,
            maxLength: 100
          },
          expected_revision: {
            type: 'integer',
            exclusiveMinimum: 0,
            maximum: 9007199254740991
          }
        },
        required: [
          'unit',
          'rest_seconds',
          'effort',
          'sound',
          'keep_awake',
          'body_style',
          'target_weight_kg',
          'weekly_workout_goal',
          'formula',
          'reminder_enabled',
          'reminder_time',
          'timezone',
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
          unit: {
            default: 'kg',
            type: 'string',
            enum: ['kg', 'lb']
          },
          rest_seconds: {
            default: 90,
            type: 'integer',
            minimum: 0,
            maximum: 3600
          },
          effort: {
            default: 'none',
            type: 'string',
            enum: ['none', 'rir', 'rpe']
          },
          sound: {
            default: true,
            type: 'boolean'
          },
          keep_awake: {
            default: true,
            type: 'boolean'
          },
          body_style: {
            default: 'male',
            type: 'string',
            enum: ['male', 'female']
          },
          target_weight_kg: {
            default: null,
            anyOf: [
              {
                type: 'number',
                exclusiveMinimum: 0,
                maximum: 1000
              },
              {
                type: 'null'
              }
            ]
          },
          weekly_workout_goal: {
            default: 3,
            type: 'integer',
            minimum: 0,
            maximum: 14
          },
          formula: {
            default: 'epley',
            type: 'string',
            enum: ['epley', 'brzycki', 'lombardi']
          },
          reminder_enabled: {
            default: false,
            type: 'boolean'
          },
          reminder_time: {
            default: '08:00',
            type: 'string',
            pattern: '^(?:[01]\\d|2[0-3]):[0-5]\\d$'
          },
          timezone: {
            default: 'UTC',
            type: 'string',
            minLength: 1,
            maxLength: 100
          },
          revision: {
            type: 'integer',
            exclusiveMinimum: 0,
            maximum: 9007199254740991
          }
        },
        required: [
          'unit',
          'rest_seconds',
          'effort',
          'sound',
          'keep_awake',
          'body_style',
          'target_weight_kg',
          'weekly_workout_goal',
          'formula',
          'reminder_enabled',
          'reminder_time',
          'timezone',
          'revision'
        ],
        additionalProperties: false
      }
    }
  },
  updateWorkout: {
    method: 'post',
    description:
      'Save active or completed workout details with stable entries, sets and revisions',
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
          date: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}-\\d{2}$'
          },
          notes: {
            default: '',
            type: 'string',
            maxLength: 10000
          },
          bodyweight_kg: {
            default: null,
            anyOf: [
              {
                type: 'number',
                exclusiveMinimum: 0,
                maximum: 1000
              },
              {
                type: 'null'
              }
            ]
          },
          current_entry_id: {
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
          rest_until: {
            default: null,
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
          work_timer: {
            default: null,
            anyOf: [
              {
                type: 'object',
                properties: {
                  entry_id: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  set_id: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  started_at: {
                    type: 'string',
                    format: 'date-time',
                    pattern:
                      '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$'
                  },
                  target_seconds: {
                    type: 'integer',
                    exclusiveMinimum: 0,
                    maximum: 86400
                  }
                },
                required: [
                  'entry_id',
                  'set_id',
                  'started_at',
                  'target_seconds'
                ],
                additionalProperties: false
              },
              {
                type: 'null'
              }
            ]
          },
          entries: {
            maxItems: 100,
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
                exercise_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                superset_group: {
                  default: null,
                  anyOf: [
                    {
                      type: 'string',
                      minLength: 1,
                      maxLength: 100
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                target: {
                  type: 'object',
                  properties: {
                    mode: {
                      default: 'reps',
                      type: 'string',
                      enum: ['reps', 'time', 'cardio']
                    },
                    sets: {
                      default: 3,
                      type: 'integer',
                      minimum: 1,
                      maximum: 50
                    },
                    reps: {
                      default: 10,
                      type: 'integer',
                      minimum: 1,
                      maximum: 1000
                    },
                    reps_min: {
                      default: 8,
                      type: 'integer',
                      minimum: 1,
                      maximum: 1000
                    },
                    weight_kg: {
                      default: 0,
                      type: 'number',
                      minimum: 0,
                      maximum: 10000
                    },
                    seconds: {
                      default: 45,
                      type: 'number',
                      minimum: 0,
                      maximum: 86400
                    },
                    minutes: {
                      default: 20,
                      type: 'number',
                      minimum: 0,
                      maximum: 1440
                    },
                    speed_kmh: {
                      default: 8,
                      type: 'number',
                      minimum: 0,
                      maximum: 200
                    },
                    rest_seconds: {
                      default: 90,
                      type: 'integer',
                      minimum: 0,
                      maximum: 3600
                    },
                    progression: {
                      default: null,
                      anyOf: [
                        {
                          type: 'string',
                          enum: ['off', 'linear', 'greyskull', 'double', 'time']
                        },
                        {
                          type: 'null'
                        }
                      ]
                    },
                    increment: {
                      default: null,
                      anyOf: [
                        {
                          type: 'number',
                          exclusiveMinimum: 0,
                          maximum: 1000
                        },
                        {
                          type: 'null'
                        }
                      ]
                    }
                  },
                  required: [
                    'mode',
                    'sets',
                    'reps',
                    'reps_min',
                    'weight_kg',
                    'seconds',
                    'minutes',
                    'speed_kmh',
                    'rest_seconds',
                    'progression',
                    'increment'
                  ],
                  additionalProperties: false
                },
                sets: {
                  minItems: 1,
                  maxItems: 100,
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
                      weight_kg: {
                        default: 0,
                        type: 'number',
                        minimum: 0,
                        maximum: 10000
                      },
                      reps: {
                        default: 0,
                        type: 'integer',
                        minimum: 0,
                        maximum: 1000
                      },
                      seconds: {
                        default: 0,
                        type: 'number',
                        minimum: 0,
                        maximum: 86400
                      },
                      minutes: {
                        default: 0,
                        type: 'number',
                        minimum: 0,
                        maximum: 1440
                      },
                      speed_kmh: {
                        default: 0,
                        type: 'number',
                        minimum: 0,
                        maximum: 200
                      },
                      done: {
                        default: false,
                        type: 'boolean'
                      },
                      rir: {
                        default: null,
                        anyOf: [
                          {
                            type: 'number',
                            minimum: 0,
                            maximum: 10
                          },
                          {
                            type: 'null'
                          }
                        ]
                      },
                      rpe: {
                        default: null,
                        anyOf: [
                          {
                            type: 'number',
                            minimum: 0,
                            maximum: 10
                          },
                          {
                            type: 'null'
                          }
                        ]
                      }
                    },
                    required: [
                      'id',
                      'weight_kg',
                      'reps',
                      'seconds',
                      'minutes',
                      'speed_kmh',
                      'done',
                      'rir',
                      'rpe'
                    ],
                    additionalProperties: false
                  }
                }
              },
              required: [
                'id',
                'exercise_id',
                'superset_group',
                'target',
                'sets'
              ],
              additionalProperties: false
            }
          },
          command_id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          },
          expected_revision: {
            type: 'integer',
            exclusiveMinimum: 0,
            maximum: 9007199254740991
          }
        },
        required: [
          'name',
          'date',
          'notes',
          'bodyweight_kg',
          'current_entry_id',
          'rest_until',
          'work_timer',
          'entries',
          'command_id',
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
          routine_id: {
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
          name: {
            type: 'string',
            minLength: 1,
            maxLength: 160
          },
          date: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}-\\d{2}$'
          },
          status: {
            type: 'string',
            enum: ['active', 'completed', 'discarded']
          },
          started_at: {
            type: 'string',
            format: 'date-time',
            pattern:
              '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$'
          },
          finished_at: {
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
          notes: {
            type: 'string'
          },
          bodyweight_kg: {
            anyOf: [
              {
                type: 'number',
                exclusiveMinimum: 0
              },
              {
                type: 'null'
              }
            ]
          },
          revision: {
            type: 'integer',
            exclusiveMinimum: 0,
            maximum: 9007199254740991
          },
          current_entry_id: {
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
          rest_until: {
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
          work_timer: {
            default: null,
            anyOf: [
              {
                type: 'object',
                properties: {
                  entry_id: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  set_id: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  started_at: {
                    type: 'string',
                    format: 'date-time',
                    pattern:
                      '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z))$'
                  },
                  target_seconds: {
                    type: 'integer',
                    exclusiveMinimum: 0,
                    maximum: 86400
                  }
                },
                required: [
                  'entry_id',
                  'set_id',
                  'started_at',
                  'target_seconds'
                ],
                additionalProperties: false
              },
              {
                type: 'null'
              }
            ]
          },
          entries: {
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
                exercise_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                superset_group: {
                  default: null,
                  anyOf: [
                    {
                      type: 'string',
                      minLength: 1,
                      maxLength: 100
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                target: {
                  type: 'object',
                  properties: {
                    mode: {
                      default: 'reps',
                      type: 'string',
                      enum: ['reps', 'time', 'cardio']
                    },
                    sets: {
                      default: 3,
                      type: 'integer',
                      minimum: 1,
                      maximum: 50
                    },
                    reps: {
                      default: 10,
                      type: 'integer',
                      minimum: 1,
                      maximum: 1000
                    },
                    reps_min: {
                      default: 8,
                      type: 'integer',
                      minimum: 1,
                      maximum: 1000
                    },
                    weight_kg: {
                      default: 0,
                      type: 'number',
                      minimum: 0,
                      maximum: 10000
                    },
                    seconds: {
                      default: 45,
                      type: 'number',
                      minimum: 0,
                      maximum: 86400
                    },
                    minutes: {
                      default: 20,
                      type: 'number',
                      minimum: 0,
                      maximum: 1440
                    },
                    speed_kmh: {
                      default: 8,
                      type: 'number',
                      minimum: 0,
                      maximum: 200
                    },
                    rest_seconds: {
                      default: 90,
                      type: 'integer',
                      minimum: 0,
                      maximum: 3600
                    },
                    progression: {
                      default: null,
                      anyOf: [
                        {
                          type: 'string',
                          enum: ['off', 'linear', 'greyskull', 'double', 'time']
                        },
                        {
                          type: 'null'
                        }
                      ]
                    },
                    increment: {
                      default: null,
                      anyOf: [
                        {
                          type: 'number',
                          exclusiveMinimum: 0,
                          maximum: 1000
                        },
                        {
                          type: 'null'
                        }
                      ]
                    }
                  },
                  required: [
                    'mode',
                    'sets',
                    'reps',
                    'reps_min',
                    'weight_kg',
                    'seconds',
                    'minutes',
                    'speed_kmh',
                    'rest_seconds',
                    'progression',
                    'increment'
                  ],
                  additionalProperties: false
                },
                sets: {
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
                      weight_kg: {
                        default: 0,
                        type: 'number',
                        minimum: 0,
                        maximum: 10000
                      },
                      reps: {
                        default: 0,
                        type: 'integer',
                        minimum: 0,
                        maximum: 1000
                      },
                      seconds: {
                        default: 0,
                        type: 'number',
                        minimum: 0,
                        maximum: 86400
                      },
                      minutes: {
                        default: 0,
                        type: 'number',
                        minimum: 0,
                        maximum: 1440
                      },
                      speed_kmh: {
                        default: 0,
                        type: 'number',
                        minimum: 0,
                        maximum: 200
                      },
                      done: {
                        default: false,
                        type: 'boolean'
                      },
                      rir: {
                        default: null,
                        anyOf: [
                          {
                            type: 'number',
                            minimum: 0,
                            maximum: 10
                          },
                          {
                            type: 'null'
                          }
                        ]
                      },
                      rpe: {
                        default: null,
                        anyOf: [
                          {
                            type: 'number',
                            minimum: 0,
                            maximum: 10
                          },
                          {
                            type: 'null'
                          }
                        ]
                      },
                      position: {
                        type: 'integer',
                        minimum: 0,
                        maximum: 9007199254740991
                      }
                    },
                    required: [
                      'id',
                      'weight_kg',
                      'reps',
                      'seconds',
                      'minutes',
                      'speed_kmh',
                      'done',
                      'rir',
                      'rpe',
                      'position'
                    ],
                    additionalProperties: false
                  }
                },
                position: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 9007199254740991
                },
                exercise: {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string',
                      minLength: 1,
                      maxLength: 160
                    },
                    mode: {
                      default: 'reps',
                      type: 'string',
                      enum: ['reps', 'time', 'cardio']
                    },
                    muscle_group: {
                      type: 'string',
                      enum: [
                        'chest',
                        'back',
                        'shoulders',
                        'biceps',
                        'triceps',
                        'forearms',
                        'quadriceps',
                        'hamstrings',
                        'glutes',
                        'calves',
                        'core',
                        'cardio',
                        'full-body'
                      ]
                    },
                    secondary_muscles: {
                      default: [],
                      maxItems: 12,
                      type: 'array',
                      items: {
                        type: 'string',
                        enum: [
                          'chest',
                          'back',
                          'shoulders',
                          'biceps',
                          'triceps',
                          'forearms',
                          'quadriceps',
                          'hamstrings',
                          'glutes',
                          'calves',
                          'core',
                          'cardio',
                          'full-body'
                        ]
                      }
                    },
                    equipment: {
                      default: '',
                      type: 'string',
                      maxLength: 100
                    },
                    instructions: {
                      default: '',
                      type: 'string',
                      maxLength: 10000
                    }
                  },
                  required: [
                    'name',
                    'mode',
                    'muscle_group',
                    'secondary_muscles',
                    'equipment',
                    'instructions'
                  ],
                  additionalProperties: false
                },
                suggestion: {
                  type: 'object',
                  properties: {
                    policy: {
                      type: 'string',
                      enum: ['off', 'linear', 'greyskull', 'double', 'time']
                    },
                    kind: {
                      type: 'string',
                      enum: ['off', 'first', 'up', 'hold', 'deload']
                    },
                    reason: {
                      type: 'string',
                      enum: [
                        'disabled',
                        'baseline',
                        'success',
                        'bodyweight-success',
                        'bodyweight-hold',
                        'amrap-double',
                        'miss',
                        'stalled',
                        'rep-range'
                      ]
                    },
                    weight_kg: {
                      type: 'number',
                      minimum: 0,
                      maximum: 10000
                    },
                    reps: {
                      type: 'integer',
                      exclusiveMinimum: 0,
                      maximum: 9007199254740991
                    },
                    seconds: {
                      type: 'number',
                      minimum: 0,
                      maximum: 86400
                    },
                    misses: {
                      default: 0,
                      type: 'integer',
                      minimum: 0,
                      maximum: 9007199254740991
                    }
                  },
                  required: ['policy', 'kind', 'reason', 'misses'],
                  additionalProperties: false
                }
              },
              required: [
                'id',
                'exercise_id',
                'superset_group',
                'target',
                'sets',
                'position',
                'exercise',
                'suggestion'
              ],
              additionalProperties: false
            }
          }
        },
        required: [
          'id',
          'routine_id',
          'name',
          'date',
          'status',
          'started_at',
          'finished_at',
          'notes',
          'bodyweight_kg',
          'revision',
          'current_entry_id',
          'rest_until',
          'work_timer',
          'entries'
        ],
        additionalProperties: false
      }
    }
  },
  applyCoachProposal: {
    method: 'post',
    description:
      'Atomically apply owner-selected, revision-checked plan changes',
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
          selected_ids: {
            minItems: 1,
            maxItems: 40,
            type: 'array',
            items: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            }
          }
        },
        required: ['selected_ids'],
        additionalProperties: false
      }
    },
    output: {
      OK: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          config: {
            type: 'object',
            properties: {
              enabled: {
                type: 'boolean'
              },
              consent: {
                type: 'boolean'
              },
              agent_id: {
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
              run_budget_cents: {
                type: 'integer',
                minimum: 0,
                maximum: 1000000
              },
              daily_limit: {
                default: 3,
                type: 'integer',
                minimum: 1,
                maximum: 20
              },
              cadence: {
                default: 'off',
                type: 'string',
                enum: ['off', 'weekly', 'sessions']
              },
              sessions_per_review: {
                default: 5,
                type: 'integer',
                minimum: 2,
                maximum: 60
              },
              intake: {
                anyOf: [
                  {
                    type: 'object',
                    properties: {
                      goal: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 1000
                      },
                      experience: {
                        type: 'string',
                        enum: ['beginner', 'intermediate', 'advanced']
                      },
                      weekdays: {
                        minItems: 1,
                        maxItems: 7,
                        type: 'array',
                        items: {
                          type: 'integer',
                          minimum: 0,
                          maximum: 6
                        }
                      },
                      session_minutes: {
                        type: 'integer',
                        minimum: 10,
                        maximum: 240
                      },
                      equipment: {
                        maxItems: 40,
                        type: 'array',
                        items: {
                          type: 'string',
                          minLength: 1,
                          maxLength: 100
                        }
                      },
                      limitations: {
                        default: '',
                        type: 'string',
                        maxLength: 2000
                      },
                      preferences: {
                        default: '',
                        type: 'string',
                        maxLength: 2000
                      }
                    },
                    required: [
                      'goal',
                      'experience',
                      'weekdays',
                      'session_minutes',
                      'equipment',
                      'limitations',
                      'preferences'
                    ],
                    additionalProperties: false
                  },
                  {
                    type: 'null'
                  }
                ]
              },
              revision: {
                type: 'integer',
                exclusiveMinimum: 0,
                maximum: 9007199254740991
              }
            },
            required: [
              'enabled',
              'consent',
              'agent_id',
              'run_budget_cents',
              'daily_limit',
              'cadence',
              'sessions_per_review',
              'intake',
              'revision'
            ],
            additionalProperties: false
          },
          plan_hash: {
            type: 'string'
          },
          agents: {
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
                adapter: {
                  type: 'string'
                },
                status: {
                  type: 'string'
                },
                budget_cents: {
                  type: 'number'
                }
              },
              required: ['id', 'name', 'adapter', 'status', 'budget_cents'],
              additionalProperties: false
            }
          },
          jobs: {
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
                kind: {
                  type: 'string',
                  enum: ['create', 'review', 'refine']
                },
                status: {
                  type: 'string'
                },
                created: {
                  type: 'string'
                },
                plan_hash: {
                  type: 'string'
                },
                applied_ids: {
                  type: 'array',
                  items: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  }
                },
                proposal: {
                  anyOf: [
                    {
                      type: 'object',
                      properties: {
                        summary: {
                          type: 'string',
                          minLength: 1,
                          maxLength: 3000
                        },
                        notes: {
                          default: [],
                          maxItems: 20,
                          type: 'array',
                          items: {
                            type: 'string',
                            maxLength: 2000
                          }
                        },
                        changes: {
                          maxItems: 40,
                          type: 'array',
                          items: {
                            oneOf: [
                              {
                                type: 'object',
                                properties: {
                                  id: {
                                    type: 'string',
                                    format: 'uuid',
                                    pattern:
                                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                  },
                                  reason: {
                                    type: 'string',
                                    minLength: 1,
                                    maxLength: 2000
                                  },
                                  kind: {
                                    type: 'string',
                                    const: 'add-routine'
                                  },
                                  routine: {
                                    type: 'object',
                                    properties: {
                                      name: {
                                        type: 'string',
                                        minLength: 1,
                                        maxLength: 160
                                      },
                                      notes: {
                                        default: '',
                                        type: 'string',
                                        maxLength: 10000
                                      },
                                      progression: {
                                        default: 'linear',
                                        type: 'string',
                                        enum: [
                                          'off',
                                          'linear',
                                          'greyskull',
                                          'double',
                                          'time'
                                        ]
                                      },
                                      entries: {
                                        default: [],
                                        maxItems: 100,
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
                                            exercise_id: {
                                              type: 'string',
                                              format: 'uuid',
                                              pattern:
                                                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                            },
                                            superset_group: {
                                              default: null,
                                              anyOf: [
                                                {
                                                  type: 'string',
                                                  minLength: 1,
                                                  maxLength: 100
                                                },
                                                {
                                                  type: 'null'
                                                }
                                              ]
                                            },
                                            prescription: {
                                              type: 'object',
                                              properties: {
                                                mode: {
                                                  default: 'reps',
                                                  type: 'string',
                                                  enum: [
                                                    'reps',
                                                    'time',
                                                    'cardio'
                                                  ]
                                                },
                                                sets: {
                                                  default: 3,
                                                  type: 'integer',
                                                  minimum: 1,
                                                  maximum: 50
                                                },
                                                reps: {
                                                  default: 10,
                                                  type: 'integer',
                                                  minimum: 1,
                                                  maximum: 1000
                                                },
                                                reps_min: {
                                                  default: 8,
                                                  type: 'integer',
                                                  minimum: 1,
                                                  maximum: 1000
                                                },
                                                weight_kg: {
                                                  default: 0,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 10000
                                                },
                                                seconds: {
                                                  default: 45,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 86400
                                                },
                                                minutes: {
                                                  default: 20,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 1440
                                                },
                                                speed_kmh: {
                                                  default: 8,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 200
                                                },
                                                rest_seconds: {
                                                  default: 90,
                                                  type: 'integer',
                                                  minimum: 0,
                                                  maximum: 3600
                                                },
                                                progression: {
                                                  default: null,
                                                  anyOf: [
                                                    {
                                                      type: 'string',
                                                      enum: [
                                                        'off',
                                                        'linear',
                                                        'greyskull',
                                                        'double',
                                                        'time'
                                                      ]
                                                    },
                                                    {
                                                      type: 'null'
                                                    }
                                                  ]
                                                },
                                                increment: {
                                                  default: null,
                                                  anyOf: [
                                                    {
                                                      type: 'number',
                                                      exclusiveMinimum: 0,
                                                      maximum: 1000
                                                    },
                                                    {
                                                      type: 'null'
                                                    }
                                                  ]
                                                }
                                              },
                                              required: [
                                                'mode',
                                                'sets',
                                                'reps',
                                                'reps_min',
                                                'weight_kg',
                                                'seconds',
                                                'minutes',
                                                'speed_kmh',
                                                'rest_seconds',
                                                'progression',
                                                'increment'
                                              ],
                                              additionalProperties: false
                                            }
                                          },
                                          required: [
                                            'id',
                                            'exercise_id',
                                            'superset_group',
                                            'prescription'
                                          ],
                                          additionalProperties: false
                                        }
                                      }
                                    },
                                    required: [
                                      'name',
                                      'notes',
                                      'progression',
                                      'entries'
                                    ],
                                    additionalProperties: false
                                  }
                                },
                                required: ['id', 'reason', 'kind', 'routine'],
                                additionalProperties: false
                              },
                              {
                                type: 'object',
                                properties: {
                                  id: {
                                    type: 'string',
                                    format: 'uuid',
                                    pattern:
                                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                  },
                                  reason: {
                                    type: 'string',
                                    minLength: 1,
                                    maxLength: 2000
                                  },
                                  kind: {
                                    type: 'string',
                                    const: 'update-routine'
                                  },
                                  routine_id: {
                                    type: 'string',
                                    format: 'uuid',
                                    pattern:
                                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                  },
                                  expected_revision: {
                                    type: 'integer',
                                    exclusiveMinimum: 0,
                                    maximum: 9007199254740991
                                  },
                                  patch: {
                                    type: 'object',
                                    properties: {
                                      name: {
                                        type: 'string',
                                        minLength: 1,
                                        maxLength: 160
                                      },
                                      notes: {
                                        type: 'string',
                                        maxLength: 10000
                                      },
                                      progression: {
                                        type: 'string',
                                        enum: [
                                          'off',
                                          'linear',
                                          'greyskull',
                                          'double',
                                          'time'
                                        ]
                                      },
                                      entries: {
                                        maxItems: 100,
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
                                            exercise_id: {
                                              type: 'string',
                                              format: 'uuid',
                                              pattern:
                                                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                            },
                                            superset_group: {
                                              default: null,
                                              anyOf: [
                                                {
                                                  type: 'string',
                                                  minLength: 1,
                                                  maxLength: 100
                                                },
                                                {
                                                  type: 'null'
                                                }
                                              ]
                                            },
                                            prescription: {
                                              type: 'object',
                                              properties: {
                                                mode: {
                                                  default: 'reps',
                                                  type: 'string',
                                                  enum: [
                                                    'reps',
                                                    'time',
                                                    'cardio'
                                                  ]
                                                },
                                                sets: {
                                                  default: 3,
                                                  type: 'integer',
                                                  minimum: 1,
                                                  maximum: 50
                                                },
                                                reps: {
                                                  default: 10,
                                                  type: 'integer',
                                                  minimum: 1,
                                                  maximum: 1000
                                                },
                                                reps_min: {
                                                  default: 8,
                                                  type: 'integer',
                                                  minimum: 1,
                                                  maximum: 1000
                                                },
                                                weight_kg: {
                                                  default: 0,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 10000
                                                },
                                                seconds: {
                                                  default: 45,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 86400
                                                },
                                                minutes: {
                                                  default: 20,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 1440
                                                },
                                                speed_kmh: {
                                                  default: 8,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 200
                                                },
                                                rest_seconds: {
                                                  default: 90,
                                                  type: 'integer',
                                                  minimum: 0,
                                                  maximum: 3600
                                                },
                                                progression: {
                                                  default: null,
                                                  anyOf: [
                                                    {
                                                      type: 'string',
                                                      enum: [
                                                        'off',
                                                        'linear',
                                                        'greyskull',
                                                        'double',
                                                        'time'
                                                      ]
                                                    },
                                                    {
                                                      type: 'null'
                                                    }
                                                  ]
                                                },
                                                increment: {
                                                  default: null,
                                                  anyOf: [
                                                    {
                                                      type: 'number',
                                                      exclusiveMinimum: 0,
                                                      maximum: 1000
                                                    },
                                                    {
                                                      type: 'null'
                                                    }
                                                  ]
                                                }
                                              },
                                              required: [
                                                'mode',
                                                'sets',
                                                'reps',
                                                'reps_min',
                                                'weight_kg',
                                                'seconds',
                                                'minutes',
                                                'speed_kmh',
                                                'rest_seconds',
                                                'progression',
                                                'increment'
                                              ],
                                              additionalProperties: false
                                            }
                                          },
                                          required: [
                                            'id',
                                            'exercise_id',
                                            'superset_group',
                                            'prescription'
                                          ],
                                          additionalProperties: false
                                        }
                                      }
                                    },
                                    additionalProperties: false
                                  }
                                },
                                required: [
                                  'id',
                                  'reason',
                                  'kind',
                                  'routine_id',
                                  'expected_revision',
                                  'patch'
                                ],
                                additionalProperties: false
                              },
                              {
                                type: 'object',
                                properties: {
                                  id: {
                                    type: 'string',
                                    format: 'uuid',
                                    pattern:
                                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                  },
                                  reason: {
                                    type: 'string',
                                    minLength: 1,
                                    maxLength: 2000
                                  },
                                  kind: {
                                    type: 'string',
                                    const: 'archive-routine'
                                  },
                                  routine_id: {
                                    type: 'string',
                                    format: 'uuid',
                                    pattern:
                                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                  },
                                  expected_revision: {
                                    type: 'integer',
                                    exclusiveMinimum: 0,
                                    maximum: 9007199254740991
                                  }
                                },
                                required: [
                                  'id',
                                  'reason',
                                  'kind',
                                  'routine_id',
                                  'expected_revision'
                                ],
                                additionalProperties: false
                              },
                              {
                                type: 'object',
                                properties: {
                                  id: {
                                    type: 'string',
                                    format: 'uuid',
                                    pattern:
                                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                  },
                                  reason: {
                                    type: 'string',
                                    minLength: 1,
                                    maxLength: 2000
                                  },
                                  kind: {
                                    type: 'string',
                                    const: 'schedule'
                                  },
                                  weekday: {
                                    type: 'integer',
                                    minimum: 0,
                                    maximum: 6
                                  },
                                  routine_id: {
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
                                required: [
                                  'id',
                                  'reason',
                                  'kind',
                                  'weekday',
                                  'routine_id'
                                ],
                                additionalProperties: false
                              }
                            ]
                          }
                        }
                      },
                      required: ['summary', 'notes', 'changes'],
                      additionalProperties: false
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                error: {
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
                'task_id',
                'run_id',
                'kind',
                'status',
                'created',
                'plan_hash',
                'applied_ids',
                'proposal',
                'error'
              ],
              additionalProperties: false
            }
          },
          can_revert: {
            type: 'boolean'
          },
          worker_required: {
            type: 'boolean',
            const: true
          }
        },
        required: [
          'config',
          'plan_hash',
          'agents',
          'jobs',
          'can_revert',
          'worker_required'
        ],
        additionalProperties: false
      }
    }
  },
  cancelCoachReview: {
    method: 'post',
    description: 'Dismiss a coaching proposal and cancel its active lease',
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
          config: {
            type: 'object',
            properties: {
              enabled: {
                type: 'boolean'
              },
              consent: {
                type: 'boolean'
              },
              agent_id: {
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
              run_budget_cents: {
                type: 'integer',
                minimum: 0,
                maximum: 1000000
              },
              daily_limit: {
                default: 3,
                type: 'integer',
                minimum: 1,
                maximum: 20
              },
              cadence: {
                default: 'off',
                type: 'string',
                enum: ['off', 'weekly', 'sessions']
              },
              sessions_per_review: {
                default: 5,
                type: 'integer',
                minimum: 2,
                maximum: 60
              },
              intake: {
                anyOf: [
                  {
                    type: 'object',
                    properties: {
                      goal: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 1000
                      },
                      experience: {
                        type: 'string',
                        enum: ['beginner', 'intermediate', 'advanced']
                      },
                      weekdays: {
                        minItems: 1,
                        maxItems: 7,
                        type: 'array',
                        items: {
                          type: 'integer',
                          minimum: 0,
                          maximum: 6
                        }
                      },
                      session_minutes: {
                        type: 'integer',
                        minimum: 10,
                        maximum: 240
                      },
                      equipment: {
                        maxItems: 40,
                        type: 'array',
                        items: {
                          type: 'string',
                          minLength: 1,
                          maxLength: 100
                        }
                      },
                      limitations: {
                        default: '',
                        type: 'string',
                        maxLength: 2000
                      },
                      preferences: {
                        default: '',
                        type: 'string',
                        maxLength: 2000
                      }
                    },
                    required: [
                      'goal',
                      'experience',
                      'weekdays',
                      'session_minutes',
                      'equipment',
                      'limitations',
                      'preferences'
                    ],
                    additionalProperties: false
                  },
                  {
                    type: 'null'
                  }
                ]
              },
              revision: {
                type: 'integer',
                exclusiveMinimum: 0,
                maximum: 9007199254740991
              }
            },
            required: [
              'enabled',
              'consent',
              'agent_id',
              'run_budget_cents',
              'daily_limit',
              'cadence',
              'sessions_per_review',
              'intake',
              'revision'
            ],
            additionalProperties: false
          },
          plan_hash: {
            type: 'string'
          },
          agents: {
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
                adapter: {
                  type: 'string'
                },
                status: {
                  type: 'string'
                },
                budget_cents: {
                  type: 'number'
                }
              },
              required: ['id', 'name', 'adapter', 'status', 'budget_cents'],
              additionalProperties: false
            }
          },
          jobs: {
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
                kind: {
                  type: 'string',
                  enum: ['create', 'review', 'refine']
                },
                status: {
                  type: 'string'
                },
                created: {
                  type: 'string'
                },
                plan_hash: {
                  type: 'string'
                },
                applied_ids: {
                  type: 'array',
                  items: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  }
                },
                proposal: {
                  anyOf: [
                    {
                      type: 'object',
                      properties: {
                        summary: {
                          type: 'string',
                          minLength: 1,
                          maxLength: 3000
                        },
                        notes: {
                          default: [],
                          maxItems: 20,
                          type: 'array',
                          items: {
                            type: 'string',
                            maxLength: 2000
                          }
                        },
                        changes: {
                          maxItems: 40,
                          type: 'array',
                          items: {
                            oneOf: [
                              {
                                type: 'object',
                                properties: {
                                  id: {
                                    type: 'string',
                                    format: 'uuid',
                                    pattern:
                                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                  },
                                  reason: {
                                    type: 'string',
                                    minLength: 1,
                                    maxLength: 2000
                                  },
                                  kind: {
                                    type: 'string',
                                    const: 'add-routine'
                                  },
                                  routine: {
                                    type: 'object',
                                    properties: {
                                      name: {
                                        type: 'string',
                                        minLength: 1,
                                        maxLength: 160
                                      },
                                      notes: {
                                        default: '',
                                        type: 'string',
                                        maxLength: 10000
                                      },
                                      progression: {
                                        default: 'linear',
                                        type: 'string',
                                        enum: [
                                          'off',
                                          'linear',
                                          'greyskull',
                                          'double',
                                          'time'
                                        ]
                                      },
                                      entries: {
                                        default: [],
                                        maxItems: 100,
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
                                            exercise_id: {
                                              type: 'string',
                                              format: 'uuid',
                                              pattern:
                                                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                            },
                                            superset_group: {
                                              default: null,
                                              anyOf: [
                                                {
                                                  type: 'string',
                                                  minLength: 1,
                                                  maxLength: 100
                                                },
                                                {
                                                  type: 'null'
                                                }
                                              ]
                                            },
                                            prescription: {
                                              type: 'object',
                                              properties: {
                                                mode: {
                                                  default: 'reps',
                                                  type: 'string',
                                                  enum: [
                                                    'reps',
                                                    'time',
                                                    'cardio'
                                                  ]
                                                },
                                                sets: {
                                                  default: 3,
                                                  type: 'integer',
                                                  minimum: 1,
                                                  maximum: 50
                                                },
                                                reps: {
                                                  default: 10,
                                                  type: 'integer',
                                                  minimum: 1,
                                                  maximum: 1000
                                                },
                                                reps_min: {
                                                  default: 8,
                                                  type: 'integer',
                                                  minimum: 1,
                                                  maximum: 1000
                                                },
                                                weight_kg: {
                                                  default: 0,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 10000
                                                },
                                                seconds: {
                                                  default: 45,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 86400
                                                },
                                                minutes: {
                                                  default: 20,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 1440
                                                },
                                                speed_kmh: {
                                                  default: 8,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 200
                                                },
                                                rest_seconds: {
                                                  default: 90,
                                                  type: 'integer',
                                                  minimum: 0,
                                                  maximum: 3600
                                                },
                                                progression: {
                                                  default: null,
                                                  anyOf: [
                                                    {
                                                      type: 'string',
                                                      enum: [
                                                        'off',
                                                        'linear',
                                                        'greyskull',
                                                        'double',
                                                        'time'
                                                      ]
                                                    },
                                                    {
                                                      type: 'null'
                                                    }
                                                  ]
                                                },
                                                increment: {
                                                  default: null,
                                                  anyOf: [
                                                    {
                                                      type: 'number',
                                                      exclusiveMinimum: 0,
                                                      maximum: 1000
                                                    },
                                                    {
                                                      type: 'null'
                                                    }
                                                  ]
                                                }
                                              },
                                              required: [
                                                'mode',
                                                'sets',
                                                'reps',
                                                'reps_min',
                                                'weight_kg',
                                                'seconds',
                                                'minutes',
                                                'speed_kmh',
                                                'rest_seconds',
                                                'progression',
                                                'increment'
                                              ],
                                              additionalProperties: false
                                            }
                                          },
                                          required: [
                                            'id',
                                            'exercise_id',
                                            'superset_group',
                                            'prescription'
                                          ],
                                          additionalProperties: false
                                        }
                                      }
                                    },
                                    required: [
                                      'name',
                                      'notes',
                                      'progression',
                                      'entries'
                                    ],
                                    additionalProperties: false
                                  }
                                },
                                required: ['id', 'reason', 'kind', 'routine'],
                                additionalProperties: false
                              },
                              {
                                type: 'object',
                                properties: {
                                  id: {
                                    type: 'string',
                                    format: 'uuid',
                                    pattern:
                                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                  },
                                  reason: {
                                    type: 'string',
                                    minLength: 1,
                                    maxLength: 2000
                                  },
                                  kind: {
                                    type: 'string',
                                    const: 'update-routine'
                                  },
                                  routine_id: {
                                    type: 'string',
                                    format: 'uuid',
                                    pattern:
                                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                  },
                                  expected_revision: {
                                    type: 'integer',
                                    exclusiveMinimum: 0,
                                    maximum: 9007199254740991
                                  },
                                  patch: {
                                    type: 'object',
                                    properties: {
                                      name: {
                                        type: 'string',
                                        minLength: 1,
                                        maxLength: 160
                                      },
                                      notes: {
                                        type: 'string',
                                        maxLength: 10000
                                      },
                                      progression: {
                                        type: 'string',
                                        enum: [
                                          'off',
                                          'linear',
                                          'greyskull',
                                          'double',
                                          'time'
                                        ]
                                      },
                                      entries: {
                                        maxItems: 100,
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
                                            exercise_id: {
                                              type: 'string',
                                              format: 'uuid',
                                              pattern:
                                                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                            },
                                            superset_group: {
                                              default: null,
                                              anyOf: [
                                                {
                                                  type: 'string',
                                                  minLength: 1,
                                                  maxLength: 100
                                                },
                                                {
                                                  type: 'null'
                                                }
                                              ]
                                            },
                                            prescription: {
                                              type: 'object',
                                              properties: {
                                                mode: {
                                                  default: 'reps',
                                                  type: 'string',
                                                  enum: [
                                                    'reps',
                                                    'time',
                                                    'cardio'
                                                  ]
                                                },
                                                sets: {
                                                  default: 3,
                                                  type: 'integer',
                                                  minimum: 1,
                                                  maximum: 50
                                                },
                                                reps: {
                                                  default: 10,
                                                  type: 'integer',
                                                  minimum: 1,
                                                  maximum: 1000
                                                },
                                                reps_min: {
                                                  default: 8,
                                                  type: 'integer',
                                                  minimum: 1,
                                                  maximum: 1000
                                                },
                                                weight_kg: {
                                                  default: 0,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 10000
                                                },
                                                seconds: {
                                                  default: 45,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 86400
                                                },
                                                minutes: {
                                                  default: 20,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 1440
                                                },
                                                speed_kmh: {
                                                  default: 8,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 200
                                                },
                                                rest_seconds: {
                                                  default: 90,
                                                  type: 'integer',
                                                  minimum: 0,
                                                  maximum: 3600
                                                },
                                                progression: {
                                                  default: null,
                                                  anyOf: [
                                                    {
                                                      type: 'string',
                                                      enum: [
                                                        'off',
                                                        'linear',
                                                        'greyskull',
                                                        'double',
                                                        'time'
                                                      ]
                                                    },
                                                    {
                                                      type: 'null'
                                                    }
                                                  ]
                                                },
                                                increment: {
                                                  default: null,
                                                  anyOf: [
                                                    {
                                                      type: 'number',
                                                      exclusiveMinimum: 0,
                                                      maximum: 1000
                                                    },
                                                    {
                                                      type: 'null'
                                                    }
                                                  ]
                                                }
                                              },
                                              required: [
                                                'mode',
                                                'sets',
                                                'reps',
                                                'reps_min',
                                                'weight_kg',
                                                'seconds',
                                                'minutes',
                                                'speed_kmh',
                                                'rest_seconds',
                                                'progression',
                                                'increment'
                                              ],
                                              additionalProperties: false
                                            }
                                          },
                                          required: [
                                            'id',
                                            'exercise_id',
                                            'superset_group',
                                            'prescription'
                                          ],
                                          additionalProperties: false
                                        }
                                      }
                                    },
                                    additionalProperties: false
                                  }
                                },
                                required: [
                                  'id',
                                  'reason',
                                  'kind',
                                  'routine_id',
                                  'expected_revision',
                                  'patch'
                                ],
                                additionalProperties: false
                              },
                              {
                                type: 'object',
                                properties: {
                                  id: {
                                    type: 'string',
                                    format: 'uuid',
                                    pattern:
                                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                  },
                                  reason: {
                                    type: 'string',
                                    minLength: 1,
                                    maxLength: 2000
                                  },
                                  kind: {
                                    type: 'string',
                                    const: 'archive-routine'
                                  },
                                  routine_id: {
                                    type: 'string',
                                    format: 'uuid',
                                    pattern:
                                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                  },
                                  expected_revision: {
                                    type: 'integer',
                                    exclusiveMinimum: 0,
                                    maximum: 9007199254740991
                                  }
                                },
                                required: [
                                  'id',
                                  'reason',
                                  'kind',
                                  'routine_id',
                                  'expected_revision'
                                ],
                                additionalProperties: false
                              },
                              {
                                type: 'object',
                                properties: {
                                  id: {
                                    type: 'string',
                                    format: 'uuid',
                                    pattern:
                                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                  },
                                  reason: {
                                    type: 'string',
                                    minLength: 1,
                                    maxLength: 2000
                                  },
                                  kind: {
                                    type: 'string',
                                    const: 'schedule'
                                  },
                                  weekday: {
                                    type: 'integer',
                                    minimum: 0,
                                    maximum: 6
                                  },
                                  routine_id: {
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
                                required: [
                                  'id',
                                  'reason',
                                  'kind',
                                  'weekday',
                                  'routine_id'
                                ],
                                additionalProperties: false
                              }
                            ]
                          }
                        }
                      },
                      required: ['summary', 'notes', 'changes'],
                      additionalProperties: false
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                error: {
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
                'task_id',
                'run_id',
                'kind',
                'status',
                'created',
                'plan_hash',
                'applied_ids',
                'proposal',
                'error'
              ],
              additionalProperties: false
            }
          },
          can_revert: {
            type: 'boolean'
          },
          worker_required: {
            type: 'boolean',
            const: true
          }
        },
        required: [
          'config',
          'plan_hash',
          'agents',
          'jobs',
          'can_revert',
          'worker_required'
        ],
        additionalProperties: false
      }
    }
  },
  coach: {
    method: 'get',
    description: 'Owned Gym coaching settings, proposals and plan snapshots',
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
          config: {
            type: 'object',
            properties: {
              enabled: {
                type: 'boolean'
              },
              consent: {
                type: 'boolean'
              },
              agent_id: {
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
              run_budget_cents: {
                type: 'integer',
                minimum: 0,
                maximum: 1000000
              },
              daily_limit: {
                default: 3,
                type: 'integer',
                minimum: 1,
                maximum: 20
              },
              cadence: {
                default: 'off',
                type: 'string',
                enum: ['off', 'weekly', 'sessions']
              },
              sessions_per_review: {
                default: 5,
                type: 'integer',
                minimum: 2,
                maximum: 60
              },
              intake: {
                anyOf: [
                  {
                    type: 'object',
                    properties: {
                      goal: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 1000
                      },
                      experience: {
                        type: 'string',
                        enum: ['beginner', 'intermediate', 'advanced']
                      },
                      weekdays: {
                        minItems: 1,
                        maxItems: 7,
                        type: 'array',
                        items: {
                          type: 'integer',
                          minimum: 0,
                          maximum: 6
                        }
                      },
                      session_minutes: {
                        type: 'integer',
                        minimum: 10,
                        maximum: 240
                      },
                      equipment: {
                        maxItems: 40,
                        type: 'array',
                        items: {
                          type: 'string',
                          minLength: 1,
                          maxLength: 100
                        }
                      },
                      limitations: {
                        default: '',
                        type: 'string',
                        maxLength: 2000
                      },
                      preferences: {
                        default: '',
                        type: 'string',
                        maxLength: 2000
                      }
                    },
                    required: [
                      'goal',
                      'experience',
                      'weekdays',
                      'session_minutes',
                      'equipment',
                      'limitations',
                      'preferences'
                    ],
                    additionalProperties: false
                  },
                  {
                    type: 'null'
                  }
                ]
              },
              revision: {
                type: 'integer',
                exclusiveMinimum: 0,
                maximum: 9007199254740991
              }
            },
            required: [
              'enabled',
              'consent',
              'agent_id',
              'run_budget_cents',
              'daily_limit',
              'cadence',
              'sessions_per_review',
              'intake',
              'revision'
            ],
            additionalProperties: false
          },
          plan_hash: {
            type: 'string'
          },
          agents: {
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
                adapter: {
                  type: 'string'
                },
                status: {
                  type: 'string'
                },
                budget_cents: {
                  type: 'number'
                }
              },
              required: ['id', 'name', 'adapter', 'status', 'budget_cents'],
              additionalProperties: false
            }
          },
          jobs: {
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
                kind: {
                  type: 'string',
                  enum: ['create', 'review', 'refine']
                },
                status: {
                  type: 'string'
                },
                created: {
                  type: 'string'
                },
                plan_hash: {
                  type: 'string'
                },
                applied_ids: {
                  type: 'array',
                  items: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  }
                },
                proposal: {
                  anyOf: [
                    {
                      type: 'object',
                      properties: {
                        summary: {
                          type: 'string',
                          minLength: 1,
                          maxLength: 3000
                        },
                        notes: {
                          default: [],
                          maxItems: 20,
                          type: 'array',
                          items: {
                            type: 'string',
                            maxLength: 2000
                          }
                        },
                        changes: {
                          maxItems: 40,
                          type: 'array',
                          items: {
                            oneOf: [
                              {
                                type: 'object',
                                properties: {
                                  id: {
                                    type: 'string',
                                    format: 'uuid',
                                    pattern:
                                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                  },
                                  reason: {
                                    type: 'string',
                                    minLength: 1,
                                    maxLength: 2000
                                  },
                                  kind: {
                                    type: 'string',
                                    const: 'add-routine'
                                  },
                                  routine: {
                                    type: 'object',
                                    properties: {
                                      name: {
                                        type: 'string',
                                        minLength: 1,
                                        maxLength: 160
                                      },
                                      notes: {
                                        default: '',
                                        type: 'string',
                                        maxLength: 10000
                                      },
                                      progression: {
                                        default: 'linear',
                                        type: 'string',
                                        enum: [
                                          'off',
                                          'linear',
                                          'greyskull',
                                          'double',
                                          'time'
                                        ]
                                      },
                                      entries: {
                                        default: [],
                                        maxItems: 100,
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
                                            exercise_id: {
                                              type: 'string',
                                              format: 'uuid',
                                              pattern:
                                                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                            },
                                            superset_group: {
                                              default: null,
                                              anyOf: [
                                                {
                                                  type: 'string',
                                                  minLength: 1,
                                                  maxLength: 100
                                                },
                                                {
                                                  type: 'null'
                                                }
                                              ]
                                            },
                                            prescription: {
                                              type: 'object',
                                              properties: {
                                                mode: {
                                                  default: 'reps',
                                                  type: 'string',
                                                  enum: [
                                                    'reps',
                                                    'time',
                                                    'cardio'
                                                  ]
                                                },
                                                sets: {
                                                  default: 3,
                                                  type: 'integer',
                                                  minimum: 1,
                                                  maximum: 50
                                                },
                                                reps: {
                                                  default: 10,
                                                  type: 'integer',
                                                  minimum: 1,
                                                  maximum: 1000
                                                },
                                                reps_min: {
                                                  default: 8,
                                                  type: 'integer',
                                                  minimum: 1,
                                                  maximum: 1000
                                                },
                                                weight_kg: {
                                                  default: 0,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 10000
                                                },
                                                seconds: {
                                                  default: 45,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 86400
                                                },
                                                minutes: {
                                                  default: 20,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 1440
                                                },
                                                speed_kmh: {
                                                  default: 8,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 200
                                                },
                                                rest_seconds: {
                                                  default: 90,
                                                  type: 'integer',
                                                  minimum: 0,
                                                  maximum: 3600
                                                },
                                                progression: {
                                                  default: null,
                                                  anyOf: [
                                                    {
                                                      type: 'string',
                                                      enum: [
                                                        'off',
                                                        'linear',
                                                        'greyskull',
                                                        'double',
                                                        'time'
                                                      ]
                                                    },
                                                    {
                                                      type: 'null'
                                                    }
                                                  ]
                                                },
                                                increment: {
                                                  default: null,
                                                  anyOf: [
                                                    {
                                                      type: 'number',
                                                      exclusiveMinimum: 0,
                                                      maximum: 1000
                                                    },
                                                    {
                                                      type: 'null'
                                                    }
                                                  ]
                                                }
                                              },
                                              required: [
                                                'mode',
                                                'sets',
                                                'reps',
                                                'reps_min',
                                                'weight_kg',
                                                'seconds',
                                                'minutes',
                                                'speed_kmh',
                                                'rest_seconds',
                                                'progression',
                                                'increment'
                                              ],
                                              additionalProperties: false
                                            }
                                          },
                                          required: [
                                            'id',
                                            'exercise_id',
                                            'superset_group',
                                            'prescription'
                                          ],
                                          additionalProperties: false
                                        }
                                      }
                                    },
                                    required: [
                                      'name',
                                      'notes',
                                      'progression',
                                      'entries'
                                    ],
                                    additionalProperties: false
                                  }
                                },
                                required: ['id', 'reason', 'kind', 'routine'],
                                additionalProperties: false
                              },
                              {
                                type: 'object',
                                properties: {
                                  id: {
                                    type: 'string',
                                    format: 'uuid',
                                    pattern:
                                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                  },
                                  reason: {
                                    type: 'string',
                                    minLength: 1,
                                    maxLength: 2000
                                  },
                                  kind: {
                                    type: 'string',
                                    const: 'update-routine'
                                  },
                                  routine_id: {
                                    type: 'string',
                                    format: 'uuid',
                                    pattern:
                                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                  },
                                  expected_revision: {
                                    type: 'integer',
                                    exclusiveMinimum: 0,
                                    maximum: 9007199254740991
                                  },
                                  patch: {
                                    type: 'object',
                                    properties: {
                                      name: {
                                        type: 'string',
                                        minLength: 1,
                                        maxLength: 160
                                      },
                                      notes: {
                                        type: 'string',
                                        maxLength: 10000
                                      },
                                      progression: {
                                        type: 'string',
                                        enum: [
                                          'off',
                                          'linear',
                                          'greyskull',
                                          'double',
                                          'time'
                                        ]
                                      },
                                      entries: {
                                        maxItems: 100,
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
                                            exercise_id: {
                                              type: 'string',
                                              format: 'uuid',
                                              pattern:
                                                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                            },
                                            superset_group: {
                                              default: null,
                                              anyOf: [
                                                {
                                                  type: 'string',
                                                  minLength: 1,
                                                  maxLength: 100
                                                },
                                                {
                                                  type: 'null'
                                                }
                                              ]
                                            },
                                            prescription: {
                                              type: 'object',
                                              properties: {
                                                mode: {
                                                  default: 'reps',
                                                  type: 'string',
                                                  enum: [
                                                    'reps',
                                                    'time',
                                                    'cardio'
                                                  ]
                                                },
                                                sets: {
                                                  default: 3,
                                                  type: 'integer',
                                                  minimum: 1,
                                                  maximum: 50
                                                },
                                                reps: {
                                                  default: 10,
                                                  type: 'integer',
                                                  minimum: 1,
                                                  maximum: 1000
                                                },
                                                reps_min: {
                                                  default: 8,
                                                  type: 'integer',
                                                  minimum: 1,
                                                  maximum: 1000
                                                },
                                                weight_kg: {
                                                  default: 0,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 10000
                                                },
                                                seconds: {
                                                  default: 45,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 86400
                                                },
                                                minutes: {
                                                  default: 20,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 1440
                                                },
                                                speed_kmh: {
                                                  default: 8,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 200
                                                },
                                                rest_seconds: {
                                                  default: 90,
                                                  type: 'integer',
                                                  minimum: 0,
                                                  maximum: 3600
                                                },
                                                progression: {
                                                  default: null,
                                                  anyOf: [
                                                    {
                                                      type: 'string',
                                                      enum: [
                                                        'off',
                                                        'linear',
                                                        'greyskull',
                                                        'double',
                                                        'time'
                                                      ]
                                                    },
                                                    {
                                                      type: 'null'
                                                    }
                                                  ]
                                                },
                                                increment: {
                                                  default: null,
                                                  anyOf: [
                                                    {
                                                      type: 'number',
                                                      exclusiveMinimum: 0,
                                                      maximum: 1000
                                                    },
                                                    {
                                                      type: 'null'
                                                    }
                                                  ]
                                                }
                                              },
                                              required: [
                                                'mode',
                                                'sets',
                                                'reps',
                                                'reps_min',
                                                'weight_kg',
                                                'seconds',
                                                'minutes',
                                                'speed_kmh',
                                                'rest_seconds',
                                                'progression',
                                                'increment'
                                              ],
                                              additionalProperties: false
                                            }
                                          },
                                          required: [
                                            'id',
                                            'exercise_id',
                                            'superset_group',
                                            'prescription'
                                          ],
                                          additionalProperties: false
                                        }
                                      }
                                    },
                                    additionalProperties: false
                                  }
                                },
                                required: [
                                  'id',
                                  'reason',
                                  'kind',
                                  'routine_id',
                                  'expected_revision',
                                  'patch'
                                ],
                                additionalProperties: false
                              },
                              {
                                type: 'object',
                                properties: {
                                  id: {
                                    type: 'string',
                                    format: 'uuid',
                                    pattern:
                                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                  },
                                  reason: {
                                    type: 'string',
                                    minLength: 1,
                                    maxLength: 2000
                                  },
                                  kind: {
                                    type: 'string',
                                    const: 'archive-routine'
                                  },
                                  routine_id: {
                                    type: 'string',
                                    format: 'uuid',
                                    pattern:
                                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                  },
                                  expected_revision: {
                                    type: 'integer',
                                    exclusiveMinimum: 0,
                                    maximum: 9007199254740991
                                  }
                                },
                                required: [
                                  'id',
                                  'reason',
                                  'kind',
                                  'routine_id',
                                  'expected_revision'
                                ],
                                additionalProperties: false
                              },
                              {
                                type: 'object',
                                properties: {
                                  id: {
                                    type: 'string',
                                    format: 'uuid',
                                    pattern:
                                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                  },
                                  reason: {
                                    type: 'string',
                                    minLength: 1,
                                    maxLength: 2000
                                  },
                                  kind: {
                                    type: 'string',
                                    const: 'schedule'
                                  },
                                  weekday: {
                                    type: 'integer',
                                    minimum: 0,
                                    maximum: 6
                                  },
                                  routine_id: {
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
                                required: [
                                  'id',
                                  'reason',
                                  'kind',
                                  'weekday',
                                  'routine_id'
                                ],
                                additionalProperties: false
                              }
                            ]
                          }
                        }
                      },
                      required: ['summary', 'notes', 'changes'],
                      additionalProperties: false
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                error: {
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
                'task_id',
                'run_id',
                'kind',
                'status',
                'created',
                'plan_hash',
                'applied_ids',
                'proposal',
                'error'
              ],
              additionalProperties: false
            }
          },
          can_revert: {
            type: 'boolean'
          },
          worker_required: {
            type: 'boolean',
            const: true
          }
        },
        required: [
          'config',
          'plan_hash',
          'agents',
          'jobs',
          'can_revert',
          'worker_required'
        ],
        additionalProperties: false
      }
    }
  },
  requestCoachReview: {
    method: 'post',
    description:
      'Queue a bounded, metered training proposal for an existing worker',
    noAuth: false,
    encrypted: true,
    isDownloadable: false,
    media: null,
    input: {
      body: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          request_id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          },
          kind: {
            type: 'string',
            enum: ['create', 'review', 'refine']
          },
          feedback: {
            default: '',
            type: 'string',
            maxLength: 5000
          },
          previous_job_id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          }
        },
        required: ['request_id', 'kind', 'feedback'],
        additionalProperties: false
      }
    },
    output: {
      OK: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          config: {
            type: 'object',
            properties: {
              enabled: {
                type: 'boolean'
              },
              consent: {
                type: 'boolean'
              },
              agent_id: {
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
              run_budget_cents: {
                type: 'integer',
                minimum: 0,
                maximum: 1000000
              },
              daily_limit: {
                default: 3,
                type: 'integer',
                minimum: 1,
                maximum: 20
              },
              cadence: {
                default: 'off',
                type: 'string',
                enum: ['off', 'weekly', 'sessions']
              },
              sessions_per_review: {
                default: 5,
                type: 'integer',
                minimum: 2,
                maximum: 60
              },
              intake: {
                anyOf: [
                  {
                    type: 'object',
                    properties: {
                      goal: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 1000
                      },
                      experience: {
                        type: 'string',
                        enum: ['beginner', 'intermediate', 'advanced']
                      },
                      weekdays: {
                        minItems: 1,
                        maxItems: 7,
                        type: 'array',
                        items: {
                          type: 'integer',
                          minimum: 0,
                          maximum: 6
                        }
                      },
                      session_minutes: {
                        type: 'integer',
                        minimum: 10,
                        maximum: 240
                      },
                      equipment: {
                        maxItems: 40,
                        type: 'array',
                        items: {
                          type: 'string',
                          minLength: 1,
                          maxLength: 100
                        }
                      },
                      limitations: {
                        default: '',
                        type: 'string',
                        maxLength: 2000
                      },
                      preferences: {
                        default: '',
                        type: 'string',
                        maxLength: 2000
                      }
                    },
                    required: [
                      'goal',
                      'experience',
                      'weekdays',
                      'session_minutes',
                      'equipment',
                      'limitations',
                      'preferences'
                    ],
                    additionalProperties: false
                  },
                  {
                    type: 'null'
                  }
                ]
              },
              revision: {
                type: 'integer',
                exclusiveMinimum: 0,
                maximum: 9007199254740991
              }
            },
            required: [
              'enabled',
              'consent',
              'agent_id',
              'run_budget_cents',
              'daily_limit',
              'cadence',
              'sessions_per_review',
              'intake',
              'revision'
            ],
            additionalProperties: false
          },
          plan_hash: {
            type: 'string'
          },
          agents: {
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
                adapter: {
                  type: 'string'
                },
                status: {
                  type: 'string'
                },
                budget_cents: {
                  type: 'number'
                }
              },
              required: ['id', 'name', 'adapter', 'status', 'budget_cents'],
              additionalProperties: false
            }
          },
          jobs: {
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
                kind: {
                  type: 'string',
                  enum: ['create', 'review', 'refine']
                },
                status: {
                  type: 'string'
                },
                created: {
                  type: 'string'
                },
                plan_hash: {
                  type: 'string'
                },
                applied_ids: {
                  type: 'array',
                  items: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  }
                },
                proposal: {
                  anyOf: [
                    {
                      type: 'object',
                      properties: {
                        summary: {
                          type: 'string',
                          minLength: 1,
                          maxLength: 3000
                        },
                        notes: {
                          default: [],
                          maxItems: 20,
                          type: 'array',
                          items: {
                            type: 'string',
                            maxLength: 2000
                          }
                        },
                        changes: {
                          maxItems: 40,
                          type: 'array',
                          items: {
                            oneOf: [
                              {
                                type: 'object',
                                properties: {
                                  id: {
                                    type: 'string',
                                    format: 'uuid',
                                    pattern:
                                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                  },
                                  reason: {
                                    type: 'string',
                                    minLength: 1,
                                    maxLength: 2000
                                  },
                                  kind: {
                                    type: 'string',
                                    const: 'add-routine'
                                  },
                                  routine: {
                                    type: 'object',
                                    properties: {
                                      name: {
                                        type: 'string',
                                        minLength: 1,
                                        maxLength: 160
                                      },
                                      notes: {
                                        default: '',
                                        type: 'string',
                                        maxLength: 10000
                                      },
                                      progression: {
                                        default: 'linear',
                                        type: 'string',
                                        enum: [
                                          'off',
                                          'linear',
                                          'greyskull',
                                          'double',
                                          'time'
                                        ]
                                      },
                                      entries: {
                                        default: [],
                                        maxItems: 100,
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
                                            exercise_id: {
                                              type: 'string',
                                              format: 'uuid',
                                              pattern:
                                                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                            },
                                            superset_group: {
                                              default: null,
                                              anyOf: [
                                                {
                                                  type: 'string',
                                                  minLength: 1,
                                                  maxLength: 100
                                                },
                                                {
                                                  type: 'null'
                                                }
                                              ]
                                            },
                                            prescription: {
                                              type: 'object',
                                              properties: {
                                                mode: {
                                                  default: 'reps',
                                                  type: 'string',
                                                  enum: [
                                                    'reps',
                                                    'time',
                                                    'cardio'
                                                  ]
                                                },
                                                sets: {
                                                  default: 3,
                                                  type: 'integer',
                                                  minimum: 1,
                                                  maximum: 50
                                                },
                                                reps: {
                                                  default: 10,
                                                  type: 'integer',
                                                  minimum: 1,
                                                  maximum: 1000
                                                },
                                                reps_min: {
                                                  default: 8,
                                                  type: 'integer',
                                                  minimum: 1,
                                                  maximum: 1000
                                                },
                                                weight_kg: {
                                                  default: 0,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 10000
                                                },
                                                seconds: {
                                                  default: 45,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 86400
                                                },
                                                minutes: {
                                                  default: 20,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 1440
                                                },
                                                speed_kmh: {
                                                  default: 8,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 200
                                                },
                                                rest_seconds: {
                                                  default: 90,
                                                  type: 'integer',
                                                  minimum: 0,
                                                  maximum: 3600
                                                },
                                                progression: {
                                                  default: null,
                                                  anyOf: [
                                                    {
                                                      type: 'string',
                                                      enum: [
                                                        'off',
                                                        'linear',
                                                        'greyskull',
                                                        'double',
                                                        'time'
                                                      ]
                                                    },
                                                    {
                                                      type: 'null'
                                                    }
                                                  ]
                                                },
                                                increment: {
                                                  default: null,
                                                  anyOf: [
                                                    {
                                                      type: 'number',
                                                      exclusiveMinimum: 0,
                                                      maximum: 1000
                                                    },
                                                    {
                                                      type: 'null'
                                                    }
                                                  ]
                                                }
                                              },
                                              required: [
                                                'mode',
                                                'sets',
                                                'reps',
                                                'reps_min',
                                                'weight_kg',
                                                'seconds',
                                                'minutes',
                                                'speed_kmh',
                                                'rest_seconds',
                                                'progression',
                                                'increment'
                                              ],
                                              additionalProperties: false
                                            }
                                          },
                                          required: [
                                            'id',
                                            'exercise_id',
                                            'superset_group',
                                            'prescription'
                                          ],
                                          additionalProperties: false
                                        }
                                      }
                                    },
                                    required: [
                                      'name',
                                      'notes',
                                      'progression',
                                      'entries'
                                    ],
                                    additionalProperties: false
                                  }
                                },
                                required: ['id', 'reason', 'kind', 'routine'],
                                additionalProperties: false
                              },
                              {
                                type: 'object',
                                properties: {
                                  id: {
                                    type: 'string',
                                    format: 'uuid',
                                    pattern:
                                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                  },
                                  reason: {
                                    type: 'string',
                                    minLength: 1,
                                    maxLength: 2000
                                  },
                                  kind: {
                                    type: 'string',
                                    const: 'update-routine'
                                  },
                                  routine_id: {
                                    type: 'string',
                                    format: 'uuid',
                                    pattern:
                                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                  },
                                  expected_revision: {
                                    type: 'integer',
                                    exclusiveMinimum: 0,
                                    maximum: 9007199254740991
                                  },
                                  patch: {
                                    type: 'object',
                                    properties: {
                                      name: {
                                        type: 'string',
                                        minLength: 1,
                                        maxLength: 160
                                      },
                                      notes: {
                                        type: 'string',
                                        maxLength: 10000
                                      },
                                      progression: {
                                        type: 'string',
                                        enum: [
                                          'off',
                                          'linear',
                                          'greyskull',
                                          'double',
                                          'time'
                                        ]
                                      },
                                      entries: {
                                        maxItems: 100,
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
                                            exercise_id: {
                                              type: 'string',
                                              format: 'uuid',
                                              pattern:
                                                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                            },
                                            superset_group: {
                                              default: null,
                                              anyOf: [
                                                {
                                                  type: 'string',
                                                  minLength: 1,
                                                  maxLength: 100
                                                },
                                                {
                                                  type: 'null'
                                                }
                                              ]
                                            },
                                            prescription: {
                                              type: 'object',
                                              properties: {
                                                mode: {
                                                  default: 'reps',
                                                  type: 'string',
                                                  enum: [
                                                    'reps',
                                                    'time',
                                                    'cardio'
                                                  ]
                                                },
                                                sets: {
                                                  default: 3,
                                                  type: 'integer',
                                                  minimum: 1,
                                                  maximum: 50
                                                },
                                                reps: {
                                                  default: 10,
                                                  type: 'integer',
                                                  minimum: 1,
                                                  maximum: 1000
                                                },
                                                reps_min: {
                                                  default: 8,
                                                  type: 'integer',
                                                  minimum: 1,
                                                  maximum: 1000
                                                },
                                                weight_kg: {
                                                  default: 0,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 10000
                                                },
                                                seconds: {
                                                  default: 45,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 86400
                                                },
                                                minutes: {
                                                  default: 20,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 1440
                                                },
                                                speed_kmh: {
                                                  default: 8,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 200
                                                },
                                                rest_seconds: {
                                                  default: 90,
                                                  type: 'integer',
                                                  minimum: 0,
                                                  maximum: 3600
                                                },
                                                progression: {
                                                  default: null,
                                                  anyOf: [
                                                    {
                                                      type: 'string',
                                                      enum: [
                                                        'off',
                                                        'linear',
                                                        'greyskull',
                                                        'double',
                                                        'time'
                                                      ]
                                                    },
                                                    {
                                                      type: 'null'
                                                    }
                                                  ]
                                                },
                                                increment: {
                                                  default: null,
                                                  anyOf: [
                                                    {
                                                      type: 'number',
                                                      exclusiveMinimum: 0,
                                                      maximum: 1000
                                                    },
                                                    {
                                                      type: 'null'
                                                    }
                                                  ]
                                                }
                                              },
                                              required: [
                                                'mode',
                                                'sets',
                                                'reps',
                                                'reps_min',
                                                'weight_kg',
                                                'seconds',
                                                'minutes',
                                                'speed_kmh',
                                                'rest_seconds',
                                                'progression',
                                                'increment'
                                              ],
                                              additionalProperties: false
                                            }
                                          },
                                          required: [
                                            'id',
                                            'exercise_id',
                                            'superset_group',
                                            'prescription'
                                          ],
                                          additionalProperties: false
                                        }
                                      }
                                    },
                                    additionalProperties: false
                                  }
                                },
                                required: [
                                  'id',
                                  'reason',
                                  'kind',
                                  'routine_id',
                                  'expected_revision',
                                  'patch'
                                ],
                                additionalProperties: false
                              },
                              {
                                type: 'object',
                                properties: {
                                  id: {
                                    type: 'string',
                                    format: 'uuid',
                                    pattern:
                                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                  },
                                  reason: {
                                    type: 'string',
                                    minLength: 1,
                                    maxLength: 2000
                                  },
                                  kind: {
                                    type: 'string',
                                    const: 'archive-routine'
                                  },
                                  routine_id: {
                                    type: 'string',
                                    format: 'uuid',
                                    pattern:
                                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                  },
                                  expected_revision: {
                                    type: 'integer',
                                    exclusiveMinimum: 0,
                                    maximum: 9007199254740991
                                  }
                                },
                                required: [
                                  'id',
                                  'reason',
                                  'kind',
                                  'routine_id',
                                  'expected_revision'
                                ],
                                additionalProperties: false
                              },
                              {
                                type: 'object',
                                properties: {
                                  id: {
                                    type: 'string',
                                    format: 'uuid',
                                    pattern:
                                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                  },
                                  reason: {
                                    type: 'string',
                                    minLength: 1,
                                    maxLength: 2000
                                  },
                                  kind: {
                                    type: 'string',
                                    const: 'schedule'
                                  },
                                  weekday: {
                                    type: 'integer',
                                    minimum: 0,
                                    maximum: 6
                                  },
                                  routine_id: {
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
                                required: [
                                  'id',
                                  'reason',
                                  'kind',
                                  'weekday',
                                  'routine_id'
                                ],
                                additionalProperties: false
                              }
                            ]
                          }
                        }
                      },
                      required: ['summary', 'notes', 'changes'],
                      additionalProperties: false
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                error: {
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
                'task_id',
                'run_id',
                'kind',
                'status',
                'created',
                'plan_hash',
                'applied_ids',
                'proposal',
                'error'
              ],
              additionalProperties: false
            }
          },
          can_revert: {
            type: 'boolean'
          },
          worker_required: {
            type: 'boolean',
            const: true
          }
        },
        required: [
          'config',
          'plan_hash',
          'agents',
          'jobs',
          'can_revert',
          'worker_required'
        ],
        additionalProperties: false
      }
    }
  },
  revertCoachProposal: {
    method: 'post',
    description:
      'Restore the latest plan snapshot without altering workout history',
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
          config: {
            type: 'object',
            properties: {
              enabled: {
                type: 'boolean'
              },
              consent: {
                type: 'boolean'
              },
              agent_id: {
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
              run_budget_cents: {
                type: 'integer',
                minimum: 0,
                maximum: 1000000
              },
              daily_limit: {
                default: 3,
                type: 'integer',
                minimum: 1,
                maximum: 20
              },
              cadence: {
                default: 'off',
                type: 'string',
                enum: ['off', 'weekly', 'sessions']
              },
              sessions_per_review: {
                default: 5,
                type: 'integer',
                minimum: 2,
                maximum: 60
              },
              intake: {
                anyOf: [
                  {
                    type: 'object',
                    properties: {
                      goal: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 1000
                      },
                      experience: {
                        type: 'string',
                        enum: ['beginner', 'intermediate', 'advanced']
                      },
                      weekdays: {
                        minItems: 1,
                        maxItems: 7,
                        type: 'array',
                        items: {
                          type: 'integer',
                          minimum: 0,
                          maximum: 6
                        }
                      },
                      session_minutes: {
                        type: 'integer',
                        minimum: 10,
                        maximum: 240
                      },
                      equipment: {
                        maxItems: 40,
                        type: 'array',
                        items: {
                          type: 'string',
                          minLength: 1,
                          maxLength: 100
                        }
                      },
                      limitations: {
                        default: '',
                        type: 'string',
                        maxLength: 2000
                      },
                      preferences: {
                        default: '',
                        type: 'string',
                        maxLength: 2000
                      }
                    },
                    required: [
                      'goal',
                      'experience',
                      'weekdays',
                      'session_minutes',
                      'equipment',
                      'limitations',
                      'preferences'
                    ],
                    additionalProperties: false
                  },
                  {
                    type: 'null'
                  }
                ]
              },
              revision: {
                type: 'integer',
                exclusiveMinimum: 0,
                maximum: 9007199254740991
              }
            },
            required: [
              'enabled',
              'consent',
              'agent_id',
              'run_budget_cents',
              'daily_limit',
              'cadence',
              'sessions_per_review',
              'intake',
              'revision'
            ],
            additionalProperties: false
          },
          plan_hash: {
            type: 'string'
          },
          agents: {
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
                adapter: {
                  type: 'string'
                },
                status: {
                  type: 'string'
                },
                budget_cents: {
                  type: 'number'
                }
              },
              required: ['id', 'name', 'adapter', 'status', 'budget_cents'],
              additionalProperties: false
            }
          },
          jobs: {
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
                kind: {
                  type: 'string',
                  enum: ['create', 'review', 'refine']
                },
                status: {
                  type: 'string'
                },
                created: {
                  type: 'string'
                },
                plan_hash: {
                  type: 'string'
                },
                applied_ids: {
                  type: 'array',
                  items: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  }
                },
                proposal: {
                  anyOf: [
                    {
                      type: 'object',
                      properties: {
                        summary: {
                          type: 'string',
                          minLength: 1,
                          maxLength: 3000
                        },
                        notes: {
                          default: [],
                          maxItems: 20,
                          type: 'array',
                          items: {
                            type: 'string',
                            maxLength: 2000
                          }
                        },
                        changes: {
                          maxItems: 40,
                          type: 'array',
                          items: {
                            oneOf: [
                              {
                                type: 'object',
                                properties: {
                                  id: {
                                    type: 'string',
                                    format: 'uuid',
                                    pattern:
                                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                  },
                                  reason: {
                                    type: 'string',
                                    minLength: 1,
                                    maxLength: 2000
                                  },
                                  kind: {
                                    type: 'string',
                                    const: 'add-routine'
                                  },
                                  routine: {
                                    type: 'object',
                                    properties: {
                                      name: {
                                        type: 'string',
                                        minLength: 1,
                                        maxLength: 160
                                      },
                                      notes: {
                                        default: '',
                                        type: 'string',
                                        maxLength: 10000
                                      },
                                      progression: {
                                        default: 'linear',
                                        type: 'string',
                                        enum: [
                                          'off',
                                          'linear',
                                          'greyskull',
                                          'double',
                                          'time'
                                        ]
                                      },
                                      entries: {
                                        default: [],
                                        maxItems: 100,
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
                                            exercise_id: {
                                              type: 'string',
                                              format: 'uuid',
                                              pattern:
                                                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                            },
                                            superset_group: {
                                              default: null,
                                              anyOf: [
                                                {
                                                  type: 'string',
                                                  minLength: 1,
                                                  maxLength: 100
                                                },
                                                {
                                                  type: 'null'
                                                }
                                              ]
                                            },
                                            prescription: {
                                              type: 'object',
                                              properties: {
                                                mode: {
                                                  default: 'reps',
                                                  type: 'string',
                                                  enum: [
                                                    'reps',
                                                    'time',
                                                    'cardio'
                                                  ]
                                                },
                                                sets: {
                                                  default: 3,
                                                  type: 'integer',
                                                  minimum: 1,
                                                  maximum: 50
                                                },
                                                reps: {
                                                  default: 10,
                                                  type: 'integer',
                                                  minimum: 1,
                                                  maximum: 1000
                                                },
                                                reps_min: {
                                                  default: 8,
                                                  type: 'integer',
                                                  minimum: 1,
                                                  maximum: 1000
                                                },
                                                weight_kg: {
                                                  default: 0,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 10000
                                                },
                                                seconds: {
                                                  default: 45,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 86400
                                                },
                                                minutes: {
                                                  default: 20,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 1440
                                                },
                                                speed_kmh: {
                                                  default: 8,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 200
                                                },
                                                rest_seconds: {
                                                  default: 90,
                                                  type: 'integer',
                                                  minimum: 0,
                                                  maximum: 3600
                                                },
                                                progression: {
                                                  default: null,
                                                  anyOf: [
                                                    {
                                                      type: 'string',
                                                      enum: [
                                                        'off',
                                                        'linear',
                                                        'greyskull',
                                                        'double',
                                                        'time'
                                                      ]
                                                    },
                                                    {
                                                      type: 'null'
                                                    }
                                                  ]
                                                },
                                                increment: {
                                                  default: null,
                                                  anyOf: [
                                                    {
                                                      type: 'number',
                                                      exclusiveMinimum: 0,
                                                      maximum: 1000
                                                    },
                                                    {
                                                      type: 'null'
                                                    }
                                                  ]
                                                }
                                              },
                                              required: [
                                                'mode',
                                                'sets',
                                                'reps',
                                                'reps_min',
                                                'weight_kg',
                                                'seconds',
                                                'minutes',
                                                'speed_kmh',
                                                'rest_seconds',
                                                'progression',
                                                'increment'
                                              ],
                                              additionalProperties: false
                                            }
                                          },
                                          required: [
                                            'id',
                                            'exercise_id',
                                            'superset_group',
                                            'prescription'
                                          ],
                                          additionalProperties: false
                                        }
                                      }
                                    },
                                    required: [
                                      'name',
                                      'notes',
                                      'progression',
                                      'entries'
                                    ],
                                    additionalProperties: false
                                  }
                                },
                                required: ['id', 'reason', 'kind', 'routine'],
                                additionalProperties: false
                              },
                              {
                                type: 'object',
                                properties: {
                                  id: {
                                    type: 'string',
                                    format: 'uuid',
                                    pattern:
                                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                  },
                                  reason: {
                                    type: 'string',
                                    minLength: 1,
                                    maxLength: 2000
                                  },
                                  kind: {
                                    type: 'string',
                                    const: 'update-routine'
                                  },
                                  routine_id: {
                                    type: 'string',
                                    format: 'uuid',
                                    pattern:
                                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                  },
                                  expected_revision: {
                                    type: 'integer',
                                    exclusiveMinimum: 0,
                                    maximum: 9007199254740991
                                  },
                                  patch: {
                                    type: 'object',
                                    properties: {
                                      name: {
                                        type: 'string',
                                        minLength: 1,
                                        maxLength: 160
                                      },
                                      notes: {
                                        type: 'string',
                                        maxLength: 10000
                                      },
                                      progression: {
                                        type: 'string',
                                        enum: [
                                          'off',
                                          'linear',
                                          'greyskull',
                                          'double',
                                          'time'
                                        ]
                                      },
                                      entries: {
                                        maxItems: 100,
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
                                            exercise_id: {
                                              type: 'string',
                                              format: 'uuid',
                                              pattern:
                                                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                            },
                                            superset_group: {
                                              default: null,
                                              anyOf: [
                                                {
                                                  type: 'string',
                                                  minLength: 1,
                                                  maxLength: 100
                                                },
                                                {
                                                  type: 'null'
                                                }
                                              ]
                                            },
                                            prescription: {
                                              type: 'object',
                                              properties: {
                                                mode: {
                                                  default: 'reps',
                                                  type: 'string',
                                                  enum: [
                                                    'reps',
                                                    'time',
                                                    'cardio'
                                                  ]
                                                },
                                                sets: {
                                                  default: 3,
                                                  type: 'integer',
                                                  minimum: 1,
                                                  maximum: 50
                                                },
                                                reps: {
                                                  default: 10,
                                                  type: 'integer',
                                                  minimum: 1,
                                                  maximum: 1000
                                                },
                                                reps_min: {
                                                  default: 8,
                                                  type: 'integer',
                                                  minimum: 1,
                                                  maximum: 1000
                                                },
                                                weight_kg: {
                                                  default: 0,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 10000
                                                },
                                                seconds: {
                                                  default: 45,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 86400
                                                },
                                                minutes: {
                                                  default: 20,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 1440
                                                },
                                                speed_kmh: {
                                                  default: 8,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 200
                                                },
                                                rest_seconds: {
                                                  default: 90,
                                                  type: 'integer',
                                                  minimum: 0,
                                                  maximum: 3600
                                                },
                                                progression: {
                                                  default: null,
                                                  anyOf: [
                                                    {
                                                      type: 'string',
                                                      enum: [
                                                        'off',
                                                        'linear',
                                                        'greyskull',
                                                        'double',
                                                        'time'
                                                      ]
                                                    },
                                                    {
                                                      type: 'null'
                                                    }
                                                  ]
                                                },
                                                increment: {
                                                  default: null,
                                                  anyOf: [
                                                    {
                                                      type: 'number',
                                                      exclusiveMinimum: 0,
                                                      maximum: 1000
                                                    },
                                                    {
                                                      type: 'null'
                                                    }
                                                  ]
                                                }
                                              },
                                              required: [
                                                'mode',
                                                'sets',
                                                'reps',
                                                'reps_min',
                                                'weight_kg',
                                                'seconds',
                                                'minutes',
                                                'speed_kmh',
                                                'rest_seconds',
                                                'progression',
                                                'increment'
                                              ],
                                              additionalProperties: false
                                            }
                                          },
                                          required: [
                                            'id',
                                            'exercise_id',
                                            'superset_group',
                                            'prescription'
                                          ],
                                          additionalProperties: false
                                        }
                                      }
                                    },
                                    additionalProperties: false
                                  }
                                },
                                required: [
                                  'id',
                                  'reason',
                                  'kind',
                                  'routine_id',
                                  'expected_revision',
                                  'patch'
                                ],
                                additionalProperties: false
                              },
                              {
                                type: 'object',
                                properties: {
                                  id: {
                                    type: 'string',
                                    format: 'uuid',
                                    pattern:
                                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                  },
                                  reason: {
                                    type: 'string',
                                    minLength: 1,
                                    maxLength: 2000
                                  },
                                  kind: {
                                    type: 'string',
                                    const: 'archive-routine'
                                  },
                                  routine_id: {
                                    type: 'string',
                                    format: 'uuid',
                                    pattern:
                                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                  },
                                  expected_revision: {
                                    type: 'integer',
                                    exclusiveMinimum: 0,
                                    maximum: 9007199254740991
                                  }
                                },
                                required: [
                                  'id',
                                  'reason',
                                  'kind',
                                  'routine_id',
                                  'expected_revision'
                                ],
                                additionalProperties: false
                              },
                              {
                                type: 'object',
                                properties: {
                                  id: {
                                    type: 'string',
                                    format: 'uuid',
                                    pattern:
                                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                  },
                                  reason: {
                                    type: 'string',
                                    minLength: 1,
                                    maxLength: 2000
                                  },
                                  kind: {
                                    type: 'string',
                                    const: 'schedule'
                                  },
                                  weekday: {
                                    type: 'integer',
                                    minimum: 0,
                                    maximum: 6
                                  },
                                  routine_id: {
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
                                required: [
                                  'id',
                                  'reason',
                                  'kind',
                                  'weekday',
                                  'routine_id'
                                ],
                                additionalProperties: false
                              }
                            ]
                          }
                        }
                      },
                      required: ['summary', 'notes', 'changes'],
                      additionalProperties: false
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                error: {
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
                'task_id',
                'run_id',
                'kind',
                'status',
                'created',
                'plan_hash',
                'applied_ids',
                'proposal',
                'error'
              ],
              additionalProperties: false
            }
          },
          can_revert: {
            type: 'boolean'
          },
          worker_required: {
            type: 'boolean',
            const: true
          }
        },
        required: [
          'config',
          'plan_hash',
          'agents',
          'jobs',
          'can_revert',
          'worker_required'
        ],
        additionalProperties: false
      }
    }
  },
  saveCoachConfig: {
    method: 'post',
    description: 'Set consent, intake, agent, budget and review cadence',
    noAuth: false,
    encrypted: true,
    isDownloadable: false,
    media: null,
    input: {
      body: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          enabled: {
            type: 'boolean'
          },
          consent: {
            type: 'boolean'
          },
          agent_id: {
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
          run_budget_cents: {
            type: 'integer',
            minimum: 0,
            maximum: 1000000
          },
          daily_limit: {
            default: 3,
            type: 'integer',
            minimum: 1,
            maximum: 20
          },
          cadence: {
            default: 'off',
            type: 'string',
            enum: ['off', 'weekly', 'sessions']
          },
          sessions_per_review: {
            default: 5,
            type: 'integer',
            minimum: 2,
            maximum: 60
          },
          intake: {
            anyOf: [
              {
                type: 'object',
                properties: {
                  goal: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 1000
                  },
                  experience: {
                    type: 'string',
                    enum: ['beginner', 'intermediate', 'advanced']
                  },
                  weekdays: {
                    minItems: 1,
                    maxItems: 7,
                    type: 'array',
                    items: {
                      type: 'integer',
                      minimum: 0,
                      maximum: 6
                    }
                  },
                  session_minutes: {
                    type: 'integer',
                    minimum: 10,
                    maximum: 240
                  },
                  equipment: {
                    maxItems: 40,
                    type: 'array',
                    items: {
                      type: 'string',
                      minLength: 1,
                      maxLength: 100
                    }
                  },
                  limitations: {
                    default: '',
                    type: 'string',
                    maxLength: 2000
                  },
                  preferences: {
                    default: '',
                    type: 'string',
                    maxLength: 2000
                  }
                },
                required: [
                  'goal',
                  'experience',
                  'weekdays',
                  'session_minutes',
                  'equipment',
                  'limitations',
                  'preferences'
                ],
                additionalProperties: false
              },
              {
                type: 'null'
              }
            ]
          },
          expected_revision: {
            type: 'integer',
            exclusiveMinimum: 0,
            maximum: 9007199254740991
          }
        },
        required: [
          'enabled',
          'consent',
          'agent_id',
          'run_budget_cents',
          'daily_limit',
          'cadence',
          'sessions_per_review',
          'intake',
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
          config: {
            type: 'object',
            properties: {
              enabled: {
                type: 'boolean'
              },
              consent: {
                type: 'boolean'
              },
              agent_id: {
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
              run_budget_cents: {
                type: 'integer',
                minimum: 0,
                maximum: 1000000
              },
              daily_limit: {
                default: 3,
                type: 'integer',
                minimum: 1,
                maximum: 20
              },
              cadence: {
                default: 'off',
                type: 'string',
                enum: ['off', 'weekly', 'sessions']
              },
              sessions_per_review: {
                default: 5,
                type: 'integer',
                minimum: 2,
                maximum: 60
              },
              intake: {
                anyOf: [
                  {
                    type: 'object',
                    properties: {
                      goal: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 1000
                      },
                      experience: {
                        type: 'string',
                        enum: ['beginner', 'intermediate', 'advanced']
                      },
                      weekdays: {
                        minItems: 1,
                        maxItems: 7,
                        type: 'array',
                        items: {
                          type: 'integer',
                          minimum: 0,
                          maximum: 6
                        }
                      },
                      session_minutes: {
                        type: 'integer',
                        minimum: 10,
                        maximum: 240
                      },
                      equipment: {
                        maxItems: 40,
                        type: 'array',
                        items: {
                          type: 'string',
                          minLength: 1,
                          maxLength: 100
                        }
                      },
                      limitations: {
                        default: '',
                        type: 'string',
                        maxLength: 2000
                      },
                      preferences: {
                        default: '',
                        type: 'string',
                        maxLength: 2000
                      }
                    },
                    required: [
                      'goal',
                      'experience',
                      'weekdays',
                      'session_minutes',
                      'equipment',
                      'limitations',
                      'preferences'
                    ],
                    additionalProperties: false
                  },
                  {
                    type: 'null'
                  }
                ]
              },
              revision: {
                type: 'integer',
                exclusiveMinimum: 0,
                maximum: 9007199254740991
              }
            },
            required: [
              'enabled',
              'consent',
              'agent_id',
              'run_budget_cents',
              'daily_limit',
              'cadence',
              'sessions_per_review',
              'intake',
              'revision'
            ],
            additionalProperties: false
          },
          plan_hash: {
            type: 'string'
          },
          agents: {
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
                adapter: {
                  type: 'string'
                },
                status: {
                  type: 'string'
                },
                budget_cents: {
                  type: 'number'
                }
              },
              required: ['id', 'name', 'adapter', 'status', 'budget_cents'],
              additionalProperties: false
            }
          },
          jobs: {
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
                kind: {
                  type: 'string',
                  enum: ['create', 'review', 'refine']
                },
                status: {
                  type: 'string'
                },
                created: {
                  type: 'string'
                },
                plan_hash: {
                  type: 'string'
                },
                applied_ids: {
                  type: 'array',
                  items: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  }
                },
                proposal: {
                  anyOf: [
                    {
                      type: 'object',
                      properties: {
                        summary: {
                          type: 'string',
                          minLength: 1,
                          maxLength: 3000
                        },
                        notes: {
                          default: [],
                          maxItems: 20,
                          type: 'array',
                          items: {
                            type: 'string',
                            maxLength: 2000
                          }
                        },
                        changes: {
                          maxItems: 40,
                          type: 'array',
                          items: {
                            oneOf: [
                              {
                                type: 'object',
                                properties: {
                                  id: {
                                    type: 'string',
                                    format: 'uuid',
                                    pattern:
                                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                  },
                                  reason: {
                                    type: 'string',
                                    minLength: 1,
                                    maxLength: 2000
                                  },
                                  kind: {
                                    type: 'string',
                                    const: 'add-routine'
                                  },
                                  routine: {
                                    type: 'object',
                                    properties: {
                                      name: {
                                        type: 'string',
                                        minLength: 1,
                                        maxLength: 160
                                      },
                                      notes: {
                                        default: '',
                                        type: 'string',
                                        maxLength: 10000
                                      },
                                      progression: {
                                        default: 'linear',
                                        type: 'string',
                                        enum: [
                                          'off',
                                          'linear',
                                          'greyskull',
                                          'double',
                                          'time'
                                        ]
                                      },
                                      entries: {
                                        default: [],
                                        maxItems: 100,
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
                                            exercise_id: {
                                              type: 'string',
                                              format: 'uuid',
                                              pattern:
                                                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                            },
                                            superset_group: {
                                              default: null,
                                              anyOf: [
                                                {
                                                  type: 'string',
                                                  minLength: 1,
                                                  maxLength: 100
                                                },
                                                {
                                                  type: 'null'
                                                }
                                              ]
                                            },
                                            prescription: {
                                              type: 'object',
                                              properties: {
                                                mode: {
                                                  default: 'reps',
                                                  type: 'string',
                                                  enum: [
                                                    'reps',
                                                    'time',
                                                    'cardio'
                                                  ]
                                                },
                                                sets: {
                                                  default: 3,
                                                  type: 'integer',
                                                  minimum: 1,
                                                  maximum: 50
                                                },
                                                reps: {
                                                  default: 10,
                                                  type: 'integer',
                                                  minimum: 1,
                                                  maximum: 1000
                                                },
                                                reps_min: {
                                                  default: 8,
                                                  type: 'integer',
                                                  minimum: 1,
                                                  maximum: 1000
                                                },
                                                weight_kg: {
                                                  default: 0,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 10000
                                                },
                                                seconds: {
                                                  default: 45,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 86400
                                                },
                                                minutes: {
                                                  default: 20,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 1440
                                                },
                                                speed_kmh: {
                                                  default: 8,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 200
                                                },
                                                rest_seconds: {
                                                  default: 90,
                                                  type: 'integer',
                                                  minimum: 0,
                                                  maximum: 3600
                                                },
                                                progression: {
                                                  default: null,
                                                  anyOf: [
                                                    {
                                                      type: 'string',
                                                      enum: [
                                                        'off',
                                                        'linear',
                                                        'greyskull',
                                                        'double',
                                                        'time'
                                                      ]
                                                    },
                                                    {
                                                      type: 'null'
                                                    }
                                                  ]
                                                },
                                                increment: {
                                                  default: null,
                                                  anyOf: [
                                                    {
                                                      type: 'number',
                                                      exclusiveMinimum: 0,
                                                      maximum: 1000
                                                    },
                                                    {
                                                      type: 'null'
                                                    }
                                                  ]
                                                }
                                              },
                                              required: [
                                                'mode',
                                                'sets',
                                                'reps',
                                                'reps_min',
                                                'weight_kg',
                                                'seconds',
                                                'minutes',
                                                'speed_kmh',
                                                'rest_seconds',
                                                'progression',
                                                'increment'
                                              ],
                                              additionalProperties: false
                                            }
                                          },
                                          required: [
                                            'id',
                                            'exercise_id',
                                            'superset_group',
                                            'prescription'
                                          ],
                                          additionalProperties: false
                                        }
                                      }
                                    },
                                    required: [
                                      'name',
                                      'notes',
                                      'progression',
                                      'entries'
                                    ],
                                    additionalProperties: false
                                  }
                                },
                                required: ['id', 'reason', 'kind', 'routine'],
                                additionalProperties: false
                              },
                              {
                                type: 'object',
                                properties: {
                                  id: {
                                    type: 'string',
                                    format: 'uuid',
                                    pattern:
                                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                  },
                                  reason: {
                                    type: 'string',
                                    minLength: 1,
                                    maxLength: 2000
                                  },
                                  kind: {
                                    type: 'string',
                                    const: 'update-routine'
                                  },
                                  routine_id: {
                                    type: 'string',
                                    format: 'uuid',
                                    pattern:
                                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                  },
                                  expected_revision: {
                                    type: 'integer',
                                    exclusiveMinimum: 0,
                                    maximum: 9007199254740991
                                  },
                                  patch: {
                                    type: 'object',
                                    properties: {
                                      name: {
                                        type: 'string',
                                        minLength: 1,
                                        maxLength: 160
                                      },
                                      notes: {
                                        type: 'string',
                                        maxLength: 10000
                                      },
                                      progression: {
                                        type: 'string',
                                        enum: [
                                          'off',
                                          'linear',
                                          'greyskull',
                                          'double',
                                          'time'
                                        ]
                                      },
                                      entries: {
                                        maxItems: 100,
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
                                            exercise_id: {
                                              type: 'string',
                                              format: 'uuid',
                                              pattern:
                                                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                            },
                                            superset_group: {
                                              default: null,
                                              anyOf: [
                                                {
                                                  type: 'string',
                                                  minLength: 1,
                                                  maxLength: 100
                                                },
                                                {
                                                  type: 'null'
                                                }
                                              ]
                                            },
                                            prescription: {
                                              type: 'object',
                                              properties: {
                                                mode: {
                                                  default: 'reps',
                                                  type: 'string',
                                                  enum: [
                                                    'reps',
                                                    'time',
                                                    'cardio'
                                                  ]
                                                },
                                                sets: {
                                                  default: 3,
                                                  type: 'integer',
                                                  minimum: 1,
                                                  maximum: 50
                                                },
                                                reps: {
                                                  default: 10,
                                                  type: 'integer',
                                                  minimum: 1,
                                                  maximum: 1000
                                                },
                                                reps_min: {
                                                  default: 8,
                                                  type: 'integer',
                                                  minimum: 1,
                                                  maximum: 1000
                                                },
                                                weight_kg: {
                                                  default: 0,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 10000
                                                },
                                                seconds: {
                                                  default: 45,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 86400
                                                },
                                                minutes: {
                                                  default: 20,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 1440
                                                },
                                                speed_kmh: {
                                                  default: 8,
                                                  type: 'number',
                                                  minimum: 0,
                                                  maximum: 200
                                                },
                                                rest_seconds: {
                                                  default: 90,
                                                  type: 'integer',
                                                  minimum: 0,
                                                  maximum: 3600
                                                },
                                                progression: {
                                                  default: null,
                                                  anyOf: [
                                                    {
                                                      type: 'string',
                                                      enum: [
                                                        'off',
                                                        'linear',
                                                        'greyskull',
                                                        'double',
                                                        'time'
                                                      ]
                                                    },
                                                    {
                                                      type: 'null'
                                                    }
                                                  ]
                                                },
                                                increment: {
                                                  default: null,
                                                  anyOf: [
                                                    {
                                                      type: 'number',
                                                      exclusiveMinimum: 0,
                                                      maximum: 1000
                                                    },
                                                    {
                                                      type: 'null'
                                                    }
                                                  ]
                                                }
                                              },
                                              required: [
                                                'mode',
                                                'sets',
                                                'reps',
                                                'reps_min',
                                                'weight_kg',
                                                'seconds',
                                                'minutes',
                                                'speed_kmh',
                                                'rest_seconds',
                                                'progression',
                                                'increment'
                                              ],
                                              additionalProperties: false
                                            }
                                          },
                                          required: [
                                            'id',
                                            'exercise_id',
                                            'superset_group',
                                            'prescription'
                                          ],
                                          additionalProperties: false
                                        }
                                      }
                                    },
                                    additionalProperties: false
                                  }
                                },
                                required: [
                                  'id',
                                  'reason',
                                  'kind',
                                  'routine_id',
                                  'expected_revision',
                                  'patch'
                                ],
                                additionalProperties: false
                              },
                              {
                                type: 'object',
                                properties: {
                                  id: {
                                    type: 'string',
                                    format: 'uuid',
                                    pattern:
                                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                  },
                                  reason: {
                                    type: 'string',
                                    minLength: 1,
                                    maxLength: 2000
                                  },
                                  kind: {
                                    type: 'string',
                                    const: 'archive-routine'
                                  },
                                  routine_id: {
                                    type: 'string',
                                    format: 'uuid',
                                    pattern:
                                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                  },
                                  expected_revision: {
                                    type: 'integer',
                                    exclusiveMinimum: 0,
                                    maximum: 9007199254740991
                                  }
                                },
                                required: [
                                  'id',
                                  'reason',
                                  'kind',
                                  'routine_id',
                                  'expected_revision'
                                ],
                                additionalProperties: false
                              },
                              {
                                type: 'object',
                                properties: {
                                  id: {
                                    type: 'string',
                                    format: 'uuid',
                                    pattern:
                                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                  },
                                  reason: {
                                    type: 'string',
                                    minLength: 1,
                                    maxLength: 2000
                                  },
                                  kind: {
                                    type: 'string',
                                    const: 'schedule'
                                  },
                                  weekday: {
                                    type: 'integer',
                                    minimum: 0,
                                    maximum: 6
                                  },
                                  routine_id: {
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
                                required: [
                                  'id',
                                  'reason',
                                  'kind',
                                  'weekday',
                                  'routine_id'
                                ],
                                additionalProperties: false
                              }
                            ]
                          }
                        }
                      },
                      required: ['summary', 'notes', 'changes'],
                      additionalProperties: false
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                error: {
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
                'task_id',
                'run_id',
                'kind',
                'status',
                'created',
                'plan_hash',
                'applied_ids',
                'proposal',
                'error'
              ],
              additionalProperties: false
            }
          },
          can_revert: {
            type: 'boolean'
          },
          worker_required: {
            type: 'boolean',
            const: true
          }
        },
        required: [
          'config',
          'plan_hash',
          'agents',
          'jobs',
          'can_revert',
          'worker_required'
        ],
        additionalProperties: false
      }
    }
  },
  pushStatus: {
    method: 'get',
    description:
      'Read Web Push capability and your opted-in devices without exposing endpoint credentials',
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
          owner_id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          },
          configured: {
            type: 'boolean'
          },
          public_key: {
            anyOf: [
              {
                type: 'string'
              },
              {
                type: 'null'
              }
            ]
          },
          subscriptions: {
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
                endpoint_hash: {
                  type: 'string',
                  pattern: '^[a-f0-9]{64}$'
                },
                device_name: {
                  type: 'string'
                },
                language: {
                  type: 'string',
                  enum: ['en', 'ms', 'zh-CN', 'zh-TW']
                },
                preferences: {
                  type: 'object',
                  properties: {
                    planned: {
                      default: true,
                      type: 'boolean'
                    },
                    rest: {
                      default: true,
                      type: 'boolean'
                    },
                    coach: {
                      default: true,
                      type: 'boolean'
                    }
                  },
                  required: ['planned', 'rest', 'coach'],
                  additionalProperties: false
                },
                created: {
                  type: 'string'
                },
                last_success: {
                  anyOf: [
                    {
                      type: 'string'
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                last_error: {
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
                'endpoint_hash',
                'device_name',
                'language',
                'preferences',
                'created',
                'last_success',
                'last_error'
              ],
              additionalProperties: false
            }
          }
        },
        required: ['owner_id', 'configured', 'public_key', 'subscriptions'],
        additionalProperties: false
      }
    }
  },
  subscribePush: {
    method: 'post',
    description:
      'Explicitly opt this browser into encrypted background Gym notifications',
    noAuth: false,
    encrypted: true,
    isDownloadable: false,
    media: null,
    input: {
      body: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          subscription: {
            type: 'object',
            properties: {
              endpoint: {
                type: 'string',
                maxLength: 2048,
                format: 'uri'
              },
              expirationTime: {
                anyOf: [
                  {
                    type: 'number',
                    exclusiveMinimum: 0
                  },
                  {
                    type: 'null'
                  }
                ]
              },
              keys: {
                type: 'object',
                properties: {
                  p256dh: {
                    type: 'string',
                    minLength: 80,
                    maxLength: 100
                  },
                  auth: {
                    type: 'string',
                    minLength: 20,
                    maxLength: 30
                  }
                },
                required: ['p256dh', 'auth'],
                additionalProperties: false
              }
            },
            required: ['endpoint', 'keys'],
            additionalProperties: false
          },
          device_name: {
            default: 'Browser',
            type: 'string',
            minLength: 1,
            maxLength: 100
          },
          language: {
            default: 'en',
            type: 'string',
            enum: ['en', 'ms', 'zh-CN', 'zh-TW']
          },
          preferences: {
            default: {
              planned: true,
              rest: true,
              coach: true
            },
            type: 'object',
            properties: {
              planned: {
                default: true,
                type: 'boolean'
              },
              rest: {
                default: true,
                type: 'boolean'
              },
              coach: {
                default: true,
                type: 'boolean'
              }
            },
            required: ['planned', 'rest', 'coach'],
            additionalProperties: false
          }
        },
        required: ['subscription', 'device_name', 'language', 'preferences'],
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
          endpoint_hash: {
            type: 'string',
            pattern: '^[a-f0-9]{64}$'
          },
          device_name: {
            type: 'string'
          },
          language: {
            type: 'string',
            enum: ['en', 'ms', 'zh-CN', 'zh-TW']
          },
          preferences: {
            type: 'object',
            properties: {
              planned: {
                default: true,
                type: 'boolean'
              },
              rest: {
                default: true,
                type: 'boolean'
              },
              coach: {
                default: true,
                type: 'boolean'
              }
            },
            required: ['planned', 'rest', 'coach'],
            additionalProperties: false
          },
          created: {
            type: 'string'
          },
          last_success: {
            anyOf: [
              {
                type: 'string'
              },
              {
                type: 'null'
              }
            ]
          },
          last_error: {
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
          'endpoint_hash',
          'device_name',
          'language',
          'preferences',
          'created',
          'last_success',
          'last_error'
        ],
        additionalProperties: false
      }
    }
  },
  testPush: {
    method: 'post',
    description:
      'Queue an encrypted test notification once for your opted-in device',
    noAuth: false,
    encrypted: true,
    isDownloadable: false,
    media: null,
    input: {
      body: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          command_id: {
            type: 'string',
            format: 'uuid',
            pattern:
              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
          },
          endpoint: {
            type: 'string',
            minLength: 1,
            maxLength: 2048
          }
        },
        required: ['command_id'],
        additionalProperties: false
      }
    },
    output: {
      OK: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          queued: {
            type: 'integer',
            minimum: 0,
            maximum: 9007199254740991
          }
        },
        required: ['queued'],
        additionalProperties: false
      }
    }
  },
  unsubscribePush: {
    method: 'post',
    description:
      'Remove only your own browser subscription and its queued notifications',
    noAuth: false,
    encrypted: true,
    isDownloadable: false,
    media: null,
    input: {
      body: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          endpoint: {
            type: 'string',
            minLength: 1,
            maxLength: 2048
          }
        },
        required: ['endpoint'],
        additionalProperties: false
      }
    },
    output: {
      NO_CONTENT: true
    }
  }
} as const

export default contract
