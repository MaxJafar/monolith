export const contract = {
  containers: {
    create: {
      method: 'post',
      description: 'Create a new container',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: {
        cover: {
          optional: true
        }
      },
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
            },
            cover: {
              type: 'string'
            },
            pinned: {
              type: 'boolean'
            },
            hidden: {
              type: 'boolean'
            }
          },
          required: [
            'id',
            'name',
            'icon',
            'color',
            'cover',
            'pinned',
            'hidden'
          ],
          additionalProperties: false
        }
      }
    },
    list: {
      method: 'get',
      description: 'Get all containers with stats',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        query: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            hidden: {
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
              name: {
                type: 'string'
              },
              icon: {
                type: 'string'
              },
              color: {
                type: 'string'
              },
              cover: {
                type: 'string'
              },
              pinned: {
                type: 'boolean'
              },
              hidden: {
                type: 'boolean'
              },
              text_count: {
                type: 'number'
              },
              link_count: {
                type: 'number'
              },
              image_count: {
                type: 'number'
              }
            },
            required: [
              'id',
              'name',
              'icon',
              'color',
              'cover',
              'pinned',
              'hidden',
              'text_count',
              'link_count',
              'image_count'
            ],
            additionalProperties: false
          }
        }
      }
    },
    remove: {
      method: 'post',
      description: 'Delete a container',
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
    toggleHide: {
      method: 'post',
      description: 'Toggle visibility of a container',
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
            name: {
              type: 'string'
            },
            icon: {
              type: 'string'
            },
            color: {
              type: 'string'
            },
            cover: {
              type: 'string'
            },
            pinned: {
              type: 'boolean'
            },
            hidden: {
              type: 'boolean'
            }
          },
          required: [
            'id',
            'name',
            'icon',
            'color',
            'cover',
            'pinned',
            'hidden'
          ],
          additionalProperties: false
        }
      }
    },
    togglePin: {
      method: 'post',
      description: 'Toggle pin status of a container',
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
            name: {
              type: 'string'
            },
            icon: {
              type: 'string'
            },
            color: {
              type: 'string'
            },
            cover: {
              type: 'string'
            },
            pinned: {
              type: 'boolean'
            },
            hidden: {
              type: 'boolean'
            }
          },
          required: [
            'id',
            'name',
            'icon',
            'color',
            'cover',
            'pinned',
            'hidden'
          ],
          additionalProperties: false
        }
      }
    },
    update: {
      method: 'post',
      description: 'Update an existing container',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: {
        cover: {
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
            },
            cover: {
              type: 'string'
            },
            pinned: {
              type: 'boolean'
            },
            hidden: {
              type: 'boolean'
            }
          },
          required: [
            'id',
            'name',
            'icon',
            'color',
            'cover',
            'pinned',
            'hidden'
          ],
          additionalProperties: false
        }
      }
    },
    validate: {
      method: 'get',
      description: 'Validate if a container exists',
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
          type: 'boolean'
        }
      }
    }
  },
  folders: {
    create: {
      method: 'post',
      description: 'Create a new folder',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            container: {
              type: 'string'
            },
            name: {
              type: 'string',
              minLength: 1
            },
            color: {
              type: 'string'
            },
            icon: {
              type: 'string'
            },
            parent: {
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
            }
          },
          required: ['container', 'name', 'color', 'icon'],
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
            container: {
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
            parent: {
              type: 'string'
            }
          },
          required: ['id', 'container', 'name', 'color', 'icon', 'parent'],
          additionalProperties: false
        }
      }
    },
    list: {
      method: 'get',
      description: 'Get all folders in a path',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        query: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            container: {
              type: 'string'
            },
            path: {
              type: 'string'
            }
          },
          required: ['container', 'path'],
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
              container: {
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
              parent: {
                type: 'string'
              }
            },
            required: ['id', 'container', 'name', 'color', 'icon', 'parent'],
            additionalProperties: false
          }
        }
      }
    },
    moveTo: {
      method: 'post',
      description: 'Move folder to another parent',
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
            target: {
              type: 'string'
            }
          },
          required: ['target'],
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
            container: {
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
            parent: {
              type: 'string'
            }
          },
          required: ['id', 'container', 'name', 'color', 'icon', 'parent'],
          additionalProperties: false
        }
      }
    },
    remove: {
      method: 'post',
      description: 'Delete a folder',
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
    removeFromParent: {
      method: 'post',
      description: 'Move folder to parent folder',
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
            container: {
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
            parent: {
              type: 'string'
            }
          },
          required: ['id', 'container', 'name', 'color', 'icon', 'parent'],
          additionalProperties: false
        }
      }
    },
    update: {
      method: 'post',
      description: 'Update folder details',
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
              type: 'string',
              minLength: 1
            },
            color: {
              type: 'string'
            },
            icon: {
              type: 'string'
            }
          },
          required: ['name', 'color', 'icon'],
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
            container: {
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
            parent: {
              type: 'string'
            }
          },
          required: ['id', 'container', 'name', 'color', 'icon', 'parent'],
          additionalProperties: false
        }
      }
    }
  },
  ideas: {
    archive: {
      method: 'post',
      description: 'Toggle archive status of an idea',
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
            type: {
              type: 'string',
              enum: ['text', 'image', 'link']
            },
            container: {
              type: 'string'
            },
            folder: {
              type: 'string'
            },
            pinned: {
              type: 'boolean'
            },
            archived: {
              type: 'boolean'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              }
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
            'type',
            'container',
            'folder',
            'pinned',
            'archived',
            'tags',
            'created',
            'updated'
          ],
          additionalProperties: false
        }
      }
    },
    create: {
      method: 'post',
      description: 'Create a new idea entry',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: {
        image: {
          optional: true
        }
      },
      input: {
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          oneOf: [
            {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  const: 'text'
                },
                container: {
                  type: 'string'
                },
                folder: {
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
                tags: {
                  type: 'array',
                  items: {
                    type: 'string'
                  }
                },
                content: {
                  type: 'string'
                }
              },
              required: ['type', 'container', 'tags', 'content'],
              additionalProperties: false
            },
            {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  const: 'image'
                },
                container: {
                  type: 'string'
                },
                folder: {
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
                tags: {
                  type: 'array',
                  items: {
                    type: 'string'
                  }
                }
              },
              required: ['type', 'container', 'tags'],
              additionalProperties: false
            },
            {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  const: 'link'
                },
                container: {
                  type: 'string'
                },
                folder: {
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
                tags: {
                  type: 'array',
                  items: {
                    type: 'string'
                  }
                },
                link: {
                  type: 'string',
                  format: 'uri'
                }
              },
              required: ['type', 'container', 'tags', 'link'],
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
              enum: ['text', 'image', 'link']
            },
            container: {
              type: 'string'
            },
            folder: {
              type: 'string'
            },
            pinned: {
              type: 'boolean'
            },
            archived: {
              type: 'boolean'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              }
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
            'type',
            'container',
            'folder',
            'pinned',
            'archived',
            'tags',
            'created',
            'updated'
          ],
          additionalProperties: false
        }
      }
    },
    list: {
      method: 'get',
      description: 'Get all ideas from a folder or idea container',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        query: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            container: {
              type: 'string'
            },
            path: {
              type: 'string'
            },
            archived: {
              type: 'string'
            }
          },
          required: ['container', 'path'],
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
                  id: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  type: {
                    type: 'string',
                    const: 'text'
                  },
                  container: {
                    type: 'string'
                  },
                  folder: {
                    type: 'string'
                  },
                  pinned: {
                    type: 'boolean'
                  },
                  archived: {
                    type: 'boolean'
                  },
                  tags: {
                    type: 'array',
                    items: {
                      type: 'string'
                    }
                  },
                  created: {
                    type: 'string',
                    format: 'date-time'
                  },
                  updated: {
                    type: 'string',
                    format: 'date-time'
                  },
                  content: {
                    type: 'string'
                  }
                },
                required: [
                  'id',
                  'type',
                  'container',
                  'folder',
                  'pinned',
                  'archived',
                  'tags',
                  'created',
                  'updated',
                  'content'
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
                    const: 'image'
                  },
                  container: {
                    type: 'string'
                  },
                  folder: {
                    type: 'string'
                  },
                  pinned: {
                    type: 'boolean'
                  },
                  archived: {
                    type: 'boolean'
                  },
                  tags: {
                    type: 'array',
                    items: {
                      type: 'string'
                    }
                  },
                  created: {
                    type: 'string',
                    format: 'date-time'
                  },
                  updated: {
                    type: 'string',
                    format: 'date-time'
                  },
                  image: {
                    type: 'string'
                  }
                },
                required: [
                  'id',
                  'type',
                  'container',
                  'folder',
                  'pinned',
                  'archived',
                  'tags',
                  'created',
                  'updated',
                  'image'
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
                    const: 'link'
                  },
                  container: {
                    type: 'string'
                  },
                  folder: {
                    type: 'string'
                  },
                  pinned: {
                    type: 'boolean'
                  },
                  archived: {
                    type: 'boolean'
                  },
                  tags: {
                    type: 'array',
                    items: {
                      type: 'string'
                    }
                  },
                  created: {
                    type: 'string',
                    format: 'date-time'
                  },
                  updated: {
                    type: 'string',
                    format: 'date-time'
                  },
                  link: {
                    type: 'string'
                  }
                },
                required: [
                  'id',
                  'type',
                  'container',
                  'folder',
                  'pinned',
                  'archived',
                  'tags',
                  'created',
                  'updated',
                  'link'
                ],
                additionalProperties: false
              }
            ]
          }
        }
      }
    },
    moveTo: {
      method: 'post',
      description: 'Move an idea to another folder',
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
            target: {
              type: 'string'
            }
          },
          required: ['target'],
          additionalProperties: false
        }
      },
      output: {
        NO_CONTENT: true
      }
    },
    pin: {
      method: 'post',
      description: 'Toggle pin status of an idea',
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
            type: {
              type: 'string',
              enum: ['text', 'image', 'link']
            },
            container: {
              type: 'string'
            },
            folder: {
              type: 'string'
            },
            pinned: {
              type: 'boolean'
            },
            archived: {
              type: 'boolean'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              }
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
            'type',
            'container',
            'folder',
            'pinned',
            'archived',
            'tags',
            'created',
            'updated'
          ],
          additionalProperties: false
        }
      }
    },
    remove: {
      method: 'post',
      description: 'Delete an idea',
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
    removeFromParent: {
      method: 'post',
      description: 'Move idea to parent folder',
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
      description: 'Update an existing idea',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: {
        image: {
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
          oneOf: [
            {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  const: 'text'
                },
                tags: {
                  type: 'array',
                  items: {
                    type: 'string'
                  }
                },
                content: {
                  type: 'string'
                }
              },
              required: ['type', 'tags', 'content'],
              additionalProperties: false
            },
            {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  const: 'image'
                },
                tags: {
                  type: 'array',
                  items: {
                    type: 'string'
                  }
                }
              },
              required: ['type', 'tags'],
              additionalProperties: false
            },
            {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  const: 'link'
                },
                tags: {
                  type: 'array',
                  items: {
                    type: 'string'
                  }
                },
                link: {
                  type: 'string',
                  format: 'uri'
                }
              },
              required: ['type', 'tags', 'link'],
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
              enum: ['text', 'image', 'link']
            },
            container: {
              type: 'string'
            },
            folder: {
              type: 'string'
            },
            pinned: {
              type: 'boolean'
            },
            archived: {
              type: 'boolean'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              }
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
            'type',
            'container',
            'folder',
            'pinned',
            'archived',
            'tags',
            'created',
            'updated'
          ],
          additionalProperties: false
        }
      }
    }
  },
  tags: {
    create: {
      method: 'post',
      description: 'Create a new tag',
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
            container: {
              type: 'string'
            }
          },
          required: ['name', 'icon', 'color', 'container'],
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
            container: {
              type: 'string'
            }
          },
          required: ['id', 'name', 'icon', 'color', 'container'],
          additionalProperties: false
        }
      }
    },
    list: {
      method: 'get',
      description: 'Get all tags in a container',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        query: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            container: {
              type: 'string'
            }
          },
          required: ['container'],
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
              icon: {
                type: 'string'
              },
              color: {
                type: 'string'
              },
              container: {
                type: 'string'
              },
              amount: {
                type: 'number'
              }
            },
            required: ['id', 'name', 'icon', 'color', 'container', 'amount'],
            additionalProperties: false
          }
        }
      }
    },
    remove: {
      method: 'post',
      description: 'Delete a tag',
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
      description: 'Update an existing tag',
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
            },
            container: {
              type: 'string'
            }
          },
          required: ['id', 'name', 'icon', 'color', 'container'],
          additionalProperties: false
        }
      }
    }
  },
  misc: {
    checkValid: {
      method: 'get',
      description: 'Validate if a folder path exists',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        query: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            container: {
              type: 'string'
            },
            path: {
              type: 'string'
            }
          },
          required: ['container', 'path'],
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
    getOgData: {
      method: 'get',
      description: 'Get Open Graph metadata for a link entry',
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
            ogTitle: {
              type: 'string'
            },
            ogDescription: {
              type: 'string'
            },
            ogSiteName: {
              type: 'string'
            },
            ogImage: {
              type: 'array',
              items: {
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
                  },
                  type: {
                    type: 'string'
                  }
                },
                required: ['url'],
                additionalProperties: false
              }
            }
          },
          additionalProperties: false
        }
      }
    },
    getPath: {
      method: 'get',
      description: 'Get path information for a container or folder',
      noAuth: false,
      encrypted: true,
      isDownloadable: false,
      media: null,
      input: {
        query: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            container: {
              type: 'string'
            },
            folder: {
              type: 'string'
            }
          },
          required: ['container'],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            container: {
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
                cover: {
                  type: 'string'
                },
                pinned: {
                  type: 'boolean'
                },
                hidden: {
                  type: 'boolean'
                }
              },
              required: [
                'id',
                'name',
                'icon',
                'color',
                'cover',
                'pinned',
                'hidden'
              ],
              additionalProperties: false
            },
            route: {
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
                  container: {
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
                  parent: {
                    type: 'string'
                  }
                },
                required: [
                  'id',
                  'container',
                  'name',
                  'color',
                  'icon',
                  'parent'
                ],
                additionalProperties: false
              }
            }
          },
          required: ['container', 'route'],
          additionalProperties: false
        }
      }
    },
    search: {
      method: 'get',
      description: 'Search entries in a container',
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
            container: {
              type: 'string'
            },
            tags: {
              type: 'string'
            },
            folder: {
              type: 'string'
            }
          },
          required: ['q', 'container'],
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
                const: 'text'
              },
              container: {
                type: 'string'
              },
              folder: {
                type: 'string'
              },
              pinned: {
                type: 'boolean'
              },
              archived: {
                type: 'boolean'
              },
              tags: {
                type: 'array',
                items: {
                  type: 'string'
                }
              },
              created: {
                type: 'string',
                format: 'date-time'
              },
              updated: {
                type: 'string',
                format: 'date-time'
              },
              content: {
                type: 'string'
              },
              fullPath: {
                type: 'string'
              },
              expand: {
                type: 'object',
                properties: {
                  folder: {
                    type: 'object',
                    properties: {
                      id: {
                        type: 'string',
                        format: 'uuid',
                        pattern:
                          '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                      },
                      container: {
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
                      parent: {
                        type: 'string'
                      }
                    },
                    required: [
                      'id',
                      'container',
                      'name',
                      'color',
                      'icon',
                      'parent'
                    ],
                    additionalProperties: false
                  }
                },
                additionalProperties: false
              }
            },
            required: [
              'id',
              'type',
              'container',
              'folder',
              'pinned',
              'archived',
              'tags',
              'created',
              'updated',
              'content',
              'fullPath',
              'expand'
            ],
            additionalProperties: false
          }
        }
      }
    }
  }
} as const

export default contract
