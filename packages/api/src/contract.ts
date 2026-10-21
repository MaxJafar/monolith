export const contract = {
  '': {
    method: 'get',
    description: 'Identify the workspace API',
    noAuth: true,
    encrypted: false,
    isDownloadable: false,
    media: null,
    input: {},
    output: {
      OK: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'string',
        const: 'Welcome to Monolith'
      }
    }
  },
  status: {
    method: 'get',
    description: 'Check database and addon readiness',
    noAuth: true,
    encrypted: false,
    isDownloadable: false,
    media: null,
    input: {},
    output: {
      OK: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          environment: {
            type: 'string'
          },
          version: {
            type: 'string'
          },
          healthy: {
            type: 'boolean'
          }
        },
        required: ['environment', 'version', 'healthy'],
        additionalProperties: false
      }
    }
  },
  ping: {
    method: 'post',
    description: 'Echo a timestamp for connectivity diagnostics',
    noAuth: true,
    encrypted: false,
    isDownloadable: false,
    media: null,
    input: {
      body: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          timestamp: {
            type: 'number',
            minimum: 0
          }
        },
        required: ['timestamp'],
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
  encryptionPublicKey: {
    method: 'get',
    description: 'Read the request encryption public key',
    noAuth: true,
    encrypted: false,
    isDownloadable: false,
    media: null,
    input: {},
    output: {
      OK: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'string'
      }
    }
  },
  locales: {
    listLanguages: {
      method: 'get',
      description: 'Read the installed language choices',
      noAuth: true,
      encrypted: false,
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
                type: 'string'
              },
              alternative: {
                type: 'array',
                items: {
                  type: 'string'
                }
              },
              icon: {
                type: 'string'
              },
              displayName: {
                type: 'string'
              }
            },
            required: ['name', 'icon', 'displayName'],
            additionalProperties: false
          }
        }
      }
    },
    getLocale: {
      method: 'get',
      description: 'Read a translated namespace',
      noAuth: true,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        query: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            lang: {
              type: 'string'
            },
            namespace: {
              type: 'string',
              enum: ['apps', 'common']
            },
            subnamespace: {
              type: 'string',
              pattern:
                '^$|^@[a-zA-Z0-9_.-]+\\/[a-zA-Z0-9_.-]+$|^[a-zA-Z0-9_.-]+$'
            }
          },
          required: ['lang', 'namespace', 'subnamespace'],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          additionalProperties: {}
        }
      }
    },
    listUnsupportedModules: {
      method: 'get',
      description: 'Read add-ons without the current account language',
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
            type: 'string'
          }
        }
      }
    }
  },
  user: {
    exists: {
      method: 'get',
      description: 'Check if user exists',
      noAuth: true,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {},
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'boolean'
        }
      }
    },
    auth: {
      createFirstUser: {
        method: 'post',
        description: 'Initialize an empty installation with its first account',
        noAuth: true,
        encrypted: true,
        isDownloadable: false,
        media: null,
        input: {
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
              username: {
                type: 'string',
                minLength: 3
              },
              name: {
                type: 'string',
                minLength: 1
              },
              password: {
                type: 'string',
                minLength: 8
              }
            },
            required: ['email', 'username', 'name', 'password'],
            additionalProperties: false
          }
        },
        output: {
          CREATED: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              state: {
                type: 'string',
                const: 'success'
              }
            },
            required: ['state'],
            additionalProperties: false
          }
        }
      }
    },
    me: {
      method: 'get',
      description: 'Read the current account profile and preferences',
      noAuth: false,
      encrypted: false,
      isDownloadable: false,
      media: null,
      input: {},
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            userData: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                email: {
                  type: 'string',
                  maxLength: 255
                },
                emailVisibility: {
                  type: 'boolean'
                },
                verified: {
                  type: 'boolean'
                },
                username: {
                  type: 'string',
                  maxLength: 150
                },
                name: {
                  anyOf: [
                    {
                      type: 'string',
                      maxLength: 255
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                dateOfBirth: {
                  anyOf: [
                    {
                      type: 'string',
                      maxLength: 50
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                theme: {
                  type: 'string',
                  maxLength: 50
                },
                color: {
                  anyOf: [
                    {
                      type: 'string',
                      maxLength: 50
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                bgTemp: {
                  anyOf: [
                    {
                      type: 'string',
                      maxLength: 255
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                fontFamily: {
                  anyOf: [
                    {
                      type: 'string',
                      maxLength: 255
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                fontScale: {
                  type: 'number',
                  minimum: -8388608,
                  maximum: 8388607
                },
                borderRadiusMultiplier: {
                  type: 'number',
                  minimum: -8388608,
                  maximum: 8388607
                },
                bordered: {
                  type: 'boolean'
                },
                language: {
                  type: 'string',
                  maxLength: 50
                },
                dashboardLayout: {
                  anyOf: [
                    {
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
                    {
                      type: 'null'
                    }
                  ]
                },
                backdropFilters: {
                  anyOf: [
                    {
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
                    {
                      type: 'null'
                    }
                  ]
                },
                avatar: {
                  anyOf: [
                    {
                      type: 'object',
                      properties: {
                        originalName: {
                          type: 'string'
                        },
                        mimeType: {
                          type: 'string'
                        },
                        key: {
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
                              key: {
                                type: 'string'
                              },
                              size: {
                                type: 'string'
                              },
                              width: {
                                type: 'number'
                              },
                              height: {
                                type: 'number'
                              }
                            },
                            required: ['key', 'size', 'width', 'height'],
                            additionalProperties: false
                          }
                        }
                      },
                      required: [
                        'originalName',
                        'mimeType',
                        'key',
                        'size',
                        'thumbs'
                      ],
                      additionalProperties: false
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                bgImage: {
                  anyOf: [
                    {
                      type: 'object',
                      properties: {
                        originalName: {
                          type: 'string'
                        },
                        mimeType: {
                          type: 'string'
                        },
                        key: {
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
                              key: {
                                type: 'string'
                              },
                              size: {
                                type: 'string'
                              },
                              width: {
                                type: 'number'
                              },
                              height: {
                                type: 'number'
                              }
                            },
                            required: ['key', 'size', 'width', 'height'],
                            additionalProperties: false
                          }
                        }
                      },
                      required: [
                        'originalName',
                        'mimeType',
                        'key',
                        'size',
                        'thumbs'
                      ],
                      additionalProperties: false
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                twoFAEnabled: {
                  type: 'boolean'
                },
                hasAPIKeysMasterPassword: {
                  type: 'boolean'
                }
              },
              required: [
                'id',
                'email',
                'emailVisibility',
                'verified',
                'username',
                'name',
                'dateOfBirth',
                'theme',
                'color',
                'bgTemp',
                'fontFamily',
                'fontScale',
                'borderRadiusMultiplier',
                'bordered',
                'language',
                'dashboardLayout',
                'backdropFilters',
                'avatar',
                'bgImage',
                'twoFAEnabled',
                'hasAPIKeysMasterPassword'
              ],
              additionalProperties: false
            }
          },
          required: ['userData'],
          additionalProperties: false
        }
      }
    },
    settings: {
      deleteAvatar: {
        method: 'post',
        description: 'Clear the current account image',
        noAuth: false,
        encrypted: true,
        isDownloadable: false,
        media: null,
        input: {},
        output: {
          NO_CONTENT: true
        }
      },
      updateAvatar: {
        method: 'post',
        description: 'Replace the current account image',
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
              originalName: {
                type: 'string'
              },
              mimeType: {
                type: 'string'
              },
              key: {
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
                    key: {
                      type: 'string'
                    },
                    size: {
                      type: 'string'
                    },
                    width: {
                      type: 'number'
                    },
                    height: {
                      type: 'number'
                    }
                  },
                  required: ['key', 'size', 'width', 'height'],
                  additionalProperties: false
                }
              }
            },
            required: ['originalName', 'mimeType', 'key', 'size', 'thumbs'],
            additionalProperties: false
          }
        }
      },
      updatePassword: {
        method: 'post',
        description: 'Change a password after verifying the current password',
        noAuth: false,
        encrypted: true,
        isDownloadable: false,
        media: null,
        input: {
          body: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              oldPassword: {
                type: 'string',
                minLength: 1
              },
              password: {
                type: 'string',
                minLength: 8
              },
              passwordConfirm: {
                type: 'string',
                minLength: 8
              }
            },
            required: ['oldPassword', 'password', 'passwordConfirm'],
            additionalProperties: false
          }
        },
        output: {
          NO_CONTENT: true
        }
      },
      updateProfile: {
        method: 'post',
        description: 'Save selected account profile fields',
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
                  username: {
                    type: 'string',
                    pattern: '^[a-zA-Z0-9]+$'
                  },
                  email: {
                    type: 'string',
                    format: 'email',
                    pattern:
                      "^(?!\\.)(?!.*\\.\\.)([A-Za-z0-9_'+\\-\\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\\-]*\\.)+[A-Za-z]{2,}$"
                  },
                  name: {
                    type: 'string'
                  },
                  dateOfBirth: {
                    type: 'string'
                  }
                },
                additionalProperties: false
              }
            },
            required: ['data'],
            additionalProperties: false
          }
        },
        output: {
          NO_CONTENT: true
        }
      }
    },
    personalization: {
      deleteBgImage: {
        method: 'post',
        description: 'Clear the current account background',
        noAuth: false,
        encrypted: true,
        isDownloadable: false,
        media: null,
        input: {},
        output: {
          NO_CONTENT: true
        }
      },
      getAppearance: {
        method: 'get',
        description: 'Read the authenticated account appearance',
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
              revision: {
                type: 'integer',
                minimum: 0,
                maximum: 9007199254740991
              },
              appearance: {
                type: 'object',
                properties: {
                  background: {
                    type: 'string',
                    pattern: '^#[0-9a-f]{6}$'
                  },
                  accent: {
                    type: 'string',
                    pattern: '^#[0-9a-f]{6}$'
                  },
                  button: {
                    type: 'string',
                    pattern: '^#[0-9a-f]{6}$'
                  },
                  icons: {
                    type: 'string',
                    pattern: '^#[0-9a-f]{6}$'
                  },
                  iconSet: {
                    type: 'string',
                    enum: [
                      'lucide',
                      'tabler',
                      'ph',
                      'ph-fill',
                      'ri-line',
                      'ri-fill',
                      'mdi'
                    ]
                  },
                  icon: {
                    type: 'string',
                    maxLength: 80,
                    pattern: '^[a-z0-9][a-z0-9-]{0,31}:[a-z0-9-]{1,60}$'
                  },
                  font: {
                    type: 'object',
                    properties: {
                      provider: {
                        type: 'string',
                        enum: ['system', 'google', 'bunny', 'fontsource']
                      },
                      family: {
                        type: 'string',
                        enum: [
                          'Inter',
                          'Lato',
                          'Nunito Sans',
                          'Open Sans',
                          'Roboto',
                          'Source Sans 3',
                          'Lora',
                          'JetBrains Mono',
                          'system-ui',
                          'serif',
                          'monospace'
                        ]
                      }
                    },
                    required: ['provider', 'family'],
                    additionalProperties: false
                  },
                  cover: {
                    anyOf: [
                      {
                        oneOf: [
                          {
                            type: 'object',
                            properties: {
                              type: {
                                type: 'string',
                                const: 'color'
                              },
                              value: {
                                type: 'string',
                                pattern: '^#[0-9a-f]{6}$'
                              }
                            },
                            required: ['type', 'value'],
                            additionalProperties: false
                          },
                          {
                            type: 'object',
                            properties: {
                              type: {
                                type: 'string',
                                const: 'image'
                              },
                              value: {
                                type: 'string',
                                maxLength: 2048
                              },
                              fileKey: {
                                type: 'string',
                                maxLength: 2048,
                                pattern: '^[a-zA-Z0-9][a-zA-Z0-9/_\\-.]+$'
                              },
                              position: {
                                default: 50,
                                type: 'number',
                                minimum: 0,
                                maximum: 100
                              }
                            },
                            required: ['type', 'value', 'position'],
                            additionalProperties: false
                          }
                        ]
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  radius: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 24
                  },
                  contentWidth: {
                    type: 'string',
                    enum: ['standard', 'full']
                  }
                },
                additionalProperties: false
              }
            },
            required: ['revision', 'appearance'],
            additionalProperties: false
          }
        }
      },
      saveAppearance: {
        method: 'post',
        description: 'Save global appearance with revision protection',
        noAuth: false,
        encrypted: true,
        isDownloadable: false,
        media: null,
        input: {
          body: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              appearance: {
                type: 'object',
                properties: {
                  background: {
                    type: 'string',
                    pattern: '^#[0-9a-f]{6}$'
                  },
                  accent: {
                    type: 'string',
                    pattern: '^#[0-9a-f]{6}$'
                  },
                  button: {
                    type: 'string',
                    pattern: '^#[0-9a-f]{6}$'
                  },
                  icons: {
                    type: 'string',
                    pattern: '^#[0-9a-f]{6}$'
                  },
                  iconSet: {
                    type: 'string',
                    enum: [
                      'lucide',
                      'tabler',
                      'ph',
                      'ph-fill',
                      'ri-line',
                      'ri-fill',
                      'mdi'
                    ]
                  },
                  icon: {
                    type: 'string',
                    maxLength: 80,
                    pattern: '^[a-z0-9][a-z0-9-]{0,31}:[a-z0-9-]{1,60}$'
                  },
                  font: {
                    type: 'object',
                    properties: {
                      provider: {
                        type: 'string',
                        enum: ['system', 'google', 'bunny', 'fontsource']
                      },
                      family: {
                        type: 'string',
                        enum: [
                          'Inter',
                          'Lato',
                          'Nunito Sans',
                          'Open Sans',
                          'Roboto',
                          'Source Sans 3',
                          'Lora',
                          'JetBrains Mono',
                          'system-ui',
                          'serif',
                          'monospace'
                        ]
                      }
                    },
                    required: ['provider', 'family'],
                    additionalProperties: false
                  },
                  cover: {
                    anyOf: [
                      {
                        oneOf: [
                          {
                            type: 'object',
                            properties: {
                              type: {
                                type: 'string',
                                const: 'color'
                              },
                              value: {
                                type: 'string',
                                pattern: '^#[0-9a-f]{6}$'
                              }
                            },
                            required: ['type', 'value'],
                            additionalProperties: false
                          },
                          {
                            type: 'object',
                            properties: {
                              type: {
                                type: 'string',
                                const: 'image'
                              },
                              value: {
                                type: 'string',
                                maxLength: 2048
                              },
                              fileKey: {
                                type: 'string',
                                maxLength: 2048,
                                pattern: '^[a-zA-Z0-9][a-zA-Z0-9/_\\-.]+$'
                              },
                              position: {
                                default: 50,
                                type: 'number',
                                minimum: 0,
                                maximum: 100
                              }
                            },
                            required: ['type', 'value', 'position'],
                            additionalProperties: false
                          }
                        ]
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  radius: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 24
                  },
                  contentWidth: {
                    type: 'string',
                    enum: ['standard', 'full']
                  }
                },
                additionalProperties: false
              },
              expected_revision: {
                type: 'integer',
                minimum: 0,
                maximum: 9007199254740991
              }
            },
            required: ['appearance', 'expected_revision'],
            additionalProperties: false
          }
        },
        output: {
          OK: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              revision: {
                type: 'integer',
                minimum: 0,
                maximum: 9007199254740991
              },
              appearance: {
                type: 'object',
                properties: {
                  background: {
                    type: 'string',
                    pattern: '^#[0-9a-f]{6}$'
                  },
                  accent: {
                    type: 'string',
                    pattern: '^#[0-9a-f]{6}$'
                  },
                  button: {
                    type: 'string',
                    pattern: '^#[0-9a-f]{6}$'
                  },
                  icons: {
                    type: 'string',
                    pattern: '^#[0-9a-f]{6}$'
                  },
                  iconSet: {
                    type: 'string',
                    enum: [
                      'lucide',
                      'tabler',
                      'ph',
                      'ph-fill',
                      'ri-line',
                      'ri-fill',
                      'mdi'
                    ]
                  },
                  icon: {
                    type: 'string',
                    maxLength: 80,
                    pattern: '^[a-z0-9][a-z0-9-]{0,31}:[a-z0-9-]{1,60}$'
                  },
                  font: {
                    type: 'object',
                    properties: {
                      provider: {
                        type: 'string',
                        enum: ['system', 'google', 'bunny', 'fontsource']
                      },
                      family: {
                        type: 'string',
                        enum: [
                          'Inter',
                          'Lato',
                          'Nunito Sans',
                          'Open Sans',
                          'Roboto',
                          'Source Sans 3',
                          'Lora',
                          'JetBrains Mono',
                          'system-ui',
                          'serif',
                          'monospace'
                        ]
                      }
                    },
                    required: ['provider', 'family'],
                    additionalProperties: false
                  },
                  cover: {
                    anyOf: [
                      {
                        oneOf: [
                          {
                            type: 'object',
                            properties: {
                              type: {
                                type: 'string',
                                const: 'color'
                              },
                              value: {
                                type: 'string',
                                pattern: '^#[0-9a-f]{6}$'
                              }
                            },
                            required: ['type', 'value'],
                            additionalProperties: false
                          },
                          {
                            type: 'object',
                            properties: {
                              type: {
                                type: 'string',
                                const: 'image'
                              },
                              value: {
                                type: 'string',
                                maxLength: 2048
                              },
                              fileKey: {
                                type: 'string',
                                maxLength: 2048,
                                pattern: '^[a-zA-Z0-9][a-zA-Z0-9/_\\-.]+$'
                              },
                              position: {
                                default: 50,
                                type: 'number',
                                minimum: 0,
                                maximum: 100
                              }
                            },
                            required: ['type', 'value', 'position'],
                            additionalProperties: false
                          }
                        ]
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  radius: {
                    type: 'integer',
                    minimum: 0,
                    maximum: 24
                  },
                  contentWidth: {
                    type: 'string',
                    enum: ['standard', 'full']
                  }
                },
                additionalProperties: false
              }
            },
            required: ['revision', 'appearance'],
            additionalProperties: false
          }
        }
      },
      updateBgImage: {
        method: 'post',
        description: 'Replace the current account background',
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
              originalName: {
                type: 'string'
              },
              mimeType: {
                type: 'string'
              },
              key: {
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
                    key: {
                      type: 'string'
                    },
                    size: {
                      type: 'string'
                    },
                    width: {
                      type: 'number'
                    },
                    height: {
                      type: 'number'
                    }
                  },
                  required: ['key', 'size', 'width', 'height'],
                  additionalProperties: false
                }
              }
            },
            required: ['originalName', 'mimeType', 'key', 'size', 'thumbs'],
            additionalProperties: false
          }
        }
      },
      updatePersonalization: {
        method: 'post',
        description: 'Save account display preferences',
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
                  fontFamily: {
                    type: 'string'
                  },
                  theme: {
                    type: 'string'
                  },
                  color: {
                    type: 'string'
                  },
                  bgTemp: {
                    type: 'string'
                  },
                  language: {
                    type: 'string'
                  },
                  fontScale: {
                    type: 'number'
                  },
                  borderRadiusMultiplier: {
                    type: 'number'
                  },
                  bordered: {
                    type: 'boolean'
                  },
                  dashboardLayout: {
                    type: 'object',
                    additionalProperties: {}
                  },
                  backdropFilters: {
                    type: 'object',
                    additionalProperties: {}
                  }
                },
                additionalProperties: false
              }
            },
            required: ['data'],
            additionalProperties: false
          }
        },
        output: {
          NO_CONTENT: true
        }
      },
      uploadCover: {
        method: 'post',
        description: 'Upload a page or workspace cover image',
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
              originalName: {
                type: 'string'
              },
              mimeType: {
                type: 'string'
              },
              key: {
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
                    key: {
                      type: 'string'
                    },
                    size: {
                      type: 'string'
                    },
                    width: {
                      type: 'number'
                    },
                    height: {
                      type: 'number'
                    }
                  },
                  required: ['key', 'size', 'width', 'height'],
                  additionalProperties: false
                }
              }
            },
            required: ['originalName', 'mimeType', 'key', 'size', 'thumbs'],
            additionalProperties: false
          }
        }
      }
    },
    pages: {
      get: {
        method: 'get',
        description: 'Get an owned block page',
        noAuth: false,
        encrypted: true,
        isDownloadable: false,
        media: null,
        input: {
          query: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              key: {
                type: 'string'
              }
            },
            required: ['key'],
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
      list: {
        method: 'get',
        description: 'List owned workspace pages',
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
                key: {
                  type: 'string'
                },
                title: {
                  type: 'string'
                },
                icon: {
                  type: 'string'
                },
                revision: {
                  type: 'number'
                }
              },
              required: ['key', 'title', 'icon', 'revision'],
              additionalProperties: false
            }
          }
        }
      },
      save: {
        method: 'post',
        description:
          'Save an owned block page with optimistic revision protection',
        noAuth: false,
        encrypted: true,
        isDownloadable: false,
        media: null,
        input: {
          body: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              key: {
                type: 'string'
              },
              page: {},
              expected_revision: {
                type: 'integer',
                minimum: 0,
                maximum: 9007199254740991
              }
            },
            required: ['key', 'page', 'expected_revision'],
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
      }
    }
  },
  auth: {
    '2fa': {
      disable: {
        method: 'post',
        description: 'Remove the current account authenticator',
        noAuth: false,
        encrypted: false,
        isDownloadable: false,
        media: null,
        input: {},
        output: {
          NO_CONTENT: true
        }
      },
      enable: {
        method: 'post',
        description: 'Confirm an authenticator setup',
        noAuth: false,
        encrypted: false,
        isDownloadable: false,
        media: null,
        input: {
          body: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              otp: {
                type: 'string'
              },
              tid: {
                type: 'string'
              }
            },
            required: ['otp', 'tid'],
            additionalProperties: false
          }
        },
        output: {
          NO_CONTENT: true
        }
      },
      generate: {
        method: 'post',
        description: 'Prepare an authenticator for the signed-in account',
        noAuth: false,
        encrypted: false,
        isDownloadable: false,
        media: null,
        input: {},
        output: {
          OK: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              tid: {
                type: 'string'
              },
              link: {
                type: 'string'
              }
            },
            required: ['tid', 'link'],
            additionalProperties: false
          }
        }
      },
      verify: {
        method: 'post',
        description: 'Finish a pending sign-in with an authenticator code',
        noAuth: true,
        encrypted: false,
        isDownloadable: false,
        media: null,
        input: {
          body: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              otp: {
                type: 'string'
              },
              tid: {
                type: 'string'
              }
            },
            required: ['otp', 'tid'],
            additionalProperties: false
          }
        },
        output: {
          OK: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              accessToken: {
                type: 'string'
              }
            },
            required: ['accessToken'],
            additionalProperties: false
          }
        }
      }
    },
    login: {
      method: 'post',
      description: 'Sign in with an existing account',
      noAuth: true,
      encrypted: false,
      isDownloadable: false,
      media: null,
      input: {
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
            password: {
              type: 'string',
              minLength: 1
            }
          },
          required: ['email', 'password'],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          anyOf: [
            {
              type: 'object',
              properties: {
                accessToken: {
                  type: 'string'
                }
              },
              required: ['accessToken'],
              additionalProperties: false
            },
            {
              type: 'object',
              properties: {
                state: {
                  type: 'string',
                  const: '2fa_required'
                },
                tid: {
                  type: 'string'
                }
              },
              required: ['state', 'tid'],
              additionalProperties: false
            }
          ]
        }
      }
    },
    logout: {
      method: 'post',
      description: 'End the browser session and revoke its refresh family',
      noAuth: true,
      encrypted: false,
      isDownloadable: false,
      media: null,
      input: {},
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'boolean'
        }
      }
    },
    oauth: {
      authorize: {
        method: 'get',
        description: 'Create a provider sign-in challenge',
        noAuth: true,
        encrypted: false,
        isDownloadable: false,
        media: null,
        input: {
          query: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              provider: {
                type: 'string',
                minLength: 1,
                maxLength: 64
              }
            },
            required: ['provider'],
            additionalProperties: false
          }
        },
        output: {
          OK: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              url: {
                type: 'string'
              },
              state: {
                type: 'string'
              }
            },
            required: ['url', 'state'],
            additionalProperties: false
          }
        }
      },
      verify: {
        method: 'post',
        description: 'Complete a single-use provider sign-in challenge',
        noAuth: true,
        encrypted: false,
        isDownloadable: false,
        media: null,
        input: {
          body: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              provider: {
                type: 'string',
                minLength: 1,
                maxLength: 64
              },
              code: {
                type: 'string',
                minLength: 1,
                maxLength: 4096
              },
              state: {
                type: 'string',
                minLength: 1,
                maxLength: 512
              }
            },
            required: ['provider', 'code', 'state'],
            additionalProperties: false
          }
        },
        output: {
          OK: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            anyOf: [
              {
                type: 'object',
                properties: {
                  accessToken: {
                    type: 'string'
                  }
                },
                required: ['accessToken'],
                additionalProperties: false
              },
              {
                type: 'object',
                properties: {
                  state: {
                    type: 'string',
                    const: '2fa_required'
                  },
                  tid: {
                    type: 'string'
                  }
                },
                required: ['state', 'tid'],
                additionalProperties: false
              }
            ]
          }
        }
      },
      providers: {
        listEnabled: {
          method: 'get',
          description: 'Read configured sign-in choices',
          noAuth: true,
          encrypted: false,
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
                  provider: {
                    type: 'string'
                  },
                  icon: {
                    type: 'string'
                  },
                  name: {
                    type: 'string'
                  }
                },
                required: ['provider', 'icon', 'name'],
                additionalProperties: false
              }
            }
          }
        },
        listOptions: {
          method: 'get',
          description: 'Read sign-in provider settings without credentials',
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
                  provider: {
                    type: 'string'
                  },
                  icon: {
                    type: 'string'
                  },
                  name: {
                    type: 'string'
                  },
                  id: {
                    anyOf: [
                      {
                        type: 'string'
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  configured: {
                    type: 'boolean'
                  },
                  enabled: {
                    type: 'boolean'
                  },
                  updated: {
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
                  'provider',
                  'icon',
                  'name',
                  'id',
                  'configured',
                  'enabled',
                  'updated'
                ],
                additionalProperties: false
              }
            }
          }
        },
        remove: {
          method: 'post',
          description: 'Forget a sign-in provider configuration',
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
                  minLength: 1
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
        toggle: {
          method: 'post',
          description: 'Enable or disable a configured sign-in provider',
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
                  minLength: 1
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
        upsert: {
          method: 'post',
          description: 'Save sign-in provider credentials',
          noAuth: false,
          encrypted: true,
          isDownloadable: false,
          media: null,
          input: {
            query: {
              $schema: 'https://json-schema.org/draft/2020-12/schema',
              type: 'object',
              properties: {
                provider: {
                  type: 'string'
                }
              },
              required: ['provider'],
              additionalProperties: false
            },
            body: {
              $schema: 'https://json-schema.org/draft/2020-12/schema',
              type: 'object',
              properties: {
                clientId: {
                  type: 'string',
                  maxLength: 255
                },
                clientSecret: {
                  type: 'string',
                  maxLength: 255
                }
              },
              required: ['clientId', 'clientSecret'],
              additionalProperties: false
            }
          },
          output: {
            NO_CONTENT: true
          }
        }
      }
    },
    qrLogin: {
      approve: {
        method: 'post',
        description: 'Confirm the account for a QR sign-in request',
        noAuth: false,
        encrypted: false,
        isDownloadable: false,
        media: null,
        input: {
          body: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
              }
            },
            required: ['sessionId'],
            additionalProperties: false
          }
        },
        output: {
          OK: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              browserInfo: {
                type: 'string'
              }
            },
            required: ['browserInfo'],
            additionalProperties: false
          }
        }
      },
      claim: {
        method: 'post',
        description: 'Consume an approved QR request on the receiving browser',
        noAuth: true,
        encrypted: false,
        isDownloadable: false,
        media: null,
        input: {
          body: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
              }
            },
            required: ['sessionId'],
            additionalProperties: false
          }
        },
        output: {
          OK: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              accessToken: {
                type: 'string'
              }
            },
            required: ['accessToken'],
            additionalProperties: false
          }
        }
      },
      register: {
        method: 'post',
        description: 'Create a short-lived QR sign-in request',
        noAuth: true,
        encrypted: false,
        isDownloadable: false,
        media: null,
        input: {
          body: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              browserInfo: {
                type: 'string'
              }
            },
            required: ['browserInfo'],
            additionalProperties: false
          }
        },
        output: {
          CREATED: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              sessionId: {
                type: 'string'
              },
              expiresAt: {
                type: 'string'
              }
            },
            required: ['sessionId', 'expiresAt'],
            additionalProperties: false
          }
        }
      },
      status: {
        method: 'get',
        description: 'Read the state of a QR sign-in request',
        noAuth: true,
        encrypted: false,
        isDownloadable: false,
        media: null,
        input: {
          query: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              sessionId: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
              }
            },
            required: ['sessionId'],
            additionalProperties: false
          }
        },
        output: {
          OK: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            anyOf: [
              {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    const: 'pending'
                  },
                  expiresAt: {
                    type: 'string'
                  }
                },
                required: ['status', 'expiresAt'],
                additionalProperties: false
              },
              {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    const: 'approved'
                  },
                  accessToken: {
                    type: 'string'
                  }
                },
                required: ['status', 'accessToken'],
                additionalProperties: false
              },
              {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    const: 'expired'
                  }
                },
                required: ['status'],
                additionalProperties: false
              },
              {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    const: 'not_found'
                  }
                },
                required: ['status'],
                additionalProperties: false
              }
            ]
          }
        }
      }
    },
    refresh: {
      method: 'post',
      description: 'Exchange a valid refresh credential for the next session',
      noAuth: true,
      encrypted: false,
      isDownloadable: false,
      media: null,
      input: {},
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            accessToken: {
              type: 'string'
            }
          },
          required: ['accessToken'],
          additionalProperties: false
        }
      }
    }
  },
  files: {
    get: {
      method: 'get',
      description: 'Stream a file owned by the signed-in account',
      noAuth: false,
      encrypted: false,
      isDownloadable: false,
      media: null,
      input: {
        query: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            key: {
              type: 'string',
              minLength: 1
            },
            thumb: {
              type: 'string'
            },
            download: {
              type: 'string'
            }
          },
          required: ['key'],
          additionalProperties: false
        }
      },
      output: 'custom'
    }
  },
  apiKeys: {
    entries: {
      get: {
        method: 'get',
        description: 'Read a key explicitly marked for client access',
        noAuth: false,
        encrypted: true,
        isDownloadable: false,
        media: null,
        input: {
          query: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              keyId: {
                type: 'string'
              }
            },
            required: ['keyId'],
            additionalProperties: false
          }
        },
        output: {
          OK: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            anyOf: [
              {
                type: 'string'
              },
              {
                type: 'null'
              }
            ]
          }
        }
      },
      list: {
        method: 'get',
        description: 'List credentials with masked values',
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
                created: {
                  type: 'string',
                  format: 'date-time'
                },
                updated: {
                  type: 'string',
                  format: 'date-time'
                },
                keyId: {
                  type: 'string',
                  maxLength: 255
                },
                key: {
                  type: 'string',
                  maxLength: 500
                },
                exposable: {
                  type: 'boolean'
                },
                name: {
                  type: 'string',
                  maxLength: 255
                },
                icon: {
                  type: 'string',
                  maxLength: 255
                }
              },
              required: [
                'id',
                'created',
                'updated',
                'keyId',
                'key',
                'exposable',
                'name',
                'icon'
              ],
              additionalProperties: false
            }
          }
        }
      },
      checkKeys: {
        method: 'get',
        description: 'Check availability of the requested credentials',
        noAuth: false,
        encrypted: true,
        isDownloadable: false,
        media: null,
        input: {
          query: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              keys: {
                type: 'string'
              }
            },
            required: ['keys'],
            additionalProperties: false
          }
        },
        output: {
          OK: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'boolean'
          }
        }
      },
      create: {
        method: 'post',
        description: 'Store an encrypted credential',
        noAuth: false,
        encrypted: true,
        isDownloadable: false,
        media: null,
        input: {
          body: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              keyId: {
                type: 'string'
              },
              name: {
                type: 'string'
              },
              icon: {
                type: 'string'
              },
              key: {
                type: 'string'
              },
              exposable: {
                type: 'boolean'
              }
            },
            required: ['keyId', 'name', 'icon', 'key', 'exposable'],
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
              created: {
                type: 'string',
                format: 'date-time'
              },
              updated: {
                type: 'string',
                format: 'date-time'
              },
              keyId: {
                type: 'string',
                maxLength: 255
              },
              key: {
                type: 'string',
                maxLength: 500
              },
              exposable: {
                type: 'boolean'
              },
              name: {
                type: 'string',
                maxLength: 255
              },
              icon: {
                type: 'string',
                maxLength: 255
              }
            },
            required: [
              'id',
              'created',
              'updated',
              'keyId',
              'key',
              'exposable',
              'name',
              'icon'
            ],
            additionalProperties: false
          }
        }
      },
      update: {
        method: 'post',
        description: 'Edit credential metadata or replace its secret',
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
              keyId: {
                type: 'string'
              },
              name: {
                type: 'string'
              },
              icon: {
                type: 'string'
              },
              key: {
                type: 'string'
              },
              exposable: {
                type: 'boolean'
              },
              overrideKey: {
                type: 'boolean'
              }
            },
            required: [
              'keyId',
              'name',
              'icon',
              'key',
              'exposable',
              'overrideKey'
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
              created: {
                type: 'string',
                format: 'date-time'
              },
              updated: {
                type: 'string',
                format: 'date-time'
              },
              keyId: {
                type: 'string',
                maxLength: 255
              },
              key: {
                type: 'string',
                maxLength: 500
              },
              exposable: {
                type: 'boolean'
              },
              name: {
                type: 'string',
                maxLength: 255
              },
              icon: {
                type: 'string',
                maxLength: 255
              }
            },
            required: [
              'id',
              'created',
              'updated',
              'keyId',
              'key',
              'exposable',
              'name',
              'icon'
            ],
            additionalProperties: false
          }
        }
      },
      remove: {
        method: 'post',
        description: 'Remove a stored credential',
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
      }
    }
  },
  fonts: {
    google: {
      get: {
        method: 'get',
        description: 'Look up a hosted font family',
        noAuth: false,
        encrypted: true,
        isDownloadable: false,
        media: null,
        input: {
          query: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              family: {
                type: 'string',
                minLength: 1,
                maxLength: 255
              }
            },
            required: ['family'],
            additionalProperties: false
          }
        },
        output: {
          OK: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              enabled: {
                type: 'boolean'
              },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    family: {
                      type: 'string'
                    },
                    category: {
                      type: 'string',
                      enum: [
                        'display',
                        'handwriting',
                        'monospace',
                        'sans-serif',
                        'serif'
                      ]
                    },
                    variants: {
                      type: 'array',
                      items: {
                        type: 'string'
                      }
                    },
                    subsets: {
                      type: 'array',
                      items: {
                        type: 'string'
                      }
                    },
                    files: {
                      type: 'object',
                      additionalProperties: {
                        type: 'string'
                      }
                    },
                    version: {
                      type: 'string'
                    },
                    lastModified: {
                      type: 'string'
                    },
                    kind: {
                      type: 'string',
                      const: 'webfonts#webfont'
                    },
                    menu: {
                      type: 'string'
                    },
                    colorCapabilities: {
                      type: 'array',
                      items: {
                        type: 'string',
                        enum: ['COLRv0', 'COLRv1', 'SVG']
                      }
                    }
                  },
                  required: [
                    'family',
                    'category',
                    'variants',
                    'subsets',
                    'files',
                    'version',
                    'lastModified',
                    'kind',
                    'menu'
                  ],
                  additionalProperties: false
                }
              }
            },
            required: ['enabled', 'items'],
            additionalProperties: false
          }
        }
      },
      list: {
        method: 'get',
        description: 'Browse the configured Google Fonts catalog',
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
              enabled: {
                type: 'boolean'
              },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    family: {
                      type: 'string'
                    },
                    category: {
                      type: 'string',
                      enum: [
                        'display',
                        'handwriting',
                        'monospace',
                        'sans-serif',
                        'serif'
                      ]
                    },
                    variants: {
                      type: 'array',
                      items: {
                        type: 'string'
                      }
                    },
                    subsets: {
                      type: 'array',
                      items: {
                        type: 'string'
                      }
                    },
                    files: {
                      type: 'object',
                      additionalProperties: {
                        type: 'string'
                      }
                    },
                    version: {
                      type: 'string'
                    },
                    lastModified: {
                      type: 'string'
                    },
                    kind: {
                      type: 'string',
                      const: 'webfonts#webfont'
                    },
                    menu: {
                      type: 'string'
                    },
                    colorCapabilities: {
                      type: 'array',
                      items: {
                        type: 'string',
                        enum: ['COLRv0', 'COLRv1', 'SVG']
                      }
                    }
                  },
                  required: [
                    'family',
                    'category',
                    'variants',
                    'subsets',
                    'files',
                    'version',
                    'lastModified',
                    'kind',
                    'menu'
                  ],
                  additionalProperties: false
                }
              }
            },
            required: ['enabled', 'items'],
            additionalProperties: false
          }
        }
      }
    },
    custom: {
      get: {
        method: 'get',
        description: 'Read an uploaded font',
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
                minLength: 1
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
              displayName: {
                type: 'string',
                minLength: 1,
                maxLength: 255
              },
              family: {
                type: 'string',
                minLength: 1,
                maxLength: 255
              },
              weight: {
                default: 400,
                type: 'number',
                minimum: 100,
                maximum: 900
              },
              id: {
                type: 'string'
              },
              created: {
                type: 'string',
                format: 'date-time'
              },
              updated: {
                type: 'string',
                format: 'date-time'
              },
              file: {
                anyOf: [
                  {
                    type: 'object',
                    properties: {
                      originalName: {
                        type: 'string'
                      },
                      mimeType: {
                        type: 'string'
                      },
                      key: {
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
                            key: {
                              type: 'string'
                            },
                            size: {
                              type: 'string'
                            },
                            width: {
                              type: 'number'
                            },
                            height: {
                              type: 'number'
                            }
                          },
                          required: ['key', 'size', 'width', 'height'],
                          additionalProperties: false
                        }
                      }
                    },
                    required: [
                      'originalName',
                      'mimeType',
                      'key',
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
              'displayName',
              'family',
              'weight',
              'id',
              'created',
              'updated',
              'file'
            ],
            additionalProperties: false
          }
        }
      },
      list: {
        method: 'get',
        description: 'Browse uploaded font families',
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
                displayName: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 255
                },
                family: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 255
                },
                weight: {
                  default: 400,
                  type: 'number',
                  minimum: 100,
                  maximum: 900
                },
                id: {
                  type: 'string'
                },
                created: {
                  type: 'string',
                  format: 'date-time'
                },
                updated: {
                  type: 'string',
                  format: 'date-time'
                },
                file: {
                  anyOf: [
                    {
                      type: 'object',
                      properties: {
                        originalName: {
                          type: 'string'
                        },
                        mimeType: {
                          type: 'string'
                        },
                        key: {
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
                              key: {
                                type: 'string'
                              },
                              size: {
                                type: 'string'
                              },
                              width: {
                                type: 'number'
                              },
                              height: {
                                type: 'number'
                              }
                            },
                            required: ['key', 'size', 'width', 'height'],
                            additionalProperties: false
                          }
                        }
                      },
                      required: [
                        'originalName',
                        'mimeType',
                        'key',
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
                'displayName',
                'family',
                'weight',
                'id',
                'created',
                'updated',
                'file'
              ],
              additionalProperties: false
            }
          }
        }
      },
      remove: {
        method: 'post',
        description: 'Remove an uploaded font',
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
                minLength: 1
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
      upload: {
        method: 'post',
        description: 'Save an uploaded font and its display settings',
        noAuth: false,
        encrypted: true,
        isDownloadable: false,
        media: {
          file: {
            optional: false
          }
        },
        input: {
          query: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              id: {
                type: 'string',
                minLength: 1
              }
            },
            additionalProperties: false
          },
          body: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              displayName: {
                type: 'string',
                minLength: 1,
                maxLength: 255
              },
              family: {
                type: 'string',
                minLength: 1,
                maxLength: 255
              },
              weight: {
                default: 400,
                type: 'number',
                minimum: 100,
                maximum: 900
              }
            },
            required: ['displayName', 'family', 'weight'],
            additionalProperties: false
          }
        },
        output: {
          OK: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              displayName: {
                type: 'string',
                minLength: 1,
                maxLength: 255
              },
              family: {
                type: 'string',
                minLength: 1,
                maxLength: 255
              },
              weight: {
                default: 400,
                type: 'number',
                minimum: 100,
                maximum: 900
              },
              id: {
                type: 'string'
              },
              created: {
                type: 'string',
                format: 'date-time'
              },
              updated: {
                type: 'string',
                format: 'date-time'
              },
              file: {
                anyOf: [
                  {
                    type: 'object',
                    properties: {
                      originalName: {
                        type: 'string'
                      },
                      mimeType: {
                        type: 'string'
                      },
                      key: {
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
                            key: {
                              type: 'string'
                            },
                            size: {
                              type: 'string'
                            },
                            width: {
                              type: 'number'
                            },
                            height: {
                              type: 'number'
                            }
                          },
                          required: ['key', 'size', 'width', 'height'],
                          additionalProperties: false
                        }
                      }
                    },
                    required: [
                      'originalName',
                      'mimeType',
                      'key',
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
              'displayName',
              'family',
              'weight',
              'id',
              'created',
              'updated',
              'file'
            ],
            additionalProperties: false
          }
        }
      }
    },
    pins: {
      list: {
        method: 'get',
        description: 'Read saved font favorites in creation order',
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
              type: 'string'
            }
          }
        }
      },
      toggle: {
        method: 'post',
        description: 'Change whether a hosted font is a favorite',
        noAuth: false,
        encrypted: true,
        isDownloadable: false,
        media: null,
        input: {
          body: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              family: {
                type: 'string',
                minLength: 1,
                maxLength: 255
              }
            },
            required: ['family'],
            additionalProperties: false
          }
        },
        output: {
          NO_CONTENT: true
        }
      }
    }
  },
  modules: {
    checkModuleAvailability: {
      method: 'get',
      description: 'Resolve an installed addon identity',
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
              minLength: 1
            }
          },
          required: ['id'],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'boolean'
        }
      }
    },
    list: {
      method: 'get',
      description: 'Inspect installed addon metadata',
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
                type: 'string'
              },
              displayName: {
                type: 'string'
              },
              version: {
                type: 'string'
              },
              description: {
                type: 'string'
              },
              author: {
                type: 'string'
              },
              icon: {
                type: 'string'
              },
              category: {
                type: 'string'
              },
              experience: {
                type: 'object',
                properties: {
                  kind: {
                    type: 'string',
                    enum: [
                      'widget',
                      'dashboard',
                      'database',
                      'workbench',
                      'overhaul',
                      'standard'
                    ]
                  },
                  surfaces: {
                    type: 'array',
                    items: {
                      type: 'string',
                      enum: ['sidebar', 'page', 'dashboard', 'widget']
                    }
                  },
                  databases: {
                    type: 'array',
                    items: {
                      type: 'string',
                      maxLength: 80
                    }
                  },
                  systemOverrides: {
                    type: 'array',
                    items: {
                      type: 'string',
                      enum: ['icons', 'labels', 'theme', 'navigation']
                    }
                  }
                },
                required: ['kind', 'surfaces'],
                additionalProperties: false
              },
              id: {
                type: 'string'
              },
              remoteId: {
                type: 'string'
              }
            },
            required: [
              'name',
              'displayName',
              'version',
              'description',
              'author',
              'icon',
              'category',
              'id',
              'remoteId'
            ],
            additionalProperties: false
          }
        }
      }
    },
    manifest: {
      method: 'get',
      description: 'Read the current addon loading manifest',
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
            modules: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: {
                    type: 'string'
                  },
                  displayName: {
                    type: 'string'
                  },
                  icon: {
                    type: 'string'
                  },
                  category: {
                    type: 'string'
                  },
                  experience: {
                    type: 'object',
                    properties: {
                      kind: {
                        type: 'string',
                        enum: [
                          'widget',
                          'dashboard',
                          'database',
                          'workbench',
                          'overhaul',
                          'standard'
                        ]
                      },
                      surfaces: {
                        type: 'array',
                        items: {
                          type: 'string',
                          enum: ['sidebar', 'page', 'dashboard', 'widget']
                        }
                      },
                      databases: {
                        type: 'array',
                        items: {
                          type: 'string',
                          maxLength: 80
                        }
                      },
                      systemOverrides: {
                        type: 'array',
                        items: {
                          type: 'string',
                          enum: ['icons', 'labels', 'theme', 'navigation']
                        }
                      }
                    },
                    required: ['kind', 'surfaces'],
                    additionalProperties: false
                  },
                  APIKeyAccess: {
                    type: 'object',
                    additionalProperties: {
                      type: 'object',
                      properties: {
                        usage: {
                          type: 'string'
                        },
                        required: {
                          type: 'boolean'
                        }
                      },
                      required: ['usage', 'required'],
                      additionalProperties: false
                    }
                  },
                  id: {
                    type: 'string'
                  },
                  remoteId: {
                    type: 'string'
                  },
                  remoteEntryUrl: {
                    type: 'string'
                  },
                  hasProvider: {
                    type: 'boolean'
                  },
                  hidden: {
                    type: 'boolean'
                  },
                  subsection: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        label: {
                          type: 'string'
                        },
                        icon: {
                          type: 'string'
                        },
                        path: {
                          type: 'string'
                        }
                      },
                      required: ['label', 'icon', 'path'],
                      additionalProperties: false
                    }
                  }
                },
                required: [
                  'name',
                  'displayName',
                  'icon',
                  'category',
                  'id',
                  'remoteId',
                  'remoteEntryUrl',
                  'hasProvider'
                ],
                additionalProperties: false
              }
            }
          },
          required: ['modules'],
          additionalProperties: false
        }
      }
    },
    widgets: {
      method: 'get',
      description: 'Read widgets registered by available addons',
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
              icon: {
                type: 'string'
              },
              minW: {
                type: 'integer',
                exclusiveMinimum: 0,
                maximum: 9007199254740991
              },
              minH: {
                type: 'integer',
                exclusiveMinimum: 0,
                maximum: 9007199254740991
              },
              maxW: {
                type: 'integer',
                exclusiveMinimum: 0,
                maximum: 9007199254740991
              },
              maxH: {
                type: 'integer',
                exclusiveMinimum: 0,
                maximum: 9007199254740991
              },
              moduleName: {
                type: 'string'
              },
              componentName: {
                type: 'string'
              }
            },
            required: ['id', 'icon', 'moduleName', 'componentName'],
            additionalProperties: false
          }
        }
      }
    },
    shop: {
      catalog: {
        method: 'get',
        description: 'Browse verified addon releases and installation progress',
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
              releases: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'string',
                      pattern: '^[a-z][a-z0-9-]{0,39}--[a-z][a-z0-9-]{0,39}$'
                    },
                    name: {
                      type: 'string',
                      minLength: 1,
                      maxLength: 120
                    },
                    description: {
                      type: 'string',
                      maxLength: 1200
                    },
                    icon: {
                      type: 'string',
                      maxLength: 100
                    },
                    category: {
                      type: 'string',
                      maxLength: 80
                    },
                    kind: {
                      type: 'string',
                      enum: ['addon', 'widget']
                    },
                    version: {
                      type: 'string',
                      maxLength: 80,
                      pattern: '^\\d+\\.\\d+\\.\\d+(?:-[a-zA-Z0-9.-]+)?$'
                    },
                    hostVersion: {
                      type: 'string',
                      maxLength: 80,
                      pattern: '^\\d+\\.\\d+\\.\\d+(?:-[a-zA-Z0-9.-]+)?$'
                    },
                    url: {
                      type: 'string',
                      format: 'uri'
                    },
                    sha256: {
                      type: 'string',
                      pattern: '^[a-f0-9]{64}$'
                    },
                    bytes: {
                      type: 'integer',
                      exclusiveMinimum: 0,
                      maximum: 100663296
                    },
                    schemaHash: {
                      anyOf: [
                        {
                          type: 'string',
                          pattern: '^[a-f0-9]{64}$'
                        },
                        {
                          type: 'null'
                        }
                      ]
                    },
                    notes: {
                      default: '',
                      type: 'string',
                      maxLength: 12000
                    },
                    widgets: {
                      default: [],
                      maxItems: 100,
                      type: 'array',
                      items: {
                        type: 'string',
                        maxLength: 100
                      }
                    }
                  },
                  required: [
                    'id',
                    'name',
                    'description',
                    'icon',
                    'category',
                    'kind',
                    'version',
                    'hostVersion',
                    'url',
                    'sha256',
                    'bytes',
                    'schemaHash',
                    'notes',
                    'widgets'
                  ],
                  additionalProperties: false
                }
              },
              jobs: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'string'
                    },
                    addonId: {
                      type: 'string',
                      pattern: '^[a-z][a-z0-9-]{0,39}--[a-z][a-z0-9-]{0,39}$'
                    },
                    version: {
                      type: 'string',
                      maxLength: 80,
                      pattern: '^\\d+\\.\\d+\\.\\d+(?:-[a-zA-Z0-9.-]+)?$'
                    },
                    phase: {
                      type: 'string',
                      enum: [
                        'queued',
                        'downloading',
                        'verifying',
                        'installing',
                        'complete',
                        'failed'
                      ]
                    },
                    received: {
                      type: 'number'
                    },
                    total: {
                      type: 'number'
                    },
                    error: {
                      type: 'string'
                    }
                  },
                  required: [
                    'id',
                    'addonId',
                    'version',
                    'phase',
                    'received',
                    'total'
                  ],
                  additionalProperties: false
                }
              },
              configured: {
                type: 'boolean'
              },
              canManage: {
                type: 'boolean'
              },
              error: {
                type: 'string'
              },
              hostVersion: {
                type: 'string'
              },
              managed: {
                type: 'array',
                items: {
                  type: 'string'
                }
              }
            },
            required: [
              'releases',
              'jobs',
              'configured',
              'canManage',
              'error',
              'hostVersion',
              'managed'
            ],
            additionalProperties: false
          }
        }
      },
      checkUpdates: {
        method: 'post',
        description: 'Refresh the signed release catalog',
        noAuth: false,
        encrypted: true,
        isDownloadable: false,
        media: null,
        input: {},
        output: {
          OK: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'boolean'
          }
        }
      },
      install: {
        method: 'post',
        description:
          'Install a verified addon release as the host administrator',
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
                pattern: '^[a-z][a-z0-9-]{0,39}--[a-z][a-z0-9-]{0,39}$'
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
              addonId: {
                type: 'string',
                pattern: '^[a-z][a-z0-9-]{0,39}--[a-z][a-z0-9-]{0,39}$'
              },
              version: {
                type: 'string',
                maxLength: 80,
                pattern: '^\\d+\\.\\d+\\.\\d+(?:-[a-zA-Z0-9.-]+)?$'
              },
              phase: {
                type: 'string',
                enum: [
                  'queued',
                  'downloading',
                  'verifying',
                  'installing',
                  'complete',
                  'failed'
                ]
              },
              received: {
                type: 'number'
              },
              total: {
                type: 'number'
              },
              error: {
                type: 'string'
              }
            },
            required: [
              'id',
              'addonId',
              'version',
              'phase',
              'received',
              'total'
            ],
            additionalProperties: false
          }
        }
      }
    },
    categories: {
      aiTranslate: {
        method: 'post',
        description: 'Suggest localized navigation labels',
        noAuth: false,
        encrypted: true,
        isDownloadable: false,
        media: null,
        input: {
          body: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              key: {
                type: 'string',
                minLength: 1,
                maxLength: 128
              },
              languages: {
                minItems: 1,
                maxItems: 64,
                type: 'array',
                items: {
                  type: 'string',
                  pattern: '^[a-z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$'
                }
              }
            },
            required: ['key', 'languages'],
            additionalProperties: false
          }
        },
        output: {
          OK: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            anyOf: [
              {
                type: 'object',
                additionalProperties: {
                  type: 'string'
                }
              },
              {
                type: 'null'
              }
            ]
          }
        }
      },
      list: {
        method: 'get',
        description: 'Read category labels in navigation order',
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
              type: 'object',
              additionalProperties: {
                type: 'string'
              }
            }
          }
        }
      },
      update: {
        method: 'post',
        description: 'Save category labels and navigation order',
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
                additionalProperties: {
                  type: 'object',
                  additionalProperties: {
                    type: 'string'
                  }
                }
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
              success: {
                type: 'boolean'
              }
            },
            required: ['success'],
            additionalProperties: false
          }
        }
      }
    }
  },
  updates: {
    status: {
      method: 'get',
      description: 'Get main server release and update progress',
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
            state: {
              type: 'object',
              properties: {
                configured: {
                  type: 'boolean'
                },
                target: {
                  type: 'string'
                },
                currentVersion: {
                  type: 'string'
                },
                phase: {
                  type: 'string',
                  enum: [
                    'idle',
                    'checking',
                    'available',
                    'downloading',
                    'ready',
                    'verifying',
                    'installing',
                    'restarting',
                    'rollingBack',
                    'rolledBack',
                    'complete',
                    'failed'
                  ]
                },
                release: {
                  anyOf: [
                    {
                      type: 'object',
                      properties: {
                        format: {
                          type: 'number',
                          const: 1
                        },
                        version: {
                          type: 'string'
                        },
                        channel: {
                          type: 'string',
                          enum: ['stable', 'beta']
                        },
                        protocol: {
                          type: 'number'
                        },
                        schemaHash: {
                          type: 'string'
                        },
                        notes: {
                          type: 'string'
                        },
                        artifacts: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              target: {
                                type: 'string'
                              },
                              url: {
                                type: 'string'
                              },
                              sha256: {
                                type: 'string'
                              },
                              bytes: {
                                type: 'number'
                              },
                              format: {
                                type: 'string',
                                enum: ['zip', 'docker-archive']
                              },
                              imageId: {
                                type: 'string'
                              },
                              parts: {
                                type: 'array',
                                items: {
                                  type: 'object',
                                  properties: {
                                    url: {
                                      type: 'string'
                                    },
                                    sha256: {
                                      type: 'string'
                                    },
                                    bytes: {
                                      type: 'number'
                                    }
                                  },
                                  required: ['url', 'sha256', 'bytes'],
                                  additionalProperties: false
                                }
                              }
                            },
                            required: [
                              'target',
                              'url',
                              'sha256',
                              'bytes',
                              'format'
                            ],
                            additionalProperties: false
                          }
                        }
                      },
                      required: [
                        'format',
                        'version',
                        'channel',
                        'protocol',
                        'schemaHash',
                        'notes',
                        'artifacts'
                      ],
                      additionalProperties: false
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                received: {
                  type: 'number'
                },
                total: {
                  type: 'number'
                },
                error: {
                  type: 'string'
                },
                blocked: {
                  type: 'string'
                },
                checkedAt: {
                  type: 'string'
                },
                preferences: {
                  type: 'object',
                  properties: {
                    channel: {
                      type: 'string',
                      enum: ['stable', 'beta']
                    },
                    autoDownload: {
                      type: 'boolean'
                    },
                    autoInstall: {
                      type: 'boolean'
                    },
                    installHourUTC: {
                      type: 'integer',
                      minimum: 0,
                      maximum: 23
                    }
                  },
                  required: [
                    'channel',
                    'autoDownload',
                    'autoInstall',
                    'installHourUTC'
                  ],
                  additionalProperties: false
                },
                previousVersion: {
                  type: 'string'
                },
                failedVersion: {
                  type: 'string'
                },
                canRollback: {
                  type: 'boolean'
                },
                noticeId: {
                  type: 'string'
                }
              },
              required: [
                'configured',
                'target',
                'currentVersion',
                'phase',
                'release',
                'received',
                'total',
                'error',
                'blocked',
                'checkedAt',
                'preferences',
                'previousVersion',
                'failedVersion',
                'canRollback',
                'noticeId'
              ],
              additionalProperties: false
            },
            canManage: {
              type: 'boolean'
            }
          },
          required: ['state', 'canManage'],
          additionalProperties: false
        }
      }
    },
    action: {
      method: 'post',
      description: 'Manage verified host updates as a host administrator',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            action: {
              type: 'string',
              enum: ['check', 'download', 'install', 'rollback']
            }
          },
          required: ['action'],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            configured: {
              type: 'boolean'
            },
            target: {
              type: 'string'
            },
            currentVersion: {
              type: 'string'
            },
            phase: {
              type: 'string',
              enum: [
                'idle',
                'checking',
                'available',
                'downloading',
                'ready',
                'verifying',
                'installing',
                'restarting',
                'rollingBack',
                'rolledBack',
                'complete',
                'failed'
              ]
            },
            release: {
              anyOf: [
                {
                  type: 'object',
                  properties: {
                    format: {
                      type: 'number',
                      const: 1
                    },
                    version: {
                      type: 'string'
                    },
                    channel: {
                      type: 'string',
                      enum: ['stable', 'beta']
                    },
                    protocol: {
                      type: 'number'
                    },
                    schemaHash: {
                      type: 'string'
                    },
                    notes: {
                      type: 'string'
                    },
                    artifacts: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          target: {
                            type: 'string'
                          },
                          url: {
                            type: 'string'
                          },
                          sha256: {
                            type: 'string'
                          },
                          bytes: {
                            type: 'number'
                          },
                          format: {
                            type: 'string',
                            enum: ['zip', 'docker-archive']
                          },
                          imageId: {
                            type: 'string'
                          },
                          parts: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                url: {
                                  type: 'string'
                                },
                                sha256: {
                                  type: 'string'
                                },
                                bytes: {
                                  type: 'number'
                                }
                              },
                              required: ['url', 'sha256', 'bytes'],
                              additionalProperties: false
                            }
                          }
                        },
                        required: [
                          'target',
                          'url',
                          'sha256',
                          'bytes',
                          'format'
                        ],
                        additionalProperties: false
                      }
                    }
                  },
                  required: [
                    'format',
                    'version',
                    'channel',
                    'protocol',
                    'schemaHash',
                    'notes',
                    'artifacts'
                  ],
                  additionalProperties: false
                },
                {
                  type: 'null'
                }
              ]
            },
            received: {
              type: 'number'
            },
            total: {
              type: 'number'
            },
            error: {
              type: 'string'
            },
            blocked: {
              type: 'string'
            },
            checkedAt: {
              type: 'string'
            },
            preferences: {
              type: 'object',
              properties: {
                channel: {
                  type: 'string',
                  enum: ['stable', 'beta']
                },
                autoDownload: {
                  type: 'boolean'
                },
                autoInstall: {
                  type: 'boolean'
                },
                installHourUTC: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 23
                }
              },
              required: [
                'channel',
                'autoDownload',
                'autoInstall',
                'installHourUTC'
              ],
              additionalProperties: false
            },
            previousVersion: {
              type: 'string'
            },
            failedVersion: {
              type: 'string'
            },
            canRollback: {
              type: 'boolean'
            },
            noticeId: {
              type: 'string'
            }
          },
          required: [
            'configured',
            'target',
            'currentVersion',
            'phase',
            'release',
            'received',
            'total',
            'error',
            'blocked',
            'checkedAt',
            'preferences',
            'previousVersion',
            'failedVersion',
            'canRollback',
            'noticeId'
          ],
          additionalProperties: false
        }
      }
    },
    settings: {
      method: 'post',
      description:
        'Configure automatic host updates and the UTC maintenance hour',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            channel: {
              type: 'string',
              enum: ['stable', 'beta']
            },
            autoDownload: {
              type: 'boolean'
            },
            autoInstall: {
              type: 'boolean'
            },
            installHourUTC: {
              type: 'integer',
              minimum: 0,
              maximum: 23
            }
          },
          required: [
            'channel',
            'autoDownload',
            'autoInstall',
            'installHourUTC'
          ],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            configured: {
              type: 'boolean'
            },
            target: {
              type: 'string'
            },
            currentVersion: {
              type: 'string'
            },
            phase: {
              type: 'string',
              enum: [
                'idle',
                'checking',
                'available',
                'downloading',
                'ready',
                'verifying',
                'installing',
                'restarting',
                'rollingBack',
                'rolledBack',
                'complete',
                'failed'
              ]
            },
            release: {
              anyOf: [
                {
                  type: 'object',
                  properties: {
                    format: {
                      type: 'number',
                      const: 1
                    },
                    version: {
                      type: 'string'
                    },
                    channel: {
                      type: 'string',
                      enum: ['stable', 'beta']
                    },
                    protocol: {
                      type: 'number'
                    },
                    schemaHash: {
                      type: 'string'
                    },
                    notes: {
                      type: 'string'
                    },
                    artifacts: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          target: {
                            type: 'string'
                          },
                          url: {
                            type: 'string'
                          },
                          sha256: {
                            type: 'string'
                          },
                          bytes: {
                            type: 'number'
                          },
                          format: {
                            type: 'string',
                            enum: ['zip', 'docker-archive']
                          },
                          imageId: {
                            type: 'string'
                          },
                          parts: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                url: {
                                  type: 'string'
                                },
                                sha256: {
                                  type: 'string'
                                },
                                bytes: {
                                  type: 'number'
                                }
                              },
                              required: ['url', 'sha256', 'bytes'],
                              additionalProperties: false
                            }
                          }
                        },
                        required: [
                          'target',
                          'url',
                          'sha256',
                          'bytes',
                          'format'
                        ],
                        additionalProperties: false
                      }
                    }
                  },
                  required: [
                    'format',
                    'version',
                    'channel',
                    'protocol',
                    'schemaHash',
                    'notes',
                    'artifacts'
                  ],
                  additionalProperties: false
                },
                {
                  type: 'null'
                }
              ]
            },
            received: {
              type: 'number'
            },
            total: {
              type: 'number'
            },
            error: {
              type: 'string'
            },
            blocked: {
              type: 'string'
            },
            checkedAt: {
              type: 'string'
            },
            preferences: {
              type: 'object',
              properties: {
                channel: {
                  type: 'string',
                  enum: ['stable', 'beta']
                },
                autoDownload: {
                  type: 'boolean'
                },
                autoInstall: {
                  type: 'boolean'
                },
                installHourUTC: {
                  type: 'integer',
                  minimum: 0,
                  maximum: 23
                }
              },
              required: [
                'channel',
                'autoDownload',
                'autoInstall',
                'installHourUTC'
              ],
              additionalProperties: false
            },
            previousVersion: {
              type: 'string'
            },
            failedVersion: {
              type: 'string'
            },
            canRollback: {
              type: 'boolean'
            },
            noticeId: {
              type: 'string'
            }
          },
          required: [
            'configured',
            'target',
            'currentVersion',
            'phase',
            'release',
            'received',
            'total',
            'error',
            'blocked',
            'checkedAt',
            'preferences',
            'previousVersion',
            'failedVersion',
            'canRollback',
            'noticeId'
          ],
          additionalProperties: false
        }
      }
    }
  },
  rooms: {
    callState: {
      method: 'get',
      description:
        'Read the active core call and your short-lived platform relay credentials',
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
            room_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            }
          },
          required: ['workspace_id', 'room_id'],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            active: {
              type: 'boolean'
            },
            participants: {
              type: 'number'
            },
            video: {
              type: 'boolean'
            },
            limit: {
              type: 'number'
            },
            iceServers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  urls: {
                    type: 'array',
                    items: {
                      type: 'string'
                    }
                  },
                  username: {
                    type: 'string'
                  },
                  credential: {
                    type: 'string'
                  }
                },
                required: ['urls', 'username', 'credential'],
                additionalProperties: false
              }
            }
          },
          required: ['active', 'participants', 'video', 'limit', 'iceServers'],
          additionalProperties: false
        }
      }
    },
    notifications: {
      method: 'get',
      description:
        'Catch up on unread room notifications using the platform connection only',
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
              workspace_id: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
              },
              room_id: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
              },
              message_id: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
              },
              seq: {
                type: 'number'
              }
            },
            required: ['workspace_id', 'room_id', 'message_id', 'seq'],
            additionalProperties: false
          }
        }
      }
    },
    keys: {
      method: 'get',
      description: 'Public keys of current room members and historical senders',
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
            room_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            }
          },
          required: ['workspace_id', 'room_id'],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            identities: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  owner_id: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  agreement: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 200,
                    pattern: '^[A-Za-z0-9_-]+$'
                  },
                  signing: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 200,
                    pattern: '^[A-Za-z0-9_-]+$'
                  }
                },
                required: ['owner_id', 'agreement', 'signing'],
                additionalProperties: false
              }
            },
            historical: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  owner_id: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  agreement: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 200,
                    pattern: '^[A-Za-z0-9_-]+$'
                  },
                  signing: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 200,
                    pattern: '^[A-Za-z0-9_-]+$'
                  }
                },
                required: ['owner_id', 'agreement', 'signing'],
                additionalProperties: false
              }
            },
            missing: {
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
            }
          },
          required: ['identities', 'historical', 'missing'],
          additionalProperties: false
        }
      }
    },
    myIdentity: {
      method: 'get',
      description: 'Read your immutable Rooms public identity',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {},
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          anyOf: [
            {
              type: 'object',
              properties: {
                owner_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                agreement: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 200,
                  pattern: '^[A-Za-z0-9_-]+$'
                },
                signing: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 200,
                  pattern: '^[A-Za-z0-9_-]+$'
                }
              },
              required: ['owner_id', 'agreement', 'signing'],
              additionalProperties: false
            },
            {
              type: 'null'
            }
          ]
        }
      }
    },
    registerIdentity: {
      method: 'post',
      description:
        'Enroll a client-generated public encryption identity; private keys stay on the client',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            identity: {
              type: 'object',
              properties: {
                owner_id: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                agreement: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 200,
                  pattern: '^[A-Za-z0-9_-]+$'
                },
                signing: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 200,
                  pattern: '^[A-Za-z0-9_-]+$'
                }
              },
              required: ['owner_id', 'agreement', 'signing'],
              additionalProperties: false
            },
            proof: {
              type: 'string',
              minLength: 1,
              maxLength: 86,
              pattern: '^[A-Za-z0-9_-]+$'
            }
          },
          required: ['identity', 'proof'],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'boolean',
          const: true
        }
      }
    },
    beginUpload: {
      method: 'post',
      description:
        'Reserve a bounded encrypted upload; file names and keys stay on clients',
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
            room_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            }
          },
          required: ['workspace_id', 'room_id'],
          additionalProperties: false
        },
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
            size: {
              type: 'integer',
              minimum: 16,
              maximum: 20971536
            },
            hash: {
              type: 'string',
              minLength: 1,
              maxLength: 43,
              pattern: '^[A-Za-z0-9_-]+$'
            }
          },
          required: ['id', 'size', 'hash'],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'boolean',
          const: true
        }
      }
    },
    putChunk: {
      method: 'post',
      description: 'Retry-safe upload of one encrypted attachment chunk',
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
            room_id: {
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
          required: ['workspace_id', 'room_id', 'id'],
          additionalProperties: false
        },
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            part: {
              type: 'integer',
              minimum: 0,
              maximum: 80
            },
            data: {
              type: 'string',
              minLength: 1,
              maxLength: 349526,
              pattern: '^[A-Za-z0-9_-]+$'
            }
          },
          required: ['part', 'data'],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'boolean',
          const: true
        }
      }
    },
    finishUpload: {
      method: 'post',
      description:
        'Verify ciphertext size and digest before an upload can be attached',
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
            room_id: {
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
          required: ['workspace_id', 'room_id', 'id'],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'boolean',
          const: true
        }
      }
    },
    getChunk: {
      method: 'get',
      description:
        'Read ciphertext only after checking current room and message access',
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
            room_id: {
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
            part: {
              type: 'integer',
              minimum: 0,
              maximum: 80
            }
          },
          required: ['workspace_id', 'room_id', 'id', 'part'],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            data: {
              type: 'string'
            },
            size: {
              type: 'number'
            },
            hash: {
              type: 'string'
            }
          },
          required: ['data', 'size', 'hash'],
          additionalProperties: false
        }
      }
    },
    discardUpload: {
      method: 'post',
      description: 'Discard your uncommitted encrypted upload',
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
            room_id: {
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
          required: ['workspace_id', 'room_id', 'id'],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'boolean',
          const: true
        }
      }
    },
    list: {
      method: 'get',
      description:
        'Core room directory with account-specific unread and mention counts',
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
              created_by: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
              },
              name: {
                type: 'string'
              },
              topic: {
                type: 'string'
              },
              kind: {
                type: 'string',
                enum: ['channel', 'private', 'direct']
              },
              member_ids: {
                type: 'array',
                items: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                }
              },
              archived: {
                type: 'boolean'
              },
              revision: {
                type: 'number'
              },
              last_seq: {
                type: 'number'
              },
              updated: {
                type: 'string'
              },
              unread: {
                type: 'number'
              },
              mentions: {
                type: 'number'
              },
              muted: {
                type: 'boolean'
              },
              can_write: {
                type: 'boolean'
              },
              can_manage: {
                type: 'boolean'
              }
            },
            required: [
              'id',
              'workspace_id',
              'created_by',
              'name',
              'topic',
              'kind',
              'member_ids',
              'archived',
              'revision',
              'last_seq',
              'updated',
              'unread',
              'mentions',
              'muted',
              'can_write',
              'can_manage'
            ],
            additionalProperties: false
          }
        }
      }
    },
    people: {
      method: 'get',
      description: 'List participants eligible for this workspace',
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
              name: {
                type: 'string'
              },
              role: {
                type: 'string'
              }
            },
            required: ['id', 'name', 'role'],
            additionalProperties: false
          }
        }
      }
    },
    create: {
      method: 'post',
      description:
        'Create a channel, private room or direct conversation inside a workspace',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        body: {
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
            },
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 100
            },
            topic: {
              default: '',
              type: 'string',
              maxLength: 1000
            },
            kind: {
              type: 'string',
              enum: ['channel', 'private', 'direct']
            },
            member_ids: {
              default: [],
              maxItems: 99,
              type: 'array',
              items: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
              }
            }
          },
          required: [
            'workspace_id',
            'id',
            'name',
            'topic',
            'kind',
            'member_ids'
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
            }
          },
          required: ['id'],
          additionalProperties: false
        }
      }
    },
    update: {
      method: 'post',
      description: 'Manage a room with a revision guard',
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
            room_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            }
          },
          required: ['workspace_id', 'room_id'],
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
              maxLength: 100
            },
            topic: {
              type: 'string',
              maxLength: 1000
            },
            archived: {
              type: 'boolean'
            },
            member_ids: {
              maxItems: 100,
              type: 'array',
              items: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
              }
            }
          },
          required: [
            'expected_revision',
            'name',
            'topic',
            'archived',
            'member_ids'
          ],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'boolean',
          const: true
        }
      }
    },
    timeline: {
      method: 'get',
      description: 'Read a stable, paginated room timeline or thread',
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
            room_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            before: {
              type: 'integer',
              exclusiveMinimum: 0,
              maximum: 9007199254740991
            },
            thread_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            message_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            q: {
              default: '',
              type: 'string',
              maxLength: 200
            },
            all_threads: {
              default: 'false',
              type: 'string',
              enum: ['true', 'false']
            },
            pinned: {
              default: 'false',
              type: 'string',
              enum: ['true', 'false']
            }
          },
          required: ['workspace_id', 'room_id', 'q', 'all_threads', 'pinned'],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            room: {
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
                created_by: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                name: {
                  type: 'string'
                },
                topic: {
                  type: 'string'
                },
                kind: {
                  type: 'string',
                  enum: ['channel', 'private', 'direct']
                },
                member_ids: {
                  type: 'array',
                  items: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  }
                },
                archived: {
                  type: 'boolean'
                },
                revision: {
                  type: 'number'
                },
                last_seq: {
                  type: 'number'
                },
                updated: {
                  type: 'string'
                },
                unread: {
                  type: 'number'
                },
                mentions: {
                  type: 'number'
                },
                muted: {
                  type: 'boolean'
                },
                can_write: {
                  type: 'boolean'
                },
                can_manage: {
                  type: 'boolean'
                }
              },
              required: [
                'id',
                'workspace_id',
                'created_by',
                'name',
                'topic',
                'kind',
                'member_ids',
                'archived',
                'revision',
                'last_seq',
                'updated',
                'unread',
                'mentions',
                'muted',
                'can_write',
                'can_manage'
              ],
              additionalProperties: false
            },
            messages: {
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
                  room_id: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  author_id: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  author_name: {
                    type: 'string'
                  },
                  seq: {
                    type: 'number'
                  },
                  thread_id: {
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
                  transaction_id: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  sealed: {
                    anyOf: [
                      {
                        type: 'object',
                        properties: {
                          version: {
                            type: 'number',
                            const: 1
                          },
                          context: {
                            type: 'object',
                            properties: {
                              workspace_id: {
                                type: 'string',
                                format: 'uuid',
                                pattern:
                                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                              },
                              room_id: {
                                type: 'string',
                                format: 'uuid',
                                pattern:
                                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                              },
                              author_id: {
                                type: 'string',
                                format: 'uuid',
                                pattern:
                                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                              },
                              transaction_id: {
                                type: 'string',
                                format: 'uuid',
                                pattern:
                                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                              },
                              thread_id: {
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
                              content_revision: {
                                type: 'integer',
                                exclusiveMinimum: 0,
                                maximum: 9007199254740991
                              },
                              references: {
                                maxItems: 20,
                                type: 'array',
                                items: {
                                  type: 'string',
                                  maxLength: 160
                                }
                              },
                              attachment_ids: {
                                maxItems: 4,
                                type: 'array',
                                items: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                }
                              }
                            },
                            required: [
                              'workspace_id',
                              'room_id',
                              'author_id',
                              'transaction_id',
                              'thread_id',
                              'content_revision',
                              'references',
                              'attachment_ids'
                            ],
                            additionalProperties: false
                          },
                          sender: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 43,
                            pattern: '^[A-Za-z0-9_-]+$'
                          },
                          ephemeral: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 200,
                            pattern: '^[A-Za-z0-9_-]+$'
                          },
                          iv: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 16,
                            pattern: '^[A-Za-z0-9_-]+$'
                          },
                          ciphertext: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 110000,
                            pattern: '^[A-Za-z0-9_-]+$'
                          },
                          recipients: {
                            minItems: 1,
                            maxItems: 100,
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                user_id: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                fingerprint: {
                                  type: 'string',
                                  minLength: 1,
                                  maxLength: 43,
                                  pattern: '^[A-Za-z0-9_-]+$'
                                },
                                iv: {
                                  type: 'string',
                                  minLength: 1,
                                  maxLength: 16,
                                  pattern: '^[A-Za-z0-9_-]+$'
                                },
                                key: {
                                  type: 'string',
                                  minLength: 1,
                                  maxLength: 64,
                                  pattern: '^[A-Za-z0-9_-]+$'
                                }
                              },
                              required: ['user_id', 'fingerprint', 'iv', 'key'],
                              additionalProperties: false
                            }
                          },
                          signature: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 86,
                            pattern: '^[A-Za-z0-9_-]+$'
                          }
                        },
                        required: [
                          'version',
                          'context',
                          'sender',
                          'ephemeral',
                          'iv',
                          'ciphertext',
                          'recipients',
                          'signature'
                        ],
                        additionalProperties: false
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  body: {
                    type: 'string'
                  },
                  references: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        key: {
                          type: 'string'
                        },
                        kind: {
                          type: 'string'
                        },
                        title: {
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
                        },
                        available: {
                          type: 'boolean'
                        }
                      },
                      required: ['key', 'kind', 'title', 'href', 'available'],
                      additionalProperties: false
                    }
                  },
                  revision: {
                    type: 'number'
                  },
                  deleted: {
                    type: 'boolean'
                  },
                  pinned: {
                    type: 'boolean'
                  },
                  created: {
                    type: 'string'
                  },
                  edited: {
                    anyOf: [
                      {
                        type: 'string'
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  replies: {
                    type: 'number'
                  },
                  reactions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        emoji: {
                          type: 'string'
                        },
                        count: {
                          type: 'number'
                        },
                        mine: {
                          type: 'boolean'
                        }
                      },
                      required: ['emoji', 'count', 'mine'],
                      additionalProperties: false
                    }
                  }
                },
                required: [
                  'id',
                  'room_id',
                  'author_id',
                  'author_name',
                  'seq',
                  'thread_id',
                  'transaction_id',
                  'sealed',
                  'body',
                  'references',
                  'revision',
                  'deleted',
                  'pinned',
                  'created',
                  'edited',
                  'replies',
                  'reactions'
                ],
                additionalProperties: false
              }
            },
            next_cursor: {
              anyOf: [
                {
                  type: 'number'
                },
                {
                  type: 'null'
                }
              ]
            },
            root: {
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
                    room_id: {
                      type: 'string',
                      format: 'uuid',
                      pattern:
                        '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                    },
                    author_id: {
                      type: 'string',
                      format: 'uuid',
                      pattern:
                        '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                    },
                    author_name: {
                      type: 'string'
                    },
                    seq: {
                      type: 'number'
                    },
                    thread_id: {
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
                    transaction_id: {
                      type: 'string',
                      format: 'uuid',
                      pattern:
                        '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                    },
                    sealed: {
                      anyOf: [
                        {
                          type: 'object',
                          properties: {
                            version: {
                              type: 'number',
                              const: 1
                            },
                            context: {
                              type: 'object',
                              properties: {
                                workspace_id: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                room_id: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                author_id: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                transaction_id: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                thread_id: {
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
                                content_revision: {
                                  type: 'integer',
                                  exclusiveMinimum: 0,
                                  maximum: 9007199254740991
                                },
                                references: {
                                  maxItems: 20,
                                  type: 'array',
                                  items: {
                                    type: 'string',
                                    maxLength: 160
                                  }
                                },
                                attachment_ids: {
                                  maxItems: 4,
                                  type: 'array',
                                  items: {
                                    type: 'string',
                                    format: 'uuid',
                                    pattern:
                                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                  }
                                }
                              },
                              required: [
                                'workspace_id',
                                'room_id',
                                'author_id',
                                'transaction_id',
                                'thread_id',
                                'content_revision',
                                'references',
                                'attachment_ids'
                              ],
                              additionalProperties: false
                            },
                            sender: {
                              type: 'string',
                              minLength: 1,
                              maxLength: 43,
                              pattern: '^[A-Za-z0-9_-]+$'
                            },
                            ephemeral: {
                              type: 'string',
                              minLength: 1,
                              maxLength: 200,
                              pattern: '^[A-Za-z0-9_-]+$'
                            },
                            iv: {
                              type: 'string',
                              minLength: 1,
                              maxLength: 16,
                              pattern: '^[A-Za-z0-9_-]+$'
                            },
                            ciphertext: {
                              type: 'string',
                              minLength: 1,
                              maxLength: 110000,
                              pattern: '^[A-Za-z0-9_-]+$'
                            },
                            recipients: {
                              minItems: 1,
                              maxItems: 100,
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  user_id: {
                                    type: 'string',
                                    format: 'uuid',
                                    pattern:
                                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                  },
                                  fingerprint: {
                                    type: 'string',
                                    minLength: 1,
                                    maxLength: 43,
                                    pattern: '^[A-Za-z0-9_-]+$'
                                  },
                                  iv: {
                                    type: 'string',
                                    minLength: 1,
                                    maxLength: 16,
                                    pattern: '^[A-Za-z0-9_-]+$'
                                  },
                                  key: {
                                    type: 'string',
                                    minLength: 1,
                                    maxLength: 64,
                                    pattern: '^[A-Za-z0-9_-]+$'
                                  }
                                },
                                required: [
                                  'user_id',
                                  'fingerprint',
                                  'iv',
                                  'key'
                                ],
                                additionalProperties: false
                              }
                            },
                            signature: {
                              type: 'string',
                              minLength: 1,
                              maxLength: 86,
                              pattern: '^[A-Za-z0-9_-]+$'
                            }
                          },
                          required: [
                            'version',
                            'context',
                            'sender',
                            'ephemeral',
                            'iv',
                            'ciphertext',
                            'recipients',
                            'signature'
                          ],
                          additionalProperties: false
                        },
                        {
                          type: 'null'
                        }
                      ]
                    },
                    body: {
                      type: 'string'
                    },
                    references: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          key: {
                            type: 'string'
                          },
                          kind: {
                            type: 'string'
                          },
                          title: {
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
                          },
                          available: {
                            type: 'boolean'
                          }
                        },
                        required: ['key', 'kind', 'title', 'href', 'available'],
                        additionalProperties: false
                      }
                    },
                    revision: {
                      type: 'number'
                    },
                    deleted: {
                      type: 'boolean'
                    },
                    pinned: {
                      type: 'boolean'
                    },
                    created: {
                      type: 'string'
                    },
                    edited: {
                      anyOf: [
                        {
                          type: 'string'
                        },
                        {
                          type: 'null'
                        }
                      ]
                    },
                    replies: {
                      type: 'number'
                    },
                    reactions: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          emoji: {
                            type: 'string'
                          },
                          count: {
                            type: 'number'
                          },
                          mine: {
                            type: 'boolean'
                          }
                        },
                        required: ['emoji', 'count', 'mine'],
                        additionalProperties: false
                      }
                    }
                  },
                  required: [
                    'id',
                    'room_id',
                    'author_id',
                    'author_name',
                    'seq',
                    'thread_id',
                    'transaction_id',
                    'sealed',
                    'body',
                    'references',
                    'revision',
                    'deleted',
                    'pinned',
                    'created',
                    'edited',
                    'replies',
                    'reactions'
                  ],
                  additionalProperties: false
                },
                {
                  type: 'null'
                }
              ]
            },
            focus: {
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
                    room_id: {
                      type: 'string',
                      format: 'uuid',
                      pattern:
                        '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                    },
                    author_id: {
                      type: 'string',
                      format: 'uuid',
                      pattern:
                        '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                    },
                    author_name: {
                      type: 'string'
                    },
                    seq: {
                      type: 'number'
                    },
                    thread_id: {
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
                    transaction_id: {
                      type: 'string',
                      format: 'uuid',
                      pattern:
                        '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                    },
                    sealed: {
                      anyOf: [
                        {
                          type: 'object',
                          properties: {
                            version: {
                              type: 'number',
                              const: 1
                            },
                            context: {
                              type: 'object',
                              properties: {
                                workspace_id: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                room_id: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                author_id: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                transaction_id: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                thread_id: {
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
                                content_revision: {
                                  type: 'integer',
                                  exclusiveMinimum: 0,
                                  maximum: 9007199254740991
                                },
                                references: {
                                  maxItems: 20,
                                  type: 'array',
                                  items: {
                                    type: 'string',
                                    maxLength: 160
                                  }
                                },
                                attachment_ids: {
                                  maxItems: 4,
                                  type: 'array',
                                  items: {
                                    type: 'string',
                                    format: 'uuid',
                                    pattern:
                                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                  }
                                }
                              },
                              required: [
                                'workspace_id',
                                'room_id',
                                'author_id',
                                'transaction_id',
                                'thread_id',
                                'content_revision',
                                'references',
                                'attachment_ids'
                              ],
                              additionalProperties: false
                            },
                            sender: {
                              type: 'string',
                              minLength: 1,
                              maxLength: 43,
                              pattern: '^[A-Za-z0-9_-]+$'
                            },
                            ephemeral: {
                              type: 'string',
                              minLength: 1,
                              maxLength: 200,
                              pattern: '^[A-Za-z0-9_-]+$'
                            },
                            iv: {
                              type: 'string',
                              minLength: 1,
                              maxLength: 16,
                              pattern: '^[A-Za-z0-9_-]+$'
                            },
                            ciphertext: {
                              type: 'string',
                              minLength: 1,
                              maxLength: 110000,
                              pattern: '^[A-Za-z0-9_-]+$'
                            },
                            recipients: {
                              minItems: 1,
                              maxItems: 100,
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  user_id: {
                                    type: 'string',
                                    format: 'uuid',
                                    pattern:
                                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                  },
                                  fingerprint: {
                                    type: 'string',
                                    minLength: 1,
                                    maxLength: 43,
                                    pattern: '^[A-Za-z0-9_-]+$'
                                  },
                                  iv: {
                                    type: 'string',
                                    minLength: 1,
                                    maxLength: 16,
                                    pattern: '^[A-Za-z0-9_-]+$'
                                  },
                                  key: {
                                    type: 'string',
                                    minLength: 1,
                                    maxLength: 64,
                                    pattern: '^[A-Za-z0-9_-]+$'
                                  }
                                },
                                required: [
                                  'user_id',
                                  'fingerprint',
                                  'iv',
                                  'key'
                                ],
                                additionalProperties: false
                              }
                            },
                            signature: {
                              type: 'string',
                              minLength: 1,
                              maxLength: 86,
                              pattern: '^[A-Za-z0-9_-]+$'
                            }
                          },
                          required: [
                            'version',
                            'context',
                            'sender',
                            'ephemeral',
                            'iv',
                            'ciphertext',
                            'recipients',
                            'signature'
                          ],
                          additionalProperties: false
                        },
                        {
                          type: 'null'
                        }
                      ]
                    },
                    body: {
                      type: 'string'
                    },
                    references: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          key: {
                            type: 'string'
                          },
                          kind: {
                            type: 'string'
                          },
                          title: {
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
                          },
                          available: {
                            type: 'boolean'
                          }
                        },
                        required: ['key', 'kind', 'title', 'href', 'available'],
                        additionalProperties: false
                      }
                    },
                    revision: {
                      type: 'number'
                    },
                    deleted: {
                      type: 'boolean'
                    },
                    pinned: {
                      type: 'boolean'
                    },
                    created: {
                      type: 'string'
                    },
                    edited: {
                      anyOf: [
                        {
                          type: 'string'
                        },
                        {
                          type: 'null'
                        }
                      ]
                    },
                    replies: {
                      type: 'number'
                    },
                    reactions: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          emoji: {
                            type: 'string'
                          },
                          count: {
                            type: 'number'
                          },
                          mine: {
                            type: 'boolean'
                          }
                        },
                        required: ['emoji', 'count', 'mine'],
                        additionalProperties: false
                      }
                    }
                  },
                  required: [
                    'id',
                    'room_id',
                    'author_id',
                    'author_name',
                    'seq',
                    'thread_id',
                    'transaction_id',
                    'sealed',
                    'body',
                    'references',
                    'revision',
                    'deleted',
                    'pinned',
                    'created',
                    'edited',
                    'replies',
                    'reactions'
                  ],
                  additionalProperties: false
                },
                {
                  type: 'null'
                }
              ]
            }
          },
          required: ['room', 'messages', 'next_cursor', 'root', 'focus'],
          additionalProperties: false
        }
      }
    },
    send: {
      method: 'post',
      description: 'Send a retry-safe message with verified workspace mentions',
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
            room_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            }
          },
          required: ['workspace_id', 'room_id'],
          additionalProperties: false
        },
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            body: {
              type: 'string',
              maxLength: 16000
            },
            sealed: {
              type: 'object',
              properties: {
                version: {
                  type: 'number',
                  const: 1
                },
                context: {
                  type: 'object',
                  properties: {
                    workspace_id: {
                      type: 'string',
                      format: 'uuid',
                      pattern:
                        '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                    },
                    room_id: {
                      type: 'string',
                      format: 'uuid',
                      pattern:
                        '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                    },
                    author_id: {
                      type: 'string',
                      format: 'uuid',
                      pattern:
                        '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                    },
                    transaction_id: {
                      type: 'string',
                      format: 'uuid',
                      pattern:
                        '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                    },
                    thread_id: {
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
                    content_revision: {
                      type: 'integer',
                      exclusiveMinimum: 0,
                      maximum: 9007199254740991
                    },
                    references: {
                      maxItems: 20,
                      type: 'array',
                      items: {
                        type: 'string',
                        maxLength: 160
                      }
                    },
                    attachment_ids: {
                      maxItems: 4,
                      type: 'array',
                      items: {
                        type: 'string',
                        format: 'uuid',
                        pattern:
                          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                      }
                    }
                  },
                  required: [
                    'workspace_id',
                    'room_id',
                    'author_id',
                    'transaction_id',
                    'thread_id',
                    'content_revision',
                    'references',
                    'attachment_ids'
                  ],
                  additionalProperties: false
                },
                sender: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 43,
                  pattern: '^[A-Za-z0-9_-]+$'
                },
                ephemeral: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 200,
                  pattern: '^[A-Za-z0-9_-]+$'
                },
                iv: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 16,
                  pattern: '^[A-Za-z0-9_-]+$'
                },
                ciphertext: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 110000,
                  pattern: '^[A-Za-z0-9_-]+$'
                },
                recipients: {
                  minItems: 1,
                  maxItems: 100,
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      user_id: {
                        type: 'string',
                        format: 'uuid',
                        pattern:
                          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                      },
                      fingerprint: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 43,
                        pattern: '^[A-Za-z0-9_-]+$'
                      },
                      iv: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 16,
                        pattern: '^[A-Za-z0-9_-]+$'
                      },
                      key: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 64,
                        pattern: '^[A-Za-z0-9_-]+$'
                      }
                    },
                    required: ['user_id', 'fingerprint', 'iv', 'key'],
                    additionalProperties: false
                  }
                },
                signature: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 86,
                  pattern: '^[A-Za-z0-9_-]+$'
                }
              },
              required: [
                'version',
                'context',
                'sender',
                'ephemeral',
                'iv',
                'ciphertext',
                'recipients',
                'signature'
              ],
              additionalProperties: false
            },
            references: {
              default: [],
              maxItems: 20,
              type: 'array',
              items: {
                type: 'string',
                pattern: '^[a-z][a-z0-9_-]{0,60}:[0-9a-f-]{36}$'
              }
            },
            transaction_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            thread_id: {
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
          required: ['body', 'references', 'transaction_id', 'thread_id'],
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
    edit: {
      method: 'post',
      description:
        'Edit or redact a message without losing its thread identity',
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
            room_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            }
          },
          required: ['workspace_id', 'room_id'],
          additionalProperties: false
        },
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
            expected_revision: {
              type: 'integer',
              exclusiveMinimum: 0,
              maximum: 9007199254740991
            },
            body: {
              type: 'string',
              maxLength: 16000
            },
            sealed: {
              type: 'object',
              properties: {
                version: {
                  type: 'number',
                  const: 1
                },
                context: {
                  type: 'object',
                  properties: {
                    workspace_id: {
                      type: 'string',
                      format: 'uuid',
                      pattern:
                        '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                    },
                    room_id: {
                      type: 'string',
                      format: 'uuid',
                      pattern:
                        '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                    },
                    author_id: {
                      type: 'string',
                      format: 'uuid',
                      pattern:
                        '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                    },
                    transaction_id: {
                      type: 'string',
                      format: 'uuid',
                      pattern:
                        '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                    },
                    thread_id: {
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
                    content_revision: {
                      type: 'integer',
                      exclusiveMinimum: 0,
                      maximum: 9007199254740991
                    },
                    references: {
                      maxItems: 20,
                      type: 'array',
                      items: {
                        type: 'string',
                        maxLength: 160
                      }
                    },
                    attachment_ids: {
                      maxItems: 4,
                      type: 'array',
                      items: {
                        type: 'string',
                        format: 'uuid',
                        pattern:
                          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                      }
                    }
                  },
                  required: [
                    'workspace_id',
                    'room_id',
                    'author_id',
                    'transaction_id',
                    'thread_id',
                    'content_revision',
                    'references',
                    'attachment_ids'
                  ],
                  additionalProperties: false
                },
                sender: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 43,
                  pattern: '^[A-Za-z0-9_-]+$'
                },
                ephemeral: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 200,
                  pattern: '^[A-Za-z0-9_-]+$'
                },
                iv: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 16,
                  pattern: '^[A-Za-z0-9_-]+$'
                },
                ciphertext: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 110000,
                  pattern: '^[A-Za-z0-9_-]+$'
                },
                recipients: {
                  minItems: 1,
                  maxItems: 100,
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      user_id: {
                        type: 'string',
                        format: 'uuid',
                        pattern:
                          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                      },
                      fingerprint: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 43,
                        pattern: '^[A-Za-z0-9_-]+$'
                      },
                      iv: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 16,
                        pattern: '^[A-Za-z0-9_-]+$'
                      },
                      key: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 64,
                        pattern: '^[A-Za-z0-9_-]+$'
                      }
                    },
                    required: ['user_id', 'fingerprint', 'iv', 'key'],
                    additionalProperties: false
                  }
                },
                signature: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 86,
                  pattern: '^[A-Za-z0-9_-]+$'
                }
              },
              required: [
                'version',
                'context',
                'sender',
                'ephemeral',
                'iv',
                'ciphertext',
                'recipients',
                'signature'
              ],
              additionalProperties: false
            },
            references: {
              maxItems: 20,
              type: 'array',
              items: {
                type: 'string',
                pattern: '^[a-z][a-z0-9_-]{0,60}:[0-9a-f-]{36}$'
              }
            },
            deleted: {
              default: false,
              type: 'boolean'
            }
          },
          required: [
            'id',
            'expected_revision',
            'body',
            'references',
            'deleted'
          ],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'boolean',
          const: true
        }
      }
    },
    react: {
      method: 'post',
      description: 'Idempotently add or remove your reaction',
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
            room_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            }
          },
          required: ['workspace_id', 'room_id'],
          additionalProperties: false
        },
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
            emoji: {
              type: 'string',
              enum: ['👍', '❤️', '🎉', '✅', '👀', '🚀']
            },
            active: {
              type: 'boolean'
            }
          },
          required: ['id', 'emoji', 'active'],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'boolean',
          const: true
        }
      }
    },
    pin: {
      method: 'post',
      description: 'Pin or unpin a message for the room',
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
            room_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            }
          },
          required: ['workspace_id', 'room_id'],
          additionalProperties: false
        },
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
            pinned: {
              type: 'boolean'
            },
            expected_revision: {
              type: 'integer',
              exclusiveMinimum: 0,
              maximum: 9007199254740991
            }
          },
          required: ['id', 'pinned', 'expected_revision'],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'boolean',
          const: true
        }
      }
    },
    receipt: {
      method: 'post',
      description:
        'Advance your read position monotonically and set room notifications',
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
            room_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            }
          },
          required: ['workspace_id', 'room_id'],
          additionalProperties: false
        },
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            read_seq: {
              type: 'integer',
              minimum: 0,
              maximum: 9007199254740991
            },
            muted: {
              type: 'boolean'
            }
          },
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'boolean',
          const: true
        }
      }
    },
    mentions: {
      method: 'get',
      description:
        'Find the latest 50 room discussions mentioning a canonical workspace item',
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
            entity: {
              type: 'string',
              pattern: '^[a-z][a-z0-9_-]{0,60}:[0-9a-f-]{36}$'
            }
          },
          required: ['workspace_id', 'entity'],
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
              room_id: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
              },
              author_id: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
              },
              author_name: {
                type: 'string'
              },
              seq: {
                type: 'number'
              },
              thread_id: {
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
              transaction_id: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
              },
              sealed: {
                anyOf: [
                  {
                    type: 'object',
                    properties: {
                      version: {
                        type: 'number',
                        const: 1
                      },
                      context: {
                        type: 'object',
                        properties: {
                          workspace_id: {
                            type: 'string',
                            format: 'uuid',
                            pattern:
                              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                          },
                          room_id: {
                            type: 'string',
                            format: 'uuid',
                            pattern:
                              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                          },
                          author_id: {
                            type: 'string',
                            format: 'uuid',
                            pattern:
                              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                          },
                          transaction_id: {
                            type: 'string',
                            format: 'uuid',
                            pattern:
                              '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                          },
                          thread_id: {
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
                          content_revision: {
                            type: 'integer',
                            exclusiveMinimum: 0,
                            maximum: 9007199254740991
                          },
                          references: {
                            maxItems: 20,
                            type: 'array',
                            items: {
                              type: 'string',
                              maxLength: 160
                            }
                          },
                          attachment_ids: {
                            maxItems: 4,
                            type: 'array',
                            items: {
                              type: 'string',
                              format: 'uuid',
                              pattern:
                                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                            }
                          }
                        },
                        required: [
                          'workspace_id',
                          'room_id',
                          'author_id',
                          'transaction_id',
                          'thread_id',
                          'content_revision',
                          'references',
                          'attachment_ids'
                        ],
                        additionalProperties: false
                      },
                      sender: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 43,
                        pattern: '^[A-Za-z0-9_-]+$'
                      },
                      ephemeral: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 200,
                        pattern: '^[A-Za-z0-9_-]+$'
                      },
                      iv: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 16,
                        pattern: '^[A-Za-z0-9_-]+$'
                      },
                      ciphertext: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 110000,
                        pattern: '^[A-Za-z0-9_-]+$'
                      },
                      recipients: {
                        minItems: 1,
                        maxItems: 100,
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            user_id: {
                              type: 'string',
                              format: 'uuid',
                              pattern:
                                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                            },
                            fingerprint: {
                              type: 'string',
                              minLength: 1,
                              maxLength: 43,
                              pattern: '^[A-Za-z0-9_-]+$'
                            },
                            iv: {
                              type: 'string',
                              minLength: 1,
                              maxLength: 16,
                              pattern: '^[A-Za-z0-9_-]+$'
                            },
                            key: {
                              type: 'string',
                              minLength: 1,
                              maxLength: 64,
                              pattern: '^[A-Za-z0-9_-]+$'
                            }
                          },
                          required: ['user_id', 'fingerprint', 'iv', 'key'],
                          additionalProperties: false
                        }
                      },
                      signature: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 86,
                        pattern: '^[A-Za-z0-9_-]+$'
                      }
                    },
                    required: [
                      'version',
                      'context',
                      'sender',
                      'ephemeral',
                      'iv',
                      'ciphertext',
                      'recipients',
                      'signature'
                    ],
                    additionalProperties: false
                  },
                  {
                    type: 'null'
                  }
                ]
              },
              body: {
                type: 'string'
              },
              references: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    key: {
                      type: 'string'
                    },
                    kind: {
                      type: 'string'
                    },
                    title: {
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
                    },
                    available: {
                      type: 'boolean'
                    }
                  },
                  required: ['key', 'kind', 'title', 'href', 'available'],
                  additionalProperties: false
                }
              },
              revision: {
                type: 'number'
              },
              deleted: {
                type: 'boolean'
              },
              pinned: {
                type: 'boolean'
              },
              created: {
                type: 'string'
              },
              edited: {
                anyOf: [
                  {
                    type: 'string'
                  },
                  {
                    type: 'null'
                  }
                ]
              },
              replies: {
                type: 'number'
              },
              reactions: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    emoji: {
                      type: 'string'
                    },
                    count: {
                      type: 'number'
                    },
                    mine: {
                      type: 'boolean'
                    }
                  },
                  required: ['emoji', 'count', 'mine'],
                  additionalProperties: false
                }
              },
              room_name: {
                type: 'string'
              }
            },
            required: [
              'id',
              'room_id',
              'author_id',
              'author_name',
              'seq',
              'thread_id',
              'transaction_id',
              'sealed',
              'body',
              'references',
              'revision',
              'deleted',
              'pinned',
              'created',
              'edited',
              'replies',
              'reactions',
              'room_name'
            ],
            additionalProperties: false
          }
        }
      }
    }
  },
  entities: {
    search: {
      method: 'get',
      description:
        'Find authorized core workspace identities for mentions and links',
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
            q: {
              default: '',
              type: 'string',
              maxLength: 100
            }
          },
          required: ['workspace_id', 'q'],
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
              key: {
                type: 'string'
              },
              kind: {
                type: 'string'
              },
              title: {
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
              },
              available: {
                type: 'boolean'
              }
            },
            required: ['key', 'kind', 'title', 'href', 'available'],
            additionalProperties: false
          }
        }
      }
    },
    resolve: {
      method: 'post',
      description:
        'Resolve live workspace references, returning tombstones for unavailable items',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            workspace_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            keys: {
              maxItems: 100,
              type: 'array',
              items: {
                type: 'string',
                pattern: '^[a-z][a-z0-9_-]{0,60}:[0-9a-f-]{36}$'
              }
            }
          },
          required: ['workspace_id', 'keys'],
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
              key: {
                type: 'string'
              },
              kind: {
                type: 'string'
              },
              title: {
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
              },
              available: {
                type: 'boolean'
              }
            },
            required: ['key', 'kind', 'title', 'href', 'available'],
            additionalProperties: false
          }
        }
      }
    },
    context: {
      method: 'get',
      description: 'Resolve the native item shown at a platform route',
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
            path: {
              type: 'string',
              maxLength: 2000
            }
          },
          required: ['workspace_id', 'path'],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          anyOf: [
            {
              type: 'object',
              properties: {
                key: {
                  type: 'string'
                },
                kind: {
                  type: 'string'
                },
                title: {
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
                },
                available: {
                  type: 'boolean'
                }
              },
              required: ['key', 'kind', 'title', 'href', 'available'],
              additionalProperties: false
            },
            {
              type: 'null'
            }
          ]
        }
      }
    }
  },
  search: {
    status: {
      method: 'get',
      description: 'Current authorized system search coverage',
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
            module: {
              type: 'string',
              maxLength: 60,
              pattern: '^[a-z-]+$'
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
            total: {
              type: 'number'
            },
            ready: {
              type: 'number'
            },
            pending: {
              type: 'number'
            },
            modules: {
              type: 'array',
              items: {
                type: 'string'
              }
            },
            warnings: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  source: {
                    type: 'string'
                  },
                  code: {
                    type: 'string'
                  }
                },
                required: ['source', 'code'],
                additionalProperties: false
              }
            }
          },
          required: ['total', 'ready', 'pending', 'modules', 'warnings'],
          additionalProperties: false
        }
      }
    },
    host: {
      method: 'get',
      description: 'Shared Mac mini model health',
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
            ready: {
              type: 'boolean'
            },
            laya: {
              type: 'boolean'
            },
            models: {
              type: 'array',
              items: {
                type: 'string'
              }
            },
            host: {
              type: 'string',
              const: 'mac-mini'
            }
          },
          required: ['ready', 'laya', 'models', 'host'],
          additionalProperties: false
        }
      }
    },
    index: {
      method: 'post',
      description: 'Index one resumable batch through the Mac mini',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            workspace_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            module: {
              type: 'string',
              maxLength: 60,
              pattern: '^[a-z-]+$'
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
            total: {
              type: 'number'
            },
            ready: {
              type: 'number'
            },
            pending: {
              type: 'number'
            },
            processed: {
              type: 'number'
            },
            source: {
              type: 'string'
            },
            warnings: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  source: {
                    type: 'string'
                  },
                  code: {
                    type: 'string'
                  }
                },
                required: ['source', 'code'],
                additionalProperties: false
              }
            }
          },
          required: [
            'total',
            'ready',
            'pending',
            'processed',
            'source',
            'warnings'
          ],
          additionalProperties: false
        }
      }
    },
    clear: {
      method: 'post',
      description: 'Remove only the signed-in account search cache',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {},
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'boolean',
          const: true
        }
      }
    },
    query: {
      method: 'post',
      description: 'Retrieve whole-system evidence and a grounded answer',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            workspace_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            module: {
              type: 'string',
              maxLength: 60,
              pattern: '^[a-z-]+$'
            },
            query: {
              type: 'string',
              minLength: 1,
              maxLength: 800
            },
            mode: {
              default: 'hybrid',
              type: 'string',
              enum: ['hybrid', 'keyword']
            },
            answer: {
              default: true,
              type: 'boolean'
            }
          },
          required: ['query', 'mode', 'answer'],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            hits: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string'
                  },
                  source_id: {
                    type: 'string'
                  },
                  graph_key: {
                    type: 'string'
                  },
                  title: {
                    type: 'string'
                  },
                  module: {
                    type: 'string'
                  },
                  workspace: {
                    anyOf: [
                      {
                        type: 'string'
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  href: {
                    type: 'string'
                  },
                  file_key: {
                    type: 'string'
                  },
                  text: {
                    type: 'string'
                  },
                  score: {
                    type: 'number'
                  },
                  relevance: {
                    anyOf: [
                      {
                        type: 'number'
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  confidence: {
                    anyOf: [
                      {
                        type: 'number'
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  inferred: {
                    type: 'boolean'
                  }
                },
                required: [
                  'id',
                  'source_id',
                  'title',
                  'module',
                  'workspace',
                  'href',
                  'text',
                  'score',
                  'relevance',
                  'confidence',
                  'inferred'
                ],
                additionalProperties: false
              }
            },
            answer: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  text: {
                    type: 'string'
                  },
                  citations: {
                    type: 'array',
                    items: {
                      type: 'number'
                    }
                  }
                },
                required: ['text', 'citations'],
                additionalProperties: false
              }
            },
            total: {
              type: 'number'
            },
            ready: {
              type: 'number'
            },
            stages: {
              type: 'array',
              items: {
                type: 'string'
              }
            },
            warnings: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  source: {
                    type: 'string'
                  },
                  code: {
                    type: 'string'
                  }
                },
                required: ['source', 'code'],
                additionalProperties: false
              }
            },
            model: {
              type: 'string'
            }
          },
          required: [
            'hits',
            'answer',
            'total',
            'ready',
            'stages',
            'warnings',
            'model'
          ],
          additionalProperties: false
        }
      }
    },
    map: {
      method: 'get',
      description:
        'Read contextual knowledge connections from the authorized RAG index',
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
                    type: 'string'
                  },
                  key: {
                    type: 'string'
                  },
                  kind: {
                    type: 'string',
                    enum: [
                      'document',
                      'record',
                      'note',
                      'tag',
                      'topic',
                      'source',
                      'redraw'
                    ]
                  },
                  title: {
                    type: 'string'
                  },
                  entityType: {
                    type: 'string'
                  },
                  tags: {
                    type: 'array',
                    items: {
                      type: 'string'
                    }
                  },
                  context: {
                    type: 'string'
                  },
                  excerpt: {
                    type: 'string'
                  },
                  href: {
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
                    enum: ['tag', 'topic', 'context']
                  },
                  label: {
                    type: 'string'
                  },
                  strength: {
                    type: 'number'
                  },
                  evidence: {
                    type: 'array',
                    items: {
                      type: 'string'
                    }
                  },
                  method: {
                    type: 'string',
                    enum: ['tag', 'topic', 'lexical', 'embedding']
                  }
                },
                required: ['id', 'source', 'target', 'kind', 'label'],
                additionalProperties: false
              }
            },
            unresolved: {
              type: 'number'
            },
            coverage: {
              type: 'object',
              properties: {
                eligible: {
                  type: 'number'
                },
                analyzed: {
                  type: 'number'
                },
                embedded: {
                  type: 'number'
                },
                topics: {
                  type: 'number'
                },
                tags: {
                  type: 'number'
                },
                omittedTags: {
                  type: 'number'
                }
              },
              required: [
                'eligible',
                'analyzed',
                'embedded',
                'topics',
                'tags',
                'omittedTags'
              ],
              additionalProperties: false
            }
          },
          required: ['nodes', 'edges', 'unresolved', 'coverage'],
          additionalProperties: false
        }
      }
    }
  },
  ai: {
    imageGeneration: {
      generateImage: {
        method: 'post',
        description: 'Render an image from a text description',
        noAuth: false,
        encrypted: true,
        isDownloadable: false,
        media: null,
        input: {
          body: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              prompt: {
                type: 'string',
                minLength: 1,
                maxLength: 32000
              }
            },
            required: ['prompt'],
            additionalProperties: false
          }
        },
        output: {
          OK: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'string'
          }
        }
      }
    },
    shared: {
      embed: {
        method: 'post',
        description: 'Embed bounded text on the shared Mac mini',
        noAuth: false,
        encrypted: true,
        isDownloadable: false,
        media: null,
        input: {
          body: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              texts: {
                minItems: 1,
                maxItems: 16,
                type: 'array',
                items: {
                  type: 'string',
                  minLength: 1,
                  maxLength: 7600
                }
              },
              purpose: {
                default: 'document',
                type: 'string',
                enum: ['query', 'document']
              }
            },
            required: ['texts', 'purpose'],
            additionalProperties: false
          }
        },
        output: {
          OK: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              model: {
                type: 'string'
              },
              vectors: {
                type: 'array',
                items: {
                  minItems: 768,
                  maxItems: 768,
                  type: 'array',
                  items: {
                    type: 'number'
                  }
                }
              }
            },
            required: ['model', 'vectors'],
            additionalProperties: false
          }
        }
      },
      generate: {
        method: 'post',
        description: 'Run text or image understanding on the shared Mac mini',
        noAuth: false,
        encrypted: true,
        isDownloadable: false,
        media: null,
        input: {
          body: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              prompt: {
                type: 'string',
                minLength: 1,
                maxLength: 12000
              },
              image: {
                type: 'string',
                maxLength: 11000000,
                pattern: '^data:image\\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$'
              }
            },
            required: ['prompt'],
            additionalProperties: false
          }
        },
        output: {
          OK: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              model: {
                type: 'string'
              },
              text: {
                type: 'string'
              }
            },
            required: ['model', 'text'],
            additionalProperties: false
          }
        }
      },
      rerank: {
        method: 'post',
        description: 'Score retrieved evidence using Mac mini Laya',
        noAuth: false,
        encrypted: true,
        isDownloadable: false,
        media: null,
        input: {
          body: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              query: {
                type: 'string',
                minLength: 1,
                maxLength: 800
              },
              items: {
                minItems: 1,
                maxItems: 12,
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'integer',
                      minimum: -9007199254740991,
                      maximum: 9007199254740991
                    },
                    passage: {
                      type: 'string',
                      minLength: 1,
                      maxLength: 1400
                    }
                  },
                  required: ['id', 'passage'],
                  additionalProperties: false
                }
              }
            },
            required: ['query', 'items'],
            additionalProperties: false
          }
        },
        output: {
          OK: {
            $schema: 'https://json-schema.org/draft/2020-12/schema',
            type: 'object',
            properties: {
              model: {
                type: 'string',
                const: 'laya'
              },
              scores: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: {
                      type: 'integer',
                      minimum: -9007199254740991,
                      maximum: 9007199254740991
                    },
                    relevance: {
                      type: 'number',
                      minimum: 0,
                      maximum: 1
                    },
                    confidence: {
                      type: 'number',
                      minimum: 0,
                      maximum: 1
                    },
                    truncated: {
                      type: 'boolean'
                    },
                    model: {
                      type: 'string'
                    }
                  },
                  required: [
                    'id',
                    'relevance',
                    'confidence',
                    'truncated',
                    'model'
                  ],
                  additionalProperties: false
                }
              }
            },
            required: ['model', 'scores'],
            additionalProperties: false
          }
        }
      },
      status: {
        method: 'get',
        description: 'Check the shared Mac mini inference host',
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
              ready: {
                type: 'boolean'
              },
              laya: {
                type: 'boolean'
              },
              host: {
                type: 'string',
                const: 'mac-mini'
              },
              models: {
                type: 'array',
                items: {
                  type: 'string'
                }
              }
            },
            required: ['ready', 'laya', 'host', 'models'],
            additionalProperties: false
          }
        }
      }
    }
  },
  locations: {
    search: {
      method: 'get',
      description: 'Find places by name or address',
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
              type: 'string',
              minLength: 1,
              maxLength: 1000
            }
          },
          required: ['q'],
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
        }
      }
    }
  },
  pixabay: {
    searchImages: {
      method: 'get',
      description: 'Search the configured image catalog',
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
              type: 'string',
              minLength: 1,
              maxLength: 200
            },
            page: {
              default: '1',
              type: 'string',
              maxLength: 6,
              pattern: '^[1-9]\\d*$'
            },
            type: {
              default: 'all',
              type: 'string',
              enum: ['all', 'photo', 'illustration', 'vector']
            },
            category: {
              type: 'string',
              enum: [
                'backgrounds',
                'fashion',
                'nature',
                'science',
                'education',
                'feelings',
                'health',
                'people',
                'religion',
                'places',
                'animals',
                'industry',
                'computer',
                'food',
                'sports',
                'transportation',
                'travel',
                'buildings',
                'business',
                'music'
              ]
            },
            colors: {
              anyOf: [
                {
                  type: 'string',
                  enum: [
                    'grayscale',
                    'transparent',
                    'red',
                    'orange',
                    'yellow',
                    'green',
                    'turquoise',
                    'blue',
                    'lilac',
                    'pink',
                    'white',
                    'gray',
                    'black',
                    'brown'
                  ]
                },
                {
                  type: 'null'
                }
              ]
            },
            editors_choice: {
              default: 'false',
              type: 'string',
              enum: ['true', 'false']
            }
          },
          required: ['q', 'page', 'type', 'editors_choice'],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            total: {
              type: 'number'
            },
            hits: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string'
                  },
                  imageURL: {
                    type: 'string'
                  },
                  thumbnail: {
                    type: 'object',
                    properties: {
                      url: {
                        type: 'string'
                      },
                      width: {
                        type: 'number'
                      },
                      height: {
                        type: 'number'
                      }
                    },
                    required: ['url', 'width', 'height'],
                    additionalProperties: false
                  }
                },
                required: ['id', 'imageURL', 'thumbnail'],
                additionalProperties: false
              }
            }
          },
          required: ['total', 'hits'],
          additionalProperties: false
        }
      }
    }
  },
  corsAnywhere: {
    method: 'get',
    description: 'Read remote text or JSON through the authenticated workspace',
    noAuth: false,
    encrypted: true,
    isDownloadable: false,
    media: null,
    input: {
      query: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
          url: {
            type: 'string',
            format: 'uri'
          }
        },
        required: ['url'],
        additionalProperties: false
      }
    },
    output: {
      OK: {
        $schema: 'https://json-schema.org/draft/2020-12/schema'
      }
    }
  }
} as const

export default contract
