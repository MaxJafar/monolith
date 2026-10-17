export const contract = {
  lists: {
    create: {
      method: 'post',
      description: 'create wishlist lists',
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
              type: 'string',
              maxLength: 1000000
            },
            color: {
              type: 'string',
              maxLength: 255
            },
            icon: {
              type: 'string',
              maxLength: 255
            }
          },
          required: ['name', 'description', 'color', 'icon'],
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
              maxLength: 255
            },
            description: {
              type: 'string',
              maxLength: 1000000
            },
            color: {
              type: 'string',
              maxLength: 255
            },
            icon: {
              type: 'string',
              maxLength: 255
            },
            id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
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
            'name',
            'description',
            'color',
            'icon',
            'id',
            'created',
            'updated'
          ],
          additionalProperties: false
        }
      }
    },
    list: {
      method: 'get',
      description: 'List wishlist lists belonging to the current user',
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
              name: {
                type: 'string',
                minLength: 1,
                maxLength: 255
              },
              description: {
                type: 'string',
                maxLength: 1000000
              },
              color: {
                type: 'string',
                maxLength: 255
              },
              icon: {
                type: 'string',
                maxLength: 255
              },
              id: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
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
              'name',
              'description',
              'color',
              'icon',
              'id',
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
      description: 'Delete wishlist lists',
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
    update: {
      method: 'post',
      description: 'update wishlist lists',
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
              type: 'string',
              maxLength: 1000000
            },
            color: {
              type: 'string',
              maxLength: 255
            },
            icon: {
              type: 'string',
              maxLength: 255
            }
          },
          required: ['name', 'description', 'color', 'icon'],
          additionalProperties: false
        }
      },
      output: {
        NO_CONTENT: true
      }
    }
  },
  entries: {
    create: {
      method: 'post',
      description: 'create wishlist entries',
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
            url: {
              anyOf: [
                {
                  type: 'string',
                  maxLength: 2048,
                  format: 'uri'
                },
                {
                  type: 'string',
                  const: ''
                }
              ]
            },
            price: {
              type: 'number',
              minimum: 0,
              maximum: 1000000000
            },
            list_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            image: {
              anyOf: [
                {
                  type: 'string',
                  maxLength: 2048,
                  format: 'uri'
                },
                {
                  type: 'string',
                  const: ''
                }
              ]
            },
            bought: {
              type: 'boolean'
            }
          },
          required: ['name', 'url', 'price', 'list_id', 'image', 'bought'],
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
              maxLength: 255
            },
            url: {
              anyOf: [
                {
                  type: 'string',
                  maxLength: 2048,
                  format: 'uri'
                },
                {
                  type: 'string',
                  const: ''
                }
              ]
            },
            price: {
              type: 'number',
              minimum: 0,
              maximum: 1000000000
            },
            list_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            image: {
              anyOf: [
                {
                  type: 'string',
                  maxLength: 2048,
                  format: 'uri'
                },
                {
                  type: 'string',
                  const: ''
                }
              ]
            },
            bought: {
              type: 'boolean'
            },
            id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            created: {
              type: 'string',
              format: 'date-time'
            },
            updated: {
              type: 'string',
              format: 'date-time'
            },
            bought_at: {
              anyOf: [
                {
                  type: 'string',
                  format: 'date-time'
                },
                {
                  type: 'null'
                }
              ]
            }
          },
          required: [
            'name',
            'url',
            'price',
            'list_id',
            'image',
            'bought',
            'id',
            'created',
            'updated',
            'bought_at'
          ],
          additionalProperties: false
        }
      }
    },
    list: {
      method: 'get',
      description: 'List wishlist entries belonging to the current user',
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
              name: {
                type: 'string',
                minLength: 1,
                maxLength: 255
              },
              url: {
                anyOf: [
                  {
                    type: 'string',
                    maxLength: 2048,
                    format: 'uri'
                  },
                  {
                    type: 'string',
                    const: ''
                  }
                ]
              },
              price: {
                type: 'number',
                minimum: 0,
                maximum: 1000000000
              },
              list_id: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
              },
              image: {
                anyOf: [
                  {
                    type: 'string',
                    maxLength: 2048,
                    format: 'uri'
                  },
                  {
                    type: 'string',
                    const: ''
                  }
                ]
              },
              bought: {
                type: 'boolean'
              },
              id: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
              },
              created: {
                type: 'string',
                format: 'date-time'
              },
              updated: {
                type: 'string',
                format: 'date-time'
              },
              bought_at: {
                anyOf: [
                  {
                    type: 'string',
                    format: 'date-time'
                  },
                  {
                    type: 'null'
                  }
                ]
              }
            },
            required: [
              'name',
              'url',
              'price',
              'list_id',
              'image',
              'bought',
              'id',
              'created',
              'updated',
              'bought_at'
            ],
            additionalProperties: false
          }
        }
      }
    },
    remove: {
      method: 'post',
      description: 'Delete wishlist entries',
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
    update: {
      method: 'post',
      description: 'update wishlist entries',
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
            url: {
              anyOf: [
                {
                  type: 'string',
                  maxLength: 2048,
                  format: 'uri'
                },
                {
                  type: 'string',
                  const: ''
                }
              ]
            },
            price: {
              type: 'number',
              minimum: 0,
              maximum: 1000000000
            },
            list_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            image: {
              anyOf: [
                {
                  type: 'string',
                  maxLength: 2048,
                  format: 'uri'
                },
                {
                  type: 'string',
                  const: ''
                }
              ]
            },
            bought: {
              type: 'boolean'
            }
          },
          required: ['name', 'url', 'price', 'list_id', 'image', 'bought'],
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
