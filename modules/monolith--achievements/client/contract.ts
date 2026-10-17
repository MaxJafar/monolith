export const contract = {
  entries: {
    create: {
      method: 'post',
      description: 'Create a new achievements entry',
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
              maxLength: 255
            },
            thoughts: {
              type: 'string'
            },
            difficulty: {
              type: 'string',
              enum: ['easy', 'medium', 'hard', 'impossible']
            },
            category: {
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
                      const: ''
                    }
                  ]
                },
                {
                  type: 'null'
                }
              ]
            }
          },
          required: ['title', 'thoughts', 'difficulty'],
          additionalProperties: false
        }
      },
      output: {
        NO_CONTENT: true
      }
    },
    difficultiesCount: {
      method: 'get',
      description: 'Get the count of achievement entries grouped by difficulty',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {},
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          additionalProperties: {
            type: 'number'
          }
        }
      }
    },
    list: {
      method: 'get',
      description:
        'Get the list of achievement entries with optional filtering by difficulty, category, or search query',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        query: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            difficulty: {
              anyOf: [
                {
                  type: 'string',
                  enum: ['easy', 'medium', 'hard', 'impossible']
                },
                {
                  type: 'null'
                }
              ]
            },
            category: {
              type: 'string'
            },
            query: {
              type: 'string'
            }
          },
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
              title: {
                type: 'string',
                maxLength: 255
              },
              thoughts: {
                type: 'string'
              },
              difficulty: {
                type: 'string',
                enum: ['easy', 'medium', 'hard', 'impossible']
              },
              created: {
                type: 'string',
                format: 'date-time'
              },
              updated: {
                type: 'string',
                format: 'date-time'
              },
              category: {
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
              'title',
              'thoughts',
              'difficulty',
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
      description: 'Delete an achievements entry',
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
      description: 'Update an existing achievements entry',
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
            title: {
              type: 'string',
              maxLength: 255
            },
            thoughts: {
              type: 'string'
            },
            difficulty: {
              type: 'string',
              enum: ['easy', 'medium', 'hard', 'impossible']
            },
            category: {
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
                      const: ''
                    }
                  ]
                },
                {
                  type: 'null'
                }
              ]
            }
          },
          required: ['title', 'thoughts', 'difficulty'],
          additionalProperties: false
        }
      },
      output: {
        NO_CONTENT: true
      }
    }
  },
  categories: {
    create: {
      method: 'post',
      description: 'Create a new achievement category',
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
              maxLength: 255
            },
            icon: {
              type: 'string',
              maxLength: 255
            },
            color: {
              type: 'string',
              maxLength: 255
            }
          },
          required: ['name', 'icon', 'color'],
          additionalProperties: false
        }
      },
      output: {
        NO_CONTENT: true
      }
    },
    list: {
      method: 'get',
      description: 'Get the list of achievement categories',
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
              name: {
                type: 'string',
                maxLength: 255
              },
              color: {
                type: 'string',
                maxLength: 255
              },
              icon: {
                type: 'string',
                maxLength: 255
              },
              amount: {
                type: 'number'
              }
            },
            required: ['id', 'name', 'color', 'icon', 'amount'],
            additionalProperties: false
          }
        }
      }
    },
    remove: {
      method: 'post',
      description: 'Delete an achievement category',
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
      description: 'Update an existing achievement category',
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
              maxLength: 255
            },
            icon: {
              type: 'string',
              maxLength: 255
            },
            color: {
              type: 'string',
              maxLength: 255
            }
          },
          required: ['name', 'icon', 'color'],
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
