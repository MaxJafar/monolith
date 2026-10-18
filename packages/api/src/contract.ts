export const contract = {
  '': {
    method: 'get',
    description: 'Welcome to Monolith API',
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
  locales: {
    listLanguages: {
      method: 'get',
      description: 'List all languages',
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
      description: 'Retrieve localization strings for namespace',
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
      description:
        "List modules that do not support the user's currently selected language",
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
        description: 'Create the first user (only works when no users exist)',
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
      description: 'Get current user data',
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
                avatar: {
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
                },
                bgImage: {
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
                'backdropFilters',
                'fontFamily',
                'dashboardLayout',
                'fontScale',
                'borderRadiusMultiplier',
                'bordered',
                'language',
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
        description: 'Remove user avatar',
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
        description: 'Upload new user avatar',
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
            required: ['key', 'originalName', 'mimeType', 'size', 'thumbs'],
            additionalProperties: false
          }
        }
      },
      updatePassword: {
        method: 'post',
        description: 'Update user password directly',
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
        description: 'Update user profile information',
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
        description: 'Remove background image',
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
        description: 'Upload new background image',
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
            required: ['key', 'originalName', 'mimeType', 'size', 'thumbs'],
            additionalProperties: false
          }
        }
      },
      updatePersonalization: {
        method: 'post',
        description: 'Update user personalization preferences',
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
            required: ['key', 'originalName', 'mimeType', 'size', 'thumbs'],
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
  fonts: {
    google: {
      get: {
        method: 'get',
        description: 'Get details of a specific Google Font',
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
                type: 'string'
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
                    version: {
                      type: 'string'
                    },
                    lastModified: {
                      type: 'string'
                    },
                    files: {
                      type: 'object',
                      properties: {
                        '100': {
                          type: 'string'
                        },
                        '200': {
                          type: 'string'
                        },
                        '300': {
                          type: 'string'
                        },
                        '500': {
                          type: 'string'
                        },
                        '600': {
                          type: 'string'
                        },
                        '700': {
                          type: 'string'
                        },
                        '800': {
                          type: 'string'
                        },
                        '900': {
                          type: 'string'
                        },
                        regular: {
                          type: 'string'
                        },
                        italic: {
                          type: 'string'
                        },
                        '100italic': {
                          type: 'string'
                        },
                        '200italic': {
                          type: 'string'
                        },
                        '300italic': {
                          type: 'string'
                        },
                        '500italic': {
                          type: 'string'
                        },
                        '600italic': {
                          type: 'string'
                        },
                        '700italic': {
                          type: 'string'
                        },
                        '800italic': {
                          type: 'string'
                        },
                        '900italic': {
                          type: 'string'
                        }
                      },
                      additionalProperties: false
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
                    'variants',
                    'subsets',
                    'version',
                    'lastModified',
                    'files',
                    'category',
                    'kind',
                    'menu'
                  ],
                  additionalProperties: false
                }
              }
            },
            required: ['enabled'],
            additionalProperties: false
          }
        }
      },
      list: {
        method: 'get',
        description: 'Retrieve available Google Fonts',
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
                    version: {
                      type: 'string'
                    },
                    lastModified: {
                      type: 'string'
                    },
                    files: {
                      type: 'object',
                      properties: {
                        '100': {
                          type: 'string'
                        },
                        '200': {
                          type: 'string'
                        },
                        '300': {
                          type: 'string'
                        },
                        '500': {
                          type: 'string'
                        },
                        '600': {
                          type: 'string'
                        },
                        '700': {
                          type: 'string'
                        },
                        '800': {
                          type: 'string'
                        },
                        '900': {
                          type: 'string'
                        },
                        regular: {
                          type: 'string'
                        },
                        italic: {
                          type: 'string'
                        },
                        '100italic': {
                          type: 'string'
                        },
                        '200italic': {
                          type: 'string'
                        },
                        '300italic': {
                          type: 'string'
                        },
                        '500italic': {
                          type: 'string'
                        },
                        '600italic': {
                          type: 'string'
                        },
                        '700italic': {
                          type: 'string'
                        },
                        '800italic': {
                          type: 'string'
                        },
                        '900italic': {
                          type: 'string'
                        }
                      },
                      additionalProperties: false
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
                    'variants',
                    'subsets',
                    'version',
                    'lastModified',
                    'files',
                    'category',
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
        description: 'Get a specific custom font by ID',
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
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
              },
              displayName: {
                type: 'string',
                maxLength: 255
              },
              family: {
                type: 'string',
                maxLength: 255
              },
              weight: {
                type: 'number',
                minimum: -8388608,
                maximum: 8388607
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
              'displayName',
              'family',
              'weight',
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
        description: 'List all custom uploaded fonts',
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
                displayName: {
                  type: 'string',
                  maxLength: 255
                },
                family: {
                  type: 'string',
                  maxLength: 255
                },
                weight: {
                  type: 'number',
                  minimum: -8388608,
                  maximum: 8388607
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
                'displayName',
                'family',
                'weight',
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
        description: 'Delete a custom font',
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
      upload: {
        method: 'post',
        description: 'Upload a new custom font',
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
                type: 'string'
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
                minLength: 1
              },
              family: {
                type: 'string',
                minLength: 1
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
              id: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
              },
              displayName: {
                type: 'string',
                maxLength: 255
              },
              family: {
                type: 'string',
                maxLength: 255
              },
              weight: {
                type: 'number',
                minimum: -8388608,
                maximum: 8388607
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
              'displayName',
              'family',
              'weight',
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
        description: 'Retrieve pinned Google Fonts',
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
        description: 'Pin or unpin a Google Font',
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
                type: 'string'
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
  apiKeys: {
    entries: {
      get: {
        method: 'get',
        description:
          'Retrieve API key by key ID. Only exposable keys can be retrieved.',
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
        description: 'Retrieve all API key entries',
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
                keyId: {
                  type: 'string',
                  maxLength: 255
                },
                name: {
                  type: 'string',
                  maxLength: 255
                },
                icon: {
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
                'keyId',
                'name',
                'icon',
                'key',
                'exposable',
                'created',
                'updated'
              ],
              additionalProperties: false
            }
          }
        }
      },
      checkKeys: {
        method: 'get',
        description: 'Verify if API keys exist.',
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
        description: 'Create a new API key entry',
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
              keyId: {
                type: 'string',
                maxLength: 255
              },
              name: {
                type: 'string',
                maxLength: 255
              },
              icon: {
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
              'keyId',
              'name',
              'icon',
              'key',
              'exposable',
              'created',
              'updated'
            ],
            additionalProperties: false
          }
        }
      },
      update: {
        method: 'post',
        description: 'Update an existing API key entry',
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
              keyId: {
                type: 'string',
                maxLength: 255
              },
              name: {
                type: 'string',
                maxLength: 255
              },
              icon: {
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
              'keyId',
              'name',
              'icon',
              'key',
              'exposable',
              'created',
              'updated'
            ],
            additionalProperties: false
          }
        }
      },
      remove: {
        method: 'post',
        description: 'Delete an API key entry',
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
  auth: {
    '2fa': {
      disable: {
        method: 'post',
        description: 'Disable two-factor authentication',
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
        description: 'Verify OTP and enable two-factor authentication',
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
        description: 'Generate 2FA authenticator app setup link',
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
        description: 'Verify two-factor authentication code during login',
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
      description: 'Authenticate user with email and password',
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
      description: 'Invalidate refresh token and clear session',
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
        description: 'Start OAuth authorization flow',
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
                type: 'string'
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
        description: 'Verify OAuth authorization callback',
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
                type: 'string'
              },
              code: {
                type: 'string'
              },
              state: {
                type: 'string'
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
          description: 'List enabled OAuth providers for the login portal',
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
          description:
            'List all available OAuth provider options for configuration',
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
                    anyOf: [
                      {
                        type: 'string'
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  provider: {
                    type: 'string'
                  },
                  configured: {
                    type: 'boolean'
                  },
                  enabled: {
                    type: 'boolean'
                  },
                  icon: {
                    type: 'string'
                  },
                  name: {
                    type: 'string'
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
                  'id',
                  'provider',
                  'configured',
                  'enabled',
                  'icon',
                  'name',
                  'updated'
                ],
                additionalProperties: false
              }
            }
          }
        },
        remove: {
          method: 'post',
          description: 'Delete OAuth provider configuration',
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
        toggle: {
          method: 'post',
          description: 'Toggle OAuth provider enabled status',
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
        upsert: {
          method: 'post',
          description: 'Update OAuth provider configuration',
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
                  type: 'string'
                },
                clientSecret: {
                  type: 'string'
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
        description: 'Approve a QR login request from an authenticated device',
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
        description: 'Claim approved QR login session and set auth cookie',
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
        description: 'Register a new QR login session',
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
        description: 'Check QR login session status',
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
      description: 'Refresh access token using refresh token cookie',
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
  pixabay: {
    searchImages: {
      method: 'get',
      description: 'Search for images on Pixabay',
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
              minLength: 1
            },
            page: {
              default: '1',
              type: 'string'
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
                  },
                  imageURL: {
                    type: 'string'
                  }
                },
                required: ['id', 'thumbnail', 'imageURL'],
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
  locations: {
    search: {
      method: 'get',
      description: 'Search for locations using Google Places API',
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
  modules: {
    checkModuleAvailability: {
      method: 'get',
      description: 'Check if a module is available (installed)',
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
      description: 'List installed modules with metadata',
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
              name: {
                type: 'string'
              },
              id: {
                type: 'string'
              },
              remoteId: {
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
              }
            },
            required: [
              'name',
              'id',
              'remoteId',
              'displayName',
              'version',
              'description',
              'author',
              'icon',
              'category'
            ],
            additionalProperties: false
          }
        }
      }
    },
    manifest: {
      method: 'get',
      description: 'Get installed modules manifest for runtime loading',
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
                  name: {
                    type: 'string'
                  },
                  id: {
                    type: 'string'
                  },
                  remoteId: {
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
                  remoteEntryUrl: {
                    type: 'string'
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
                  'id',
                  'remoteId',
                  'displayName',
                  'icon',
                  'category',
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
      description: 'Get all available widgets configuration',
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
        description: 'Translate a specific category into desired languages',
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
              languages: {
                type: 'array',
                items: {
                  type: 'string'
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
        description: 'Get the category display order',
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
        description: 'Update the category display order',
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
  ai: {
    imageGeneration: {
      generateImage: {
        method: 'post',
        description: 'Generate image from text prompt using AI',
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
                minLength: 1
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
  files: {
    get: {
      method: 'get',
      description: 'Retrieve a stored file or thumbnail',
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
              type: 'string'
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
  ping: {
    method: 'post',
    description: 'Ping the server',
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
  status: {
    method: 'get',
    description: 'Get server status',
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
  corsAnywhere: {
    method: 'get',
    description: 'CORS Anywhere - Fetch external URL content',
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
  },
  encryptionPublicKey: {
    method: 'get',
    description: 'Get server public key for end-to-end encryption',
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
  }
} as const

export default contract
