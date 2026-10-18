export const contract = {
  tags: {
    create: {
      method: 'post',
      description: 'create flashcards tags',
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
            color: {
              type: 'string',
              maxLength: 255
            }
          },
          required: ['name', 'color'],
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
            color: {
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
          required: ['name', 'color', 'id', 'created', 'updated'],
          additionalProperties: false
        }
      }
    },
    list: {
      method: 'get',
      description: 'List flashcards tags belonging to the current user',
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
              color: {
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
            required: ['name', 'color', 'id', 'created', 'updated'],
            additionalProperties: false
          }
        }
      }
    },
    remove: {
      method: 'post',
      description: 'Delete flashcards tags',
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
      description: 'update flashcards tags',
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
            color: {
              type: 'string',
              maxLength: 255
            }
          },
          required: ['name', 'color'],
          additionalProperties: false
        }
      },
      output: {
        NO_CONTENT: true
      }
    }
  },
  decks: {
    create: {
      method: 'post',
      description: 'create flashcards decks',
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
            tag_id: {
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
          required: ['name', 'description', 'tag_id'],
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
            tag_id: {
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
            'tag_id',
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
      description: 'List flashcards decks belonging to the current user',
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
              tag_id: {
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
              'tag_id',
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
      description: 'Delete flashcards decks',
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
      description: 'update flashcards decks',
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
            tag_id: {
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
          required: ['name', 'description', 'tag_id'],
          additionalProperties: false
        }
      },
      output: {
        NO_CONTENT: true
      }
    }
  },
  cards: {
    create: {
      method: 'post',
      description: 'create flashcards cards',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            question: {
              type: 'string',
              minLength: 1,
              maxLength: 1000000
            },
            answer: {
              type: 'string',
              minLength: 1,
              maxLength: 1000000
            },
            deck_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            }
          },
          required: ['question', 'answer', 'deck_id'],
          additionalProperties: false
        }
      },
      output: {
        CREATED: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            question: {
              type: 'string',
              minLength: 1,
              maxLength: 1000000
            },
            answer: {
              type: 'string',
              minLength: 1,
              maxLength: 1000000
            },
            deck_id: {
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
            },
            created: {
              type: 'string',
              format: 'date-time'
            },
            updated: {
              type: 'string',
              format: 'date-time'
            },
            reviews: {
              type: 'number'
            },
            correct: {
              type: 'number'
            },
            next_review: {
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
            'question',
            'answer',
            'deck_id',
            'id',
            'created',
            'updated',
            'reviews',
            'correct',
            'next_review'
          ],
          additionalProperties: false
        }
      }
    },
    list: {
      method: 'get',
      description: 'List flashcards cards belonging to the current user',
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
              question: {
                type: 'string',
                minLength: 1,
                maxLength: 1000000
              },
              answer: {
                type: 'string',
                minLength: 1,
                maxLength: 1000000
              },
              deck_id: {
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
              },
              created: {
                type: 'string',
                format: 'date-time'
              },
              updated: {
                type: 'string',
                format: 'date-time'
              },
              reviews: {
                type: 'number'
              },
              correct: {
                type: 'number'
              },
              next_review: {
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
              'question',
              'answer',
              'deck_id',
              'id',
              'created',
              'updated',
              'reviews',
              'correct',
              'next_review'
            ],
            additionalProperties: false
          }
        }
      }
    },
    remove: {
      method: 'post',
      description: 'Delete flashcards cards',
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
    review: {
      method: 'post',
      description: 'Record a flashcard review',
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
            remembered: {
              type: 'boolean'
            }
          },
          required: ['remembered'],
          additionalProperties: false
        }
      },
      output: {
        NO_CONTENT: true
      }
    },
    update: {
      method: 'post',
      description: 'update flashcards cards',
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
            question: {
              type: 'string',
              minLength: 1,
              maxLength: 1000000
            },
            answer: {
              type: 'string',
              minLength: 1,
              maxLength: 1000000
            },
            deck_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            }
          },
          required: ['question', 'answer', 'deck_id'],
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
