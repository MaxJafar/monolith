export const contract = {
  accounts: {
    save: {
      method: 'post',
      description:
        'Create or update a bank, card, cash, crypto, savings or debt account',
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
              maxLength: 120
            },
            kind: {
              default: 'bank',
              type: 'string',
              enum: [
                'bank',
                'card',
                'cash',
                'savings',
                'crypto',
                'investment',
                'debt'
              ]
            },
            currency: {
              default: 'AZN',
              type: 'string',
              pattern: '^[A-Z][A-Z0-9]{1,9}$'
            },
            opening_balance: {
              default: '0',
              type: 'string',
              pattern: '^-?\\d{1,18}(\\.\\d{1,8})?$'
            },
            institution: {
              default: '',
              type: 'string',
              maxLength: 120
            },
            icon: {
              default: '',
              type: 'string',
              maxLength: 100
            },
            color: {
              default: '',
              type: 'string',
              pattern: '^(#[0-9a-fA-F]{6})?$'
            },
            interest_rate: {
              default: null,
              anyOf: [
                {
                  type: 'string',
                  pattern: '^\\d{1,3}(\\.\\d{1,6})?$'
                },
                {
                  type: 'null'
                }
              ]
            },
            include_in_net_worth: {
              default: true,
              type: 'boolean'
            },
            archived: {
              default: false,
              type: 'boolean'
            },
            sort: {
              default: 0,
              type: 'integer',
              minimum: 0,
              maximum: 100000
            },
            notes: {
              default: '',
              type: 'string',
              maxLength: 5000
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
            'currency',
            'opening_balance',
            'institution',
            'icon',
            'color',
            'interest_rate',
            'include_in_net_worth',
            'archived',
            'sort',
            'notes'
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
            updated: {
              type: 'string'
            }
          },
          required: ['id', 'updated'],
          additionalProperties: false
        }
      }
    },
    delete: {
      method: 'post',
      description: 'Delete an account that has no transactions',
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
  categories: {
    save: {
      method: 'post',
      description:
        'Create, rename or move an expense category or income stream',
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
              maxLength: 120
            },
            kind: {
              default: 'expense',
              type: 'string',
              enum: ['income', 'expense']
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
            icon: {
              default: '',
              type: 'string',
              maxLength: 100
            },
            color: {
              default: '',
              type: 'string',
              pattern: '^(#[0-9a-fA-F]{6})?$'
            },
            budget: {
              default: null,
              anyOf: [
                {
                  type: 'string',
                  pattern: '^\\d{1,18}(\\.\\d{1,8})?$'
                },
                {
                  type: 'null'
                }
              ]
            },
            tax_rule_id: {
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
            archived: {
              default: false,
              type: 'boolean'
            },
            sort: {
              default: 0,
              type: 'integer',
              minimum: 0,
              maximum: 100000
            },
            notes: {
              default: '',
              type: 'string',
              maxLength: 5000
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
            'parent_id',
            'icon',
            'color',
            'budget',
            'tax_rule_id',
            'archived',
            'sort',
            'notes'
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
            updated: {
              type: 'string'
            }
          },
          required: ['id', 'updated'],
          additionalProperties: false
        }
      }
    },
    delete: {
      method: 'post',
      description: 'Delete a category; its transactions become uncategorized',
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
  plan: {
    save: {
      method: 'post',
      description: 'Create or update a recurring income, bill or subscription',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            kind: {
              type: 'string',
              enum: ['income', 'expense']
            },
            title: {
              type: 'string',
              minLength: 1,
              maxLength: 120
            },
            account_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            category_id: {
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
            amount: {
              type: 'string',
              pattern: '^\\d{1,18}(\\.\\d{1,8})?$'
            },
            currency: {
              type: 'string',
              pattern: '^[A-Z][A-Z0-9]{1,9}$'
            },
            tax_rule_id: {
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
            tax_basis: {
              default: 'gross',
              type: 'string',
              enum: ['gross', 'net']
            },
            cadence: {
              default: 'monthly',
              type: 'string',
              enum: ['weekly', 'monthly', 'quarterly', 'yearly']
            },
            interval: {
              default: 1,
              type: 'integer',
              minimum: 1,
              maximum: 52
            },
            start_on: {
              type: 'string',
              pattern: '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$'
            },
            end_on: {
              default: null,
              anyOf: [
                {
                  type: 'string',
                  pattern: '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$'
                },
                {
                  type: 'null'
                }
              ]
            },
            auto_post: {
              default: false,
              type: 'boolean'
            },
            active: {
              default: true,
              type: 'boolean'
            },
            notes: {
              default: '',
              type: 'string',
              maxLength: 5000
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
            'kind',
            'title',
            'account_id',
            'category_id',
            'amount',
            'currency',
            'tax_rule_id',
            'tax_basis',
            'cadence',
            'interval',
            'start_on',
            'end_on',
            'auto_post',
            'active',
            'notes'
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
            updated: {
              type: 'string'
            }
          },
          required: ['id', 'updated'],
          additionalProperties: false
        }
      }
    },
    delete: {
      method: 'post',
      description: 'Delete a planned item; transactions it posted stay',
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
    post: {
      method: 'post',
      description: 'Book due occurrences of planned items exactly once',
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
            today: {
              type: 'string',
              pattern: '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$'
            },
            automatic: {
              default: false,
              type: 'boolean'
            }
          },
          required: ['today', 'automatic'],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            posted: {
              type: 'integer',
              minimum: -9007199254740991,
              maximum: 9007199254740991
            }
          },
          required: ['posted'],
          additionalProperties: false
        }
      }
    }
  },
  rates: {
    refresh: {
      method: 'post',
      description: 'Fetch market exchange rates for the currencies you use',
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
            rates: {
              type: 'object',
              properties: {
                base: {
                  type: 'string'
                },
                entries: {
                  type: 'object',
                  additionalProperties: {
                    type: 'object',
                    properties: {
                      code: {
                        type: 'string'
                      },
                      rate: {
                        anyOf: [
                          {
                            type: 'string',
                            pattern: '^-?\\d+(\\.\\d+)?$'
                          },
                          {
                            type: 'null'
                          }
                        ]
                      },
                      source: {
                        type: 'string',
                        enum: ['base', 'custom', 'market', 'missing']
                      },
                      market: {
                        anyOf: [
                          {
                            type: 'string',
                            pattern: '^-?\\d+(\\.\\d+)?$'
                          },
                          {
                            type: 'null'
                          }
                        ]
                      },
                      custom: {
                        anyOf: [
                          {
                            type: 'string',
                            pattern: '^-?\\d+(\\.\\d+)?$'
                          },
                          {
                            type: 'null'
                          }
                        ]
                      },
                      market_at: {
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
                      'code',
                      'rate',
                      'source',
                      'market',
                      'custom',
                      'market_at'
                    ],
                    additionalProperties: false
                  }
                }
              },
              required: ['base', 'entries'],
              additionalProperties: false
            },
            refreshed: {
              type: 'array',
              items: {
                type: 'string'
              }
            },
            failed: {
              type: 'array',
              items: {
                type: 'string'
              }
            }
          },
          required: ['rates', 'refreshed', 'failed'],
          additionalProperties: false
        }
      }
    },
    save: {
      method: 'post',
      description: 'Pin your own exchange rate for a currency, or clear it',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            code: {
              type: 'string',
              pattern: '^[A-Z][A-Z0-9]{1,9}$'
            },
            custom_rate: {
              anyOf: [
                {
                  type: 'string',
                  pattern: '^\\d{1,18}(\\.\\d{1,12})?$'
                },
                {
                  type: 'null'
                }
              ]
            }
          },
          required: ['code', 'custom_rate'],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            base: {
              type: 'string'
            },
            entries: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                properties: {
                  code: {
                    type: 'string'
                  },
                  rate: {
                    anyOf: [
                      {
                        type: 'string',
                        pattern: '^-?\\d+(\\.\\d+)?$'
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  source: {
                    type: 'string',
                    enum: ['base', 'custom', 'market', 'missing']
                  },
                  market: {
                    anyOf: [
                      {
                        type: 'string',
                        pattern: '^-?\\d+(\\.\\d+)?$'
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  custom: {
                    anyOf: [
                      {
                        type: 'string',
                        pattern: '^-?\\d+(\\.\\d+)?$'
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  market_at: {
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
                  'code',
                  'rate',
                  'source',
                  'market',
                  'custom',
                  'market_at'
                ],
                additionalProperties: false
              }
            }
          },
          required: ['base', 'entries'],
          additionalProperties: false
        }
      }
    }
  },
  settings: {
    save: {
      method: 'post',
      description: 'Save your main and display currencies and preferences',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            base_currency: {
              default: 'AZN',
              type: 'string',
              pattern: '^[A-Z][A-Z0-9]{1,9}$'
            },
            display_currency: {
              default: 'AZN',
              type: 'string',
              pattern: '^[A-Z][A-Z0-9]{1,9}$'
            },
            currencies: {
              default: ['AZN', 'USD', 'EUR'],
              minItems: 1,
              maxItems: 40,
              type: 'array',
              items: {
                type: 'string',
                pattern: '^[A-Z][A-Z0-9]{1,9}$'
              }
            },
            week_start: {
              default: 1,
              type: 'integer',
              minimum: 1,
              maximum: 7
            },
            default_account_id: {
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
            wish_category_id: {
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
            expected_updated: {
              type: 'string',
              format: 'date-time',
              pattern:
                '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$'
            }
          },
          required: [
            'base_currency',
            'display_currency',
            'currencies',
            'week_start',
            'default_account_id',
            'wish_category_id'
          ],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            base_currency: {
              default: 'AZN',
              type: 'string',
              pattern: '^[A-Z][A-Z0-9]{1,9}$'
            },
            display_currency: {
              default: 'AZN',
              type: 'string',
              pattern: '^[A-Z][A-Z0-9]{1,9}$'
            },
            currencies: {
              default: ['AZN', 'USD', 'EUR'],
              minItems: 1,
              maxItems: 40,
              type: 'array',
              items: {
                type: 'string',
                pattern: '^[A-Z][A-Z0-9]{1,9}$'
              }
            },
            week_start: {
              default: 1,
              type: 'integer',
              minimum: 1,
              maximum: 7
            },
            default_account_id: {
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
            wish_category_id: {
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
            updated: {
              type: 'string',
              format: 'date-time',
              pattern:
                '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$'
            },
            configured: {
              type: 'boolean'
            }
          },
          required: [
            'base_currency',
            'display_currency',
            'currencies',
            'week_start',
            'default_account_id',
            'wish_category_id',
            'updated',
            'configured'
          ],
          additionalProperties: false
        }
      }
    }
  },
  setup: {
    apply: {
      method: 'post',
      description:
        'Create your starting accounts, categories, tax rules and wishlists',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            base_currency: {
              type: 'string',
              pattern: '^[A-Z][A-Z0-9]{1,9}$'
            },
            currencies: {
              minItems: 1,
              maxItems: 40,
              type: 'array',
              items: {
                type: 'string',
                pattern: '^[A-Z][A-Z0-9]{1,9}$'
              }
            },
            accounts: {
              maxItems: 30,
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 120
                  },
                  kind: {
                    default: 'bank',
                    type: 'string',
                    enum: [
                      'bank',
                      'card',
                      'cash',
                      'savings',
                      'crypto',
                      'investment',
                      'debt'
                    ]
                  },
                  currency: {
                    default: 'AZN',
                    type: 'string',
                    pattern: '^[A-Z][A-Z0-9]{1,9}$'
                  },
                  opening_balance: {
                    default: '0',
                    type: 'string',
                    pattern: '^-?\\d{1,18}(\\.\\d{1,8})?$'
                  },
                  institution: {
                    default: '',
                    type: 'string',
                    maxLength: 120
                  },
                  icon: {
                    default: '',
                    type: 'string',
                    maxLength: 100
                  },
                  color: {
                    default: '',
                    type: 'string',
                    pattern: '^(#[0-9a-fA-F]{6})?$'
                  },
                  interest_rate: {
                    default: null,
                    anyOf: [
                      {
                        type: 'string',
                        pattern: '^\\d{1,3}(\\.\\d{1,6})?$'
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  include_in_net_worth: {
                    default: true,
                    type: 'boolean'
                  },
                  archived: {
                    default: false,
                    type: 'boolean'
                  },
                  sort: {
                    default: 0,
                    type: 'integer',
                    minimum: 0,
                    maximum: 100000
                  },
                  notes: {
                    default: '',
                    type: 'string',
                    maxLength: 5000
                  },
                  key: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 60
                  }
                },
                required: [
                  'name',
                  'kind',
                  'currency',
                  'opening_balance',
                  'institution',
                  'icon',
                  'color',
                  'interest_rate',
                  'include_in_net_worth',
                  'archived',
                  'sort',
                  'notes',
                  'key'
                ],
                additionalProperties: false
              }
            },
            tax_rules: {
              maxItems: 30,
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 120
                  },
                  kind: {
                    default: 'vat',
                    type: 'string',
                    enum: ['vat', 'income']
                  },
                  rate: {
                    default: '0',
                    type: 'string',
                    pattern: '^\\d{1,3}(\\.\\d{1,6})?$'
                  },
                  inclusive: {
                    default: true,
                    type: 'boolean'
                  },
                  withheld: {
                    default: false,
                    type: 'boolean'
                  },
                  components: {
                    default: [],
                    maxItems: 8,
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        label: {
                          type: 'string',
                          minLength: 1,
                          maxLength: 80
                        },
                        brackets: {
                          minItems: 1,
                          maxItems: 12,
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              up_to: {
                                anyOf: [
                                  {
                                    type: 'string',
                                    pattern: '^\\d{1,18}(\\.\\d{1,8})?$'
                                  },
                                  {
                                    type: 'null'
                                  }
                                ]
                              },
                              rate: {
                                type: 'string',
                                pattern: '^\\d{1,3}(\\.\\d{1,6})?$'
                              }
                            },
                            required: ['up_to', 'rate'],
                            additionalProperties: false
                          }
                        }
                      },
                      required: ['label', 'brackets'],
                      additionalProperties: false
                    }
                  },
                  archived: {
                    default: false,
                    type: 'boolean'
                  },
                  notes: {
                    default: '',
                    type: 'string',
                    maxLength: 5000
                  },
                  key: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 60
                  }
                },
                required: [
                  'name',
                  'kind',
                  'rate',
                  'inclusive',
                  'withheld',
                  'components',
                  'archived',
                  'notes',
                  'key'
                ],
                additionalProperties: false
              }
            },
            categories: {
              maxItems: 200,
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 120
                  },
                  kind: {
                    default: 'expense',
                    type: 'string',
                    enum: ['income', 'expense']
                  },
                  icon: {
                    default: '',
                    type: 'string',
                    maxLength: 100
                  },
                  color: {
                    default: '',
                    type: 'string',
                    pattern: '^(#[0-9a-fA-F]{6})?$'
                  },
                  budget: {
                    default: null,
                    anyOf: [
                      {
                        type: 'string',
                        pattern: '^\\d{1,18}(\\.\\d{1,8})?$'
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  archived: {
                    default: false,
                    type: 'boolean'
                  },
                  sort: {
                    default: 0,
                    type: 'integer',
                    minimum: 0,
                    maximum: 100000
                  },
                  notes: {
                    default: '',
                    type: 'string',
                    maxLength: 5000
                  },
                  key: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 60
                  },
                  parent_key: {
                    default: null,
                    anyOf: [
                      {
                        type: 'string',
                        minLength: 1,
                        maxLength: 60
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  tax_rule_key: {
                    default: null,
                    anyOf: [
                      {
                        type: 'string',
                        minLength: 1,
                        maxLength: 60
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
                  'icon',
                  'color',
                  'budget',
                  'archived',
                  'sort',
                  'notes',
                  'key',
                  'parent_key',
                  'tax_rule_key'
                ],
                additionalProperties: false
              }
            },
            lists: {
              maxItems: 40,
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 120
                  },
                  icon: {
                    default: '',
                    type: 'string',
                    maxLength: 100
                  },
                  color: {
                    default: '',
                    type: 'string',
                    pattern: '^(#[0-9a-fA-F]{6})?$'
                  },
                  sort: {
                    default: 0,
                    type: 'integer',
                    minimum: 0,
                    maximum: 100000
                  },
                  archived: {
                    default: false,
                    type: 'boolean'
                  },
                  key: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 60
                  }
                },
                required: ['name', 'icon', 'color', 'sort', 'archived', 'key'],
                additionalProperties: false
              }
            },
            wish_category_key: {
              default: null,
              anyOf: [
                {
                  type: 'string',
                  minLength: 1,
                  maxLength: 60
                },
                {
                  type: 'null'
                }
              ]
            }
          },
          required: [
            'base_currency',
            'currencies',
            'accounts',
            'tax_rules',
            'categories',
            'lists',
            'wish_category_key'
          ],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            settings: {
              type: 'object',
              properties: {
                base_currency: {
                  default: 'AZN',
                  type: 'string',
                  pattern: '^[A-Z][A-Z0-9]{1,9}$'
                },
                display_currency: {
                  default: 'AZN',
                  type: 'string',
                  pattern: '^[A-Z][A-Z0-9]{1,9}$'
                },
                currencies: {
                  default: ['AZN', 'USD', 'EUR'],
                  minItems: 1,
                  maxItems: 40,
                  type: 'array',
                  items: {
                    type: 'string',
                    pattern: '^[A-Z][A-Z0-9]{1,9}$'
                  }
                },
                week_start: {
                  default: 1,
                  type: 'integer',
                  minimum: 1,
                  maximum: 7
                },
                default_account_id: {
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
                wish_category_id: {
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
                updated: {
                  type: 'string',
                  format: 'date-time',
                  pattern:
                    '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$'
                },
                configured: {
                  type: 'boolean'
                }
              },
              required: [
                'base_currency',
                'display_currency',
                'currencies',
                'week_start',
                'default_account_id',
                'wish_category_id',
                'updated',
                'configured'
              ],
              additionalProperties: false
            },
            rates: {
              type: 'object',
              properties: {
                base: {
                  type: 'string'
                },
                entries: {
                  type: 'object',
                  additionalProperties: {
                    type: 'object',
                    properties: {
                      code: {
                        type: 'string'
                      },
                      rate: {
                        anyOf: [
                          {
                            type: 'string',
                            pattern: '^-?\\d+(\\.\\d+)?$'
                          },
                          {
                            type: 'null'
                          }
                        ]
                      },
                      source: {
                        type: 'string',
                        enum: ['base', 'custom', 'market', 'missing']
                      },
                      market: {
                        anyOf: [
                          {
                            type: 'string',
                            pattern: '^-?\\d+(\\.\\d+)?$'
                          },
                          {
                            type: 'null'
                          }
                        ]
                      },
                      custom: {
                        anyOf: [
                          {
                            type: 'string',
                            pattern: '^-?\\d+(\\.\\d+)?$'
                          },
                          {
                            type: 'null'
                          }
                        ]
                      },
                      market_at: {
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
                      'code',
                      'rate',
                      'source',
                      'market',
                      'custom',
                      'market_at'
                    ],
                    additionalProperties: false
                  }
                }
              },
              required: ['base', 'entries'],
              additionalProperties: false
            },
            accounts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 120
                  },
                  kind: {
                    default: 'bank',
                    type: 'string',
                    enum: [
                      'bank',
                      'card',
                      'cash',
                      'savings',
                      'crypto',
                      'investment',
                      'debt'
                    ]
                  },
                  currency: {
                    default: 'AZN',
                    type: 'string',
                    pattern: '^[A-Z][A-Z0-9]{1,9}$'
                  },
                  opening_balance: {
                    default: '0',
                    type: 'string',
                    pattern: '^-?\\d{1,18}(\\.\\d{1,8})?$'
                  },
                  institution: {
                    default: '',
                    type: 'string',
                    maxLength: 120
                  },
                  icon: {
                    default: '',
                    type: 'string',
                    maxLength: 100
                  },
                  color: {
                    default: '',
                    type: 'string',
                    pattern: '^(#[0-9a-fA-F]{6})?$'
                  },
                  interest_rate: {
                    default: null,
                    anyOf: [
                      {
                        type: 'string',
                        pattern: '^\\d{1,3}(\\.\\d{1,6})?$'
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  include_in_net_worth: {
                    default: true,
                    type: 'boolean'
                  },
                  archived: {
                    default: false,
                    type: 'boolean'
                  },
                  sort: {
                    default: 0,
                    type: 'integer',
                    minimum: 0,
                    maximum: 100000
                  },
                  notes: {
                    default: '',
                    type: 'string',
                    maxLength: 5000
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
                  balance: {
                    type: 'string',
                    pattern: '^-?\\d+(\\.\\d+)?$'
                  },
                  base_balance: {
                    anyOf: [
                      {
                        type: 'string',
                        pattern: '^-?\\d+(\\.\\d+)?$'
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  transactions: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 9007199254740991
                  }
                },
                required: [
                  'name',
                  'kind',
                  'currency',
                  'opening_balance',
                  'institution',
                  'icon',
                  'color',
                  'interest_rate',
                  'include_in_net_worth',
                  'archived',
                  'sort',
                  'notes',
                  'id',
                  'created',
                  'updated',
                  'balance',
                  'base_balance',
                  'transactions'
                ],
                additionalProperties: false
              }
            },
            categories: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 120
                  },
                  kind: {
                    default: 'expense',
                    type: 'string',
                    enum: ['income', 'expense']
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
                  icon: {
                    default: '',
                    type: 'string',
                    maxLength: 100
                  },
                  color: {
                    default: '',
                    type: 'string',
                    pattern: '^(#[0-9a-fA-F]{6})?$'
                  },
                  budget: {
                    default: null,
                    anyOf: [
                      {
                        type: 'string',
                        pattern: '^\\d{1,18}(\\.\\d{1,8})?$'
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  tax_rule_id: {
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
                  archived: {
                    default: false,
                    type: 'boolean'
                  },
                  sort: {
                    default: 0,
                    type: 'integer',
                    minimum: 0,
                    maximum: 100000
                  },
                  notes: {
                    default: '',
                    type: 'string',
                    maxLength: 5000
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
                  'parent_id',
                  'icon',
                  'color',
                  'budget',
                  'tax_rule_id',
                  'archived',
                  'sort',
                  'notes',
                  'id',
                  'created',
                  'updated'
                ],
                additionalProperties: false
              }
            },
            tax_rules: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 120
                  },
                  kind: {
                    default: 'vat',
                    type: 'string',
                    enum: ['vat', 'income']
                  },
                  rate: {
                    default: '0',
                    type: 'string',
                    pattern: '^\\d{1,3}(\\.\\d{1,6})?$'
                  },
                  inclusive: {
                    default: true,
                    type: 'boolean'
                  },
                  withheld: {
                    default: false,
                    type: 'boolean'
                  },
                  components: {
                    default: [],
                    maxItems: 8,
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        label: {
                          type: 'string',
                          minLength: 1,
                          maxLength: 80
                        },
                        brackets: {
                          minItems: 1,
                          maxItems: 12,
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              up_to: {
                                anyOf: [
                                  {
                                    type: 'string',
                                    pattern: '^\\d{1,18}(\\.\\d{1,8})?$'
                                  },
                                  {
                                    type: 'null'
                                  }
                                ]
                              },
                              rate: {
                                type: 'string',
                                pattern: '^\\d{1,3}(\\.\\d{1,6})?$'
                              }
                            },
                            required: ['up_to', 'rate'],
                            additionalProperties: false
                          }
                        }
                      },
                      required: ['label', 'brackets'],
                      additionalProperties: false
                    }
                  },
                  archived: {
                    default: false,
                    type: 'boolean'
                  },
                  notes: {
                    default: '',
                    type: 'string',
                    maxLength: 5000
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
                  'rate',
                  'inclusive',
                  'withheld',
                  'components',
                  'archived',
                  'notes',
                  'id',
                  'created',
                  'updated'
                ],
                additionalProperties: false
              }
            },
            lists: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 120
                  },
                  icon: {
                    default: '',
                    type: 'string',
                    maxLength: 100
                  },
                  color: {
                    default: '',
                    type: 'string',
                    pattern: '^(#[0-9a-fA-F]{6})?$'
                  },
                  sort: {
                    default: 0,
                    type: 'integer',
                    minimum: 0,
                    maximum: 100000
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
                  'icon',
                  'color',
                  'sort',
                  'archived',
                  'id',
                  'created',
                  'updated'
                ],
                additionalProperties: false
              }
            },
            wishes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  list_id: {
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
                  name: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 200
                  },
                  url: {
                    default: '',
                    type: 'string',
                    maxLength: 2048
                  },
                  price: {
                    type: 'string',
                    pattern: '^\\d{1,18}(\\.\\d{1,8})?$'
                  },
                  currency: {
                    type: 'string',
                    pattern: '^[A-Z][A-Z0-9]{1,9}$'
                  },
                  quantity: {
                    default: 1,
                    type: 'integer',
                    minimum: 1,
                    maximum: 1000
                  },
                  shipping: {
                    default: '0',
                    type: 'string',
                    pattern: '^\\d{1,18}(\\.\\d{1,8})?$'
                  },
                  tax_rule_id: {
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
                  priority: {
                    default: 'medium',
                    type: 'string',
                    enum: ['low', 'medium', 'high']
                  },
                  target_on: {
                    default: null,
                    anyOf: [
                      {
                        type: 'string',
                        pattern:
                          '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$'
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  category_id: {
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
                  account_id: {
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
                  sort: {
                    default: 0,
                    type: 'integer',
                    minimum: 0,
                    maximum: 100000
                  },
                  notes: {
                    default: '',
                    type: 'string',
                    maxLength: 5000
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
                  status: {
                    type: 'string',
                    enum: ['wanted', 'purchased']
                  },
                  purchased_on: {
                    anyOf: [
                      {
                        type: 'string',
                        pattern:
                          '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$'
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  transaction_id: {
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
                  subtotal: {
                    type: 'string',
                    pattern: '^-?\\d+(\\.\\d+)?$'
                  },
                  tax: {
                    type: 'string',
                    pattern: '^-?\\d+(\\.\\d+)?$'
                  },
                  total: {
                    type: 'string',
                    pattern: '^-?\\d+(\\.\\d+)?$'
                  },
                  base_total: {
                    anyOf: [
                      {
                        type: 'string',
                        pattern: '^-?\\d+(\\.\\d+)?$'
                      },
                      {
                        type: 'null'
                      }
                    ]
                  }
                },
                required: [
                  'list_id',
                  'name',
                  'url',
                  'price',
                  'currency',
                  'quantity',
                  'shipping',
                  'tax_rule_id',
                  'priority',
                  'target_on',
                  'category_id',
                  'account_id',
                  'sort',
                  'notes',
                  'id',
                  'created',
                  'updated',
                  'status',
                  'purchased_on',
                  'transaction_id',
                  'subtotal',
                  'tax',
                  'total',
                  'base_total'
                ],
                additionalProperties: false
              }
            },
            recurring: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  kind: {
                    type: 'string',
                    enum: ['income', 'expense']
                  },
                  title: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 120
                  },
                  account_id: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  category_id: {
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
                  amount: {
                    type: 'string',
                    pattern: '^\\d{1,18}(\\.\\d{1,8})?$'
                  },
                  currency: {
                    type: 'string',
                    pattern: '^[A-Z][A-Z0-9]{1,9}$'
                  },
                  tax_rule_id: {
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
                  tax_basis: {
                    default: 'gross',
                    type: 'string',
                    enum: ['gross', 'net']
                  },
                  cadence: {
                    default: 'monthly',
                    type: 'string',
                    enum: ['weekly', 'monthly', 'quarterly', 'yearly']
                  },
                  interval: {
                    default: 1,
                    type: 'integer',
                    minimum: 1,
                    maximum: 52
                  },
                  start_on: {
                    type: 'string',
                    pattern: '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$'
                  },
                  end_on: {
                    default: null,
                    anyOf: [
                      {
                        type: 'string',
                        pattern:
                          '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$'
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  auto_post: {
                    default: false,
                    type: 'boolean'
                  },
                  active: {
                    default: true,
                    type: 'boolean'
                  },
                  notes: {
                    default: '',
                    type: 'string',
                    maxLength: 5000
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
                  next_index: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 9007199254740991
                  },
                  next_on: {
                    anyOf: [
                      {
                        type: 'string',
                        pattern:
                          '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$'
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  posted: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 9007199254740991
                  }
                },
                required: [
                  'kind',
                  'title',
                  'account_id',
                  'category_id',
                  'amount',
                  'currency',
                  'tax_rule_id',
                  'tax_basis',
                  'cadence',
                  'interval',
                  'start_on',
                  'end_on',
                  'auto_post',
                  'active',
                  'notes',
                  'id',
                  'created',
                  'updated',
                  'next_index',
                  'next_on',
                  'posted'
                ],
                additionalProperties: false
              }
            },
            earliest_on: {
              anyOf: [
                {
                  type: 'string',
                  pattern: '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$'
                },
                {
                  type: 'null'
                }
              ]
            },
            transaction_count: {
              type: 'integer',
              minimum: 0,
              maximum: 9007199254740991
            }
          },
          required: [
            'settings',
            'rates',
            'accounts',
            'categories',
            'tax_rules',
            'lists',
            'wishes',
            'recurring',
            'earliest_on',
            'transaction_count'
          ],
          additionalProperties: false
        }
      }
    }
  },
  snapshot: {
    method: 'get',
    description:
      'Read your accounts with balances, categories, tax rules, wishlist, plan and exchange rates',
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
          settings: {
            type: 'object',
            properties: {
              base_currency: {
                default: 'AZN',
                type: 'string',
                pattern: '^[A-Z][A-Z0-9]{1,9}$'
              },
              display_currency: {
                default: 'AZN',
                type: 'string',
                pattern: '^[A-Z][A-Z0-9]{1,9}$'
              },
              currencies: {
                default: ['AZN', 'USD', 'EUR'],
                minItems: 1,
                maxItems: 40,
                type: 'array',
                items: {
                  type: 'string',
                  pattern: '^[A-Z][A-Z0-9]{1,9}$'
                }
              },
              week_start: {
                default: 1,
                type: 'integer',
                minimum: 1,
                maximum: 7
              },
              default_account_id: {
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
              wish_category_id: {
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
              updated: {
                type: 'string',
                format: 'date-time',
                pattern:
                  '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$'
              },
              configured: {
                type: 'boolean'
              }
            },
            required: [
              'base_currency',
              'display_currency',
              'currencies',
              'week_start',
              'default_account_id',
              'wish_category_id',
              'updated',
              'configured'
            ],
            additionalProperties: false
          },
          rates: {
            type: 'object',
            properties: {
              base: {
                type: 'string'
              },
              entries: {
                type: 'object',
                additionalProperties: {
                  type: 'object',
                  properties: {
                    code: {
                      type: 'string'
                    },
                    rate: {
                      anyOf: [
                        {
                          type: 'string',
                          pattern: '^-?\\d+(\\.\\d+)?$'
                        },
                        {
                          type: 'null'
                        }
                      ]
                    },
                    source: {
                      type: 'string',
                      enum: ['base', 'custom', 'market', 'missing']
                    },
                    market: {
                      anyOf: [
                        {
                          type: 'string',
                          pattern: '^-?\\d+(\\.\\d+)?$'
                        },
                        {
                          type: 'null'
                        }
                      ]
                    },
                    custom: {
                      anyOf: [
                        {
                          type: 'string',
                          pattern: '^-?\\d+(\\.\\d+)?$'
                        },
                        {
                          type: 'null'
                        }
                      ]
                    },
                    market_at: {
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
                    'code',
                    'rate',
                    'source',
                    'market',
                    'custom',
                    'market_at'
                  ],
                  additionalProperties: false
                }
              }
            },
            required: ['base', 'entries'],
            additionalProperties: false
          },
          accounts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 120
                },
                kind: {
                  default: 'bank',
                  type: 'string',
                  enum: [
                    'bank',
                    'card',
                    'cash',
                    'savings',
                    'crypto',
                    'investment',
                    'debt'
                  ]
                },
                currency: {
                  default: 'AZN',
                  type: 'string',
                  pattern: '^[A-Z][A-Z0-9]{1,9}$'
                },
                opening_balance: {
                  default: '0',
                  type: 'string',
                  pattern: '^-?\\d{1,18}(\\.\\d{1,8})?$'
                },
                institution: {
                  default: '',
                  type: 'string',
                  maxLength: 120
                },
                icon: {
                  default: '',
                  type: 'string',
                  maxLength: 100
                },
                color: {
                  default: '',
                  type: 'string',
                  pattern: '^(#[0-9a-fA-F]{6})?$'
                },
                interest_rate: {
                  default: null,
                  anyOf: [
                    {
                      type: 'string',
                      pattern: '^\\d{1,3}(\\.\\d{1,6})?$'
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                include_in_net_worth: {
                  default: true,
                  type: 'boolean'
                },
                archived: {
                  default: false,
                  type: 'boolean'
                },
                sort: {
                  default: 0,
                  type: 'integer',
                  minimum: 0,
                  maximum: 100000
                },
                notes: {
                  default: '',
                  type: 'string',
                  maxLength: 5000
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
                balance: {
                  type: 'string',
                  pattern: '^-?\\d+(\\.\\d+)?$'
                },
                base_balance: {
                  anyOf: [
                    {
                      type: 'string',
                      pattern: '^-?\\d+(\\.\\d+)?$'
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                transactions: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 9007199254740991
                }
              },
              required: [
                'name',
                'kind',
                'currency',
                'opening_balance',
                'institution',
                'icon',
                'color',
                'interest_rate',
                'include_in_net_worth',
                'archived',
                'sort',
                'notes',
                'id',
                'created',
                'updated',
                'balance',
                'base_balance',
                'transactions'
              ],
              additionalProperties: false
            }
          },
          categories: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 120
                },
                kind: {
                  default: 'expense',
                  type: 'string',
                  enum: ['income', 'expense']
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
                icon: {
                  default: '',
                  type: 'string',
                  maxLength: 100
                },
                color: {
                  default: '',
                  type: 'string',
                  pattern: '^(#[0-9a-fA-F]{6})?$'
                },
                budget: {
                  default: null,
                  anyOf: [
                    {
                      type: 'string',
                      pattern: '^\\d{1,18}(\\.\\d{1,8})?$'
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                tax_rule_id: {
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
                archived: {
                  default: false,
                  type: 'boolean'
                },
                sort: {
                  default: 0,
                  type: 'integer',
                  minimum: 0,
                  maximum: 100000
                },
                notes: {
                  default: '',
                  type: 'string',
                  maxLength: 5000
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
                'parent_id',
                'icon',
                'color',
                'budget',
                'tax_rule_id',
                'archived',
                'sort',
                'notes',
                'id',
                'created',
                'updated'
              ],
              additionalProperties: false
            }
          },
          tax_rules: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 120
                },
                kind: {
                  default: 'vat',
                  type: 'string',
                  enum: ['vat', 'income']
                },
                rate: {
                  default: '0',
                  type: 'string',
                  pattern: '^\\d{1,3}(\\.\\d{1,6})?$'
                },
                inclusive: {
                  default: true,
                  type: 'boolean'
                },
                withheld: {
                  default: false,
                  type: 'boolean'
                },
                components: {
                  default: [],
                  maxItems: 8,
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      label: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 80
                      },
                      brackets: {
                        minItems: 1,
                        maxItems: 12,
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            up_to: {
                              anyOf: [
                                {
                                  type: 'string',
                                  pattern: '^\\d{1,18}(\\.\\d{1,8})?$'
                                },
                                {
                                  type: 'null'
                                }
                              ]
                            },
                            rate: {
                              type: 'string',
                              pattern: '^\\d{1,3}(\\.\\d{1,6})?$'
                            }
                          },
                          required: ['up_to', 'rate'],
                          additionalProperties: false
                        }
                      }
                    },
                    required: ['label', 'brackets'],
                    additionalProperties: false
                  }
                },
                archived: {
                  default: false,
                  type: 'boolean'
                },
                notes: {
                  default: '',
                  type: 'string',
                  maxLength: 5000
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
                'rate',
                'inclusive',
                'withheld',
                'components',
                'archived',
                'notes',
                'id',
                'created',
                'updated'
              ],
              additionalProperties: false
            }
          },
          lists: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 120
                },
                icon: {
                  default: '',
                  type: 'string',
                  maxLength: 100
                },
                color: {
                  default: '',
                  type: 'string',
                  pattern: '^(#[0-9a-fA-F]{6})?$'
                },
                sort: {
                  default: 0,
                  type: 'integer',
                  minimum: 0,
                  maximum: 100000
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
                'icon',
                'color',
                'sort',
                'archived',
                'id',
                'created',
                'updated'
              ],
              additionalProperties: false
            }
          },
          wishes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                list_id: {
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
                name: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 200
                },
                url: {
                  default: '',
                  type: 'string',
                  maxLength: 2048
                },
                price: {
                  type: 'string',
                  pattern: '^\\d{1,18}(\\.\\d{1,8})?$'
                },
                currency: {
                  type: 'string',
                  pattern: '^[A-Z][A-Z0-9]{1,9}$'
                },
                quantity: {
                  default: 1,
                  type: 'integer',
                  minimum: 1,
                  maximum: 1000
                },
                shipping: {
                  default: '0',
                  type: 'string',
                  pattern: '^\\d{1,18}(\\.\\d{1,8})?$'
                },
                tax_rule_id: {
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
                priority: {
                  default: 'medium',
                  type: 'string',
                  enum: ['low', 'medium', 'high']
                },
                target_on: {
                  default: null,
                  anyOf: [
                    {
                      type: 'string',
                      pattern: '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$'
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                category_id: {
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
                account_id: {
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
                sort: {
                  default: 0,
                  type: 'integer',
                  minimum: 0,
                  maximum: 100000
                },
                notes: {
                  default: '',
                  type: 'string',
                  maxLength: 5000
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
                status: {
                  type: 'string',
                  enum: ['wanted', 'purchased']
                },
                purchased_on: {
                  anyOf: [
                    {
                      type: 'string',
                      pattern: '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$'
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                transaction_id: {
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
                subtotal: {
                  type: 'string',
                  pattern: '^-?\\d+(\\.\\d+)?$'
                },
                tax: {
                  type: 'string',
                  pattern: '^-?\\d+(\\.\\d+)?$'
                },
                total: {
                  type: 'string',
                  pattern: '^-?\\d+(\\.\\d+)?$'
                },
                base_total: {
                  anyOf: [
                    {
                      type: 'string',
                      pattern: '^-?\\d+(\\.\\d+)?$'
                    },
                    {
                      type: 'null'
                    }
                  ]
                }
              },
              required: [
                'list_id',
                'name',
                'url',
                'price',
                'currency',
                'quantity',
                'shipping',
                'tax_rule_id',
                'priority',
                'target_on',
                'category_id',
                'account_id',
                'sort',
                'notes',
                'id',
                'created',
                'updated',
                'status',
                'purchased_on',
                'transaction_id',
                'subtotal',
                'tax',
                'total',
                'base_total'
              ],
              additionalProperties: false
            }
          },
          recurring: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                kind: {
                  type: 'string',
                  enum: ['income', 'expense']
                },
                title: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 120
                },
                account_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                category_id: {
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
                amount: {
                  type: 'string',
                  pattern: '^\\d{1,18}(\\.\\d{1,8})?$'
                },
                currency: {
                  type: 'string',
                  pattern: '^[A-Z][A-Z0-9]{1,9}$'
                },
                tax_rule_id: {
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
                tax_basis: {
                  default: 'gross',
                  type: 'string',
                  enum: ['gross', 'net']
                },
                cadence: {
                  default: 'monthly',
                  type: 'string',
                  enum: ['weekly', 'monthly', 'quarterly', 'yearly']
                },
                interval: {
                  default: 1,
                  type: 'integer',
                  minimum: 1,
                  maximum: 52
                },
                start_on: {
                  type: 'string',
                  pattern: '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$'
                },
                end_on: {
                  default: null,
                  anyOf: [
                    {
                      type: 'string',
                      pattern: '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$'
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                auto_post: {
                  default: false,
                  type: 'boolean'
                },
                active: {
                  default: true,
                  type: 'boolean'
                },
                notes: {
                  default: '',
                  type: 'string',
                  maxLength: 5000
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
                next_index: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 9007199254740991
                },
                next_on: {
                  anyOf: [
                    {
                      type: 'string',
                      pattern: '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$'
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                posted: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 9007199254740991
                }
              },
              required: [
                'kind',
                'title',
                'account_id',
                'category_id',
                'amount',
                'currency',
                'tax_rule_id',
                'tax_basis',
                'cadence',
                'interval',
                'start_on',
                'end_on',
                'auto_post',
                'active',
                'notes',
                'id',
                'created',
                'updated',
                'next_index',
                'next_on',
                'posted'
              ],
              additionalProperties: false
            }
          },
          earliest_on: {
            anyOf: [
              {
                type: 'string',
                pattern: '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$'
              },
              {
                type: 'null'
              }
            ]
          },
          transaction_count: {
            type: 'integer',
            minimum: 0,
            maximum: 9007199254740991
          }
        },
        required: [
          'settings',
          'rates',
          'accounts',
          'categories',
          'tax_rules',
          'lists',
          'wishes',
          'recurring',
          'earliest_on',
          'transaction_count'
        ],
        additionalProperties: false
      }
    }
  },
  summary: {
    method: 'get',
    description:
      'Read exact income, spending, tax and net worth totals for a period, bucketed for a timeline',
    noAuth: false,
    encrypted: true,
    isDownloadable: false,
    media: null,
    input: {
      query: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          from: {
            type: 'string',
            pattern: '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$'
          },
          to: {
            type: 'string',
            pattern: '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$'
          },
          bucket: {
            type: 'string',
            enum: ['day', 'week', 'month', 'year']
          },
          compare_from: {
            type: 'string',
            pattern: '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$'
          },
          compare_to: {
            type: 'string',
            pattern: '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$'
          }
        },
        required: ['from', 'to', 'bucket'],
        additionalProperties: false
      }
    },
    output: {
      OK: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          base: {
            type: 'string'
          },
          from: {
            type: 'string',
            pattern: '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$'
          },
          to: {
            type: 'string',
            pattern: '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$'
          },
          bucket: {
            type: 'string',
            enum: ['day', 'week', 'month', 'year']
          },
          totals: {
            type: 'object',
            properties: {
              income_gross: {
                type: 'string',
                pattern: '^-?\\d+(\\.\\d+)?$'
              },
              income_tax: {
                type: 'string',
                pattern: '^-?\\d+(\\.\\d+)?$'
              },
              income_received: {
                type: 'string',
                pattern: '^-?\\d+(\\.\\d+)?$'
              },
              tax_withheld: {
                type: 'string',
                pattern: '^-?\\d+(\\.\\d+)?$'
              },
              tax_reserve: {
                type: 'string',
                pattern: '^-?\\d+(\\.\\d+)?$'
              },
              expense: {
                type: 'string',
                pattern: '^-?\\d+(\\.\\d+)?$'
              },
              vat: {
                type: 'string',
                pattern: '^-?\\d+(\\.\\d+)?$'
              },
              net: {
                type: 'string',
                pattern: '^-?\\d+(\\.\\d+)?$'
              },
              count: {
                type: 'integer',
                minimum: -9007199254740991,
                maximum: 9007199254740991
              },
              transfers: {
                type: 'integer',
                minimum: -9007199254740991,
                maximum: 9007199254740991
              }
            },
            required: [
              'income_gross',
              'income_tax',
              'income_received',
              'tax_withheld',
              'tax_reserve',
              'expense',
              'vat',
              'net',
              'count',
              'transfers'
            ],
            additionalProperties: false
          },
          previous: {
            anyOf: [
              {
                type: 'object',
                properties: {
                  income_gross: {
                    type: 'string',
                    pattern: '^-?\\d+(\\.\\d+)?$'
                  },
                  income_tax: {
                    type: 'string',
                    pattern: '^-?\\d+(\\.\\d+)?$'
                  },
                  income_received: {
                    type: 'string',
                    pattern: '^-?\\d+(\\.\\d+)?$'
                  },
                  tax_withheld: {
                    type: 'string',
                    pattern: '^-?\\d+(\\.\\d+)?$'
                  },
                  tax_reserve: {
                    type: 'string',
                    pattern: '^-?\\d+(\\.\\d+)?$'
                  },
                  expense: {
                    type: 'string',
                    pattern: '^-?\\d+(\\.\\d+)?$'
                  },
                  vat: {
                    type: 'string',
                    pattern: '^-?\\d+(\\.\\d+)?$'
                  },
                  net: {
                    type: 'string',
                    pattern: '^-?\\d+(\\.\\d+)?$'
                  },
                  count: {
                    type: 'integer',
                    minimum: -9007199254740991,
                    maximum: 9007199254740991
                  },
                  transfers: {
                    type: 'integer',
                    minimum: -9007199254740991,
                    maximum: 9007199254740991
                  }
                },
                required: [
                  'income_gross',
                  'income_tax',
                  'income_received',
                  'tax_withheld',
                  'tax_reserve',
                  'expense',
                  'vat',
                  'net',
                  'count',
                  'transfers'
                ],
                additionalProperties: false
              },
              {
                type: 'null'
              }
            ]
          },
          buckets: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                start: {
                  type: 'string',
                  pattern: '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$'
                },
                income: {
                  type: 'string',
                  pattern: '^-?\\d+(\\.\\d+)?$'
                },
                expense: {
                  type: 'string',
                  pattern: '^-?\\d+(\\.\\d+)?$'
                },
                tax: {
                  type: 'string',
                  pattern: '^-?\\d+(\\.\\d+)?$'
                },
                net: {
                  type: 'string',
                  pattern: '^-?\\d+(\\.\\d+)?$'
                }
              },
              required: ['start', 'income', 'expense', 'tax', 'net'],
              additionalProperties: false
            }
          },
          categories: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                category_id: {
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
                  enum: ['income', 'expense']
                },
                amount: {
                  type: 'string',
                  pattern: '^-?\\d+(\\.\\d+)?$'
                },
                gross: {
                  type: 'string',
                  pattern: '^-?\\d+(\\.\\d+)?$'
                },
                tax: {
                  type: 'string',
                  pattern: '^-?\\d+(\\.\\d+)?$'
                },
                count: {
                  type: 'integer',
                  minimum: -9007199254740991,
                  maximum: 9007199254740991
                }
              },
              required: [
                'category_id',
                'kind',
                'amount',
                'gross',
                'tax',
                'count'
              ],
              additionalProperties: false
            }
          },
          net_worth: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                start: {
                  type: 'string',
                  pattern: '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$'
                },
                value: {
                  type: 'string',
                  pattern: '^-?\\d+(\\.\\d+)?$'
                }
              },
              required: ['start', 'value'],
              additionalProperties: false
            }
          },
          net_worth_unpriced: {
            type: 'integer',
            minimum: -9007199254740991,
            maximum: 9007199254740991
          }
        },
        required: [
          'base',
          'from',
          'to',
          'bucket',
          'totals',
          'previous',
          'buckets',
          'categories',
          'net_worth',
          'net_worth_unpriced'
        ],
        additionalProperties: false
      }
    }
  },
  taxRules: {
    save: {
      method: 'post',
      description: 'Create or update a VAT rule or an income tax schedule',
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
              maxLength: 120
            },
            kind: {
              default: 'vat',
              type: 'string',
              enum: ['vat', 'income']
            },
            rate: {
              default: '0',
              type: 'string',
              pattern: '^\\d{1,3}(\\.\\d{1,6})?$'
            },
            inclusive: {
              default: true,
              type: 'boolean'
            },
            withheld: {
              default: false,
              type: 'boolean'
            },
            components: {
              default: [],
              maxItems: 8,
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  label: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 80
                  },
                  brackets: {
                    minItems: 1,
                    maxItems: 12,
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        up_to: {
                          anyOf: [
                            {
                              type: 'string',
                              pattern: '^\\d{1,18}(\\.\\d{1,8})?$'
                            },
                            {
                              type: 'null'
                            }
                          ]
                        },
                        rate: {
                          type: 'string',
                          pattern: '^\\d{1,3}(\\.\\d{1,6})?$'
                        }
                      },
                      required: ['up_to', 'rate'],
                      additionalProperties: false
                    }
                  }
                },
                required: ['label', 'brackets'],
                additionalProperties: false
              }
            },
            archived: {
              default: false,
              type: 'boolean'
            },
            notes: {
              default: '',
              type: 'string',
              maxLength: 5000
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
            'rate',
            'inclusive',
            'withheld',
            'components',
            'archived',
            'notes'
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
            updated: {
              type: 'string'
            }
          },
          required: ['id', 'updated'],
          additionalProperties: false
        }
      }
    },
    delete: {
      method: 'post',
      description: 'Delete a tax rule; booked transactions keep their tax',
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
  transactions: {
    list: {
      method: 'get',
      description: 'List your transactions between two dates, newest first',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        query: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            from: {
              type: 'string',
              pattern: '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$'
            },
            to: {
              type: 'string',
              pattern: '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$'
            },
            limit: {
              default: 2000,
              type: 'integer',
              minimum: 1,
              maximum: 5000
            }
          },
          required: ['from', 'to', 'limit'],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  kind: {
                    type: 'string',
                    enum: ['income', 'expense', 'transfer']
                  },
                  occurred_on: {
                    type: 'string',
                    pattern: '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$'
                  },
                  account_id: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  to_account_id: {
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
                  category_id: {
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
                  title: {
                    default: '',
                    type: 'string',
                    maxLength: 200
                  },
                  notes: {
                    default: '',
                    type: 'string',
                    maxLength: 5000
                  },
                  entered_amount: {
                    type: 'string',
                    pattern: '^\\d{1,18}(\\.\\d{1,8})?$'
                  },
                  entered_currency: {
                    type: 'string',
                    pattern: '^[A-Z][A-Z0-9]{1,9}$'
                  },
                  to_amount: {
                    anyOf: [
                      {
                        type: 'string',
                        pattern: '^-?\\d+(\\.\\d+)?$'
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  tax_rule_id: {
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
                  tax_basis: {
                    default: 'gross',
                    type: 'string',
                    enum: ['gross', 'net']
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
                  amount: {
                    type: 'string',
                    pattern: '^-?\\d+(\\.\\d+)?$'
                  },
                  gross_amount: {
                    type: 'string',
                    pattern: '^-?\\d+(\\.\\d+)?$'
                  },
                  tax_amount: {
                    type: 'string',
                    pattern: '^-?\\d+(\\.\\d+)?$'
                  },
                  net_amount: {
                    type: 'string',
                    pattern: '^-?\\d+(\\.\\d+)?$'
                  },
                  base_rate: {
                    type: 'string',
                    pattern: '^-?\\d+(\\.\\d+)?$'
                  },
                  base_amount: {
                    type: 'string',
                    pattern: '^-?\\d+(\\.\\d+)?$'
                  },
                  base_gross: {
                    type: 'string',
                    pattern: '^-?\\d+(\\.\\d+)?$'
                  },
                  base_tax: {
                    type: 'string',
                    pattern: '^-?\\d+(\\.\\d+)?$'
                  },
                  base_net: {
                    type: 'string',
                    pattern: '^-?\\d+(\\.\\d+)?$'
                  },
                  withheld: {
                    type: 'boolean'
                  },
                  tax_name: {
                    type: 'string'
                  },
                  tax_parts: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        label: {
                          type: 'string'
                        },
                        tax: {
                          type: 'string',
                          pattern: '^-?\\d+(\\.\\d+)?$'
                        }
                      },
                      required: ['label', 'tax'],
                      additionalProperties: false
                    }
                  },
                  wishlist_item_id: {
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
                  recurring_id: {
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
                  'kind',
                  'occurred_on',
                  'account_id',
                  'to_account_id',
                  'category_id',
                  'title',
                  'notes',
                  'entered_amount',
                  'entered_currency',
                  'to_amount',
                  'tax_rule_id',
                  'tax_basis',
                  'id',
                  'created',
                  'updated',
                  'amount',
                  'gross_amount',
                  'tax_amount',
                  'net_amount',
                  'base_rate',
                  'base_amount',
                  'base_gross',
                  'base_tax',
                  'base_net',
                  'withheld',
                  'tax_name',
                  'tax_parts',
                  'wishlist_item_id',
                  'recurring_id'
                ],
                additionalProperties: false
              }
            },
            truncated: {
              type: 'boolean'
            }
          },
          required: ['items', 'truncated'],
          additionalProperties: false
        }
      }
    },
    save: {
      method: 'post',
      description:
        'Record or edit income, spending or a transfer; taxes and conversions are calculated on the server',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            kind: {
              type: 'string',
              enum: ['income', 'expense', 'transfer']
            },
            occurred_on: {
              type: 'string',
              pattern: '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$'
            },
            account_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            to_account_id: {
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
            category_id: {
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
            title: {
              default: '',
              type: 'string',
              maxLength: 200
            },
            notes: {
              default: '',
              type: 'string',
              maxLength: 5000
            },
            entered_amount: {
              type: 'string',
              pattern: '^\\d{1,18}(\\.\\d{1,8})?$'
            },
            entered_currency: {
              type: 'string',
              pattern: '^[A-Z][A-Z0-9]{1,9}$'
            },
            to_amount: {
              default: null,
              anyOf: [
                {
                  type: 'string',
                  pattern: '^\\d{1,18}(\\.\\d{1,8})?$'
                },
                {
                  type: 'null'
                }
              ]
            },
            tax_rule_id: {
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
            tax_basis: {
              default: 'gross',
              type: 'string',
              enum: ['gross', 'net']
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
            'kind',
            'occurred_on',
            'account_id',
            'to_account_id',
            'category_id',
            'title',
            'notes',
            'entered_amount',
            'entered_currency',
            'to_amount',
            'tax_rule_id',
            'tax_basis'
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
            updated: {
              type: 'string'
            }
          },
          required: ['id', 'updated'],
          additionalProperties: false
        }
      }
    },
    delete: {
      method: 'post',
      description:
        'Delete a transaction; a wishlist purchase returns to the wishlist',
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
  wishlist: {
    saveList: {
      method: 'post',
      description: 'Create or rename a wishlist',
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
              maxLength: 120
            },
            icon: {
              default: '',
              type: 'string',
              maxLength: 100
            },
            color: {
              default: '',
              type: 'string',
              pattern: '^(#[0-9a-fA-F]{6})?$'
            },
            sort: {
              default: 0,
              type: 'integer',
              minimum: 0,
              maximum: 100000
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
            expected_updated: {
              type: 'string',
              format: 'date-time',
              pattern:
                '^(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))T(?:(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d(?:\\.\\d+)?)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$'
            }
          },
          required: ['name', 'icon', 'color', 'sort', 'archived'],
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
            updated: {
              type: 'string'
            }
          },
          required: ['id', 'updated'],
          additionalProperties: false
        }
      }
    },
    deleteList: {
      method: 'post',
      description: 'Delete a wishlist and keep its items unsorted',
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
    save: {
      method: 'post',
      description: 'Create or update a wishlist item and its price',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            list_id: {
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
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 200
            },
            url: {
              default: '',
              type: 'string',
              maxLength: 2048
            },
            price: {
              type: 'string',
              pattern: '^\\d{1,18}(\\.\\d{1,8})?$'
            },
            currency: {
              type: 'string',
              pattern: '^[A-Z][A-Z0-9]{1,9}$'
            },
            quantity: {
              default: 1,
              type: 'integer',
              minimum: 1,
              maximum: 1000
            },
            shipping: {
              default: '0',
              type: 'string',
              pattern: '^\\d{1,18}(\\.\\d{1,8})?$'
            },
            tax_rule_id: {
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
            priority: {
              default: 'medium',
              type: 'string',
              enum: ['low', 'medium', 'high']
            },
            target_on: {
              default: null,
              anyOf: [
                {
                  type: 'string',
                  pattern: '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$'
                },
                {
                  type: 'null'
                }
              ]
            },
            category_id: {
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
            account_id: {
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
            sort: {
              default: 0,
              type: 'integer',
              minimum: 0,
              maximum: 100000
            },
            notes: {
              default: '',
              type: 'string',
              maxLength: 5000
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
            'list_id',
            'name',
            'url',
            'price',
            'currency',
            'quantity',
            'shipping',
            'tax_rule_id',
            'priority',
            'target_on',
            'category_id',
            'account_id',
            'sort',
            'notes'
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
            updated: {
              type: 'string'
            }
          },
          required: ['id', 'updated'],
          additionalProperties: false
        }
      }
    },
    delete: {
      method: 'post',
      description:
        'Delete a wishlist item; a booked purchase stays in your spending',
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
    purchase: {
      method: 'post',
      description:
        'Move a wishlist item into your spending at its calculated total, or move it back',
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
            },
            purchased: {
              type: 'boolean'
            },
            account_id: {
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
            category_id: {
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
            occurred_on: {
              default: null,
              anyOf: [
                {
                  type: 'string',
                  pattern: '^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$'
                },
                {
                  type: 'null'
                }
              ]
            }
          },
          required: [
            'id',
            'expected_updated',
            'purchased',
            'account_id',
            'category_id',
            'occurred_on'
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
            updated: {
              type: 'string'
            }
          },
          required: ['id', 'updated'],
          additionalProperties: false
        }
      }
    }
  }
} as const

export default contract
