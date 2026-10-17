export const contract = {
  settings: {
    get: {
      method: 'get',
      description: 'Get user pomodoro settings',
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
            id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            autoStartBreak: {
              type: 'boolean'
            },
            autoStartWork: {
              type: 'boolean'
            },
            workColor: {
              type: 'string',
              maxLength: 255
            },
            shortBreakColor: {
              type: 'string',
              maxLength: 255
            },
            longBreakColor: {
              type: 'string',
              maxLength: 255
            },
            created: {
              type: 'string',
              format: 'date-time'
            },
            updated: {
              type: 'string',
              format: 'date-time'
            },
            notificationSound: {
              anyOf: [
                {
                  type: 'object',
                  properties: {
                    key: {
                      type: 'string'
                    },
                    originalName: {
                      type: 'string'
                    },
                    mimeType: {
                      type: 'string'
                    },
                    size: {
                      type: 'number'
                    },
                    thumbs: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          size: {
                            type: 'string'
                          },
                          key: {
                            type: 'string'
                          },
                          width: {
                            type: 'number'
                          },
                          height: {
                            type: 'number'
                          }
                        },
                        required: ['size', 'key', 'width', 'height'],
                        additionalProperties: false
                      }
                    }
                  },
                  required: [
                    'key',
                    'originalName',
                    'mimeType',
                    'size',
                    'thumbs'
                  ],
                  additionalProperties: false
                },
                {
                  type: 'null'
                }
              ]
            }
          },
          required: [
            'id',
            'autoStartBreak',
            'autoStartWork',
            'workColor',
            'shortBreakColor',
            'longBreakColor',
            'created',
            'updated',
            'notificationSound'
          ],
          additionalProperties: false
        }
      }
    },
    update: {
      method: 'post',
      description: 'Update pomodoro settings',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: {
        notificationSound: {
          optional: true
        }
      },
      input: {
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            autoStartBreak: {
              type: 'boolean'
            },
            autoStartWork: {
              type: 'boolean'
            },
            workColor: {
              type: 'string'
            },
            shortBreakColor: {
              type: 'string'
            },
            longBreakColor: {
              type: 'string'
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
            id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            autoStartBreak: {
              type: 'boolean'
            },
            autoStartWork: {
              type: 'boolean'
            },
            workColor: {
              type: 'string',
              maxLength: 255
            },
            shortBreakColor: {
              type: 'string',
              maxLength: 255
            },
            longBreakColor: {
              type: 'string',
              maxLength: 255
            },
            created: {
              type: 'string',
              format: 'date-time'
            },
            updated: {
              type: 'string',
              format: 'date-time'
            },
            notificationSound: {
              anyOf: [
                {
                  type: 'object',
                  properties: {
                    key: {
                      type: 'string'
                    },
                    originalName: {
                      type: 'string'
                    },
                    mimeType: {
                      type: 'string'
                    },
                    size: {
                      type: 'number'
                    },
                    thumbs: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          size: {
                            type: 'string'
                          },
                          key: {
                            type: 'string'
                          },
                          width: {
                            type: 'number'
                          },
                          height: {
                            type: 'number'
                          }
                        },
                        required: ['size', 'key', 'width', 'height'],
                        additionalProperties: false
                      }
                    }
                  },
                  required: [
                    'key',
                    'originalName',
                    'mimeType',
                    'size',
                    'thumbs'
                  ],
                  additionalProperties: false
                },
                {
                  type: 'null'
                }
              ]
            }
          },
          required: [
            'id',
            'autoStartBreak',
            'autoStartWork',
            'workColor',
            'shortBreakColor',
            'longBreakColor',
            'created',
            'updated',
            'notificationSound'
          ],
          additionalProperties: false
        }
      }
    }
  },
  sessions: {
    changeStatus: {
      method: 'post',
      description: 'Change status of a pomodoro session',
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
              type: 'string'
            }
          },
          required: ['id'],
          additionalProperties: false
        },
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['new', 'active', 'completed']
            },
            subSessions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['work', 'short_break', 'long_break']
                  },
                  durationElapsed: {
                    type: 'number',
                    minimum: 0
                  },
                  ended: {
                    type: 'string'
                  },
                  isCompleted: {
                    type: 'boolean'
                  }
                },
                required: ['type', 'durationElapsed', 'ended', 'isCompleted'],
                additionalProperties: false
              }
            },
            pomodoroCount: {
              type: 'number'
            }
          },
          required: ['status'],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            id: {
              type: 'string'
            },
            workDuration: {
              type: 'number'
            },
            shortBreakDuration: {
              type: 'number'
            },
            longBreakDuration: {
              type: 'number'
            },
            sessionUntilLongBreak: {
              type: 'number'
            },
            name: {
              type: 'string'
            },
            status: {
              type: 'string',
              enum: ['new', 'active', 'completed']
            },
            created: {
              type: 'string',
              format: 'date-time'
            },
            pomodoroCount: {
              type: 'number'
            },
            totalTimeElapsed: {
              type: 'number'
            }
          },
          required: [
            'id',
            'workDuration',
            'shortBreakDuration',
            'longBreakDuration',
            'sessionUntilLongBreak',
            'name',
            'status',
            'created',
            'pomodoroCount',
            'totalTimeElapsed'
          ],
          additionalProperties: false
        }
      }
    },
    create: {
      method: 'post',
      description: 'Create a new pomodoro session',
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
              type: 'string'
            },
            workDuration: {
              type: 'number',
              minimum: 1,
              maximum: 120
            },
            shortBreakDuration: {
              type: 'number',
              minimum: 1,
              maximum: 60
            },
            longBreakDuration: {
              type: 'number',
              minimum: 1,
              maximum: 120
            },
            sessionUntilLongBreak: {
              type: 'number',
              minimum: 1,
              maximum: 10
            }
          },
          required: [
            'name',
            'workDuration',
            'shortBreakDuration',
            'longBreakDuration',
            'sessionUntilLongBreak'
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
            workDuration: {
              type: 'integer',
              minimum: -2147483648,
              maximum: 2147483647
            },
            shortBreakDuration: {
              type: 'integer',
              minimum: -2147483648,
              maximum: 2147483647
            },
            longBreakDuration: {
              type: 'integer',
              minimum: -2147483648,
              maximum: 2147483647
            },
            sessionUntilLongBreak: {
              type: 'integer',
              minimum: -2147483648,
              maximum: 2147483647
            },
            name: {
              type: 'string',
              maxLength: 255
            },
            status: {
              type: 'string',
              enum: ['new', 'active', 'completed']
            },
            created: {
              type: 'string',
              format: 'date-time'
            }
          },
          required: [
            'id',
            'workDuration',
            'shortBreakDuration',
            'longBreakDuration',
            'sessionUntilLongBreak',
            'name',
            'status',
            'created'
          ],
          additionalProperties: false
        }
      }
    },
    getById: {
      method: 'get',
      description: 'Get pomodoro session by ID',
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
              type: 'string'
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
            id: {
              type: 'string'
            },
            workDuration: {
              type: 'number'
            },
            shortBreakDuration: {
              type: 'number'
            },
            longBreakDuration: {
              type: 'number'
            },
            sessionUntilLongBreak: {
              type: 'number'
            },
            name: {
              type: 'string'
            },
            status: {
              type: 'string',
              enum: ['new', 'active', 'completed']
            },
            created: {
              type: 'string',
              format: 'date-time'
            },
            pomodoroCount: {
              type: 'number'
            },
            totalTimeElapsed: {
              type: 'number'
            },
            lastSubSessionType: {
              type: 'string',
              enum: ['work', 'short_break', 'long_break']
            }
          },
          required: [
            'id',
            'workDuration',
            'shortBreakDuration',
            'longBreakDuration',
            'sessionUntilLongBreak',
            'name',
            'status',
            'created',
            'pomodoroCount',
            'totalTimeElapsed',
            'lastSubSessionType'
          ],
          additionalProperties: false
        }
      }
    },
    list: {
      method: 'get',
      description: 'List all pomodoro sessions',
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
                type: 'string'
              },
              workDuration: {
                type: 'number'
              },
              shortBreakDuration: {
                type: 'number'
              },
              longBreakDuration: {
                type: 'number'
              },
              sessionUntilLongBreak: {
                type: 'number'
              },
              name: {
                type: 'string'
              },
              status: {
                type: 'string',
                enum: ['new', 'active', 'completed']
              },
              created: {
                type: 'string',
                format: 'date-time'
              },
              pomodoroCount: {
                type: 'number'
              },
              totalTimeElapsed: {
                type: 'number'
              }
            },
            required: [
              'id',
              'workDuration',
              'shortBreakDuration',
              'longBreakDuration',
              'sessionUntilLongBreak',
              'name',
              'status',
              'created',
              'pomodoroCount',
              'totalTimeElapsed'
            ],
            additionalProperties: false
          }
        }
      }
    },
    listSubSessions: {
      method: 'get',
      description: 'List sub-sessions for a pomodoro session',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        query: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            sessionId: {
              type: 'string'
            }
          },
          required: ['sessionId'],
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
              type: {
                type: 'string',
                enum: ['work', 'short_break', 'long_break']
              },
              durationElapsed: {
                type: 'integer',
                minimum: -2147483648,
                maximum: 2147483647
              },
              isCompleted: {
                type: 'boolean'
              },
              sessionId: {
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
              ended: {
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
              created: {
                type: 'string',
                format: 'date-time'
              }
            },
            required: [
              'id',
              'type',
              'durationElapsed',
              'isCompleted',
              'sessionId',
              'ended',
              'created'
            ],
            additionalProperties: false
          }
        }
      }
    },
    remove: {
      method: 'post',
      description: 'Delete a pomodoro session',
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
              type: 'string'
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
    update: {
      method: 'post',
      description: 'Update a pomodoro session',
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
              type: 'string'
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
              type: 'string'
            }
          },
          required: ['name'],
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
            workDuration: {
              type: 'integer',
              minimum: -2147483648,
              maximum: 2147483647
            },
            shortBreakDuration: {
              type: 'integer',
              minimum: -2147483648,
              maximum: 2147483647
            },
            longBreakDuration: {
              type: 'integer',
              minimum: -2147483648,
              maximum: 2147483647
            },
            sessionUntilLongBreak: {
              type: 'integer',
              minimum: -2147483648,
              maximum: 2147483647
            },
            name: {
              type: 'string',
              maxLength: 255
            },
            status: {
              type: 'string',
              enum: ['new', 'active', 'completed']
            },
            created: {
              type: 'string',
              format: 'date-time'
            }
          },
          required: [
            'id',
            'workDuration',
            'shortBreakDuration',
            'longBreakDuration',
            'sessionUntilLongBreak',
            'name',
            'status',
            'created'
          ],
          additionalProperties: false
        }
      }
    }
  }
} as const

export default contract
