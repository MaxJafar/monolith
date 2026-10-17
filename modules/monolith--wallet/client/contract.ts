export const contract = {
  transactions: {
    create: {
      method: 'post',
      description: 'Create a new transaction with receipt',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: {
        receipt: {
          optional: true
        }
      },
      input: {
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          anyOf: [
            {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['income', 'expenses']
                },
                amount: {
                  type: 'number',
                  minimum: 0
                },
                date: {
                  type: 'string'
                },
                particulars: {
                  type: 'string'
                },
                asset: {
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
                category: {
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
                platform: {
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
                ledgers: {
                  type: 'array',
                  items: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  }
                },
                location: {
                  anyOf: [
                    {
                      type: 'object',
                      properties: {
                        name: {
                          type: 'string'
                        },
                        formattedAddress: {
                          type: 'string'
                        },
                        location: {
                          type: 'object',
                          properties: {
                            latitude: {
                              type: 'number'
                            },
                            longitude: {
                              type: 'number'
                            }
                          },
                          required: ['latitude', 'longitude'],
                          additionalProperties: false
                        }
                      },
                      required: ['name', 'formattedAddress', 'location'],
                      additionalProperties: false
                    },
                    {
                      type: 'null'
                    }
                  ]
                }
              },
              required: ['type', 'amount'],
              additionalProperties: false
            },
            {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  const: 'transfer'
                },
                amount: {
                  type: 'number',
                  minimum: 0
                },
                date: {
                  type: 'string'
                },
                from: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                to: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                }
              },
              required: ['type', 'amount', 'from', 'to'],
              additionalProperties: false
            }
          ]
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
            type: {
              type: 'string',
              enum: ['transfer', 'income_expenses']
            },
            amount: {
              type: 'number',
              minimum: -140737488355328,
              maximum: 140737488355327
            },
            date: {
              type: 'string',
              format: 'date-time'
            },
            receipt: {
              type: 'string'
            }
          },
          required: ['id', 'type', 'amount', 'date', 'receipt'],
          additionalProperties: false
        }
      }
    },
    createMultiple: {
      method: 'post',
      description: 'Create multiple new transactions',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            transactions: {
              type: 'array',
              items: {
                anyOf: [
                  {
                    type: 'object',
                    properties: {
                      type: {
                        type: 'string',
                        enum: ['income', 'expenses']
                      },
                      amount: {
                        type: 'number',
                        minimum: 0
                      },
                      date: {
                        type: 'string'
                      },
                      particulars: {
                        type: 'string'
                      },
                      asset: {
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
                      category: {
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
                      platform: {
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
                      ledgers: {
                        type: 'array',
                        items: {
                          type: 'string',
                          format: 'uuid',
                          pattern:
                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                        }
                      },
                      location: {
                        anyOf: [
                          {
                            type: 'object',
                            properties: {
                              name: {
                                type: 'string'
                              },
                              formattedAddress: {
                                type: 'string'
                              },
                              location: {
                                type: 'object',
                                properties: {
                                  latitude: {
                                    type: 'number'
                                  },
                                  longitude: {
                                    type: 'number'
                                  }
                                },
                                required: ['latitude', 'longitude'],
                                additionalProperties: false
                              }
                            },
                            required: ['name', 'formattedAddress', 'location'],
                            additionalProperties: false
                          },
                          {
                            type: 'null'
                          }
                        ]
                      }
                    },
                    required: ['type', 'amount'],
                    additionalProperties: false
                  },
                  {
                    type: 'object',
                    properties: {
                      type: {
                        type: 'string',
                        const: 'transfer'
                      },
                      amount: {
                        type: 'number',
                        minimum: 0
                      },
                      date: {
                        type: 'string'
                      },
                      from: {
                        type: 'string',
                        format: 'uuid',
                        pattern:
                          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                      },
                      to: {
                        type: 'string',
                        format: 'uuid',
                        pattern:
                          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                      }
                    },
                    required: ['type', 'amount', 'from', 'to'],
                    additionalProperties: false
                  }
                ]
              }
            }
          },
          required: ['transactions'],
          additionalProperties: false
        }
      },
      output: {
        CREATED: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'null'
        }
      }
    },
    getById: {
      method: 'get',
      description: 'Get wallet transaction by ID',
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
                type: {
                  type: 'string',
                  const: 'transfer'
                },
                amount: {
                  type: 'number',
                  minimum: -140737488355328,
                  maximum: 140737488355327
                },
                date: {
                  type: 'string',
                  format: 'date-time'
                },
                receipt: {
                  type: 'string'
                },
                from: {
                  type: 'string'
                },
                to: {
                  type: 'string'
                }
              },
              required: [
                'id',
                'type',
                'amount',
                'date',
                'receipt',
                'from',
                'to'
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
                type: {
                  type: 'string',
                  const: 'income'
                },
                amount: {
                  type: 'number',
                  minimum: -140737488355328,
                  maximum: 140737488355327
                },
                date: {
                  type: 'string',
                  format: 'date-time'
                },
                receipt: {
                  type: 'string'
                },
                particulars: {
                  type: 'string'
                },
                asset: {
                  type: 'string'
                },
                category: {
                  type: 'string'
                },
                platform: {
                  anyOf: [
                    {
                      type: 'string'
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                ledgers: {
                  type: 'array',
                  items: {
                    type: 'string'
                  }
                },
                location_name: {
                  type: 'string'
                },
                location_coords: {
                  anyOf: [
                    {
                      type: 'object',
                      properties: {
                        lon: {
                          type: 'number'
                        },
                        lat: {
                          type: 'number'
                        }
                      },
                      required: ['lon', 'lat'],
                      additionalProperties: false
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                asset_info: {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string'
                    },
                    icon: {
                      type: 'string'
                    }
                  },
                  required: ['name', 'icon'],
                  additionalProperties: false
                },
                category_info: {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string'
                    },
                    icon: {
                      type: 'string'
                    },
                    color: {
                      type: 'string'
                    }
                  },
                  required: ['name', 'icon', 'color'],
                  additionalProperties: false
                },
                platform_info: {
                  anyOf: [
                    {
                      type: 'object',
                      properties: {
                        name: {
                          type: 'string'
                        },
                        icon: {
                          type: 'string'
                        },
                        color: {
                          type: 'string'
                        }
                      },
                      required: ['name', 'icon', 'color'],
                      additionalProperties: false
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                ledger_info: {
                  anyOf: [
                    {
                      type: 'object',
                      properties: {
                        name: {
                          type: 'string'
                        },
                        icon: {
                          type: 'string'
                        },
                        color: {
                          type: 'string'
                        }
                      },
                      required: ['name', 'icon', 'color'],
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
                'type',
                'amount',
                'date',
                'receipt',
                'particulars',
                'asset',
                'category',
                'platform',
                'ledgers',
                'location_name',
                'location_coords',
                'asset_info',
                'category_info',
                'platform_info',
                'ledger_info'
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
                type: {
                  type: 'string',
                  const: 'expenses'
                },
                amount: {
                  type: 'number',
                  minimum: -140737488355328,
                  maximum: 140737488355327
                },
                date: {
                  type: 'string',
                  format: 'date-time'
                },
                receipt: {
                  type: 'string'
                },
                particulars: {
                  type: 'string'
                },
                asset: {
                  type: 'string'
                },
                category: {
                  type: 'string'
                },
                platform: {
                  anyOf: [
                    {
                      type: 'string'
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                ledgers: {
                  type: 'array',
                  items: {
                    type: 'string'
                  }
                },
                location_name: {
                  type: 'string'
                },
                location_coords: {
                  anyOf: [
                    {
                      type: 'object',
                      properties: {
                        lon: {
                          type: 'number'
                        },
                        lat: {
                          type: 'number'
                        }
                      },
                      required: ['lon', 'lat'],
                      additionalProperties: false
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                asset_info: {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string'
                    },
                    icon: {
                      type: 'string'
                    }
                  },
                  required: ['name', 'icon'],
                  additionalProperties: false
                },
                category_info: {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string'
                    },
                    icon: {
                      type: 'string'
                    },
                    color: {
                      type: 'string'
                    }
                  },
                  required: ['name', 'icon', 'color'],
                  additionalProperties: false
                },
                platform_info: {
                  anyOf: [
                    {
                      type: 'object',
                      properties: {
                        name: {
                          type: 'string'
                        },
                        icon: {
                          type: 'string'
                        },
                        color: {
                          type: 'string'
                        }
                      },
                      required: ['name', 'icon', 'color'],
                      additionalProperties: false
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                ledger_info: {
                  anyOf: [
                    {
                      type: 'object',
                      properties: {
                        name: {
                          type: 'string'
                        },
                        icon: {
                          type: 'string'
                        },
                        color: {
                          type: 'string'
                        }
                      },
                      required: ['name', 'icon', 'color'],
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
                'type',
                'amount',
                'date',
                'receipt',
                'particulars',
                'asset',
                'category',
                'platform',
                'ledgers',
                'location_name',
                'location_coords',
                'asset_info',
                'category_info',
                'platform_info',
                'ledger_info'
              ],
              additionalProperties: false
            }
          ]
        }
      }
    },
    list: {
      method: 'get',
      description: 'Get paginated wallet transactions',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        query: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            q: {
              type: 'string'
            },
            type: {
              type: 'string',
              enum: ['income', 'expenses', 'transfer']
            },
            category: {
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
            platform: {
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
            asset: {
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
            ledger: {
              type: 'string'
            },
            startDate: {
              type: 'string'
            },
            endDate: {
              type: 'string'
            },
            range: {
              type: 'string',
              enum: [
                'week',
                'month',
                'mtd',
                'quarter',
                'year',
                'ytd',
                'all',
                'custom'
              ]
            },
            page: {
              type: 'string'
            },
            perPage: {
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
            groups: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  date: {
                    type: 'string'
                  },
                  items: {
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
                            type: {
                              type: 'string',
                              const: 'transfer'
                            },
                            amount: {
                              type: 'number',
                              minimum: -140737488355328,
                              maximum: 140737488355327
                            },
                            date: {
                              type: 'string',
                              format: 'date-time'
                            },
                            receipt: {
                              type: 'string'
                            },
                            from: {
                              type: 'string'
                            },
                            to: {
                              type: 'string'
                            }
                          },
                          required: [
                            'id',
                            'type',
                            'amount',
                            'date',
                            'receipt',
                            'from',
                            'to'
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
                            type: {
                              type: 'string',
                              const: 'income'
                            },
                            amount: {
                              type: 'number',
                              minimum: -140737488355328,
                              maximum: 140737488355327
                            },
                            date: {
                              type: 'string',
                              format: 'date-time'
                            },
                            receipt: {
                              type: 'string'
                            },
                            particulars: {
                              type: 'string'
                            },
                            asset: {
                              type: 'string'
                            },
                            category: {
                              type: 'string'
                            },
                            platform: {
                              anyOf: [
                                {
                                  type: 'string'
                                },
                                {
                                  type: 'null'
                                }
                              ]
                            },
                            ledgers: {
                              type: 'array',
                              items: {
                                type: 'string'
                              }
                            },
                            location_name: {
                              type: 'string'
                            },
                            location_coords: {
                              anyOf: [
                                {
                                  type: 'object',
                                  properties: {
                                    lon: {
                                      type: 'number'
                                    },
                                    lat: {
                                      type: 'number'
                                    }
                                  },
                                  required: ['lon', 'lat'],
                                  additionalProperties: false
                                },
                                {
                                  type: 'null'
                                }
                              ]
                            },
                            asset_info: {
                              type: 'object',
                              properties: {
                                name: {
                                  type: 'string'
                                },
                                icon: {
                                  type: 'string'
                                }
                              },
                              required: ['name', 'icon'],
                              additionalProperties: false
                            },
                            category_info: {
                              type: 'object',
                              properties: {
                                name: {
                                  type: 'string'
                                },
                                icon: {
                                  type: 'string'
                                },
                                color: {
                                  type: 'string'
                                }
                              },
                              required: ['name', 'icon', 'color'],
                              additionalProperties: false
                            },
                            platform_info: {
                              anyOf: [
                                {
                                  type: 'object',
                                  properties: {
                                    name: {
                                      type: 'string'
                                    },
                                    icon: {
                                      type: 'string'
                                    },
                                    color: {
                                      type: 'string'
                                    }
                                  },
                                  required: ['name', 'icon', 'color'],
                                  additionalProperties: false
                                },
                                {
                                  type: 'null'
                                }
                              ]
                            },
                            ledger_info: {
                              anyOf: [
                                {
                                  type: 'object',
                                  properties: {
                                    name: {
                                      type: 'string'
                                    },
                                    icon: {
                                      type: 'string'
                                    },
                                    color: {
                                      type: 'string'
                                    }
                                  },
                                  required: ['name', 'icon', 'color'],
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
                            'type',
                            'amount',
                            'date',
                            'receipt',
                            'particulars',
                            'asset',
                            'category',
                            'platform',
                            'ledgers',
                            'location_name',
                            'location_coords',
                            'asset_info',
                            'category_info',
                            'platform_info',
                            'ledger_info'
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
                            type: {
                              type: 'string',
                              const: 'expenses'
                            },
                            amount: {
                              type: 'number',
                              minimum: -140737488355328,
                              maximum: 140737488355327
                            },
                            date: {
                              type: 'string',
                              format: 'date-time'
                            },
                            receipt: {
                              type: 'string'
                            },
                            particulars: {
                              type: 'string'
                            },
                            asset: {
                              type: 'string'
                            },
                            category: {
                              type: 'string'
                            },
                            platform: {
                              anyOf: [
                                {
                                  type: 'string'
                                },
                                {
                                  type: 'null'
                                }
                              ]
                            },
                            ledgers: {
                              type: 'array',
                              items: {
                                type: 'string'
                              }
                            },
                            location_name: {
                              type: 'string'
                            },
                            location_coords: {
                              anyOf: [
                                {
                                  type: 'object',
                                  properties: {
                                    lon: {
                                      type: 'number'
                                    },
                                    lat: {
                                      type: 'number'
                                    }
                                  },
                                  required: ['lon', 'lat'],
                                  additionalProperties: false
                                },
                                {
                                  type: 'null'
                                }
                              ]
                            },
                            asset_info: {
                              type: 'object',
                              properties: {
                                name: {
                                  type: 'string'
                                },
                                icon: {
                                  type: 'string'
                                }
                              },
                              required: ['name', 'icon'],
                              additionalProperties: false
                            },
                            category_info: {
                              type: 'object',
                              properties: {
                                name: {
                                  type: 'string'
                                },
                                icon: {
                                  type: 'string'
                                },
                                color: {
                                  type: 'string'
                                }
                              },
                              required: ['name', 'icon', 'color'],
                              additionalProperties: false
                            },
                            platform_info: {
                              anyOf: [
                                {
                                  type: 'object',
                                  properties: {
                                    name: {
                                      type: 'string'
                                    },
                                    icon: {
                                      type: 'string'
                                    },
                                    color: {
                                      type: 'string'
                                    }
                                  },
                                  required: ['name', 'icon', 'color'],
                                  additionalProperties: false
                                },
                                {
                                  type: 'null'
                                }
                              ]
                            },
                            ledger_info: {
                              anyOf: [
                                {
                                  type: 'object',
                                  properties: {
                                    name: {
                                      type: 'string'
                                    },
                                    icon: {
                                      type: 'string'
                                    },
                                    color: {
                                      type: 'string'
                                    }
                                  },
                                  required: ['name', 'icon', 'color'],
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
                            'type',
                            'amount',
                            'date',
                            'receipt',
                            'particulars',
                            'asset',
                            'category',
                            'platform',
                            'ledgers',
                            'location_name',
                            'location_coords',
                            'asset_info',
                            'category_info',
                            'platform_info',
                            'ledger_info'
                          ],
                          additionalProperties: false
                        }
                      ]
                    }
                  }
                },
                required: ['date', 'items'],
                additionalProperties: false
              }
            },
            page: {
              type: 'number'
            },
            perPage: {
              type: 'number'
            },
            totalItems: {
              type: 'number'
            },
            totalPages: {
              type: 'number'
            }
          },
          required: ['groups', 'page', 'perPage', 'totalItems', 'totalPages'],
          additionalProperties: false
        }
      }
    },
    remove: {
      method: 'post',
      description: 'Delete a transaction',
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
    scanReceipt: {
      method: 'post',
      description: 'Extract transaction data from receipt using OCR',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: {
        file: {
          optional: false
        }
      },
      input: {},
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            date: {
              type: 'string'
            },
            amount: {
              type: 'number',
              minimum: 0
            },
            type: {
              type: 'string',
              enum: ['income', 'expenses']
            },
            category: {
              type: 'string'
            },
            platform: {
              anyOf: [
                {
                  type: 'string'
                },
                {
                  type: 'null'
                }
              ]
            },
            particulars: {
              type: 'string'
            },
            location_coords: {
              type: 'object',
              properties: {
                lon: {
                  type: 'number'
                },
                lat: {
                  type: 'number'
                }
              },
              required: ['lon', 'lat'],
              additionalProperties: false
            },
            location_name: {
              type: 'string'
            },
            matchedTransactionIds: {
              type: 'array',
              items: {
                type: 'string'
              }
            }
          },
          required: [
            'date',
            'amount',
            'type',
            'category',
            'platform',
            'particulars',
            'location_coords',
            'location_name',
            'matchedTransactionIds'
          ],
          additionalProperties: false
        }
      }
    },
    update: {
      method: 'post',
      description: 'Update transaction details',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: {
        receipt: {
          optional: true
        }
      },
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
          anyOf: [
            {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  enum: ['income', 'expenses']
                },
                amount: {
                  type: 'number',
                  minimum: 0
                },
                date: {
                  type: 'string'
                },
                particulars: {
                  type: 'string'
                },
                asset: {
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
                category: {
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
                platform: {
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
                ledgers: {
                  type: 'array',
                  items: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  }
                },
                location: {
                  anyOf: [
                    {
                      type: 'object',
                      properties: {
                        name: {
                          type: 'string'
                        },
                        formattedAddress: {
                          type: 'string'
                        },
                        location: {
                          type: 'object',
                          properties: {
                            latitude: {
                              type: 'number'
                            },
                            longitude: {
                              type: 'number'
                            }
                          },
                          required: ['latitude', 'longitude'],
                          additionalProperties: false
                        }
                      },
                      required: ['name', 'formattedAddress', 'location'],
                      additionalProperties: false
                    },
                    {
                      type: 'null'
                    }
                  ]
                }
              },
              required: ['type', 'amount'],
              additionalProperties: false
            },
            {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  const: 'transfer'
                },
                amount: {
                  type: 'number',
                  minimum: 0
                },
                date: {
                  type: 'string'
                },
                from: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                to: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                }
              },
              required: ['type', 'amount', 'from', 'to'],
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
            },
            type: {
              type: 'string',
              enum: ['transfer', 'income_expenses']
            },
            amount: {
              type: 'number',
              minimum: -140737488355328,
              maximum: 140737488355327
            },
            date: {
              type: 'string',
              format: 'date-time'
            },
            receipt: {
              type: 'string'
            }
          },
          required: ['id', 'type', 'amount', 'date', 'receipt'],
          additionalProperties: false
        }
      }
    },
    fromNaturalLanguage: {
      method: 'post',
      description:
        'Convert human natural language into partial transaction object',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            description: {
              type: 'string'
            }
          },
          required: ['description'],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'array',
          items: {
            oneOf: [
              {
                type: 'object',
                properties: {
                  date: {
                    type: 'string'
                  },
                  amount: {
                    type: 'number'
                  },
                  type: {
                    type: 'string',
                    const: 'transfer'
                  },
                  from: {
                    type: 'string'
                  },
                  to: {
                    type: 'string'
                  }
                },
                required: ['date', 'amount', 'type', 'from', 'to'],
                additionalProperties: false
              },
              {
                type: 'object',
                properties: {
                  date: {
                    type: 'string'
                  },
                  amount: {
                    type: 'number'
                  },
                  category: {
                    type: 'string'
                  },
                  particulars: {
                    type: 'string'
                  },
                  location_coords: {
                    type: 'object',
                    properties: {
                      lon: {
                        type: 'number'
                      },
                      lat: {
                        type: 'number'
                      }
                    },
                    required: ['lon', 'lat'],
                    additionalProperties: false
                  },
                  location_name: {
                    type: 'string'
                  },
                  asset: {
                    type: 'string'
                  },
                  platform: {
                    type: 'string'
                  },
                  ledgers: {
                    type: 'array',
                    items: {
                      type: 'string'
                    }
                  },
                  asset_info: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string'
                      },
                      icon: {
                        type: 'string'
                      }
                    },
                    required: ['name', 'icon'],
                    additionalProperties: false
                  },
                  category_info: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string'
                      },
                      icon: {
                        type: 'string'
                      },
                      color: {
                        type: 'string'
                      }
                    },
                    required: ['name', 'icon', 'color'],
                    additionalProperties: false
                  },
                  platform_info: {
                    anyOf: [
                      {
                        type: 'object',
                        properties: {
                          name: {
                            type: 'string'
                          },
                          icon: {
                            type: 'string'
                          },
                          color: {
                            type: 'string'
                          }
                        },
                        required: ['name', 'icon', 'color'],
                        additionalProperties: false
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  ledger_info: {
                    anyOf: [
                      {
                        type: 'object',
                        properties: {
                          name: {
                            type: 'string'
                          },
                          icon: {
                            type: 'string'
                          },
                          color: {
                            type: 'string'
                          }
                        },
                        required: ['name', 'icon', 'color'],
                        additionalProperties: false
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  type: {
                    type: 'string',
                    const: 'income'
                  }
                },
                required: [
                  'date',
                  'amount',
                  'category',
                  'particulars',
                  'location_coords',
                  'location_name',
                  'asset',
                  'asset_info',
                  'category_info',
                  'platform_info',
                  'ledger_info',
                  'type'
                ],
                additionalProperties: false
              },
              {
                type: 'object',
                properties: {
                  date: {
                    type: 'string'
                  },
                  amount: {
                    type: 'number'
                  },
                  category: {
                    type: 'string'
                  },
                  particulars: {
                    type: 'string'
                  },
                  location_coords: {
                    type: 'object',
                    properties: {
                      lon: {
                        type: 'number'
                      },
                      lat: {
                        type: 'number'
                      }
                    },
                    required: ['lon', 'lat'],
                    additionalProperties: false
                  },
                  location_name: {
                    type: 'string'
                  },
                  asset: {
                    type: 'string'
                  },
                  platform: {
                    type: 'string'
                  },
                  ledgers: {
                    type: 'array',
                    items: {
                      type: 'string'
                    }
                  },
                  asset_info: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string'
                      },
                      icon: {
                        type: 'string'
                      }
                    },
                    required: ['name', 'icon'],
                    additionalProperties: false
                  },
                  category_info: {
                    type: 'object',
                    properties: {
                      name: {
                        type: 'string'
                      },
                      icon: {
                        type: 'string'
                      },
                      color: {
                        type: 'string'
                      }
                    },
                    required: ['name', 'icon', 'color'],
                    additionalProperties: false
                  },
                  platform_info: {
                    anyOf: [
                      {
                        type: 'object',
                        properties: {
                          name: {
                            type: 'string'
                          },
                          icon: {
                            type: 'string'
                          },
                          color: {
                            type: 'string'
                          }
                        },
                        required: ['name', 'icon', 'color'],
                        additionalProperties: false
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  ledger_info: {
                    anyOf: [
                      {
                        type: 'object',
                        properties: {
                          name: {
                            type: 'string'
                          },
                          icon: {
                            type: 'string'
                          },
                          color: {
                            type: 'string'
                          }
                        },
                        required: ['name', 'icon', 'color'],
                        additionalProperties: false
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  type: {
                    type: 'string',
                    const: 'expenses'
                  }
                },
                required: [
                  'date',
                  'amount',
                  'category',
                  'particulars',
                  'location_coords',
                  'location_name',
                  'asset',
                  'asset_info',
                  'category_info',
                  'platform_info',
                  'ledger_info',
                  'type'
                ],
                additionalProperties: false
              }
            ]
          }
        }
      }
    },
    prompts: {
      autoGenerate: {
        method: 'post',
        description: 'Auto-generate prompt using AI',
        noAuth: false,
        encrypted: true,
        isDownloadable: false,
        media: null,
        input: {
          body: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['income', 'expenses']
              },
              count: {
                type: 'number',
                minimum: 10,
                maximum: 500
              }
            },
            required: ['type', 'count'],
            additionalProperties: false
          }
        },
        output: {
          OK: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'string'
          }
        }
      },
      get: {
        method: 'get',
        description: 'Get AI prompts for transaction generation',
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
              income: {
                type: 'string'
              },
              expenses: {
                type: 'string'
              }
            },
            required: ['income', 'expenses'],
            additionalProperties: false
          }
        }
      },
      update: {
        method: 'post',
        description: 'Update AI generation prompts',
        noAuth: false,
        encrypted: true,
        isDownloadable: false,
        media: null,
        input: {
          body: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              income: {
                type: 'string',
                minLength: 1
              },
              expenses: {
                type: 'string',
                minLength: 1
              }
            },
            required: ['income', 'expenses'],
            additionalProperties: false
          }
        },
        output: {
          OK: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              income: {
                type: 'string'
              },
              expenses: {
                type: 'string'
              }
            },
            required: ['income', 'expenses'],
            additionalProperties: false
          }
        }
      }
    }
  },
  categories: {
    create: {
      method: 'post',
      description: 'Create a new transaction category',
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
            icon: {
              type: 'string'
            },
            color: {
              type: 'string'
            },
            type: {
              type: 'string',
              enum: ['income', 'expenses']
            }
          },
          required: ['name', 'icon', 'color', 'type'],
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
            name: {
              type: 'string'
            },
            icon: {
              type: 'string'
            },
            color: {
              type: 'string'
            },
            type: {
              type: 'string',
              enum: ['income', 'expenses']
            }
          },
          required: ['id', 'name', 'icon', 'color', 'type'],
          additionalProperties: false
        }
      }
    },
    list: {
      method: 'get',
      description: 'Get all transaction categories',
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
              type: {
                type: 'string',
                enum: ['income', 'expenses']
              },
              name: {
                type: 'string'
              },
              icon: {
                type: 'string'
              },
              color: {
                type: 'string'
              },
              amount: {
                type: 'number'
              }
            },
            required: ['id', 'type', 'name', 'icon', 'color', 'amount'],
            additionalProperties: false
          }
        }
      }
    },
    remove: {
      method: 'post',
      description: 'Delete a transaction category',
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
      description: 'Update category details',
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
            },
            icon: {
              type: 'string'
            },
            color: {
              type: 'string'
            },
            type: {
              type: 'string',
              enum: ['income', 'expenses']
            }
          },
          required: ['name', 'icon', 'color', 'type'],
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
            name: {
              type: 'string'
            },
            icon: {
              type: 'string'
            },
            color: {
              type: 'string'
            },
            type: {
              type: 'string',
              enum: ['income', 'expenses']
            }
          },
          required: ['id', 'name', 'icon', 'color', 'type'],
          additionalProperties: false
        }
      }
    }
  },
  assets: {
    create: {
      method: 'post',
      description: 'Create a new wallet asset',
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
            icon: {
              type: 'string'
            },
            starting_balance: {
              type: 'number'
            },
            is_liability: {
              type: 'boolean'
            },
            credit_limit: {
              type: 'number'
            }
          },
          required: [
            'name',
            'icon',
            'starting_balance',
            'is_liability',
            'credit_limit'
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
            name: {
              type: 'string'
            },
            icon: {
              type: 'string'
            },
            starting_balance: {
              type: 'number',
              minimum: -140737488355328,
              maximum: 140737488355327
            },
            is_liability: {
              type: 'boolean'
            },
            credit_limit: {
              type: 'number',
              minimum: -140737488355328,
              maximum: 140737488355327
            }
          },
          required: [
            'id',
            'name',
            'icon',
            'starting_balance',
            'is_liability',
            'credit_limit'
          ],
          additionalProperties: false
        }
      }
    },
    getAssetAccumulatedBalance: {
      method: 'get',
      description: 'Get asset balance over time',
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
            },
            rangeMode: {
              type: 'string',
              enum: ['week', 'month', 'year', 'all', 'custom', 'quarter']
            },
            startDate: {
              type: 'string'
            },
            endDate: {
              type: 'string'
            }
          },
          required: ['id', 'rangeMode'],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            balances: {
              type: 'object',
              additionalProperties: {
                type: 'number'
              }
            },
            startBalance: {
              type: 'number'
            },
            endBalance: {
              type: 'number'
            }
          },
          required: ['balances', 'startBalance', 'endBalance'],
          additionalProperties: false
        }
      }
    },
    list: {
      method: 'get',
      description: 'Get all wallet assets',
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
              name: {
                type: 'string'
              },
              icon: {
                type: 'string'
              },
              starting_balance: {
                type: 'number'
              },
              is_liability: {
                type: 'boolean'
              },
              credit_limit: {
                type: 'number'
              },
              transaction_count: {
                type: 'number'
              },
              current_balance: {
                type: 'number'
              }
            },
            required: [
              'id',
              'name',
              'icon',
              'starting_balance',
              'is_liability',
              'credit_limit',
              'transaction_count',
              'current_balance'
            ],
            additionalProperties: false
          }
        }
      }
    },
    remove: {
      method: 'post',
      description: 'Delete a wallet asset',
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
      description: 'Update asset details',
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
            },
            icon: {
              type: 'string'
            },
            starting_balance: {
              type: 'number'
            },
            is_liability: {
              type: 'boolean'
            },
            credit_limit: {
              type: 'number'
            }
          },
          required: [
            'name',
            'icon',
            'starting_balance',
            'is_liability',
            'credit_limit'
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
            name: {
              type: 'string'
            },
            icon: {
              type: 'string'
            },
            starting_balance: {
              type: 'number',
              minimum: -140737488355328,
              maximum: 140737488355327
            },
            is_liability: {
              type: 'boolean'
            },
            credit_limit: {
              type: 'number',
              minimum: -140737488355328,
              maximum: 140737488355327
            }
          },
          required: [
            'id',
            'name',
            'icon',
            'starting_balance',
            'is_liability',
            'credit_limit'
          ],
          additionalProperties: false
        }
      }
    }
  },
  ledgers: {
    create: {
      method: 'post',
      description: 'Create a new ledger',
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
            icon: {
              type: 'string'
            },
            color: {
              type: 'string'
            }
          },
          required: ['name', 'icon', 'color'],
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
            name: {
              type: 'string'
            },
            icon: {
              type: 'string'
            },
            color: {
              type: 'string'
            }
          },
          required: ['id', 'name', 'icon', 'color'],
          additionalProperties: false
        }
      }
    },
    list: {
      method: 'get',
      description: 'Get all ledgers',
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
              name: {
                type: 'string'
              },
              color: {
                type: 'string'
              },
              icon: {
                type: 'string'
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
      description: 'Delete a ledger',
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
      description: 'Update ledger details',
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
            },
            icon: {
              type: 'string'
            },
            color: {
              type: 'string'
            }
          },
          required: ['name', 'icon', 'color'],
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
            name: {
              type: 'string'
            },
            icon: {
              type: 'string'
            },
            color: {
              type: 'string'
            }
          },
          required: ['id', 'name', 'icon', 'color'],
          additionalProperties: false
        }
      }
    }
  },
  platforms: {
    create: {
      method: 'post',
      description: 'Create a new purchase platform',
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
            icon: {
              type: 'string'
            },
            color: {
              type: 'string'
            }
          },
          required: ['name', 'icon', 'color'],
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
            name: {
              type: 'string'
            },
            icon: {
              type: 'string'
            },
            color: {
              type: 'string'
            }
          },
          required: ['id', 'name', 'icon', 'color'],
          additionalProperties: false
        }
      }
    },
    list: {
      method: 'get',
      description: 'Get all purchase platforms',
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
              name: {
                type: 'string'
              },
              icon: {
                type: 'string'
              },
              color: {
                type: 'string'
              },
              amount: {
                type: 'number'
              }
            },
            required: ['id', 'name', 'icon', 'color', 'amount'],
            additionalProperties: false
          }
        }
      }
    },
    remove: {
      method: 'post',
      description: 'Delete a purchase platform',
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
      description: 'Update platform details',
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
            },
            icon: {
              type: 'string'
            },
            color: {
              type: 'string'
            }
          },
          required: ['name', 'icon', 'color'],
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
            name: {
              type: 'string'
            },
            icon: {
              type: 'string'
            },
            color: {
              type: 'string'
            }
          },
          required: ['id', 'name', 'icon', 'color'],
          additionalProperties: false
        }
      }
    }
  },
  templates: {
    create: {
      method: 'post',
      description: 'Create a new transaction template',
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
            type: {
              type: 'string',
              enum: ['income', 'expenses']
            },
            amount: {
              type: 'number',
              minimum: 0
            },
            particulars: {
              type: 'string'
            },
            asset: {
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
            category: {
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
            platform: {
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
            ledgers: {
              type: 'array',
              items: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
              }
            },
            location: {
              type: 'object',
              properties: {
                name: {
                  type: 'string'
                },
                formattedAddress: {
                  type: 'string'
                },
                location: {
                  type: 'object',
                  properties: {
                    latitude: {
                      type: 'number'
                    },
                    longitude: {
                      type: 'number'
                    }
                  },
                  required: ['latitude', 'longitude'],
                  additionalProperties: false
                }
              },
              required: ['name', 'formattedAddress', 'location'],
              additionalProperties: false
            }
          },
          required: ['name', 'type', 'amount', 'particulars'],
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
            name: {
              type: 'string'
            },
            type: {
              type: 'string',
              enum: ['income', 'expenses']
            },
            amount: {
              type: 'number',
              minimum: -140737488355328,
              maximum: 140737488355327
            },
            particulars: {
              type: 'string'
            },
            asset: {
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
            category: {
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
            platform: {
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
            ledgers: {
              type: 'array',
              items: {
                type: 'string'
              }
            },
            location_name: {
              type: 'string'
            },
            location_coords: {
              anyOf: [
                {
                  type: 'object',
                  properties: {
                    lon: {
                      type: 'number'
                    },
                    lat: {
                      type: 'number'
                    }
                  },
                  required: ['lon', 'lat'],
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
            'name',
            'type',
            'amount',
            'particulars',
            'asset',
            'category',
            'platform',
            'ledgers',
            'location_name',
            'location_coords'
          ],
          additionalProperties: false
        }
      }
    },
    list: {
      method: 'get',
      description: 'Get all transaction templates',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {},
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          propertyNames: {
            type: 'string',
            enum: ['income', 'expenses']
          },
          additionalProperties: false,
          required: ['income', 'expenses'],
          properties: {
            income: {
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
                  type: {
                    type: 'string',
                    enum: ['income', 'expenses']
                  },
                  amount: {
                    type: 'number',
                    minimum: -140737488355328,
                    maximum: 140737488355327
                  },
                  particulars: {
                    type: 'string'
                  },
                  asset: {
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
                  category: {
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
                  platform: {
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
                  ledgers: {
                    type: 'array',
                    items: {
                      type: 'string'
                    }
                  },
                  location_name: {
                    type: 'string'
                  },
                  location_coords: {
                    anyOf: [
                      {
                        type: 'object',
                        properties: {
                          lon: {
                            type: 'number'
                          },
                          lat: {
                            type: 'number'
                          }
                        },
                        required: ['lon', 'lat'],
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
                  'name',
                  'type',
                  'amount',
                  'particulars',
                  'asset',
                  'category',
                  'platform',
                  'ledgers',
                  'location_name',
                  'location_coords'
                ],
                additionalProperties: false
              }
            },
            expenses: {
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
                  type: {
                    type: 'string',
                    enum: ['income', 'expenses']
                  },
                  amount: {
                    type: 'number',
                    minimum: -140737488355328,
                    maximum: 140737488355327
                  },
                  particulars: {
                    type: 'string'
                  },
                  asset: {
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
                  category: {
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
                  platform: {
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
                  ledgers: {
                    type: 'array',
                    items: {
                      type: 'string'
                    }
                  },
                  location_name: {
                    type: 'string'
                  },
                  location_coords: {
                    anyOf: [
                      {
                        type: 'object',
                        properties: {
                          lon: {
                            type: 'number'
                          },
                          lat: {
                            type: 'number'
                          }
                        },
                        required: ['lon', 'lat'],
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
                  'name',
                  'type',
                  'amount',
                  'particulars',
                  'asset',
                  'category',
                  'platform',
                  'ledgers',
                  'location_name',
                  'location_coords'
                ],
                additionalProperties: false
              }
            }
          }
        }
      }
    },
    remove: {
      method: 'post',
      description: 'Delete a transaction template',
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
      description: 'Update transaction template',
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
            },
            type: {
              type: 'string',
              enum: ['income', 'expenses']
            },
            amount: {
              type: 'number',
              minimum: 0
            },
            particulars: {
              type: 'string'
            },
            asset: {
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
            category: {
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
            platform: {
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
            ledgers: {
              type: 'array',
              items: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
              }
            },
            location: {
              type: 'object',
              properties: {
                name: {
                  type: 'string'
                },
                formattedAddress: {
                  type: 'string'
                },
                location: {
                  type: 'object',
                  properties: {
                    latitude: {
                      type: 'number'
                    },
                    longitude: {
                      type: 'number'
                    }
                  },
                  required: ['latitude', 'longitude'],
                  additionalProperties: false
                }
              },
              required: ['name', 'formattedAddress', 'location'],
              additionalProperties: false
            }
          },
          required: ['name', 'type', 'amount', 'particulars'],
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
            name: {
              type: 'string'
            },
            type: {
              type: 'string',
              enum: ['income', 'expenses']
            },
            amount: {
              type: 'number',
              minimum: -140737488355328,
              maximum: 140737488355327
            },
            particulars: {
              type: 'string'
            },
            asset: {
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
            category: {
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
            platform: {
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
            ledgers: {
              type: 'array',
              items: {
                type: 'string'
              }
            },
            location_name: {
              type: 'string'
            },
            location_coords: {
              anyOf: [
                {
                  type: 'object',
                  properties: {
                    lon: {
                      type: 'number'
                    },
                    lat: {
                      type: 'number'
                    }
                  },
                  required: ['lon', 'lat'],
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
            'name',
            'type',
            'amount',
            'particulars',
            'asset',
            'category',
            'platform',
            'ledgers',
            'location_name',
            'location_coords'
          ],
          additionalProperties: false
        }
      }
    }
  },
  statements: {
    get: {
      method: 'get',
      description: 'Get fully computed financial statement for a month',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        query: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            year: {
              type: 'string'
            },
            month: {
              type: 'string'
            }
          },
          required: ['year', 'month'],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            overview: {
              type: 'object',
              properties: {
                monthlyIncome: {
                  type: 'number'
                },
                monthlyExpenses: {
                  type: 'number'
                },
                netIncome: {
                  type: 'number'
                }
              },
              required: ['monthlyIncome', 'monthlyExpenses', 'netIncome'],
              additionalProperties: false
            },
            assets: {
              type: 'object',
              properties: {
                balances: {
                  type: 'object',
                  additionalProperties: {
                    type: 'object',
                    properties: {
                      last: {
                        type: 'number'
                      },
                      current: {
                        type: 'number'
                      },
                      change: {
                        type: 'number'
                      },
                      percentage: {
                        type: 'number'
                      }
                    },
                    required: ['last', 'current', 'change', 'percentage'],
                    additionalProperties: false
                  }
                },
                total: {
                  type: 'object',
                  properties: {
                    last: {
                      type: 'number'
                    },
                    current: {
                      type: 'number'
                    },
                    change: {
                      type: 'number'
                    },
                    percentage: {
                      type: 'number'
                    }
                  },
                  required: ['last', 'current', 'change', 'percentage'],
                  additionalProperties: false
                },
                liabilitiesTotal: {
                  type: 'object',
                  properties: {
                    last: {
                      type: 'number'
                    },
                    current: {
                      type: 'number'
                    },
                    change: {
                      type: 'number'
                    },
                    percentage: {
                      type: 'number'
                    }
                  },
                  required: ['last', 'current', 'change', 'percentage'],
                  additionalProperties: false
                },
                netWorth: {
                  type: 'object',
                  properties: {
                    last: {
                      type: 'number'
                    },
                    current: {
                      type: 'number'
                    },
                    change: {
                      type: 'number'
                    },
                    percentage: {
                      type: 'number'
                    }
                  },
                  required: ['last', 'current', 'change', 'percentage'],
                  additionalProperties: false
                }
              },
              required: ['balances', 'total', 'liabilitiesTotal', 'netWorth'],
              additionalProperties: false
            },
            categoryComparison: {
              type: 'object',
              properties: {
                income: {
                  type: 'object',
                  properties: {
                    currentTotal: {
                      type: 'number'
                    },
                    previousTotal: {
                      type: 'number'
                    },
                    totalChange: {
                      type: 'number'
                    },
                    totalPercentageChange: {
                      type: 'number'
                    },
                    items: {
                      type: 'object',
                      additionalProperties: {
                        type: 'object',
                        properties: {
                          currentAmount: {
                            type: 'number'
                          },
                          previousAmount: {
                            type: 'number'
                          },
                          change: {
                            type: 'number'
                          },
                          percentageChange: {
                            type: 'number'
                          }
                        },
                        required: [
                          'currentAmount',
                          'previousAmount',
                          'change',
                          'percentageChange'
                        ],
                        additionalProperties: false
                      }
                    }
                  },
                  required: [
                    'currentTotal',
                    'previousTotal',
                    'totalChange',
                    'totalPercentageChange',
                    'items'
                  ],
                  additionalProperties: false
                },
                expenses: {
                  type: 'object',
                  properties: {
                    currentTotal: {
                      type: 'number'
                    },
                    previousTotal: {
                      type: 'number'
                    },
                    totalChange: {
                      type: 'number'
                    },
                    totalPercentageChange: {
                      type: 'number'
                    },
                    items: {
                      type: 'object',
                      additionalProperties: {
                        type: 'object',
                        properties: {
                          currentAmount: {
                            type: 'number'
                          },
                          previousAmount: {
                            type: 'number'
                          },
                          change: {
                            type: 'number'
                          },
                          percentageChange: {
                            type: 'number'
                          }
                        },
                        required: [
                          'currentAmount',
                          'previousAmount',
                          'change',
                          'percentageChange'
                        ],
                        additionalProperties: false
                      }
                    }
                  },
                  required: [
                    'currentTotal',
                    'previousTotal',
                    'totalChange',
                    'totalPercentageChange',
                    'items'
                  ],
                  additionalProperties: false
                }
              },
              required: ['income', 'expenses'],
              additionalProperties: false
            },
            transactions: {
              type: 'object',
              properties: {
                income: {
                  type: 'object',
                  properties: {
                    items: {
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
                              type: {
                                type: 'string',
                                const: 'transfer'
                              },
                              amount: {
                                type: 'number',
                                minimum: -140737488355328,
                                maximum: 140737488355327
                              },
                              date: {
                                type: 'string',
                                format: 'date-time'
                              },
                              receipt: {
                                type: 'string'
                              },
                              from: {
                                type: 'string'
                              },
                              to: {
                                type: 'string'
                              }
                            },
                            required: [
                              'id',
                              'type',
                              'amount',
                              'date',
                              'receipt',
                              'from',
                              'to'
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
                              type: {
                                type: 'string',
                                const: 'income'
                              },
                              amount: {
                                type: 'number',
                                minimum: -140737488355328,
                                maximum: 140737488355327
                              },
                              date: {
                                type: 'string',
                                format: 'date-time'
                              },
                              receipt: {
                                type: 'string'
                              },
                              particulars: {
                                type: 'string'
                              },
                              asset: {
                                type: 'string'
                              },
                              category: {
                                type: 'string'
                              },
                              platform: {
                                anyOf: [
                                  {
                                    type: 'string'
                                  },
                                  {
                                    type: 'null'
                                  }
                                ]
                              },
                              ledgers: {
                                type: 'array',
                                items: {
                                  type: 'string'
                                }
                              },
                              location_name: {
                                type: 'string'
                              },
                              location_coords: {
                                anyOf: [
                                  {
                                    type: 'object',
                                    properties: {
                                      lon: {
                                        type: 'number'
                                      },
                                      lat: {
                                        type: 'number'
                                      }
                                    },
                                    required: ['lon', 'lat'],
                                    additionalProperties: false
                                  },
                                  {
                                    type: 'null'
                                  }
                                ]
                              },
                              asset_info: {
                                type: 'object',
                                properties: {
                                  name: {
                                    type: 'string'
                                  },
                                  icon: {
                                    type: 'string'
                                  }
                                },
                                required: ['name', 'icon'],
                                additionalProperties: false
                              },
                              category_info: {
                                type: 'object',
                                properties: {
                                  name: {
                                    type: 'string'
                                  },
                                  icon: {
                                    type: 'string'
                                  },
                                  color: {
                                    type: 'string'
                                  }
                                },
                                required: ['name', 'icon', 'color'],
                                additionalProperties: false
                              },
                              platform_info: {
                                anyOf: [
                                  {
                                    type: 'object',
                                    properties: {
                                      name: {
                                        type: 'string'
                                      },
                                      icon: {
                                        type: 'string'
                                      },
                                      color: {
                                        type: 'string'
                                      }
                                    },
                                    required: ['name', 'icon', 'color'],
                                    additionalProperties: false
                                  },
                                  {
                                    type: 'null'
                                  }
                                ]
                              },
                              ledger_info: {
                                anyOf: [
                                  {
                                    type: 'object',
                                    properties: {
                                      name: {
                                        type: 'string'
                                      },
                                      icon: {
                                        type: 'string'
                                      },
                                      color: {
                                        type: 'string'
                                      }
                                    },
                                    required: ['name', 'icon', 'color'],
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
                              'type',
                              'amount',
                              'date',
                              'receipt',
                              'particulars',
                              'asset',
                              'category',
                              'platform',
                              'ledgers',
                              'location_name',
                              'location_coords',
                              'asset_info',
                              'category_info',
                              'platform_info',
                              'ledger_info'
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
                              type: {
                                type: 'string',
                                const: 'expenses'
                              },
                              amount: {
                                type: 'number',
                                minimum: -140737488355328,
                                maximum: 140737488355327
                              },
                              date: {
                                type: 'string',
                                format: 'date-time'
                              },
                              receipt: {
                                type: 'string'
                              },
                              particulars: {
                                type: 'string'
                              },
                              asset: {
                                type: 'string'
                              },
                              category: {
                                type: 'string'
                              },
                              platform: {
                                anyOf: [
                                  {
                                    type: 'string'
                                  },
                                  {
                                    type: 'null'
                                  }
                                ]
                              },
                              ledgers: {
                                type: 'array',
                                items: {
                                  type: 'string'
                                }
                              },
                              location_name: {
                                type: 'string'
                              },
                              location_coords: {
                                anyOf: [
                                  {
                                    type: 'object',
                                    properties: {
                                      lon: {
                                        type: 'number'
                                      },
                                      lat: {
                                        type: 'number'
                                      }
                                    },
                                    required: ['lon', 'lat'],
                                    additionalProperties: false
                                  },
                                  {
                                    type: 'null'
                                  }
                                ]
                              },
                              asset_info: {
                                type: 'object',
                                properties: {
                                  name: {
                                    type: 'string'
                                  },
                                  icon: {
                                    type: 'string'
                                  }
                                },
                                required: ['name', 'icon'],
                                additionalProperties: false
                              },
                              category_info: {
                                type: 'object',
                                properties: {
                                  name: {
                                    type: 'string'
                                  },
                                  icon: {
                                    type: 'string'
                                  },
                                  color: {
                                    type: 'string'
                                  }
                                },
                                required: ['name', 'icon', 'color'],
                                additionalProperties: false
                              },
                              platform_info: {
                                anyOf: [
                                  {
                                    type: 'object',
                                    properties: {
                                      name: {
                                        type: 'string'
                                      },
                                      icon: {
                                        type: 'string'
                                      },
                                      color: {
                                        type: 'string'
                                      }
                                    },
                                    required: ['name', 'icon', 'color'],
                                    additionalProperties: false
                                  },
                                  {
                                    type: 'null'
                                  }
                                ]
                              },
                              ledger_info: {
                                anyOf: [
                                  {
                                    type: 'object',
                                    properties: {
                                      name: {
                                        type: 'string'
                                      },
                                      icon: {
                                        type: 'string'
                                      },
                                      color: {
                                        type: 'string'
                                      }
                                    },
                                    required: ['name', 'icon', 'color'],
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
                              'type',
                              'amount',
                              'date',
                              'receipt',
                              'particulars',
                              'asset',
                              'category',
                              'platform',
                              'ledgers',
                              'location_name',
                              'location_coords',
                              'asset_info',
                              'category_info',
                              'platform_info',
                              'ledger_info'
                            ],
                            additionalProperties: false
                          }
                        ]
                      }
                    },
                    total: {
                      type: 'number'
                    },
                    count: {
                      type: 'number'
                    }
                  },
                  required: ['items', 'total', 'count'],
                  additionalProperties: false
                },
                expenses: {
                  type: 'object',
                  properties: {
                    items: {
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
                              type: {
                                type: 'string',
                                const: 'transfer'
                              },
                              amount: {
                                type: 'number',
                                minimum: -140737488355328,
                                maximum: 140737488355327
                              },
                              date: {
                                type: 'string',
                                format: 'date-time'
                              },
                              receipt: {
                                type: 'string'
                              },
                              from: {
                                type: 'string'
                              },
                              to: {
                                type: 'string'
                              }
                            },
                            required: [
                              'id',
                              'type',
                              'amount',
                              'date',
                              'receipt',
                              'from',
                              'to'
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
                              type: {
                                type: 'string',
                                const: 'income'
                              },
                              amount: {
                                type: 'number',
                                minimum: -140737488355328,
                                maximum: 140737488355327
                              },
                              date: {
                                type: 'string',
                                format: 'date-time'
                              },
                              receipt: {
                                type: 'string'
                              },
                              particulars: {
                                type: 'string'
                              },
                              asset: {
                                type: 'string'
                              },
                              category: {
                                type: 'string'
                              },
                              platform: {
                                anyOf: [
                                  {
                                    type: 'string'
                                  },
                                  {
                                    type: 'null'
                                  }
                                ]
                              },
                              ledgers: {
                                type: 'array',
                                items: {
                                  type: 'string'
                                }
                              },
                              location_name: {
                                type: 'string'
                              },
                              location_coords: {
                                anyOf: [
                                  {
                                    type: 'object',
                                    properties: {
                                      lon: {
                                        type: 'number'
                                      },
                                      lat: {
                                        type: 'number'
                                      }
                                    },
                                    required: ['lon', 'lat'],
                                    additionalProperties: false
                                  },
                                  {
                                    type: 'null'
                                  }
                                ]
                              },
                              asset_info: {
                                type: 'object',
                                properties: {
                                  name: {
                                    type: 'string'
                                  },
                                  icon: {
                                    type: 'string'
                                  }
                                },
                                required: ['name', 'icon'],
                                additionalProperties: false
                              },
                              category_info: {
                                type: 'object',
                                properties: {
                                  name: {
                                    type: 'string'
                                  },
                                  icon: {
                                    type: 'string'
                                  },
                                  color: {
                                    type: 'string'
                                  }
                                },
                                required: ['name', 'icon', 'color'],
                                additionalProperties: false
                              },
                              platform_info: {
                                anyOf: [
                                  {
                                    type: 'object',
                                    properties: {
                                      name: {
                                        type: 'string'
                                      },
                                      icon: {
                                        type: 'string'
                                      },
                                      color: {
                                        type: 'string'
                                      }
                                    },
                                    required: ['name', 'icon', 'color'],
                                    additionalProperties: false
                                  },
                                  {
                                    type: 'null'
                                  }
                                ]
                              },
                              ledger_info: {
                                anyOf: [
                                  {
                                    type: 'object',
                                    properties: {
                                      name: {
                                        type: 'string'
                                      },
                                      icon: {
                                        type: 'string'
                                      },
                                      color: {
                                        type: 'string'
                                      }
                                    },
                                    required: ['name', 'icon', 'color'],
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
                              'type',
                              'amount',
                              'date',
                              'receipt',
                              'particulars',
                              'asset',
                              'category',
                              'platform',
                              'ledgers',
                              'location_name',
                              'location_coords',
                              'asset_info',
                              'category_info',
                              'platform_info',
                              'ledger_info'
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
                              type: {
                                type: 'string',
                                const: 'expenses'
                              },
                              amount: {
                                type: 'number',
                                minimum: -140737488355328,
                                maximum: 140737488355327
                              },
                              date: {
                                type: 'string',
                                format: 'date-time'
                              },
                              receipt: {
                                type: 'string'
                              },
                              particulars: {
                                type: 'string'
                              },
                              asset: {
                                type: 'string'
                              },
                              category: {
                                type: 'string'
                              },
                              platform: {
                                anyOf: [
                                  {
                                    type: 'string'
                                  },
                                  {
                                    type: 'null'
                                  }
                                ]
                              },
                              ledgers: {
                                type: 'array',
                                items: {
                                  type: 'string'
                                }
                              },
                              location_name: {
                                type: 'string'
                              },
                              location_coords: {
                                anyOf: [
                                  {
                                    type: 'object',
                                    properties: {
                                      lon: {
                                        type: 'number'
                                      },
                                      lat: {
                                        type: 'number'
                                      }
                                    },
                                    required: ['lon', 'lat'],
                                    additionalProperties: false
                                  },
                                  {
                                    type: 'null'
                                  }
                                ]
                              },
                              asset_info: {
                                type: 'object',
                                properties: {
                                  name: {
                                    type: 'string'
                                  },
                                  icon: {
                                    type: 'string'
                                  }
                                },
                                required: ['name', 'icon'],
                                additionalProperties: false
                              },
                              category_info: {
                                type: 'object',
                                properties: {
                                  name: {
                                    type: 'string'
                                  },
                                  icon: {
                                    type: 'string'
                                  },
                                  color: {
                                    type: 'string'
                                  }
                                },
                                required: ['name', 'icon', 'color'],
                                additionalProperties: false
                              },
                              platform_info: {
                                anyOf: [
                                  {
                                    type: 'object',
                                    properties: {
                                      name: {
                                        type: 'string'
                                      },
                                      icon: {
                                        type: 'string'
                                      },
                                      color: {
                                        type: 'string'
                                      }
                                    },
                                    required: ['name', 'icon', 'color'],
                                    additionalProperties: false
                                  },
                                  {
                                    type: 'null'
                                  }
                                ]
                              },
                              ledger_info: {
                                anyOf: [
                                  {
                                    type: 'object',
                                    properties: {
                                      name: {
                                        type: 'string'
                                      },
                                      icon: {
                                        type: 'string'
                                      },
                                      color: {
                                        type: 'string'
                                      }
                                    },
                                    required: ['name', 'icon', 'color'],
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
                              'type',
                              'amount',
                              'date',
                              'receipt',
                              'particulars',
                              'asset',
                              'category',
                              'platform',
                              'ledgers',
                              'location_name',
                              'location_coords',
                              'asset_info',
                              'category_info',
                              'platform_info',
                              'ledger_info'
                            ],
                            additionalProperties: false
                          }
                        ]
                      }
                    },
                    total: {
                      type: 'number'
                    },
                    count: {
                      type: 'number'
                    }
                  },
                  required: ['items', 'total', 'count'],
                  additionalProperties: false
                },
                transfer: {
                  type: 'object',
                  properties: {
                    items: {
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
                              type: {
                                type: 'string',
                                const: 'transfer'
                              },
                              amount: {
                                type: 'number',
                                minimum: -140737488355328,
                                maximum: 140737488355327
                              },
                              date: {
                                type: 'string',
                                format: 'date-time'
                              },
                              receipt: {
                                type: 'string'
                              },
                              from: {
                                type: 'string'
                              },
                              to: {
                                type: 'string'
                              }
                            },
                            required: [
                              'id',
                              'type',
                              'amount',
                              'date',
                              'receipt',
                              'from',
                              'to'
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
                              type: {
                                type: 'string',
                                const: 'income'
                              },
                              amount: {
                                type: 'number',
                                minimum: -140737488355328,
                                maximum: 140737488355327
                              },
                              date: {
                                type: 'string',
                                format: 'date-time'
                              },
                              receipt: {
                                type: 'string'
                              },
                              particulars: {
                                type: 'string'
                              },
                              asset: {
                                type: 'string'
                              },
                              category: {
                                type: 'string'
                              },
                              platform: {
                                anyOf: [
                                  {
                                    type: 'string'
                                  },
                                  {
                                    type: 'null'
                                  }
                                ]
                              },
                              ledgers: {
                                type: 'array',
                                items: {
                                  type: 'string'
                                }
                              },
                              location_name: {
                                type: 'string'
                              },
                              location_coords: {
                                anyOf: [
                                  {
                                    type: 'object',
                                    properties: {
                                      lon: {
                                        type: 'number'
                                      },
                                      lat: {
                                        type: 'number'
                                      }
                                    },
                                    required: ['lon', 'lat'],
                                    additionalProperties: false
                                  },
                                  {
                                    type: 'null'
                                  }
                                ]
                              },
                              asset_info: {
                                type: 'object',
                                properties: {
                                  name: {
                                    type: 'string'
                                  },
                                  icon: {
                                    type: 'string'
                                  }
                                },
                                required: ['name', 'icon'],
                                additionalProperties: false
                              },
                              category_info: {
                                type: 'object',
                                properties: {
                                  name: {
                                    type: 'string'
                                  },
                                  icon: {
                                    type: 'string'
                                  },
                                  color: {
                                    type: 'string'
                                  }
                                },
                                required: ['name', 'icon', 'color'],
                                additionalProperties: false
                              },
                              platform_info: {
                                anyOf: [
                                  {
                                    type: 'object',
                                    properties: {
                                      name: {
                                        type: 'string'
                                      },
                                      icon: {
                                        type: 'string'
                                      },
                                      color: {
                                        type: 'string'
                                      }
                                    },
                                    required: ['name', 'icon', 'color'],
                                    additionalProperties: false
                                  },
                                  {
                                    type: 'null'
                                  }
                                ]
                              },
                              ledger_info: {
                                anyOf: [
                                  {
                                    type: 'object',
                                    properties: {
                                      name: {
                                        type: 'string'
                                      },
                                      icon: {
                                        type: 'string'
                                      },
                                      color: {
                                        type: 'string'
                                      }
                                    },
                                    required: ['name', 'icon', 'color'],
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
                              'type',
                              'amount',
                              'date',
                              'receipt',
                              'particulars',
                              'asset',
                              'category',
                              'platform',
                              'ledgers',
                              'location_name',
                              'location_coords',
                              'asset_info',
                              'category_info',
                              'platform_info',
                              'ledger_info'
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
                              type: {
                                type: 'string',
                                const: 'expenses'
                              },
                              amount: {
                                type: 'number',
                                minimum: -140737488355328,
                                maximum: 140737488355327
                              },
                              date: {
                                type: 'string',
                                format: 'date-time'
                              },
                              receipt: {
                                type: 'string'
                              },
                              particulars: {
                                type: 'string'
                              },
                              asset: {
                                type: 'string'
                              },
                              category: {
                                type: 'string'
                              },
                              platform: {
                                anyOf: [
                                  {
                                    type: 'string'
                                  },
                                  {
                                    type: 'null'
                                  }
                                ]
                              },
                              ledgers: {
                                type: 'array',
                                items: {
                                  type: 'string'
                                }
                              },
                              location_name: {
                                type: 'string'
                              },
                              location_coords: {
                                anyOf: [
                                  {
                                    type: 'object',
                                    properties: {
                                      lon: {
                                        type: 'number'
                                      },
                                      lat: {
                                        type: 'number'
                                      }
                                    },
                                    required: ['lon', 'lat'],
                                    additionalProperties: false
                                  },
                                  {
                                    type: 'null'
                                  }
                                ]
                              },
                              asset_info: {
                                type: 'object',
                                properties: {
                                  name: {
                                    type: 'string'
                                  },
                                  icon: {
                                    type: 'string'
                                  }
                                },
                                required: ['name', 'icon'],
                                additionalProperties: false
                              },
                              category_info: {
                                type: 'object',
                                properties: {
                                  name: {
                                    type: 'string'
                                  },
                                  icon: {
                                    type: 'string'
                                  },
                                  color: {
                                    type: 'string'
                                  }
                                },
                                required: ['name', 'icon', 'color'],
                                additionalProperties: false
                              },
                              platform_info: {
                                anyOf: [
                                  {
                                    type: 'object',
                                    properties: {
                                      name: {
                                        type: 'string'
                                      },
                                      icon: {
                                        type: 'string'
                                      },
                                      color: {
                                        type: 'string'
                                      }
                                    },
                                    required: ['name', 'icon', 'color'],
                                    additionalProperties: false
                                  },
                                  {
                                    type: 'null'
                                  }
                                ]
                              },
                              ledger_info: {
                                anyOf: [
                                  {
                                    type: 'object',
                                    properties: {
                                      name: {
                                        type: 'string'
                                      },
                                      icon: {
                                        type: 'string'
                                      },
                                      color: {
                                        type: 'string'
                                      }
                                    },
                                    required: ['name', 'icon', 'color'],
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
                              'type',
                              'amount',
                              'date',
                              'receipt',
                              'particulars',
                              'asset',
                              'category',
                              'platform',
                              'ledgers',
                              'location_name',
                              'location_coords',
                              'asset_info',
                              'category_info',
                              'platform_info',
                              'ledger_info'
                            ],
                            additionalProperties: false
                          }
                        ]
                      }
                    },
                    total: {
                      type: 'number'
                    },
                    count: {
                      type: 'number'
                    }
                  },
                  required: ['items', 'total', 'count'],
                  additionalProperties: false
                },
                totalCount: {
                  type: 'number'
                }
              },
              required: ['income', 'expenses', 'transfer', 'totalCount'],
              additionalProperties: false
            },
            platformBreakdown: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  platform: {
                    anyOf: [
                      {
                        type: 'string'
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  amount: {
                    type: 'number'
                  },
                  count: {
                    type: 'number'
                  },
                  percentage: {
                    type: 'number'
                  }
                },
                required: ['platform', 'amount', 'count', 'percentage'],
                additionalProperties: false
              }
            }
          },
          required: [
            'overview',
            'assets',
            'categoryComparison',
            'transactions',
            'platformBreakdown'
          ],
          additionalProperties: false
        }
      }
    }
  },
  analytics: {
    getAvailableYearMonths: {
      method: 'get',
      description: 'Get available years and months from transaction dates',
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
            years: {
              type: 'array',
              items: {
                type: 'number'
              }
            },
            monthsByYear: {
              type: 'object',
              additionalProperties: {
                type: 'array',
                items: {
                  type: 'number'
                }
              }
            }
          },
          required: ['years', 'monthsByYear'],
          additionalProperties: false
        }
      }
    },
    getCategoriesBreakdown: {
      method: 'get',
      description: 'Get income and expenses breakdown by category for a month',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        query: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            year: {
              type: 'string'
            },
            month: {
              type: 'string'
            },
            range: {
              type: 'string',
              enum: [
                'week',
                'month',
                'mtd',
                'quarter',
                'year',
                'ytd',
                'all',
                'custom'
              ]
            },
            startDate: {
              type: 'string'
            },
            endDate: {
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
            income: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                properties: {
                  amount: {
                    type: 'number'
                  },
                  count: {
                    type: 'number'
                  },
                  percentage: {
                    type: 'number'
                  }
                },
                required: ['amount', 'count', 'percentage'],
                additionalProperties: false
              }
            },
            expenses: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                properties: {
                  amount: {
                    type: 'number'
                  },
                  count: {
                    type: 'number'
                  },
                  percentage: {
                    type: 'number'
                  }
                },
                required: ['amount', 'count', 'percentage'],
                additionalProperties: false
              }
            }
          },
          required: ['income', 'expenses'],
          additionalProperties: false
        }
      }
    },
    getChartData: {
      method: 'get',
      description: 'Get chart data for income/expenses by date range',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        query: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            range: {
              type: 'string',
              enum: [
                'week',
                'month',
                'mtd',
                'quarter',
                'year',
                'ytd',
                'all',
                'custom'
              ]
            },
            startDate: {
              type: 'string'
            },
            endDate: {
              type: 'string'
            }
          },
          required: ['range'],
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
              date: {
                type: 'string'
              },
              income: {
                type: 'number'
              },
              expenses: {
                type: 'number'
              }
            },
            required: ['date', 'income', 'expenses'],
            additionalProperties: false
          }
        }
      }
    },
    getDailyBreakdown: {
      method: 'get',
      description: 'Get daily income and expenses for a date range',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        query: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            range: {
              type: 'string',
              enum: [
                'week',
                'month',
                'mtd',
                'quarter',
                'year',
                'ytd',
                'all',
                'custom'
              ]
            },
            startDate: {
              type: 'string'
            },
            endDate: {
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
              date: {
                type: 'string'
              },
              income: {
                type: 'number'
              },
              expenses: {
                type: 'number'
              }
            },
            required: ['date', 'income', 'expenses'],
            additionalProperties: false
          }
        }
      }
    },
    getEntityBreakdown: {
      method: 'get',
      description:
        'Get accumulated income and expenses per category, platform and ledger for a range',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        query: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            range: {
              type: 'string',
              enum: [
                'week',
                'month',
                'mtd',
                'quarter',
                'year',
                'ytd',
                'all',
                'custom'
              ]
            },
            startDate: {
              type: 'string'
            },
            endDate: {
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
            categories: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                properties: {
                  income: {
                    type: 'number'
                  },
                  expenses: {
                    type: 'number'
                  },
                  count: {
                    type: 'number'
                  }
                },
                required: ['income', 'expenses', 'count'],
                additionalProperties: false
              }
            },
            platforms: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                properties: {
                  income: {
                    type: 'number'
                  },
                  expenses: {
                    type: 'number'
                  },
                  count: {
                    type: 'number'
                  }
                },
                required: ['income', 'expenses', 'count'],
                additionalProperties: false
              }
            },
            ledgers: {
              type: 'object',
              additionalProperties: {
                type: 'object',
                properties: {
                  income: {
                    type: 'number'
                  },
                  expenses: {
                    type: 'number'
                  },
                  count: {
                    type: 'number'
                  }
                },
                required: ['income', 'expenses', 'count'],
                additionalProperties: false
              }
            }
          },
          required: ['categories', 'platforms', 'ledgers'],
          additionalProperties: false
        }
      }
    },
    getIncomeExpensesSummary: {
      method: 'get',
      description: 'Get income and expenses summary for a month',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        query: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            year: {
              type: 'string'
            },
            month: {
              type: 'string'
            }
          },
          required: ['year', 'month'],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            totalIncome: {
              type: 'number'
            },
            totalExpenses: {
              type: 'number'
            },
            monthlyIncome: {
              type: 'number'
            },
            monthlyExpenses: {
              type: 'number'
            }
          },
          required: [
            'totalIncome',
            'totalExpenses',
            'monthlyIncome',
            'monthlyExpenses'
          ],
          additionalProperties: false
        }
      }
    },
    getSpendingByLocation: {
      method: 'get',
      description: 'Get spending aggregated by location for heatmap',
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
              lat: {
                type: 'number'
              },
              lng: {
                type: 'number'
              },
              locationName: {
                type: 'string'
              },
              amount: {
                type: 'number'
              },
              count: {
                type: 'number'
              }
            },
            required: ['lat', 'lng', 'locationName', 'amount', 'count'],
            additionalProperties: false
          }
        }
      }
    },
    getSpendingByPlatform: {
      method: 'get',
      description: 'Get expenses breakdown by purchase platform for a month',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        query: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            year: {
              type: 'string'
            },
            month: {
              type: 'string'
            },
            range: {
              type: 'string',
              enum: [
                'week',
                'month',
                'mtd',
                'quarter',
                'year',
                'ytd',
                'all',
                'custom'
              ]
            },
            startDate: {
              type: 'string'
            },
            endDate: {
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
              platform: {
                type: 'string'
              },
              amount: {
                type: 'number'
              },
              count: {
                type: 'number'
              },
              percentage: {
                type: 'number'
              }
            },
            required: ['platform', 'amount', 'count', 'percentage'],
            additionalProperties: false
          }
        }
      }
    },
    getTransactionCountByDay: {
      method: 'get',
      description: 'Get transaction counts by day for a specific month',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        query: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            year: {
              type: 'string'
            },
            month: {
              type: 'string'
            },
            viewFilter: {
              type: 'string'
            }
          },
          required: ['year', 'month'],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          additionalProperties: {
            type: 'object',
            properties: {
              income: {
                type: 'number'
              },
              expenses: {
                type: 'number'
              },
              transfer: {
                type: 'number'
              },
              incomeAmount: {
                type: 'number'
              },
              expensesAmount: {
                type: 'number'
              },
              transferAmount: {
                type: 'number'
              },
              total: {
                type: 'number'
              },
              count: {
                type: 'number'
              }
            },
            required: [
              'income',
              'expenses',
              'transfer',
              'incomeAmount',
              'expensesAmount',
              'transferAmount',
              'total',
              'count'
            ],
            additionalProperties: false
          }
        }
      }
    },
    getTypesCount: {
      method: 'get',
      description: 'Get transaction counts and totals by type',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        query: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            year: {
              type: 'string'
            },
            month: {
              type: 'string'
            },
            range: {
              type: 'string',
              enum: [
                'week',
                'month',
                'mtd',
                'quarter',
                'year',
                'ytd',
                'all',
                'custom'
              ]
            },
            startDate: {
              type: 'string'
            },
            endDate: {
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
          additionalProperties: {
            type: 'object',
            properties: {
              transactionCount: {
                type: 'number'
              },
              accumulatedAmount: {
                type: 'number'
              },
              previousCount: {
                type: 'number'
              },
              previousAmount: {
                type: 'number'
              },
              percentageChange: {
                type: 'number'
              }
            },
            required: [
              'transactionCount',
              'accumulatedAmount',
              'previousCount',
              'previousAmount',
              'percentageChange'
            ],
            additionalProperties: false
          }
        }
      }
    }
  }
} as const

export default contract
