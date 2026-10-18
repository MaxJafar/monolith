export const contract = {
  workspaces: {
    method: 'get',
    description: 'List accessible workspaces',
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
            owner_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            name: {
              type: 'string',
              maxLength: 160
            },
            icon: {
              type: 'string',
              maxLength: 80
            },
            profile: {
              type: 'string',
              enum: ['personal', 'collaborative', 'agents']
            },
            enabled_modules: {
              maxItems: 64,
              type: 'array',
              items: {
                type: 'string',
                maxLength: 80,
                pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$'
              }
            },
            description: {
              type: 'string'
            },
            is_default: {
              type: 'boolean'
            },
            native_imported: {
              type: 'boolean'
            },
            navigation: {
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
            created: {
              type: 'string',
              format: 'date-time'
            },
            updated: {
              type: 'string',
              format: 'date-time'
            },
            role: {
              type: 'string',
              enum: ['owner', 'editor', 'viewer']
            }
          },
          required: [
            'id',
            'owner_id',
            'name',
            'icon',
            'profile',
            'enabled_modules',
            'description',
            'is_default',
            'native_imported',
            'navigation',
            'created',
            'updated',
            'role'
          ],
          additionalProperties: false
        }
      }
    }
  },
  projects: {
    create: {
      method: 'post',
      description: 'Create a Redraw project',
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
        },
        body: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            title: {
              type: 'string',
              minLength: 1,
              maxLength: 160
            },
            document: {
              type: 'object',
              properties: {
                version: {
                  type: 'number',
                  const: 1
                },
                tags: {
                  maxItems: 30,
                  type: 'array',
                  items: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 80
                  }
                },
                prototypeStart: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                pages: {
                  minItems: 1,
                  maxItems: 40,
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
                        minLength: 1,
                        maxLength: 160
                      },
                      mode: {
                        type: 'string',
                        enum: ['blackboard', 'canvas']
                      },
                      background: {
                        type: 'string',
                        pattern: '^#[\\da-f]{6}$'
                      },
                      elements: {
                        maxItems: 2000,
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
                            kind: {
                              type: 'string',
                              enum: [
                                'rectangle',
                                'ellipse',
                                'diamond',
                                'text',
                                'sticky',
                                'node',
                                'frame',
                                'path',
                                'image'
                              ]
                            },
                            name: {
                              type: 'string',
                              maxLength: 160
                            },
                            x: {
                              type: 'number',
                              minimum: -100000,
                              maximum: 100000
                            },
                            y: {
                              type: 'number',
                              minimum: -100000,
                              maximum: 100000
                            },
                            width: {
                              type: 'number',
                              minimum: 1,
                              maximum: 20000
                            },
                            height: {
                              type: 'number',
                              minimum: 1,
                              maximum: 20000
                            },
                            rotation: {
                              type: 'number',
                              minimum: -360,
                              maximum: 360
                            },
                            fill: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            fillOpacity: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1
                            },
                            stroke: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            strokeWidth: {
                              type: 'number',
                              minimum: 0,
                              maximum: 40
                            },
                            opacity: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1
                            },
                            radius: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1000
                            },
                            text: {
                              type: 'string',
                              maxLength: 10000
                            },
                            fontSize: {
                              type: 'number',
                              minimum: 8,
                              maximum: 400
                            },
                            fontWeight: {
                              type: 'string',
                              enum: ['400', '600', '700']
                            },
                            textColor: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            align: {
                              type: 'string',
                              enum: ['left', 'center', 'right']
                            },
                            locked: {
                              type: 'boolean'
                            },
                            hidden: {
                              type: 'boolean'
                            },
                            group: {
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
                            parent: {
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
                            layout: {
                              type: 'object',
                              properties: {
                                direction: {
                                  type: 'string',
                                  enum: ['horizontal', 'vertical']
                                },
                                gap: {
                                  type: 'number',
                                  minimum: 0,
                                  maximum: 2000
                                },
                                padding: {
                                  type: 'object',
                                  properties: {
                                    top: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    },
                                    right: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    },
                                    bottom: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    },
                                    left: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    }
                                  },
                                  required: ['top', 'right', 'bottom', 'left'],
                                  additionalProperties: false
                                },
                                align: {
                                  type: 'string',
                                  enum: ['start', 'center', 'end', 'stretch']
                                },
                                justify: {
                                  type: 'string',
                                  enum: [
                                    'start',
                                    'center',
                                    'end',
                                    'space-between'
                                  ]
                                },
                                wrap: {
                                  type: 'boolean'
                                }
                              },
                              required: [
                                'direction',
                                'gap',
                                'padding',
                                'align',
                                'justify',
                                'wrap'
                              ],
                              additionalProperties: false
                            },
                            widthMode: {
                              type: 'string',
                              enum: ['fixed', 'hug', 'fill']
                            },
                            heightMode: {
                              type: 'string',
                              enum: ['fixed', 'hug', 'fill']
                            },
                            component: {
                              type: 'object',
                              properties: {
                                definition: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                instance: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                key: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                overrides: {
                                  maxItems: 40,
                                  type: 'array',
                                  items: {
                                    type: 'string'
                                  }
                                }
                              },
                              required: [
                                'definition',
                                'instance',
                                'key',
                                'overrides'
                              ],
                              additionalProperties: false
                            },
                            points: {
                              maxItems: 10000,
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  x: {
                                    type: 'number',
                                    minimum: -100000,
                                    maximum: 100000
                                  },
                                  y: {
                                    type: 'number',
                                    minimum: -100000,
                                    maximum: 100000
                                  }
                                },
                                required: ['x', 'y'],
                                additionalProperties: false
                              }
                            },
                            pathData: {
                              type: 'string',
                              maxLength: 200000,
                              pattern: '^[MmLlHhVvCcSsQqTtAaZz0-9eE+.,\\s-]*$'
                            },
                            pathViewBox: {
                              type: 'object',
                              properties: {
                                x: {
                                  type: 'number',
                                  minimum: -100000,
                                  maximum: 100000
                                },
                                y: {
                                  type: 'number',
                                  minimum: -100000,
                                  maximum: 100000
                                },
                                width: {
                                  type: 'number',
                                  exclusiveMinimum: 0,
                                  maximum: 20000
                                },
                                height: {
                                  type: 'number',
                                  exclusiveMinimum: 0,
                                  maximum: 20000
                                }
                              },
                              required: ['x', 'y', 'width', 'height'],
                              additionalProperties: false
                            },
                            fillRule: {
                              type: 'string',
                              enum: ['nonzero', 'evenodd']
                            },
                            vector: {
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
                                  closed: {
                                    type: 'boolean'
                                  },
                                  nodes: {
                                    minItems: 1,
                                    maxItems: 2000,
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
                                        x: {
                                          type: 'number',
                                          minimum: -100000,
                                          maximum: 100000
                                        },
                                        y: {
                                          type: 'number',
                                          minimum: -100000,
                                          maximum: 100000
                                        },
                                        mode: {
                                          type: 'string',
                                          enum: [
                                            'corner',
                                            'smooth',
                                            'symmetric'
                                          ]
                                        },
                                        in: {
                                          anyOf: [
                                            {
                                              type: 'object',
                                              properties: {
                                                x: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                },
                                                y: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                }
                                              },
                                              required: ['x', 'y'],
                                              additionalProperties: false
                                            },
                                            {
                                              type: 'null'
                                            }
                                          ]
                                        },
                                        out: {
                                          anyOf: [
                                            {
                                              type: 'object',
                                              properties: {
                                                x: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                },
                                                y: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                }
                                              },
                                              required: ['x', 'y'],
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
                                        'x',
                                        'y',
                                        'mode',
                                        'in',
                                        'out'
                                      ],
                                      additionalProperties: false
                                    }
                                  }
                                },
                                required: ['id', 'closed', 'nodes'],
                                additionalProperties: false
                              }
                            },
                            gradient: {
                              type: 'object',
                              properties: {
                                type: {
                                  type: 'string',
                                  enum: ['linear', 'radial']
                                },
                                transform: {
                                  minItems: 6,
                                  maxItems: 6,
                                  type: 'array',
                                  items: {
                                    type: 'number',
                                    minimum: -100000,
                                    maximum: 100000
                                  }
                                },
                                start: {
                                  type: 'object',
                                  properties: {
                                    x: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    },
                                    y: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    }
                                  },
                                  required: ['x', 'y'],
                                  additionalProperties: false
                                },
                                end: {
                                  type: 'object',
                                  properties: {
                                    x: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    },
                                    y: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    }
                                  },
                                  required: ['x', 'y'],
                                  additionalProperties: false
                                },
                                stops: {
                                  minItems: 2,
                                  maxItems: 32,
                                  type: 'array',
                                  items: {
                                    type: 'object',
                                    properties: {
                                      offset: {
                                        type: 'number',
                                        minimum: 0,
                                        maximum: 1
                                      },
                                      color: {
                                        type: 'string',
                                        pattern: '^#[\\da-f]{6}$'
                                      },
                                      opacity: {
                                        type: 'number',
                                        minimum: 0,
                                        maximum: 1
                                      }
                                    },
                                    required: ['offset', 'color', 'opacity'],
                                    additionalProperties: false
                                  }
                                }
                              },
                              required: ['type', 'start', 'end', 'stops'],
                              additionalProperties: false
                            },
                            fontFamily: {
                              type: 'string',
                              maxLength: 120,
                              pattern: '^[\\p{L}\\p{N} _-]+$'
                            },
                            lineHeight: {
                              type: 'number',
                              minimum: 0.1,
                              maximum: 10
                            },
                            letterSpacing: {
                              type: 'number',
                              minimum: -100,
                              maximum: 100
                            },
                            verticalAlign: {
                              type: 'string',
                              enum: ['top', 'center', 'bottom']
                            },
                            textPadding: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1000
                            },
                            clipContent: {
                              type: 'boolean'
                            },
                            prototype: {
                              type: 'object',
                              properties: {
                                trigger: {
                                  type: 'string',
                                  enum: ['click', 'hover']
                                },
                                action: {
                                  type: 'string',
                                  enum: ['navigate', 'overlay', 'back', 'close']
                                },
                                target: {
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
                                transition: {
                                  type: 'string',
                                  enum: ['instant', 'dissolve']
                                },
                                duration: {
                                  type: 'integer',
                                  minimum: 0,
                                  maximum: 3000
                                }
                              },
                              required: [
                                'trigger',
                                'action',
                                'target',
                                'transition',
                                'duration'
                              ],
                              additionalProperties: false
                            },
                            image: {
                              type: 'string',
                              maxLength: 2000000,
                              pattern:
                                '^(?:|data:image\\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+)$'
                            }
                          },
                          required: [
                            'id',
                            'kind',
                            'name',
                            'x',
                            'y',
                            'width',
                            'height',
                            'rotation',
                            'fill',
                            'stroke',
                            'strokeWidth',
                            'opacity',
                            'radius',
                            'text',
                            'fontSize',
                            'fontWeight',
                            'textColor',
                            'align',
                            'locked',
                            'hidden',
                            'group',
                            'points',
                            'image'
                          ],
                          additionalProperties: false
                        }
                      },
                      connectors: {
                        maxItems: 4000,
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
                            source: {
                              type: 'string',
                              format: 'uuid',
                              pattern:
                                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                            },
                            target: {
                              type: 'string',
                              format: 'uuid',
                              pattern:
                                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                            },
                            label: {
                              type: 'string',
                              maxLength: 200
                            },
                            color: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            style: {
                              type: 'string',
                              enum: ['curve', 'straight']
                            },
                            arrow: {
                              type: 'boolean'
                            }
                          },
                          required: [
                            'id',
                            'source',
                            'target',
                            'label',
                            'color',
                            'style',
                            'arrow'
                          ],
                          additionalProperties: false
                        }
                      }
                    },
                    required: [
                      'id',
                      'name',
                      'mode',
                      'background',
                      'elements',
                      'connectors'
                    ],
                    additionalProperties: false
                  }
                },
                components: {
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
                      name: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 160
                      },
                      elements: {
                        minItems: 1,
                        maxItems: 500,
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
                            kind: {
                              type: 'string',
                              enum: [
                                'rectangle',
                                'ellipse',
                                'diamond',
                                'text',
                                'sticky',
                                'node',
                                'frame',
                                'path',
                                'image'
                              ]
                            },
                            name: {
                              type: 'string',
                              maxLength: 160
                            },
                            x: {
                              type: 'number',
                              minimum: -100000,
                              maximum: 100000
                            },
                            y: {
                              type: 'number',
                              minimum: -100000,
                              maximum: 100000
                            },
                            width: {
                              type: 'number',
                              minimum: 1,
                              maximum: 20000
                            },
                            height: {
                              type: 'number',
                              minimum: 1,
                              maximum: 20000
                            },
                            rotation: {
                              type: 'number',
                              minimum: -360,
                              maximum: 360
                            },
                            fill: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            fillOpacity: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1
                            },
                            stroke: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            strokeWidth: {
                              type: 'number',
                              minimum: 0,
                              maximum: 40
                            },
                            opacity: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1
                            },
                            radius: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1000
                            },
                            text: {
                              type: 'string',
                              maxLength: 10000
                            },
                            fontSize: {
                              type: 'number',
                              minimum: 8,
                              maximum: 400
                            },
                            fontWeight: {
                              type: 'string',
                              enum: ['400', '600', '700']
                            },
                            textColor: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            align: {
                              type: 'string',
                              enum: ['left', 'center', 'right']
                            },
                            locked: {
                              type: 'boolean'
                            },
                            hidden: {
                              type: 'boolean'
                            },
                            group: {
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
                            parent: {
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
                            layout: {
                              type: 'object',
                              properties: {
                                direction: {
                                  type: 'string',
                                  enum: ['horizontal', 'vertical']
                                },
                                gap: {
                                  type: 'number',
                                  minimum: 0,
                                  maximum: 2000
                                },
                                padding: {
                                  type: 'object',
                                  properties: {
                                    top: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    },
                                    right: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    },
                                    bottom: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    },
                                    left: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    }
                                  },
                                  required: ['top', 'right', 'bottom', 'left'],
                                  additionalProperties: false
                                },
                                align: {
                                  type: 'string',
                                  enum: ['start', 'center', 'end', 'stretch']
                                },
                                justify: {
                                  type: 'string',
                                  enum: [
                                    'start',
                                    'center',
                                    'end',
                                    'space-between'
                                  ]
                                },
                                wrap: {
                                  type: 'boolean'
                                }
                              },
                              required: [
                                'direction',
                                'gap',
                                'padding',
                                'align',
                                'justify',
                                'wrap'
                              ],
                              additionalProperties: false
                            },
                            widthMode: {
                              type: 'string',
                              enum: ['fixed', 'hug', 'fill']
                            },
                            heightMode: {
                              type: 'string',
                              enum: ['fixed', 'hug', 'fill']
                            },
                            component: {
                              type: 'object',
                              properties: {
                                definition: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                instance: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                key: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                overrides: {
                                  maxItems: 40,
                                  type: 'array',
                                  items: {
                                    type: 'string'
                                  }
                                }
                              },
                              required: [
                                'definition',
                                'instance',
                                'key',
                                'overrides'
                              ],
                              additionalProperties: false
                            },
                            points: {
                              maxItems: 10000,
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  x: {
                                    type: 'number',
                                    minimum: -100000,
                                    maximum: 100000
                                  },
                                  y: {
                                    type: 'number',
                                    minimum: -100000,
                                    maximum: 100000
                                  }
                                },
                                required: ['x', 'y'],
                                additionalProperties: false
                              }
                            },
                            pathData: {
                              type: 'string',
                              maxLength: 200000,
                              pattern: '^[MmLlHhVvCcSsQqTtAaZz0-9eE+.,\\s-]*$'
                            },
                            pathViewBox: {
                              type: 'object',
                              properties: {
                                x: {
                                  type: 'number',
                                  minimum: -100000,
                                  maximum: 100000
                                },
                                y: {
                                  type: 'number',
                                  minimum: -100000,
                                  maximum: 100000
                                },
                                width: {
                                  type: 'number',
                                  exclusiveMinimum: 0,
                                  maximum: 20000
                                },
                                height: {
                                  type: 'number',
                                  exclusiveMinimum: 0,
                                  maximum: 20000
                                }
                              },
                              required: ['x', 'y', 'width', 'height'],
                              additionalProperties: false
                            },
                            fillRule: {
                              type: 'string',
                              enum: ['nonzero', 'evenodd']
                            },
                            vector: {
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
                                  closed: {
                                    type: 'boolean'
                                  },
                                  nodes: {
                                    minItems: 1,
                                    maxItems: 2000,
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
                                        x: {
                                          type: 'number',
                                          minimum: -100000,
                                          maximum: 100000
                                        },
                                        y: {
                                          type: 'number',
                                          minimum: -100000,
                                          maximum: 100000
                                        },
                                        mode: {
                                          type: 'string',
                                          enum: [
                                            'corner',
                                            'smooth',
                                            'symmetric'
                                          ]
                                        },
                                        in: {
                                          anyOf: [
                                            {
                                              type: 'object',
                                              properties: {
                                                x: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                },
                                                y: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                }
                                              },
                                              required: ['x', 'y'],
                                              additionalProperties: false
                                            },
                                            {
                                              type: 'null'
                                            }
                                          ]
                                        },
                                        out: {
                                          anyOf: [
                                            {
                                              type: 'object',
                                              properties: {
                                                x: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                },
                                                y: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                }
                                              },
                                              required: ['x', 'y'],
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
                                        'x',
                                        'y',
                                        'mode',
                                        'in',
                                        'out'
                                      ],
                                      additionalProperties: false
                                    }
                                  }
                                },
                                required: ['id', 'closed', 'nodes'],
                                additionalProperties: false
                              }
                            },
                            gradient: {
                              type: 'object',
                              properties: {
                                type: {
                                  type: 'string',
                                  enum: ['linear', 'radial']
                                },
                                transform: {
                                  minItems: 6,
                                  maxItems: 6,
                                  type: 'array',
                                  items: {
                                    type: 'number',
                                    minimum: -100000,
                                    maximum: 100000
                                  }
                                },
                                start: {
                                  type: 'object',
                                  properties: {
                                    x: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    },
                                    y: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    }
                                  },
                                  required: ['x', 'y'],
                                  additionalProperties: false
                                },
                                end: {
                                  type: 'object',
                                  properties: {
                                    x: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    },
                                    y: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    }
                                  },
                                  required: ['x', 'y'],
                                  additionalProperties: false
                                },
                                stops: {
                                  minItems: 2,
                                  maxItems: 32,
                                  type: 'array',
                                  items: {
                                    type: 'object',
                                    properties: {
                                      offset: {
                                        type: 'number',
                                        minimum: 0,
                                        maximum: 1
                                      },
                                      color: {
                                        type: 'string',
                                        pattern: '^#[\\da-f]{6}$'
                                      },
                                      opacity: {
                                        type: 'number',
                                        minimum: 0,
                                        maximum: 1
                                      }
                                    },
                                    required: ['offset', 'color', 'opacity'],
                                    additionalProperties: false
                                  }
                                }
                              },
                              required: ['type', 'start', 'end', 'stops'],
                              additionalProperties: false
                            },
                            fontFamily: {
                              type: 'string',
                              maxLength: 120,
                              pattern: '^[\\p{L}\\p{N} _-]+$'
                            },
                            lineHeight: {
                              type: 'number',
                              minimum: 0.1,
                              maximum: 10
                            },
                            letterSpacing: {
                              type: 'number',
                              minimum: -100,
                              maximum: 100
                            },
                            verticalAlign: {
                              type: 'string',
                              enum: ['top', 'center', 'bottom']
                            },
                            textPadding: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1000
                            },
                            clipContent: {
                              type: 'boolean'
                            },
                            prototype: {
                              type: 'object',
                              properties: {
                                trigger: {
                                  type: 'string',
                                  enum: ['click', 'hover']
                                },
                                action: {
                                  type: 'string',
                                  enum: ['navigate', 'overlay', 'back', 'close']
                                },
                                target: {
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
                                transition: {
                                  type: 'string',
                                  enum: ['instant', 'dissolve']
                                },
                                duration: {
                                  type: 'integer',
                                  minimum: 0,
                                  maximum: 3000
                                }
                              },
                              required: [
                                'trigger',
                                'action',
                                'target',
                                'transition',
                                'duration'
                              ],
                              additionalProperties: false
                            },
                            image: {
                              type: 'string',
                              maxLength: 2000000,
                              pattern:
                                '^(?:|data:image\\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+)$'
                            }
                          },
                          required: [
                            'id',
                            'kind',
                            'name',
                            'x',
                            'y',
                            'width',
                            'height',
                            'rotation',
                            'fill',
                            'stroke',
                            'strokeWidth',
                            'opacity',
                            'radius',
                            'text',
                            'fontSize',
                            'fontWeight',
                            'textColor',
                            'align',
                            'locked',
                            'hidden',
                            'group',
                            'points',
                            'image'
                          ],
                          additionalProperties: false
                        }
                      },
                      connectors: {
                        maxItems: 1000,
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
                            source: {
                              type: 'string',
                              format: 'uuid',
                              pattern:
                                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                            },
                            target: {
                              type: 'string',
                              format: 'uuid',
                              pattern:
                                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                            },
                            label: {
                              type: 'string',
                              maxLength: 200
                            },
                            color: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            style: {
                              type: 'string',
                              enum: ['curve', 'straight']
                            },
                            arrow: {
                              type: 'boolean'
                            }
                          },
                          required: [
                            'id',
                            'source',
                            'target',
                            'label',
                            'color',
                            'style',
                            'arrow'
                          ],
                          additionalProperties: false
                        }
                      }
                    },
                    required: ['id', 'name', 'elements', 'connectors'],
                    additionalProperties: false
                  }
                }
              },
              required: ['version', 'pages'],
              additionalProperties: false
            }
          },
          required: ['title', 'document'],
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
            workspace_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            title: {
              type: 'string',
              minLength: 1,
              maxLength: 160
            },
            revision: {
              type: 'integer',
              exclusiveMinimum: 0,
              maximum: 9007199254740991
            },
            starred: {
              type: 'boolean'
            },
            archived: {
              type: 'boolean'
            },
            created: {
              type: 'string'
            },
            updated: {
              type: 'string'
            },
            document: {
              type: 'object',
              properties: {
                version: {
                  type: 'number',
                  const: 1
                },
                tags: {
                  maxItems: 30,
                  type: 'array',
                  items: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 80
                  }
                },
                prototypeStart: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                pages: {
                  minItems: 1,
                  maxItems: 40,
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
                        minLength: 1,
                        maxLength: 160
                      },
                      mode: {
                        type: 'string',
                        enum: ['blackboard', 'canvas']
                      },
                      background: {
                        type: 'string',
                        pattern: '^#[\\da-f]{6}$'
                      },
                      elements: {
                        maxItems: 2000,
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
                            kind: {
                              type: 'string',
                              enum: [
                                'rectangle',
                                'ellipse',
                                'diamond',
                                'text',
                                'sticky',
                                'node',
                                'frame',
                                'path',
                                'image'
                              ]
                            },
                            name: {
                              type: 'string',
                              maxLength: 160
                            },
                            x: {
                              type: 'number',
                              minimum: -100000,
                              maximum: 100000
                            },
                            y: {
                              type: 'number',
                              minimum: -100000,
                              maximum: 100000
                            },
                            width: {
                              type: 'number',
                              minimum: 1,
                              maximum: 20000
                            },
                            height: {
                              type: 'number',
                              minimum: 1,
                              maximum: 20000
                            },
                            rotation: {
                              type: 'number',
                              minimum: -360,
                              maximum: 360
                            },
                            fill: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            fillOpacity: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1
                            },
                            stroke: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            strokeWidth: {
                              type: 'number',
                              minimum: 0,
                              maximum: 40
                            },
                            opacity: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1
                            },
                            radius: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1000
                            },
                            text: {
                              type: 'string',
                              maxLength: 10000
                            },
                            fontSize: {
                              type: 'number',
                              minimum: 8,
                              maximum: 400
                            },
                            fontWeight: {
                              type: 'string',
                              enum: ['400', '600', '700']
                            },
                            textColor: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            align: {
                              type: 'string',
                              enum: ['left', 'center', 'right']
                            },
                            locked: {
                              type: 'boolean'
                            },
                            hidden: {
                              type: 'boolean'
                            },
                            group: {
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
                            parent: {
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
                            layout: {
                              type: 'object',
                              properties: {
                                direction: {
                                  type: 'string',
                                  enum: ['horizontal', 'vertical']
                                },
                                gap: {
                                  type: 'number',
                                  minimum: 0,
                                  maximum: 2000
                                },
                                padding: {
                                  type: 'object',
                                  properties: {
                                    top: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    },
                                    right: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    },
                                    bottom: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    },
                                    left: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    }
                                  },
                                  required: ['top', 'right', 'bottom', 'left'],
                                  additionalProperties: false
                                },
                                align: {
                                  type: 'string',
                                  enum: ['start', 'center', 'end', 'stretch']
                                },
                                justify: {
                                  type: 'string',
                                  enum: [
                                    'start',
                                    'center',
                                    'end',
                                    'space-between'
                                  ]
                                },
                                wrap: {
                                  type: 'boolean'
                                }
                              },
                              required: [
                                'direction',
                                'gap',
                                'padding',
                                'align',
                                'justify',
                                'wrap'
                              ],
                              additionalProperties: false
                            },
                            widthMode: {
                              type: 'string',
                              enum: ['fixed', 'hug', 'fill']
                            },
                            heightMode: {
                              type: 'string',
                              enum: ['fixed', 'hug', 'fill']
                            },
                            component: {
                              type: 'object',
                              properties: {
                                definition: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                instance: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                key: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                overrides: {
                                  maxItems: 40,
                                  type: 'array',
                                  items: {
                                    type: 'string'
                                  }
                                }
                              },
                              required: [
                                'definition',
                                'instance',
                                'key',
                                'overrides'
                              ],
                              additionalProperties: false
                            },
                            points: {
                              maxItems: 10000,
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  x: {
                                    type: 'number',
                                    minimum: -100000,
                                    maximum: 100000
                                  },
                                  y: {
                                    type: 'number',
                                    minimum: -100000,
                                    maximum: 100000
                                  }
                                },
                                required: ['x', 'y'],
                                additionalProperties: false
                              }
                            },
                            pathData: {
                              type: 'string',
                              maxLength: 200000,
                              pattern: '^[MmLlHhVvCcSsQqTtAaZz0-9eE+.,\\s-]*$'
                            },
                            pathViewBox: {
                              type: 'object',
                              properties: {
                                x: {
                                  type: 'number',
                                  minimum: -100000,
                                  maximum: 100000
                                },
                                y: {
                                  type: 'number',
                                  minimum: -100000,
                                  maximum: 100000
                                },
                                width: {
                                  type: 'number',
                                  exclusiveMinimum: 0,
                                  maximum: 20000
                                },
                                height: {
                                  type: 'number',
                                  exclusiveMinimum: 0,
                                  maximum: 20000
                                }
                              },
                              required: ['x', 'y', 'width', 'height'],
                              additionalProperties: false
                            },
                            fillRule: {
                              type: 'string',
                              enum: ['nonzero', 'evenodd']
                            },
                            vector: {
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
                                  closed: {
                                    type: 'boolean'
                                  },
                                  nodes: {
                                    minItems: 1,
                                    maxItems: 2000,
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
                                        x: {
                                          type: 'number',
                                          minimum: -100000,
                                          maximum: 100000
                                        },
                                        y: {
                                          type: 'number',
                                          minimum: -100000,
                                          maximum: 100000
                                        },
                                        mode: {
                                          type: 'string',
                                          enum: [
                                            'corner',
                                            'smooth',
                                            'symmetric'
                                          ]
                                        },
                                        in: {
                                          anyOf: [
                                            {
                                              type: 'object',
                                              properties: {
                                                x: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                },
                                                y: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                }
                                              },
                                              required: ['x', 'y'],
                                              additionalProperties: false
                                            },
                                            {
                                              type: 'null'
                                            }
                                          ]
                                        },
                                        out: {
                                          anyOf: [
                                            {
                                              type: 'object',
                                              properties: {
                                                x: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                },
                                                y: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                }
                                              },
                                              required: ['x', 'y'],
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
                                        'x',
                                        'y',
                                        'mode',
                                        'in',
                                        'out'
                                      ],
                                      additionalProperties: false
                                    }
                                  }
                                },
                                required: ['id', 'closed', 'nodes'],
                                additionalProperties: false
                              }
                            },
                            gradient: {
                              type: 'object',
                              properties: {
                                type: {
                                  type: 'string',
                                  enum: ['linear', 'radial']
                                },
                                transform: {
                                  minItems: 6,
                                  maxItems: 6,
                                  type: 'array',
                                  items: {
                                    type: 'number',
                                    minimum: -100000,
                                    maximum: 100000
                                  }
                                },
                                start: {
                                  type: 'object',
                                  properties: {
                                    x: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    },
                                    y: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    }
                                  },
                                  required: ['x', 'y'],
                                  additionalProperties: false
                                },
                                end: {
                                  type: 'object',
                                  properties: {
                                    x: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    },
                                    y: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    }
                                  },
                                  required: ['x', 'y'],
                                  additionalProperties: false
                                },
                                stops: {
                                  minItems: 2,
                                  maxItems: 32,
                                  type: 'array',
                                  items: {
                                    type: 'object',
                                    properties: {
                                      offset: {
                                        type: 'number',
                                        minimum: 0,
                                        maximum: 1
                                      },
                                      color: {
                                        type: 'string',
                                        pattern: '^#[\\da-f]{6}$'
                                      },
                                      opacity: {
                                        type: 'number',
                                        minimum: 0,
                                        maximum: 1
                                      }
                                    },
                                    required: ['offset', 'color', 'opacity'],
                                    additionalProperties: false
                                  }
                                }
                              },
                              required: ['type', 'start', 'end', 'stops'],
                              additionalProperties: false
                            },
                            fontFamily: {
                              type: 'string',
                              maxLength: 120,
                              pattern: '^[\\p{L}\\p{N} _-]+$'
                            },
                            lineHeight: {
                              type: 'number',
                              minimum: 0.1,
                              maximum: 10
                            },
                            letterSpacing: {
                              type: 'number',
                              minimum: -100,
                              maximum: 100
                            },
                            verticalAlign: {
                              type: 'string',
                              enum: ['top', 'center', 'bottom']
                            },
                            textPadding: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1000
                            },
                            clipContent: {
                              type: 'boolean'
                            },
                            prototype: {
                              type: 'object',
                              properties: {
                                trigger: {
                                  type: 'string',
                                  enum: ['click', 'hover']
                                },
                                action: {
                                  type: 'string',
                                  enum: ['navigate', 'overlay', 'back', 'close']
                                },
                                target: {
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
                                transition: {
                                  type: 'string',
                                  enum: ['instant', 'dissolve']
                                },
                                duration: {
                                  type: 'integer',
                                  minimum: 0,
                                  maximum: 3000
                                }
                              },
                              required: [
                                'trigger',
                                'action',
                                'target',
                                'transition',
                                'duration'
                              ],
                              additionalProperties: false
                            },
                            image: {
                              type: 'string',
                              maxLength: 2000000,
                              pattern:
                                '^(?:|data:image\\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+)$'
                            }
                          },
                          required: [
                            'id',
                            'kind',
                            'name',
                            'x',
                            'y',
                            'width',
                            'height',
                            'rotation',
                            'fill',
                            'stroke',
                            'strokeWidth',
                            'opacity',
                            'radius',
                            'text',
                            'fontSize',
                            'fontWeight',
                            'textColor',
                            'align',
                            'locked',
                            'hidden',
                            'group',
                            'points',
                            'image'
                          ],
                          additionalProperties: false
                        }
                      },
                      connectors: {
                        maxItems: 4000,
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
                            source: {
                              type: 'string',
                              format: 'uuid',
                              pattern:
                                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                            },
                            target: {
                              type: 'string',
                              format: 'uuid',
                              pattern:
                                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                            },
                            label: {
                              type: 'string',
                              maxLength: 200
                            },
                            color: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            style: {
                              type: 'string',
                              enum: ['curve', 'straight']
                            },
                            arrow: {
                              type: 'boolean'
                            }
                          },
                          required: [
                            'id',
                            'source',
                            'target',
                            'label',
                            'color',
                            'style',
                            'arrow'
                          ],
                          additionalProperties: false
                        }
                      }
                    },
                    required: [
                      'id',
                      'name',
                      'mode',
                      'background',
                      'elements',
                      'connectors'
                    ],
                    additionalProperties: false
                  }
                },
                components: {
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
                      name: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 160
                      },
                      elements: {
                        minItems: 1,
                        maxItems: 500,
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
                            kind: {
                              type: 'string',
                              enum: [
                                'rectangle',
                                'ellipse',
                                'diamond',
                                'text',
                                'sticky',
                                'node',
                                'frame',
                                'path',
                                'image'
                              ]
                            },
                            name: {
                              type: 'string',
                              maxLength: 160
                            },
                            x: {
                              type: 'number',
                              minimum: -100000,
                              maximum: 100000
                            },
                            y: {
                              type: 'number',
                              minimum: -100000,
                              maximum: 100000
                            },
                            width: {
                              type: 'number',
                              minimum: 1,
                              maximum: 20000
                            },
                            height: {
                              type: 'number',
                              minimum: 1,
                              maximum: 20000
                            },
                            rotation: {
                              type: 'number',
                              minimum: -360,
                              maximum: 360
                            },
                            fill: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            fillOpacity: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1
                            },
                            stroke: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            strokeWidth: {
                              type: 'number',
                              minimum: 0,
                              maximum: 40
                            },
                            opacity: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1
                            },
                            radius: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1000
                            },
                            text: {
                              type: 'string',
                              maxLength: 10000
                            },
                            fontSize: {
                              type: 'number',
                              minimum: 8,
                              maximum: 400
                            },
                            fontWeight: {
                              type: 'string',
                              enum: ['400', '600', '700']
                            },
                            textColor: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            align: {
                              type: 'string',
                              enum: ['left', 'center', 'right']
                            },
                            locked: {
                              type: 'boolean'
                            },
                            hidden: {
                              type: 'boolean'
                            },
                            group: {
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
                            parent: {
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
                            layout: {
                              type: 'object',
                              properties: {
                                direction: {
                                  type: 'string',
                                  enum: ['horizontal', 'vertical']
                                },
                                gap: {
                                  type: 'number',
                                  minimum: 0,
                                  maximum: 2000
                                },
                                padding: {
                                  type: 'object',
                                  properties: {
                                    top: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    },
                                    right: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    },
                                    bottom: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    },
                                    left: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    }
                                  },
                                  required: ['top', 'right', 'bottom', 'left'],
                                  additionalProperties: false
                                },
                                align: {
                                  type: 'string',
                                  enum: ['start', 'center', 'end', 'stretch']
                                },
                                justify: {
                                  type: 'string',
                                  enum: [
                                    'start',
                                    'center',
                                    'end',
                                    'space-between'
                                  ]
                                },
                                wrap: {
                                  type: 'boolean'
                                }
                              },
                              required: [
                                'direction',
                                'gap',
                                'padding',
                                'align',
                                'justify',
                                'wrap'
                              ],
                              additionalProperties: false
                            },
                            widthMode: {
                              type: 'string',
                              enum: ['fixed', 'hug', 'fill']
                            },
                            heightMode: {
                              type: 'string',
                              enum: ['fixed', 'hug', 'fill']
                            },
                            component: {
                              type: 'object',
                              properties: {
                                definition: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                instance: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                key: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                overrides: {
                                  maxItems: 40,
                                  type: 'array',
                                  items: {
                                    type: 'string'
                                  }
                                }
                              },
                              required: [
                                'definition',
                                'instance',
                                'key',
                                'overrides'
                              ],
                              additionalProperties: false
                            },
                            points: {
                              maxItems: 10000,
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  x: {
                                    type: 'number',
                                    minimum: -100000,
                                    maximum: 100000
                                  },
                                  y: {
                                    type: 'number',
                                    minimum: -100000,
                                    maximum: 100000
                                  }
                                },
                                required: ['x', 'y'],
                                additionalProperties: false
                              }
                            },
                            pathData: {
                              type: 'string',
                              maxLength: 200000,
                              pattern: '^[MmLlHhVvCcSsQqTtAaZz0-9eE+.,\\s-]*$'
                            },
                            pathViewBox: {
                              type: 'object',
                              properties: {
                                x: {
                                  type: 'number',
                                  minimum: -100000,
                                  maximum: 100000
                                },
                                y: {
                                  type: 'number',
                                  minimum: -100000,
                                  maximum: 100000
                                },
                                width: {
                                  type: 'number',
                                  exclusiveMinimum: 0,
                                  maximum: 20000
                                },
                                height: {
                                  type: 'number',
                                  exclusiveMinimum: 0,
                                  maximum: 20000
                                }
                              },
                              required: ['x', 'y', 'width', 'height'],
                              additionalProperties: false
                            },
                            fillRule: {
                              type: 'string',
                              enum: ['nonzero', 'evenodd']
                            },
                            vector: {
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
                                  closed: {
                                    type: 'boolean'
                                  },
                                  nodes: {
                                    minItems: 1,
                                    maxItems: 2000,
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
                                        x: {
                                          type: 'number',
                                          minimum: -100000,
                                          maximum: 100000
                                        },
                                        y: {
                                          type: 'number',
                                          minimum: -100000,
                                          maximum: 100000
                                        },
                                        mode: {
                                          type: 'string',
                                          enum: [
                                            'corner',
                                            'smooth',
                                            'symmetric'
                                          ]
                                        },
                                        in: {
                                          anyOf: [
                                            {
                                              type: 'object',
                                              properties: {
                                                x: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                },
                                                y: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                }
                                              },
                                              required: ['x', 'y'],
                                              additionalProperties: false
                                            },
                                            {
                                              type: 'null'
                                            }
                                          ]
                                        },
                                        out: {
                                          anyOf: [
                                            {
                                              type: 'object',
                                              properties: {
                                                x: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                },
                                                y: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                }
                                              },
                                              required: ['x', 'y'],
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
                                        'x',
                                        'y',
                                        'mode',
                                        'in',
                                        'out'
                                      ],
                                      additionalProperties: false
                                    }
                                  }
                                },
                                required: ['id', 'closed', 'nodes'],
                                additionalProperties: false
                              }
                            },
                            gradient: {
                              type: 'object',
                              properties: {
                                type: {
                                  type: 'string',
                                  enum: ['linear', 'radial']
                                },
                                transform: {
                                  minItems: 6,
                                  maxItems: 6,
                                  type: 'array',
                                  items: {
                                    type: 'number',
                                    minimum: -100000,
                                    maximum: 100000
                                  }
                                },
                                start: {
                                  type: 'object',
                                  properties: {
                                    x: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    },
                                    y: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    }
                                  },
                                  required: ['x', 'y'],
                                  additionalProperties: false
                                },
                                end: {
                                  type: 'object',
                                  properties: {
                                    x: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    },
                                    y: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    }
                                  },
                                  required: ['x', 'y'],
                                  additionalProperties: false
                                },
                                stops: {
                                  minItems: 2,
                                  maxItems: 32,
                                  type: 'array',
                                  items: {
                                    type: 'object',
                                    properties: {
                                      offset: {
                                        type: 'number',
                                        minimum: 0,
                                        maximum: 1
                                      },
                                      color: {
                                        type: 'string',
                                        pattern: '^#[\\da-f]{6}$'
                                      },
                                      opacity: {
                                        type: 'number',
                                        minimum: 0,
                                        maximum: 1
                                      }
                                    },
                                    required: ['offset', 'color', 'opacity'],
                                    additionalProperties: false
                                  }
                                }
                              },
                              required: ['type', 'start', 'end', 'stops'],
                              additionalProperties: false
                            },
                            fontFamily: {
                              type: 'string',
                              maxLength: 120,
                              pattern: '^[\\p{L}\\p{N} _-]+$'
                            },
                            lineHeight: {
                              type: 'number',
                              minimum: 0.1,
                              maximum: 10
                            },
                            letterSpacing: {
                              type: 'number',
                              minimum: -100,
                              maximum: 100
                            },
                            verticalAlign: {
                              type: 'string',
                              enum: ['top', 'center', 'bottom']
                            },
                            textPadding: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1000
                            },
                            clipContent: {
                              type: 'boolean'
                            },
                            prototype: {
                              type: 'object',
                              properties: {
                                trigger: {
                                  type: 'string',
                                  enum: ['click', 'hover']
                                },
                                action: {
                                  type: 'string',
                                  enum: ['navigate', 'overlay', 'back', 'close']
                                },
                                target: {
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
                                transition: {
                                  type: 'string',
                                  enum: ['instant', 'dissolve']
                                },
                                duration: {
                                  type: 'integer',
                                  minimum: 0,
                                  maximum: 3000
                                }
                              },
                              required: [
                                'trigger',
                                'action',
                                'target',
                                'transition',
                                'duration'
                              ],
                              additionalProperties: false
                            },
                            image: {
                              type: 'string',
                              maxLength: 2000000,
                              pattern:
                                '^(?:|data:image\\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+)$'
                            }
                          },
                          required: [
                            'id',
                            'kind',
                            'name',
                            'x',
                            'y',
                            'width',
                            'height',
                            'rotation',
                            'fill',
                            'stroke',
                            'strokeWidth',
                            'opacity',
                            'radius',
                            'text',
                            'fontSize',
                            'fontWeight',
                            'textColor',
                            'align',
                            'locked',
                            'hidden',
                            'group',
                            'points',
                            'image'
                          ],
                          additionalProperties: false
                        }
                      },
                      connectors: {
                        maxItems: 1000,
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
                            source: {
                              type: 'string',
                              format: 'uuid',
                              pattern:
                                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                            },
                            target: {
                              type: 'string',
                              format: 'uuid',
                              pattern:
                                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                            },
                            label: {
                              type: 'string',
                              maxLength: 200
                            },
                            color: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            style: {
                              type: 'string',
                              enum: ['curve', 'straight']
                            },
                            arrow: {
                              type: 'boolean'
                            }
                          },
                          required: [
                            'id',
                            'source',
                            'target',
                            'label',
                            'color',
                            'style',
                            'arrow'
                          ],
                          additionalProperties: false
                        }
                      }
                    },
                    required: ['id', 'name', 'elements', 'connectors'],
                    additionalProperties: false
                  }
                }
              },
              required: ['version', 'pages'],
              additionalProperties: false
            }
          },
          required: [
            'id',
            'workspace_id',
            'title',
            'revision',
            'starred',
            'archived',
            'created',
            'updated',
            'document'
          ],
          additionalProperties: false
        }
      }
    },
    get: {
      method: 'get',
      description: 'Open a Redraw project',
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
            id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            }
          },
          required: ['workspace_id', 'id'],
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
            workspace_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            title: {
              type: 'string',
              minLength: 1,
              maxLength: 160
            },
            revision: {
              type: 'integer',
              exclusiveMinimum: 0,
              maximum: 9007199254740991
            },
            starred: {
              type: 'boolean'
            },
            archived: {
              type: 'boolean'
            },
            created: {
              type: 'string'
            },
            updated: {
              type: 'string'
            },
            document: {
              type: 'object',
              properties: {
                version: {
                  type: 'number',
                  const: 1
                },
                tags: {
                  maxItems: 30,
                  type: 'array',
                  items: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 80
                  }
                },
                prototypeStart: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                pages: {
                  minItems: 1,
                  maxItems: 40,
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
                        minLength: 1,
                        maxLength: 160
                      },
                      mode: {
                        type: 'string',
                        enum: ['blackboard', 'canvas']
                      },
                      background: {
                        type: 'string',
                        pattern: '^#[\\da-f]{6}$'
                      },
                      elements: {
                        maxItems: 2000,
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
                            kind: {
                              type: 'string',
                              enum: [
                                'rectangle',
                                'ellipse',
                                'diamond',
                                'text',
                                'sticky',
                                'node',
                                'frame',
                                'path',
                                'image'
                              ]
                            },
                            name: {
                              type: 'string',
                              maxLength: 160
                            },
                            x: {
                              type: 'number',
                              minimum: -100000,
                              maximum: 100000
                            },
                            y: {
                              type: 'number',
                              minimum: -100000,
                              maximum: 100000
                            },
                            width: {
                              type: 'number',
                              minimum: 1,
                              maximum: 20000
                            },
                            height: {
                              type: 'number',
                              minimum: 1,
                              maximum: 20000
                            },
                            rotation: {
                              type: 'number',
                              minimum: -360,
                              maximum: 360
                            },
                            fill: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            fillOpacity: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1
                            },
                            stroke: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            strokeWidth: {
                              type: 'number',
                              minimum: 0,
                              maximum: 40
                            },
                            opacity: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1
                            },
                            radius: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1000
                            },
                            text: {
                              type: 'string',
                              maxLength: 10000
                            },
                            fontSize: {
                              type: 'number',
                              minimum: 8,
                              maximum: 400
                            },
                            fontWeight: {
                              type: 'string',
                              enum: ['400', '600', '700']
                            },
                            textColor: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            align: {
                              type: 'string',
                              enum: ['left', 'center', 'right']
                            },
                            locked: {
                              type: 'boolean'
                            },
                            hidden: {
                              type: 'boolean'
                            },
                            group: {
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
                            parent: {
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
                            layout: {
                              type: 'object',
                              properties: {
                                direction: {
                                  type: 'string',
                                  enum: ['horizontal', 'vertical']
                                },
                                gap: {
                                  type: 'number',
                                  minimum: 0,
                                  maximum: 2000
                                },
                                padding: {
                                  type: 'object',
                                  properties: {
                                    top: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    },
                                    right: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    },
                                    bottom: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    },
                                    left: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    }
                                  },
                                  required: ['top', 'right', 'bottom', 'left'],
                                  additionalProperties: false
                                },
                                align: {
                                  type: 'string',
                                  enum: ['start', 'center', 'end', 'stretch']
                                },
                                justify: {
                                  type: 'string',
                                  enum: [
                                    'start',
                                    'center',
                                    'end',
                                    'space-between'
                                  ]
                                },
                                wrap: {
                                  type: 'boolean'
                                }
                              },
                              required: [
                                'direction',
                                'gap',
                                'padding',
                                'align',
                                'justify',
                                'wrap'
                              ],
                              additionalProperties: false
                            },
                            widthMode: {
                              type: 'string',
                              enum: ['fixed', 'hug', 'fill']
                            },
                            heightMode: {
                              type: 'string',
                              enum: ['fixed', 'hug', 'fill']
                            },
                            component: {
                              type: 'object',
                              properties: {
                                definition: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                instance: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                key: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                overrides: {
                                  maxItems: 40,
                                  type: 'array',
                                  items: {
                                    type: 'string'
                                  }
                                }
                              },
                              required: [
                                'definition',
                                'instance',
                                'key',
                                'overrides'
                              ],
                              additionalProperties: false
                            },
                            points: {
                              maxItems: 10000,
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  x: {
                                    type: 'number',
                                    minimum: -100000,
                                    maximum: 100000
                                  },
                                  y: {
                                    type: 'number',
                                    minimum: -100000,
                                    maximum: 100000
                                  }
                                },
                                required: ['x', 'y'],
                                additionalProperties: false
                              }
                            },
                            pathData: {
                              type: 'string',
                              maxLength: 200000,
                              pattern: '^[MmLlHhVvCcSsQqTtAaZz0-9eE+.,\\s-]*$'
                            },
                            pathViewBox: {
                              type: 'object',
                              properties: {
                                x: {
                                  type: 'number',
                                  minimum: -100000,
                                  maximum: 100000
                                },
                                y: {
                                  type: 'number',
                                  minimum: -100000,
                                  maximum: 100000
                                },
                                width: {
                                  type: 'number',
                                  exclusiveMinimum: 0,
                                  maximum: 20000
                                },
                                height: {
                                  type: 'number',
                                  exclusiveMinimum: 0,
                                  maximum: 20000
                                }
                              },
                              required: ['x', 'y', 'width', 'height'],
                              additionalProperties: false
                            },
                            fillRule: {
                              type: 'string',
                              enum: ['nonzero', 'evenodd']
                            },
                            vector: {
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
                                  closed: {
                                    type: 'boolean'
                                  },
                                  nodes: {
                                    minItems: 1,
                                    maxItems: 2000,
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
                                        x: {
                                          type: 'number',
                                          minimum: -100000,
                                          maximum: 100000
                                        },
                                        y: {
                                          type: 'number',
                                          minimum: -100000,
                                          maximum: 100000
                                        },
                                        mode: {
                                          type: 'string',
                                          enum: [
                                            'corner',
                                            'smooth',
                                            'symmetric'
                                          ]
                                        },
                                        in: {
                                          anyOf: [
                                            {
                                              type: 'object',
                                              properties: {
                                                x: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                },
                                                y: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                }
                                              },
                                              required: ['x', 'y'],
                                              additionalProperties: false
                                            },
                                            {
                                              type: 'null'
                                            }
                                          ]
                                        },
                                        out: {
                                          anyOf: [
                                            {
                                              type: 'object',
                                              properties: {
                                                x: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                },
                                                y: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                }
                                              },
                                              required: ['x', 'y'],
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
                                        'x',
                                        'y',
                                        'mode',
                                        'in',
                                        'out'
                                      ],
                                      additionalProperties: false
                                    }
                                  }
                                },
                                required: ['id', 'closed', 'nodes'],
                                additionalProperties: false
                              }
                            },
                            gradient: {
                              type: 'object',
                              properties: {
                                type: {
                                  type: 'string',
                                  enum: ['linear', 'radial']
                                },
                                transform: {
                                  minItems: 6,
                                  maxItems: 6,
                                  type: 'array',
                                  items: {
                                    type: 'number',
                                    minimum: -100000,
                                    maximum: 100000
                                  }
                                },
                                start: {
                                  type: 'object',
                                  properties: {
                                    x: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    },
                                    y: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    }
                                  },
                                  required: ['x', 'y'],
                                  additionalProperties: false
                                },
                                end: {
                                  type: 'object',
                                  properties: {
                                    x: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    },
                                    y: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    }
                                  },
                                  required: ['x', 'y'],
                                  additionalProperties: false
                                },
                                stops: {
                                  minItems: 2,
                                  maxItems: 32,
                                  type: 'array',
                                  items: {
                                    type: 'object',
                                    properties: {
                                      offset: {
                                        type: 'number',
                                        minimum: 0,
                                        maximum: 1
                                      },
                                      color: {
                                        type: 'string',
                                        pattern: '^#[\\da-f]{6}$'
                                      },
                                      opacity: {
                                        type: 'number',
                                        minimum: 0,
                                        maximum: 1
                                      }
                                    },
                                    required: ['offset', 'color', 'opacity'],
                                    additionalProperties: false
                                  }
                                }
                              },
                              required: ['type', 'start', 'end', 'stops'],
                              additionalProperties: false
                            },
                            fontFamily: {
                              type: 'string',
                              maxLength: 120,
                              pattern: '^[\\p{L}\\p{N} _-]+$'
                            },
                            lineHeight: {
                              type: 'number',
                              minimum: 0.1,
                              maximum: 10
                            },
                            letterSpacing: {
                              type: 'number',
                              minimum: -100,
                              maximum: 100
                            },
                            verticalAlign: {
                              type: 'string',
                              enum: ['top', 'center', 'bottom']
                            },
                            textPadding: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1000
                            },
                            clipContent: {
                              type: 'boolean'
                            },
                            prototype: {
                              type: 'object',
                              properties: {
                                trigger: {
                                  type: 'string',
                                  enum: ['click', 'hover']
                                },
                                action: {
                                  type: 'string',
                                  enum: ['navigate', 'overlay', 'back', 'close']
                                },
                                target: {
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
                                transition: {
                                  type: 'string',
                                  enum: ['instant', 'dissolve']
                                },
                                duration: {
                                  type: 'integer',
                                  minimum: 0,
                                  maximum: 3000
                                }
                              },
                              required: [
                                'trigger',
                                'action',
                                'target',
                                'transition',
                                'duration'
                              ],
                              additionalProperties: false
                            },
                            image: {
                              type: 'string',
                              maxLength: 2000000,
                              pattern:
                                '^(?:|data:image\\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+)$'
                            }
                          },
                          required: [
                            'id',
                            'kind',
                            'name',
                            'x',
                            'y',
                            'width',
                            'height',
                            'rotation',
                            'fill',
                            'stroke',
                            'strokeWidth',
                            'opacity',
                            'radius',
                            'text',
                            'fontSize',
                            'fontWeight',
                            'textColor',
                            'align',
                            'locked',
                            'hidden',
                            'group',
                            'points',
                            'image'
                          ],
                          additionalProperties: false
                        }
                      },
                      connectors: {
                        maxItems: 4000,
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
                            source: {
                              type: 'string',
                              format: 'uuid',
                              pattern:
                                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                            },
                            target: {
                              type: 'string',
                              format: 'uuid',
                              pattern:
                                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                            },
                            label: {
                              type: 'string',
                              maxLength: 200
                            },
                            color: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            style: {
                              type: 'string',
                              enum: ['curve', 'straight']
                            },
                            arrow: {
                              type: 'boolean'
                            }
                          },
                          required: [
                            'id',
                            'source',
                            'target',
                            'label',
                            'color',
                            'style',
                            'arrow'
                          ],
                          additionalProperties: false
                        }
                      }
                    },
                    required: [
                      'id',
                      'name',
                      'mode',
                      'background',
                      'elements',
                      'connectors'
                    ],
                    additionalProperties: false
                  }
                },
                components: {
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
                      name: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 160
                      },
                      elements: {
                        minItems: 1,
                        maxItems: 500,
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
                            kind: {
                              type: 'string',
                              enum: [
                                'rectangle',
                                'ellipse',
                                'diamond',
                                'text',
                                'sticky',
                                'node',
                                'frame',
                                'path',
                                'image'
                              ]
                            },
                            name: {
                              type: 'string',
                              maxLength: 160
                            },
                            x: {
                              type: 'number',
                              minimum: -100000,
                              maximum: 100000
                            },
                            y: {
                              type: 'number',
                              minimum: -100000,
                              maximum: 100000
                            },
                            width: {
                              type: 'number',
                              minimum: 1,
                              maximum: 20000
                            },
                            height: {
                              type: 'number',
                              minimum: 1,
                              maximum: 20000
                            },
                            rotation: {
                              type: 'number',
                              minimum: -360,
                              maximum: 360
                            },
                            fill: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            fillOpacity: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1
                            },
                            stroke: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            strokeWidth: {
                              type: 'number',
                              minimum: 0,
                              maximum: 40
                            },
                            opacity: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1
                            },
                            radius: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1000
                            },
                            text: {
                              type: 'string',
                              maxLength: 10000
                            },
                            fontSize: {
                              type: 'number',
                              minimum: 8,
                              maximum: 400
                            },
                            fontWeight: {
                              type: 'string',
                              enum: ['400', '600', '700']
                            },
                            textColor: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            align: {
                              type: 'string',
                              enum: ['left', 'center', 'right']
                            },
                            locked: {
                              type: 'boolean'
                            },
                            hidden: {
                              type: 'boolean'
                            },
                            group: {
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
                            parent: {
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
                            layout: {
                              type: 'object',
                              properties: {
                                direction: {
                                  type: 'string',
                                  enum: ['horizontal', 'vertical']
                                },
                                gap: {
                                  type: 'number',
                                  minimum: 0,
                                  maximum: 2000
                                },
                                padding: {
                                  type: 'object',
                                  properties: {
                                    top: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    },
                                    right: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    },
                                    bottom: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    },
                                    left: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    }
                                  },
                                  required: ['top', 'right', 'bottom', 'left'],
                                  additionalProperties: false
                                },
                                align: {
                                  type: 'string',
                                  enum: ['start', 'center', 'end', 'stretch']
                                },
                                justify: {
                                  type: 'string',
                                  enum: [
                                    'start',
                                    'center',
                                    'end',
                                    'space-between'
                                  ]
                                },
                                wrap: {
                                  type: 'boolean'
                                }
                              },
                              required: [
                                'direction',
                                'gap',
                                'padding',
                                'align',
                                'justify',
                                'wrap'
                              ],
                              additionalProperties: false
                            },
                            widthMode: {
                              type: 'string',
                              enum: ['fixed', 'hug', 'fill']
                            },
                            heightMode: {
                              type: 'string',
                              enum: ['fixed', 'hug', 'fill']
                            },
                            component: {
                              type: 'object',
                              properties: {
                                definition: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                instance: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                key: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                overrides: {
                                  maxItems: 40,
                                  type: 'array',
                                  items: {
                                    type: 'string'
                                  }
                                }
                              },
                              required: [
                                'definition',
                                'instance',
                                'key',
                                'overrides'
                              ],
                              additionalProperties: false
                            },
                            points: {
                              maxItems: 10000,
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  x: {
                                    type: 'number',
                                    minimum: -100000,
                                    maximum: 100000
                                  },
                                  y: {
                                    type: 'number',
                                    minimum: -100000,
                                    maximum: 100000
                                  }
                                },
                                required: ['x', 'y'],
                                additionalProperties: false
                              }
                            },
                            pathData: {
                              type: 'string',
                              maxLength: 200000,
                              pattern: '^[MmLlHhVvCcSsQqTtAaZz0-9eE+.,\\s-]*$'
                            },
                            pathViewBox: {
                              type: 'object',
                              properties: {
                                x: {
                                  type: 'number',
                                  minimum: -100000,
                                  maximum: 100000
                                },
                                y: {
                                  type: 'number',
                                  minimum: -100000,
                                  maximum: 100000
                                },
                                width: {
                                  type: 'number',
                                  exclusiveMinimum: 0,
                                  maximum: 20000
                                },
                                height: {
                                  type: 'number',
                                  exclusiveMinimum: 0,
                                  maximum: 20000
                                }
                              },
                              required: ['x', 'y', 'width', 'height'],
                              additionalProperties: false
                            },
                            fillRule: {
                              type: 'string',
                              enum: ['nonzero', 'evenodd']
                            },
                            vector: {
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
                                  closed: {
                                    type: 'boolean'
                                  },
                                  nodes: {
                                    minItems: 1,
                                    maxItems: 2000,
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
                                        x: {
                                          type: 'number',
                                          minimum: -100000,
                                          maximum: 100000
                                        },
                                        y: {
                                          type: 'number',
                                          minimum: -100000,
                                          maximum: 100000
                                        },
                                        mode: {
                                          type: 'string',
                                          enum: [
                                            'corner',
                                            'smooth',
                                            'symmetric'
                                          ]
                                        },
                                        in: {
                                          anyOf: [
                                            {
                                              type: 'object',
                                              properties: {
                                                x: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                },
                                                y: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                }
                                              },
                                              required: ['x', 'y'],
                                              additionalProperties: false
                                            },
                                            {
                                              type: 'null'
                                            }
                                          ]
                                        },
                                        out: {
                                          anyOf: [
                                            {
                                              type: 'object',
                                              properties: {
                                                x: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                },
                                                y: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                }
                                              },
                                              required: ['x', 'y'],
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
                                        'x',
                                        'y',
                                        'mode',
                                        'in',
                                        'out'
                                      ],
                                      additionalProperties: false
                                    }
                                  }
                                },
                                required: ['id', 'closed', 'nodes'],
                                additionalProperties: false
                              }
                            },
                            gradient: {
                              type: 'object',
                              properties: {
                                type: {
                                  type: 'string',
                                  enum: ['linear', 'radial']
                                },
                                transform: {
                                  minItems: 6,
                                  maxItems: 6,
                                  type: 'array',
                                  items: {
                                    type: 'number',
                                    minimum: -100000,
                                    maximum: 100000
                                  }
                                },
                                start: {
                                  type: 'object',
                                  properties: {
                                    x: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    },
                                    y: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    }
                                  },
                                  required: ['x', 'y'],
                                  additionalProperties: false
                                },
                                end: {
                                  type: 'object',
                                  properties: {
                                    x: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    },
                                    y: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    }
                                  },
                                  required: ['x', 'y'],
                                  additionalProperties: false
                                },
                                stops: {
                                  minItems: 2,
                                  maxItems: 32,
                                  type: 'array',
                                  items: {
                                    type: 'object',
                                    properties: {
                                      offset: {
                                        type: 'number',
                                        minimum: 0,
                                        maximum: 1
                                      },
                                      color: {
                                        type: 'string',
                                        pattern: '^#[\\da-f]{6}$'
                                      },
                                      opacity: {
                                        type: 'number',
                                        minimum: 0,
                                        maximum: 1
                                      }
                                    },
                                    required: ['offset', 'color', 'opacity'],
                                    additionalProperties: false
                                  }
                                }
                              },
                              required: ['type', 'start', 'end', 'stops'],
                              additionalProperties: false
                            },
                            fontFamily: {
                              type: 'string',
                              maxLength: 120,
                              pattern: '^[\\p{L}\\p{N} _-]+$'
                            },
                            lineHeight: {
                              type: 'number',
                              minimum: 0.1,
                              maximum: 10
                            },
                            letterSpacing: {
                              type: 'number',
                              minimum: -100,
                              maximum: 100
                            },
                            verticalAlign: {
                              type: 'string',
                              enum: ['top', 'center', 'bottom']
                            },
                            textPadding: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1000
                            },
                            clipContent: {
                              type: 'boolean'
                            },
                            prototype: {
                              type: 'object',
                              properties: {
                                trigger: {
                                  type: 'string',
                                  enum: ['click', 'hover']
                                },
                                action: {
                                  type: 'string',
                                  enum: ['navigate', 'overlay', 'back', 'close']
                                },
                                target: {
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
                                transition: {
                                  type: 'string',
                                  enum: ['instant', 'dissolve']
                                },
                                duration: {
                                  type: 'integer',
                                  minimum: 0,
                                  maximum: 3000
                                }
                              },
                              required: [
                                'trigger',
                                'action',
                                'target',
                                'transition',
                                'duration'
                              ],
                              additionalProperties: false
                            },
                            image: {
                              type: 'string',
                              maxLength: 2000000,
                              pattern:
                                '^(?:|data:image\\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+)$'
                            }
                          },
                          required: [
                            'id',
                            'kind',
                            'name',
                            'x',
                            'y',
                            'width',
                            'height',
                            'rotation',
                            'fill',
                            'stroke',
                            'strokeWidth',
                            'opacity',
                            'radius',
                            'text',
                            'fontSize',
                            'fontWeight',
                            'textColor',
                            'align',
                            'locked',
                            'hidden',
                            'group',
                            'points',
                            'image'
                          ],
                          additionalProperties: false
                        }
                      },
                      connectors: {
                        maxItems: 1000,
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
                            source: {
                              type: 'string',
                              format: 'uuid',
                              pattern:
                                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                            },
                            target: {
                              type: 'string',
                              format: 'uuid',
                              pattern:
                                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                            },
                            label: {
                              type: 'string',
                              maxLength: 200
                            },
                            color: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            style: {
                              type: 'string',
                              enum: ['curve', 'straight']
                            },
                            arrow: {
                              type: 'boolean'
                            }
                          },
                          required: [
                            'id',
                            'source',
                            'target',
                            'label',
                            'color',
                            'style',
                            'arrow'
                          ],
                          additionalProperties: false
                        }
                      }
                    },
                    required: ['id', 'name', 'elements', 'connectors'],
                    additionalProperties: false
                  }
                }
              },
              required: ['version', 'pages'],
              additionalProperties: false
            }
          },
          required: [
            'id',
            'workspace_id',
            'title',
            'revision',
            'starred',
            'archived',
            'created',
            'updated',
            'document'
          ],
          additionalProperties: false
        }
      }
    },
    list: {
      method: 'get',
      description: 'List Redraw projects in an accessible workspace',
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
            archived: {
              default: 'false',
              type: 'string',
              enum: ['true', 'false']
            }
          },
          required: ['workspace_id', 'archived'],
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
              title: {
                type: 'string',
                minLength: 1,
                maxLength: 160
              },
              revision: {
                type: 'integer',
                exclusiveMinimum: 0,
                maximum: 9007199254740991
              },
              starred: {
                type: 'boolean'
              },
              archived: {
                type: 'boolean'
              },
              created: {
                type: 'string'
              },
              updated: {
                type: 'string'
              },
              tags: {
                type: 'array',
                items: {
                  type: 'string'
                }
              },
              modes: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['blackboard', 'canvas']
                }
              },
              objects: {
                type: 'integer',
                minimum: 0,
                maximum: 9007199254740991
              }
            },
            required: [
              'id',
              'workspace_id',
              'title',
              'revision',
              'starred',
              'archived',
              'created',
              'updated',
              'modes',
              'objects'
            ],
            additionalProperties: false
          }
        }
      }
    },
    save: {
      method: 'post',
      description: 'Save a Redraw document if its revision is current',
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
            title: {
              type: 'string',
              minLength: 1,
              maxLength: 160
            },
            document: {
              type: 'object',
              properties: {
                version: {
                  type: 'number',
                  const: 1
                },
                tags: {
                  maxItems: 30,
                  type: 'array',
                  items: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 80
                  }
                },
                prototypeStart: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                pages: {
                  minItems: 1,
                  maxItems: 40,
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
                        minLength: 1,
                        maxLength: 160
                      },
                      mode: {
                        type: 'string',
                        enum: ['blackboard', 'canvas']
                      },
                      background: {
                        type: 'string',
                        pattern: '^#[\\da-f]{6}$'
                      },
                      elements: {
                        maxItems: 2000,
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
                            kind: {
                              type: 'string',
                              enum: [
                                'rectangle',
                                'ellipse',
                                'diamond',
                                'text',
                                'sticky',
                                'node',
                                'frame',
                                'path',
                                'image'
                              ]
                            },
                            name: {
                              type: 'string',
                              maxLength: 160
                            },
                            x: {
                              type: 'number',
                              minimum: -100000,
                              maximum: 100000
                            },
                            y: {
                              type: 'number',
                              minimum: -100000,
                              maximum: 100000
                            },
                            width: {
                              type: 'number',
                              minimum: 1,
                              maximum: 20000
                            },
                            height: {
                              type: 'number',
                              minimum: 1,
                              maximum: 20000
                            },
                            rotation: {
                              type: 'number',
                              minimum: -360,
                              maximum: 360
                            },
                            fill: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            fillOpacity: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1
                            },
                            stroke: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            strokeWidth: {
                              type: 'number',
                              minimum: 0,
                              maximum: 40
                            },
                            opacity: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1
                            },
                            radius: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1000
                            },
                            text: {
                              type: 'string',
                              maxLength: 10000
                            },
                            fontSize: {
                              type: 'number',
                              minimum: 8,
                              maximum: 400
                            },
                            fontWeight: {
                              type: 'string',
                              enum: ['400', '600', '700']
                            },
                            textColor: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            align: {
                              type: 'string',
                              enum: ['left', 'center', 'right']
                            },
                            locked: {
                              type: 'boolean'
                            },
                            hidden: {
                              type: 'boolean'
                            },
                            group: {
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
                            parent: {
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
                            layout: {
                              type: 'object',
                              properties: {
                                direction: {
                                  type: 'string',
                                  enum: ['horizontal', 'vertical']
                                },
                                gap: {
                                  type: 'number',
                                  minimum: 0,
                                  maximum: 2000
                                },
                                padding: {
                                  type: 'object',
                                  properties: {
                                    top: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    },
                                    right: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    },
                                    bottom: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    },
                                    left: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    }
                                  },
                                  required: ['top', 'right', 'bottom', 'left'],
                                  additionalProperties: false
                                },
                                align: {
                                  type: 'string',
                                  enum: ['start', 'center', 'end', 'stretch']
                                },
                                justify: {
                                  type: 'string',
                                  enum: [
                                    'start',
                                    'center',
                                    'end',
                                    'space-between'
                                  ]
                                },
                                wrap: {
                                  type: 'boolean'
                                }
                              },
                              required: [
                                'direction',
                                'gap',
                                'padding',
                                'align',
                                'justify',
                                'wrap'
                              ],
                              additionalProperties: false
                            },
                            widthMode: {
                              type: 'string',
                              enum: ['fixed', 'hug', 'fill']
                            },
                            heightMode: {
                              type: 'string',
                              enum: ['fixed', 'hug', 'fill']
                            },
                            component: {
                              type: 'object',
                              properties: {
                                definition: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                instance: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                key: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                overrides: {
                                  maxItems: 40,
                                  type: 'array',
                                  items: {
                                    type: 'string'
                                  }
                                }
                              },
                              required: [
                                'definition',
                                'instance',
                                'key',
                                'overrides'
                              ],
                              additionalProperties: false
                            },
                            points: {
                              maxItems: 10000,
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  x: {
                                    type: 'number',
                                    minimum: -100000,
                                    maximum: 100000
                                  },
                                  y: {
                                    type: 'number',
                                    minimum: -100000,
                                    maximum: 100000
                                  }
                                },
                                required: ['x', 'y'],
                                additionalProperties: false
                              }
                            },
                            pathData: {
                              type: 'string',
                              maxLength: 200000,
                              pattern: '^[MmLlHhVvCcSsQqTtAaZz0-9eE+.,\\s-]*$'
                            },
                            pathViewBox: {
                              type: 'object',
                              properties: {
                                x: {
                                  type: 'number',
                                  minimum: -100000,
                                  maximum: 100000
                                },
                                y: {
                                  type: 'number',
                                  minimum: -100000,
                                  maximum: 100000
                                },
                                width: {
                                  type: 'number',
                                  exclusiveMinimum: 0,
                                  maximum: 20000
                                },
                                height: {
                                  type: 'number',
                                  exclusiveMinimum: 0,
                                  maximum: 20000
                                }
                              },
                              required: ['x', 'y', 'width', 'height'],
                              additionalProperties: false
                            },
                            fillRule: {
                              type: 'string',
                              enum: ['nonzero', 'evenodd']
                            },
                            vector: {
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
                                  closed: {
                                    type: 'boolean'
                                  },
                                  nodes: {
                                    minItems: 1,
                                    maxItems: 2000,
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
                                        x: {
                                          type: 'number',
                                          minimum: -100000,
                                          maximum: 100000
                                        },
                                        y: {
                                          type: 'number',
                                          minimum: -100000,
                                          maximum: 100000
                                        },
                                        mode: {
                                          type: 'string',
                                          enum: [
                                            'corner',
                                            'smooth',
                                            'symmetric'
                                          ]
                                        },
                                        in: {
                                          anyOf: [
                                            {
                                              type: 'object',
                                              properties: {
                                                x: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                },
                                                y: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                }
                                              },
                                              required: ['x', 'y'],
                                              additionalProperties: false
                                            },
                                            {
                                              type: 'null'
                                            }
                                          ]
                                        },
                                        out: {
                                          anyOf: [
                                            {
                                              type: 'object',
                                              properties: {
                                                x: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                },
                                                y: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                }
                                              },
                                              required: ['x', 'y'],
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
                                        'x',
                                        'y',
                                        'mode',
                                        'in',
                                        'out'
                                      ],
                                      additionalProperties: false
                                    }
                                  }
                                },
                                required: ['id', 'closed', 'nodes'],
                                additionalProperties: false
                              }
                            },
                            gradient: {
                              type: 'object',
                              properties: {
                                type: {
                                  type: 'string',
                                  enum: ['linear', 'radial']
                                },
                                transform: {
                                  minItems: 6,
                                  maxItems: 6,
                                  type: 'array',
                                  items: {
                                    type: 'number',
                                    minimum: -100000,
                                    maximum: 100000
                                  }
                                },
                                start: {
                                  type: 'object',
                                  properties: {
                                    x: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    },
                                    y: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    }
                                  },
                                  required: ['x', 'y'],
                                  additionalProperties: false
                                },
                                end: {
                                  type: 'object',
                                  properties: {
                                    x: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    },
                                    y: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    }
                                  },
                                  required: ['x', 'y'],
                                  additionalProperties: false
                                },
                                stops: {
                                  minItems: 2,
                                  maxItems: 32,
                                  type: 'array',
                                  items: {
                                    type: 'object',
                                    properties: {
                                      offset: {
                                        type: 'number',
                                        minimum: 0,
                                        maximum: 1
                                      },
                                      color: {
                                        type: 'string',
                                        pattern: '^#[\\da-f]{6}$'
                                      },
                                      opacity: {
                                        type: 'number',
                                        minimum: 0,
                                        maximum: 1
                                      }
                                    },
                                    required: ['offset', 'color', 'opacity'],
                                    additionalProperties: false
                                  }
                                }
                              },
                              required: ['type', 'start', 'end', 'stops'],
                              additionalProperties: false
                            },
                            fontFamily: {
                              type: 'string',
                              maxLength: 120,
                              pattern: '^[\\p{L}\\p{N} _-]+$'
                            },
                            lineHeight: {
                              type: 'number',
                              minimum: 0.1,
                              maximum: 10
                            },
                            letterSpacing: {
                              type: 'number',
                              minimum: -100,
                              maximum: 100
                            },
                            verticalAlign: {
                              type: 'string',
                              enum: ['top', 'center', 'bottom']
                            },
                            textPadding: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1000
                            },
                            clipContent: {
                              type: 'boolean'
                            },
                            prototype: {
                              type: 'object',
                              properties: {
                                trigger: {
                                  type: 'string',
                                  enum: ['click', 'hover']
                                },
                                action: {
                                  type: 'string',
                                  enum: ['navigate', 'overlay', 'back', 'close']
                                },
                                target: {
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
                                transition: {
                                  type: 'string',
                                  enum: ['instant', 'dissolve']
                                },
                                duration: {
                                  type: 'integer',
                                  minimum: 0,
                                  maximum: 3000
                                }
                              },
                              required: [
                                'trigger',
                                'action',
                                'target',
                                'transition',
                                'duration'
                              ],
                              additionalProperties: false
                            },
                            image: {
                              type: 'string',
                              maxLength: 2000000,
                              pattern:
                                '^(?:|data:image\\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+)$'
                            }
                          },
                          required: [
                            'id',
                            'kind',
                            'name',
                            'x',
                            'y',
                            'width',
                            'height',
                            'rotation',
                            'fill',
                            'stroke',
                            'strokeWidth',
                            'opacity',
                            'radius',
                            'text',
                            'fontSize',
                            'fontWeight',
                            'textColor',
                            'align',
                            'locked',
                            'hidden',
                            'group',
                            'points',
                            'image'
                          ],
                          additionalProperties: false
                        }
                      },
                      connectors: {
                        maxItems: 4000,
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
                            source: {
                              type: 'string',
                              format: 'uuid',
                              pattern:
                                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                            },
                            target: {
                              type: 'string',
                              format: 'uuid',
                              pattern:
                                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                            },
                            label: {
                              type: 'string',
                              maxLength: 200
                            },
                            color: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            style: {
                              type: 'string',
                              enum: ['curve', 'straight']
                            },
                            arrow: {
                              type: 'boolean'
                            }
                          },
                          required: [
                            'id',
                            'source',
                            'target',
                            'label',
                            'color',
                            'style',
                            'arrow'
                          ],
                          additionalProperties: false
                        }
                      }
                    },
                    required: [
                      'id',
                      'name',
                      'mode',
                      'background',
                      'elements',
                      'connectors'
                    ],
                    additionalProperties: false
                  }
                },
                components: {
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
                      name: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 160
                      },
                      elements: {
                        minItems: 1,
                        maxItems: 500,
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
                            kind: {
                              type: 'string',
                              enum: [
                                'rectangle',
                                'ellipse',
                                'diamond',
                                'text',
                                'sticky',
                                'node',
                                'frame',
                                'path',
                                'image'
                              ]
                            },
                            name: {
                              type: 'string',
                              maxLength: 160
                            },
                            x: {
                              type: 'number',
                              minimum: -100000,
                              maximum: 100000
                            },
                            y: {
                              type: 'number',
                              minimum: -100000,
                              maximum: 100000
                            },
                            width: {
                              type: 'number',
                              minimum: 1,
                              maximum: 20000
                            },
                            height: {
                              type: 'number',
                              minimum: 1,
                              maximum: 20000
                            },
                            rotation: {
                              type: 'number',
                              minimum: -360,
                              maximum: 360
                            },
                            fill: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            fillOpacity: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1
                            },
                            stroke: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            strokeWidth: {
                              type: 'number',
                              minimum: 0,
                              maximum: 40
                            },
                            opacity: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1
                            },
                            radius: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1000
                            },
                            text: {
                              type: 'string',
                              maxLength: 10000
                            },
                            fontSize: {
                              type: 'number',
                              minimum: 8,
                              maximum: 400
                            },
                            fontWeight: {
                              type: 'string',
                              enum: ['400', '600', '700']
                            },
                            textColor: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            align: {
                              type: 'string',
                              enum: ['left', 'center', 'right']
                            },
                            locked: {
                              type: 'boolean'
                            },
                            hidden: {
                              type: 'boolean'
                            },
                            group: {
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
                            parent: {
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
                            layout: {
                              type: 'object',
                              properties: {
                                direction: {
                                  type: 'string',
                                  enum: ['horizontal', 'vertical']
                                },
                                gap: {
                                  type: 'number',
                                  minimum: 0,
                                  maximum: 2000
                                },
                                padding: {
                                  type: 'object',
                                  properties: {
                                    top: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    },
                                    right: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    },
                                    bottom: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    },
                                    left: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    }
                                  },
                                  required: ['top', 'right', 'bottom', 'left'],
                                  additionalProperties: false
                                },
                                align: {
                                  type: 'string',
                                  enum: ['start', 'center', 'end', 'stretch']
                                },
                                justify: {
                                  type: 'string',
                                  enum: [
                                    'start',
                                    'center',
                                    'end',
                                    'space-between'
                                  ]
                                },
                                wrap: {
                                  type: 'boolean'
                                }
                              },
                              required: [
                                'direction',
                                'gap',
                                'padding',
                                'align',
                                'justify',
                                'wrap'
                              ],
                              additionalProperties: false
                            },
                            widthMode: {
                              type: 'string',
                              enum: ['fixed', 'hug', 'fill']
                            },
                            heightMode: {
                              type: 'string',
                              enum: ['fixed', 'hug', 'fill']
                            },
                            component: {
                              type: 'object',
                              properties: {
                                definition: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                instance: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                key: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                overrides: {
                                  maxItems: 40,
                                  type: 'array',
                                  items: {
                                    type: 'string'
                                  }
                                }
                              },
                              required: [
                                'definition',
                                'instance',
                                'key',
                                'overrides'
                              ],
                              additionalProperties: false
                            },
                            points: {
                              maxItems: 10000,
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  x: {
                                    type: 'number',
                                    minimum: -100000,
                                    maximum: 100000
                                  },
                                  y: {
                                    type: 'number',
                                    minimum: -100000,
                                    maximum: 100000
                                  }
                                },
                                required: ['x', 'y'],
                                additionalProperties: false
                              }
                            },
                            pathData: {
                              type: 'string',
                              maxLength: 200000,
                              pattern: '^[MmLlHhVvCcSsQqTtAaZz0-9eE+.,\\s-]*$'
                            },
                            pathViewBox: {
                              type: 'object',
                              properties: {
                                x: {
                                  type: 'number',
                                  minimum: -100000,
                                  maximum: 100000
                                },
                                y: {
                                  type: 'number',
                                  minimum: -100000,
                                  maximum: 100000
                                },
                                width: {
                                  type: 'number',
                                  exclusiveMinimum: 0,
                                  maximum: 20000
                                },
                                height: {
                                  type: 'number',
                                  exclusiveMinimum: 0,
                                  maximum: 20000
                                }
                              },
                              required: ['x', 'y', 'width', 'height'],
                              additionalProperties: false
                            },
                            fillRule: {
                              type: 'string',
                              enum: ['nonzero', 'evenodd']
                            },
                            vector: {
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
                                  closed: {
                                    type: 'boolean'
                                  },
                                  nodes: {
                                    minItems: 1,
                                    maxItems: 2000,
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
                                        x: {
                                          type: 'number',
                                          minimum: -100000,
                                          maximum: 100000
                                        },
                                        y: {
                                          type: 'number',
                                          minimum: -100000,
                                          maximum: 100000
                                        },
                                        mode: {
                                          type: 'string',
                                          enum: [
                                            'corner',
                                            'smooth',
                                            'symmetric'
                                          ]
                                        },
                                        in: {
                                          anyOf: [
                                            {
                                              type: 'object',
                                              properties: {
                                                x: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                },
                                                y: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                }
                                              },
                                              required: ['x', 'y'],
                                              additionalProperties: false
                                            },
                                            {
                                              type: 'null'
                                            }
                                          ]
                                        },
                                        out: {
                                          anyOf: [
                                            {
                                              type: 'object',
                                              properties: {
                                                x: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                },
                                                y: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                }
                                              },
                                              required: ['x', 'y'],
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
                                        'x',
                                        'y',
                                        'mode',
                                        'in',
                                        'out'
                                      ],
                                      additionalProperties: false
                                    }
                                  }
                                },
                                required: ['id', 'closed', 'nodes'],
                                additionalProperties: false
                              }
                            },
                            gradient: {
                              type: 'object',
                              properties: {
                                type: {
                                  type: 'string',
                                  enum: ['linear', 'radial']
                                },
                                transform: {
                                  minItems: 6,
                                  maxItems: 6,
                                  type: 'array',
                                  items: {
                                    type: 'number',
                                    minimum: -100000,
                                    maximum: 100000
                                  }
                                },
                                start: {
                                  type: 'object',
                                  properties: {
                                    x: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    },
                                    y: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    }
                                  },
                                  required: ['x', 'y'],
                                  additionalProperties: false
                                },
                                end: {
                                  type: 'object',
                                  properties: {
                                    x: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    },
                                    y: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    }
                                  },
                                  required: ['x', 'y'],
                                  additionalProperties: false
                                },
                                stops: {
                                  minItems: 2,
                                  maxItems: 32,
                                  type: 'array',
                                  items: {
                                    type: 'object',
                                    properties: {
                                      offset: {
                                        type: 'number',
                                        minimum: 0,
                                        maximum: 1
                                      },
                                      color: {
                                        type: 'string',
                                        pattern: '^#[\\da-f]{6}$'
                                      },
                                      opacity: {
                                        type: 'number',
                                        minimum: 0,
                                        maximum: 1
                                      }
                                    },
                                    required: ['offset', 'color', 'opacity'],
                                    additionalProperties: false
                                  }
                                }
                              },
                              required: ['type', 'start', 'end', 'stops'],
                              additionalProperties: false
                            },
                            fontFamily: {
                              type: 'string',
                              maxLength: 120,
                              pattern: '^[\\p{L}\\p{N} _-]+$'
                            },
                            lineHeight: {
                              type: 'number',
                              minimum: 0.1,
                              maximum: 10
                            },
                            letterSpacing: {
                              type: 'number',
                              minimum: -100,
                              maximum: 100
                            },
                            verticalAlign: {
                              type: 'string',
                              enum: ['top', 'center', 'bottom']
                            },
                            textPadding: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1000
                            },
                            clipContent: {
                              type: 'boolean'
                            },
                            prototype: {
                              type: 'object',
                              properties: {
                                trigger: {
                                  type: 'string',
                                  enum: ['click', 'hover']
                                },
                                action: {
                                  type: 'string',
                                  enum: ['navigate', 'overlay', 'back', 'close']
                                },
                                target: {
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
                                transition: {
                                  type: 'string',
                                  enum: ['instant', 'dissolve']
                                },
                                duration: {
                                  type: 'integer',
                                  minimum: 0,
                                  maximum: 3000
                                }
                              },
                              required: [
                                'trigger',
                                'action',
                                'target',
                                'transition',
                                'duration'
                              ],
                              additionalProperties: false
                            },
                            image: {
                              type: 'string',
                              maxLength: 2000000,
                              pattern:
                                '^(?:|data:image\\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+)$'
                            }
                          },
                          required: [
                            'id',
                            'kind',
                            'name',
                            'x',
                            'y',
                            'width',
                            'height',
                            'rotation',
                            'fill',
                            'stroke',
                            'strokeWidth',
                            'opacity',
                            'radius',
                            'text',
                            'fontSize',
                            'fontWeight',
                            'textColor',
                            'align',
                            'locked',
                            'hidden',
                            'group',
                            'points',
                            'image'
                          ],
                          additionalProperties: false
                        }
                      },
                      connectors: {
                        maxItems: 1000,
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
                            source: {
                              type: 'string',
                              format: 'uuid',
                              pattern:
                                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                            },
                            target: {
                              type: 'string',
                              format: 'uuid',
                              pattern:
                                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                            },
                            label: {
                              type: 'string',
                              maxLength: 200
                            },
                            color: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            style: {
                              type: 'string',
                              enum: ['curve', 'straight']
                            },
                            arrow: {
                              type: 'boolean'
                            }
                          },
                          required: [
                            'id',
                            'source',
                            'target',
                            'label',
                            'color',
                            'style',
                            'arrow'
                          ],
                          additionalProperties: false
                        }
                      }
                    },
                    required: ['id', 'name', 'elements', 'connectors'],
                    additionalProperties: false
                  }
                }
              },
              required: ['version', 'pages'],
              additionalProperties: false
            }
          },
          required: ['id', 'expected_revision', 'title', 'document'],
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
            workspace_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            title: {
              type: 'string',
              minLength: 1,
              maxLength: 160
            },
            revision: {
              type: 'integer',
              exclusiveMinimum: 0,
              maximum: 9007199254740991
            },
            starred: {
              type: 'boolean'
            },
            archived: {
              type: 'boolean'
            },
            created: {
              type: 'string'
            },
            updated: {
              type: 'string'
            },
            document: {
              type: 'object',
              properties: {
                version: {
                  type: 'number',
                  const: 1
                },
                tags: {
                  maxItems: 30,
                  type: 'array',
                  items: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 80
                  }
                },
                prototypeStart: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                pages: {
                  minItems: 1,
                  maxItems: 40,
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
                        minLength: 1,
                        maxLength: 160
                      },
                      mode: {
                        type: 'string',
                        enum: ['blackboard', 'canvas']
                      },
                      background: {
                        type: 'string',
                        pattern: '^#[\\da-f]{6}$'
                      },
                      elements: {
                        maxItems: 2000,
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
                            kind: {
                              type: 'string',
                              enum: [
                                'rectangle',
                                'ellipse',
                                'diamond',
                                'text',
                                'sticky',
                                'node',
                                'frame',
                                'path',
                                'image'
                              ]
                            },
                            name: {
                              type: 'string',
                              maxLength: 160
                            },
                            x: {
                              type: 'number',
                              minimum: -100000,
                              maximum: 100000
                            },
                            y: {
                              type: 'number',
                              minimum: -100000,
                              maximum: 100000
                            },
                            width: {
                              type: 'number',
                              minimum: 1,
                              maximum: 20000
                            },
                            height: {
                              type: 'number',
                              minimum: 1,
                              maximum: 20000
                            },
                            rotation: {
                              type: 'number',
                              minimum: -360,
                              maximum: 360
                            },
                            fill: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            fillOpacity: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1
                            },
                            stroke: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            strokeWidth: {
                              type: 'number',
                              minimum: 0,
                              maximum: 40
                            },
                            opacity: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1
                            },
                            radius: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1000
                            },
                            text: {
                              type: 'string',
                              maxLength: 10000
                            },
                            fontSize: {
                              type: 'number',
                              minimum: 8,
                              maximum: 400
                            },
                            fontWeight: {
                              type: 'string',
                              enum: ['400', '600', '700']
                            },
                            textColor: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            align: {
                              type: 'string',
                              enum: ['left', 'center', 'right']
                            },
                            locked: {
                              type: 'boolean'
                            },
                            hidden: {
                              type: 'boolean'
                            },
                            group: {
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
                            parent: {
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
                            layout: {
                              type: 'object',
                              properties: {
                                direction: {
                                  type: 'string',
                                  enum: ['horizontal', 'vertical']
                                },
                                gap: {
                                  type: 'number',
                                  minimum: 0,
                                  maximum: 2000
                                },
                                padding: {
                                  type: 'object',
                                  properties: {
                                    top: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    },
                                    right: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    },
                                    bottom: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    },
                                    left: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    }
                                  },
                                  required: ['top', 'right', 'bottom', 'left'],
                                  additionalProperties: false
                                },
                                align: {
                                  type: 'string',
                                  enum: ['start', 'center', 'end', 'stretch']
                                },
                                justify: {
                                  type: 'string',
                                  enum: [
                                    'start',
                                    'center',
                                    'end',
                                    'space-between'
                                  ]
                                },
                                wrap: {
                                  type: 'boolean'
                                }
                              },
                              required: [
                                'direction',
                                'gap',
                                'padding',
                                'align',
                                'justify',
                                'wrap'
                              ],
                              additionalProperties: false
                            },
                            widthMode: {
                              type: 'string',
                              enum: ['fixed', 'hug', 'fill']
                            },
                            heightMode: {
                              type: 'string',
                              enum: ['fixed', 'hug', 'fill']
                            },
                            component: {
                              type: 'object',
                              properties: {
                                definition: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                instance: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                key: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                overrides: {
                                  maxItems: 40,
                                  type: 'array',
                                  items: {
                                    type: 'string'
                                  }
                                }
                              },
                              required: [
                                'definition',
                                'instance',
                                'key',
                                'overrides'
                              ],
                              additionalProperties: false
                            },
                            points: {
                              maxItems: 10000,
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  x: {
                                    type: 'number',
                                    minimum: -100000,
                                    maximum: 100000
                                  },
                                  y: {
                                    type: 'number',
                                    minimum: -100000,
                                    maximum: 100000
                                  }
                                },
                                required: ['x', 'y'],
                                additionalProperties: false
                              }
                            },
                            pathData: {
                              type: 'string',
                              maxLength: 200000,
                              pattern: '^[MmLlHhVvCcSsQqTtAaZz0-9eE+.,\\s-]*$'
                            },
                            pathViewBox: {
                              type: 'object',
                              properties: {
                                x: {
                                  type: 'number',
                                  minimum: -100000,
                                  maximum: 100000
                                },
                                y: {
                                  type: 'number',
                                  minimum: -100000,
                                  maximum: 100000
                                },
                                width: {
                                  type: 'number',
                                  exclusiveMinimum: 0,
                                  maximum: 20000
                                },
                                height: {
                                  type: 'number',
                                  exclusiveMinimum: 0,
                                  maximum: 20000
                                }
                              },
                              required: ['x', 'y', 'width', 'height'],
                              additionalProperties: false
                            },
                            fillRule: {
                              type: 'string',
                              enum: ['nonzero', 'evenodd']
                            },
                            vector: {
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
                                  closed: {
                                    type: 'boolean'
                                  },
                                  nodes: {
                                    minItems: 1,
                                    maxItems: 2000,
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
                                        x: {
                                          type: 'number',
                                          minimum: -100000,
                                          maximum: 100000
                                        },
                                        y: {
                                          type: 'number',
                                          minimum: -100000,
                                          maximum: 100000
                                        },
                                        mode: {
                                          type: 'string',
                                          enum: [
                                            'corner',
                                            'smooth',
                                            'symmetric'
                                          ]
                                        },
                                        in: {
                                          anyOf: [
                                            {
                                              type: 'object',
                                              properties: {
                                                x: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                },
                                                y: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                }
                                              },
                                              required: ['x', 'y'],
                                              additionalProperties: false
                                            },
                                            {
                                              type: 'null'
                                            }
                                          ]
                                        },
                                        out: {
                                          anyOf: [
                                            {
                                              type: 'object',
                                              properties: {
                                                x: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                },
                                                y: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                }
                                              },
                                              required: ['x', 'y'],
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
                                        'x',
                                        'y',
                                        'mode',
                                        'in',
                                        'out'
                                      ],
                                      additionalProperties: false
                                    }
                                  }
                                },
                                required: ['id', 'closed', 'nodes'],
                                additionalProperties: false
                              }
                            },
                            gradient: {
                              type: 'object',
                              properties: {
                                type: {
                                  type: 'string',
                                  enum: ['linear', 'radial']
                                },
                                transform: {
                                  minItems: 6,
                                  maxItems: 6,
                                  type: 'array',
                                  items: {
                                    type: 'number',
                                    minimum: -100000,
                                    maximum: 100000
                                  }
                                },
                                start: {
                                  type: 'object',
                                  properties: {
                                    x: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    },
                                    y: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    }
                                  },
                                  required: ['x', 'y'],
                                  additionalProperties: false
                                },
                                end: {
                                  type: 'object',
                                  properties: {
                                    x: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    },
                                    y: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    }
                                  },
                                  required: ['x', 'y'],
                                  additionalProperties: false
                                },
                                stops: {
                                  minItems: 2,
                                  maxItems: 32,
                                  type: 'array',
                                  items: {
                                    type: 'object',
                                    properties: {
                                      offset: {
                                        type: 'number',
                                        minimum: 0,
                                        maximum: 1
                                      },
                                      color: {
                                        type: 'string',
                                        pattern: '^#[\\da-f]{6}$'
                                      },
                                      opacity: {
                                        type: 'number',
                                        minimum: 0,
                                        maximum: 1
                                      }
                                    },
                                    required: ['offset', 'color', 'opacity'],
                                    additionalProperties: false
                                  }
                                }
                              },
                              required: ['type', 'start', 'end', 'stops'],
                              additionalProperties: false
                            },
                            fontFamily: {
                              type: 'string',
                              maxLength: 120,
                              pattern: '^[\\p{L}\\p{N} _-]+$'
                            },
                            lineHeight: {
                              type: 'number',
                              minimum: 0.1,
                              maximum: 10
                            },
                            letterSpacing: {
                              type: 'number',
                              minimum: -100,
                              maximum: 100
                            },
                            verticalAlign: {
                              type: 'string',
                              enum: ['top', 'center', 'bottom']
                            },
                            textPadding: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1000
                            },
                            clipContent: {
                              type: 'boolean'
                            },
                            prototype: {
                              type: 'object',
                              properties: {
                                trigger: {
                                  type: 'string',
                                  enum: ['click', 'hover']
                                },
                                action: {
                                  type: 'string',
                                  enum: ['navigate', 'overlay', 'back', 'close']
                                },
                                target: {
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
                                transition: {
                                  type: 'string',
                                  enum: ['instant', 'dissolve']
                                },
                                duration: {
                                  type: 'integer',
                                  minimum: 0,
                                  maximum: 3000
                                }
                              },
                              required: [
                                'trigger',
                                'action',
                                'target',
                                'transition',
                                'duration'
                              ],
                              additionalProperties: false
                            },
                            image: {
                              type: 'string',
                              maxLength: 2000000,
                              pattern:
                                '^(?:|data:image\\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+)$'
                            }
                          },
                          required: [
                            'id',
                            'kind',
                            'name',
                            'x',
                            'y',
                            'width',
                            'height',
                            'rotation',
                            'fill',
                            'stroke',
                            'strokeWidth',
                            'opacity',
                            'radius',
                            'text',
                            'fontSize',
                            'fontWeight',
                            'textColor',
                            'align',
                            'locked',
                            'hidden',
                            'group',
                            'points',
                            'image'
                          ],
                          additionalProperties: false
                        }
                      },
                      connectors: {
                        maxItems: 4000,
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
                            source: {
                              type: 'string',
                              format: 'uuid',
                              pattern:
                                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                            },
                            target: {
                              type: 'string',
                              format: 'uuid',
                              pattern:
                                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                            },
                            label: {
                              type: 'string',
                              maxLength: 200
                            },
                            color: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            style: {
                              type: 'string',
                              enum: ['curve', 'straight']
                            },
                            arrow: {
                              type: 'boolean'
                            }
                          },
                          required: [
                            'id',
                            'source',
                            'target',
                            'label',
                            'color',
                            'style',
                            'arrow'
                          ],
                          additionalProperties: false
                        }
                      }
                    },
                    required: [
                      'id',
                      'name',
                      'mode',
                      'background',
                      'elements',
                      'connectors'
                    ],
                    additionalProperties: false
                  }
                },
                components: {
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
                      name: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 160
                      },
                      elements: {
                        minItems: 1,
                        maxItems: 500,
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
                            kind: {
                              type: 'string',
                              enum: [
                                'rectangle',
                                'ellipse',
                                'diamond',
                                'text',
                                'sticky',
                                'node',
                                'frame',
                                'path',
                                'image'
                              ]
                            },
                            name: {
                              type: 'string',
                              maxLength: 160
                            },
                            x: {
                              type: 'number',
                              minimum: -100000,
                              maximum: 100000
                            },
                            y: {
                              type: 'number',
                              minimum: -100000,
                              maximum: 100000
                            },
                            width: {
                              type: 'number',
                              minimum: 1,
                              maximum: 20000
                            },
                            height: {
                              type: 'number',
                              minimum: 1,
                              maximum: 20000
                            },
                            rotation: {
                              type: 'number',
                              minimum: -360,
                              maximum: 360
                            },
                            fill: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            fillOpacity: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1
                            },
                            stroke: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            strokeWidth: {
                              type: 'number',
                              minimum: 0,
                              maximum: 40
                            },
                            opacity: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1
                            },
                            radius: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1000
                            },
                            text: {
                              type: 'string',
                              maxLength: 10000
                            },
                            fontSize: {
                              type: 'number',
                              minimum: 8,
                              maximum: 400
                            },
                            fontWeight: {
                              type: 'string',
                              enum: ['400', '600', '700']
                            },
                            textColor: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            align: {
                              type: 'string',
                              enum: ['left', 'center', 'right']
                            },
                            locked: {
                              type: 'boolean'
                            },
                            hidden: {
                              type: 'boolean'
                            },
                            group: {
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
                            parent: {
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
                            layout: {
                              type: 'object',
                              properties: {
                                direction: {
                                  type: 'string',
                                  enum: ['horizontal', 'vertical']
                                },
                                gap: {
                                  type: 'number',
                                  minimum: 0,
                                  maximum: 2000
                                },
                                padding: {
                                  type: 'object',
                                  properties: {
                                    top: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    },
                                    right: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    },
                                    bottom: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    },
                                    left: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    }
                                  },
                                  required: ['top', 'right', 'bottom', 'left'],
                                  additionalProperties: false
                                },
                                align: {
                                  type: 'string',
                                  enum: ['start', 'center', 'end', 'stretch']
                                },
                                justify: {
                                  type: 'string',
                                  enum: [
                                    'start',
                                    'center',
                                    'end',
                                    'space-between'
                                  ]
                                },
                                wrap: {
                                  type: 'boolean'
                                }
                              },
                              required: [
                                'direction',
                                'gap',
                                'padding',
                                'align',
                                'justify',
                                'wrap'
                              ],
                              additionalProperties: false
                            },
                            widthMode: {
                              type: 'string',
                              enum: ['fixed', 'hug', 'fill']
                            },
                            heightMode: {
                              type: 'string',
                              enum: ['fixed', 'hug', 'fill']
                            },
                            component: {
                              type: 'object',
                              properties: {
                                definition: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                instance: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                key: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                overrides: {
                                  maxItems: 40,
                                  type: 'array',
                                  items: {
                                    type: 'string'
                                  }
                                }
                              },
                              required: [
                                'definition',
                                'instance',
                                'key',
                                'overrides'
                              ],
                              additionalProperties: false
                            },
                            points: {
                              maxItems: 10000,
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  x: {
                                    type: 'number',
                                    minimum: -100000,
                                    maximum: 100000
                                  },
                                  y: {
                                    type: 'number',
                                    minimum: -100000,
                                    maximum: 100000
                                  }
                                },
                                required: ['x', 'y'],
                                additionalProperties: false
                              }
                            },
                            pathData: {
                              type: 'string',
                              maxLength: 200000,
                              pattern: '^[MmLlHhVvCcSsQqTtAaZz0-9eE+.,\\s-]*$'
                            },
                            pathViewBox: {
                              type: 'object',
                              properties: {
                                x: {
                                  type: 'number',
                                  minimum: -100000,
                                  maximum: 100000
                                },
                                y: {
                                  type: 'number',
                                  minimum: -100000,
                                  maximum: 100000
                                },
                                width: {
                                  type: 'number',
                                  exclusiveMinimum: 0,
                                  maximum: 20000
                                },
                                height: {
                                  type: 'number',
                                  exclusiveMinimum: 0,
                                  maximum: 20000
                                }
                              },
                              required: ['x', 'y', 'width', 'height'],
                              additionalProperties: false
                            },
                            fillRule: {
                              type: 'string',
                              enum: ['nonzero', 'evenodd']
                            },
                            vector: {
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
                                  closed: {
                                    type: 'boolean'
                                  },
                                  nodes: {
                                    minItems: 1,
                                    maxItems: 2000,
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
                                        x: {
                                          type: 'number',
                                          minimum: -100000,
                                          maximum: 100000
                                        },
                                        y: {
                                          type: 'number',
                                          minimum: -100000,
                                          maximum: 100000
                                        },
                                        mode: {
                                          type: 'string',
                                          enum: [
                                            'corner',
                                            'smooth',
                                            'symmetric'
                                          ]
                                        },
                                        in: {
                                          anyOf: [
                                            {
                                              type: 'object',
                                              properties: {
                                                x: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                },
                                                y: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                }
                                              },
                                              required: ['x', 'y'],
                                              additionalProperties: false
                                            },
                                            {
                                              type: 'null'
                                            }
                                          ]
                                        },
                                        out: {
                                          anyOf: [
                                            {
                                              type: 'object',
                                              properties: {
                                                x: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                },
                                                y: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                }
                                              },
                                              required: ['x', 'y'],
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
                                        'x',
                                        'y',
                                        'mode',
                                        'in',
                                        'out'
                                      ],
                                      additionalProperties: false
                                    }
                                  }
                                },
                                required: ['id', 'closed', 'nodes'],
                                additionalProperties: false
                              }
                            },
                            gradient: {
                              type: 'object',
                              properties: {
                                type: {
                                  type: 'string',
                                  enum: ['linear', 'radial']
                                },
                                transform: {
                                  minItems: 6,
                                  maxItems: 6,
                                  type: 'array',
                                  items: {
                                    type: 'number',
                                    minimum: -100000,
                                    maximum: 100000
                                  }
                                },
                                start: {
                                  type: 'object',
                                  properties: {
                                    x: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    },
                                    y: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    }
                                  },
                                  required: ['x', 'y'],
                                  additionalProperties: false
                                },
                                end: {
                                  type: 'object',
                                  properties: {
                                    x: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    },
                                    y: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    }
                                  },
                                  required: ['x', 'y'],
                                  additionalProperties: false
                                },
                                stops: {
                                  minItems: 2,
                                  maxItems: 32,
                                  type: 'array',
                                  items: {
                                    type: 'object',
                                    properties: {
                                      offset: {
                                        type: 'number',
                                        minimum: 0,
                                        maximum: 1
                                      },
                                      color: {
                                        type: 'string',
                                        pattern: '^#[\\da-f]{6}$'
                                      },
                                      opacity: {
                                        type: 'number',
                                        minimum: 0,
                                        maximum: 1
                                      }
                                    },
                                    required: ['offset', 'color', 'opacity'],
                                    additionalProperties: false
                                  }
                                }
                              },
                              required: ['type', 'start', 'end', 'stops'],
                              additionalProperties: false
                            },
                            fontFamily: {
                              type: 'string',
                              maxLength: 120,
                              pattern: '^[\\p{L}\\p{N} _-]+$'
                            },
                            lineHeight: {
                              type: 'number',
                              minimum: 0.1,
                              maximum: 10
                            },
                            letterSpacing: {
                              type: 'number',
                              minimum: -100,
                              maximum: 100
                            },
                            verticalAlign: {
                              type: 'string',
                              enum: ['top', 'center', 'bottom']
                            },
                            textPadding: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1000
                            },
                            clipContent: {
                              type: 'boolean'
                            },
                            prototype: {
                              type: 'object',
                              properties: {
                                trigger: {
                                  type: 'string',
                                  enum: ['click', 'hover']
                                },
                                action: {
                                  type: 'string',
                                  enum: ['navigate', 'overlay', 'back', 'close']
                                },
                                target: {
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
                                transition: {
                                  type: 'string',
                                  enum: ['instant', 'dissolve']
                                },
                                duration: {
                                  type: 'integer',
                                  minimum: 0,
                                  maximum: 3000
                                }
                              },
                              required: [
                                'trigger',
                                'action',
                                'target',
                                'transition',
                                'duration'
                              ],
                              additionalProperties: false
                            },
                            image: {
                              type: 'string',
                              maxLength: 2000000,
                              pattern:
                                '^(?:|data:image\\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+)$'
                            }
                          },
                          required: [
                            'id',
                            'kind',
                            'name',
                            'x',
                            'y',
                            'width',
                            'height',
                            'rotation',
                            'fill',
                            'stroke',
                            'strokeWidth',
                            'opacity',
                            'radius',
                            'text',
                            'fontSize',
                            'fontWeight',
                            'textColor',
                            'align',
                            'locked',
                            'hidden',
                            'group',
                            'points',
                            'image'
                          ],
                          additionalProperties: false
                        }
                      },
                      connectors: {
                        maxItems: 1000,
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
                            source: {
                              type: 'string',
                              format: 'uuid',
                              pattern:
                                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                            },
                            target: {
                              type: 'string',
                              format: 'uuid',
                              pattern:
                                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                            },
                            label: {
                              type: 'string',
                              maxLength: 200
                            },
                            color: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            style: {
                              type: 'string',
                              enum: ['curve', 'straight']
                            },
                            arrow: {
                              type: 'boolean'
                            }
                          },
                          required: [
                            'id',
                            'source',
                            'target',
                            'label',
                            'color',
                            'style',
                            'arrow'
                          ],
                          additionalProperties: false
                        }
                      }
                    },
                    required: ['id', 'name', 'elements', 'connectors'],
                    additionalProperties: false
                  }
                }
              },
              required: ['version', 'pages'],
              additionalProperties: false
            }
          },
          required: [
            'id',
            'workspace_id',
            'title',
            'revision',
            'starred',
            'archived',
            'created',
            'updated',
            'document'
          ],
          additionalProperties: false
        }
      }
    },
    update: {
      method: 'post',
      description:
        'Star, archive or restore a Redraw project without deleting its document',
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
            starred: {
              type: 'boolean'
            },
            archived: {
              type: 'boolean'
            }
          },
          required: ['id', 'expected_revision'],
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
            workspace_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            title: {
              type: 'string',
              minLength: 1,
              maxLength: 160
            },
            revision: {
              type: 'integer',
              exclusiveMinimum: 0,
              maximum: 9007199254740991
            },
            starred: {
              type: 'boolean'
            },
            archived: {
              type: 'boolean'
            },
            created: {
              type: 'string'
            },
            updated: {
              type: 'string'
            },
            document: {
              type: 'object',
              properties: {
                version: {
                  type: 'number',
                  const: 1
                },
                tags: {
                  maxItems: 30,
                  type: 'array',
                  items: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 80
                  }
                },
                prototypeStart: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                pages: {
                  minItems: 1,
                  maxItems: 40,
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
                        minLength: 1,
                        maxLength: 160
                      },
                      mode: {
                        type: 'string',
                        enum: ['blackboard', 'canvas']
                      },
                      background: {
                        type: 'string',
                        pattern: '^#[\\da-f]{6}$'
                      },
                      elements: {
                        maxItems: 2000,
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
                            kind: {
                              type: 'string',
                              enum: [
                                'rectangle',
                                'ellipse',
                                'diamond',
                                'text',
                                'sticky',
                                'node',
                                'frame',
                                'path',
                                'image'
                              ]
                            },
                            name: {
                              type: 'string',
                              maxLength: 160
                            },
                            x: {
                              type: 'number',
                              minimum: -100000,
                              maximum: 100000
                            },
                            y: {
                              type: 'number',
                              minimum: -100000,
                              maximum: 100000
                            },
                            width: {
                              type: 'number',
                              minimum: 1,
                              maximum: 20000
                            },
                            height: {
                              type: 'number',
                              minimum: 1,
                              maximum: 20000
                            },
                            rotation: {
                              type: 'number',
                              minimum: -360,
                              maximum: 360
                            },
                            fill: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            fillOpacity: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1
                            },
                            stroke: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            strokeWidth: {
                              type: 'number',
                              minimum: 0,
                              maximum: 40
                            },
                            opacity: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1
                            },
                            radius: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1000
                            },
                            text: {
                              type: 'string',
                              maxLength: 10000
                            },
                            fontSize: {
                              type: 'number',
                              minimum: 8,
                              maximum: 400
                            },
                            fontWeight: {
                              type: 'string',
                              enum: ['400', '600', '700']
                            },
                            textColor: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            align: {
                              type: 'string',
                              enum: ['left', 'center', 'right']
                            },
                            locked: {
                              type: 'boolean'
                            },
                            hidden: {
                              type: 'boolean'
                            },
                            group: {
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
                            parent: {
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
                            layout: {
                              type: 'object',
                              properties: {
                                direction: {
                                  type: 'string',
                                  enum: ['horizontal', 'vertical']
                                },
                                gap: {
                                  type: 'number',
                                  minimum: 0,
                                  maximum: 2000
                                },
                                padding: {
                                  type: 'object',
                                  properties: {
                                    top: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    },
                                    right: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    },
                                    bottom: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    },
                                    left: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    }
                                  },
                                  required: ['top', 'right', 'bottom', 'left'],
                                  additionalProperties: false
                                },
                                align: {
                                  type: 'string',
                                  enum: ['start', 'center', 'end', 'stretch']
                                },
                                justify: {
                                  type: 'string',
                                  enum: [
                                    'start',
                                    'center',
                                    'end',
                                    'space-between'
                                  ]
                                },
                                wrap: {
                                  type: 'boolean'
                                }
                              },
                              required: [
                                'direction',
                                'gap',
                                'padding',
                                'align',
                                'justify',
                                'wrap'
                              ],
                              additionalProperties: false
                            },
                            widthMode: {
                              type: 'string',
                              enum: ['fixed', 'hug', 'fill']
                            },
                            heightMode: {
                              type: 'string',
                              enum: ['fixed', 'hug', 'fill']
                            },
                            component: {
                              type: 'object',
                              properties: {
                                definition: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                instance: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                key: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                overrides: {
                                  maxItems: 40,
                                  type: 'array',
                                  items: {
                                    type: 'string'
                                  }
                                }
                              },
                              required: [
                                'definition',
                                'instance',
                                'key',
                                'overrides'
                              ],
                              additionalProperties: false
                            },
                            points: {
                              maxItems: 10000,
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  x: {
                                    type: 'number',
                                    minimum: -100000,
                                    maximum: 100000
                                  },
                                  y: {
                                    type: 'number',
                                    minimum: -100000,
                                    maximum: 100000
                                  }
                                },
                                required: ['x', 'y'],
                                additionalProperties: false
                              }
                            },
                            pathData: {
                              type: 'string',
                              maxLength: 200000,
                              pattern: '^[MmLlHhVvCcSsQqTtAaZz0-9eE+.,\\s-]*$'
                            },
                            pathViewBox: {
                              type: 'object',
                              properties: {
                                x: {
                                  type: 'number',
                                  minimum: -100000,
                                  maximum: 100000
                                },
                                y: {
                                  type: 'number',
                                  minimum: -100000,
                                  maximum: 100000
                                },
                                width: {
                                  type: 'number',
                                  exclusiveMinimum: 0,
                                  maximum: 20000
                                },
                                height: {
                                  type: 'number',
                                  exclusiveMinimum: 0,
                                  maximum: 20000
                                }
                              },
                              required: ['x', 'y', 'width', 'height'],
                              additionalProperties: false
                            },
                            fillRule: {
                              type: 'string',
                              enum: ['nonzero', 'evenodd']
                            },
                            vector: {
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
                                  closed: {
                                    type: 'boolean'
                                  },
                                  nodes: {
                                    minItems: 1,
                                    maxItems: 2000,
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
                                        x: {
                                          type: 'number',
                                          minimum: -100000,
                                          maximum: 100000
                                        },
                                        y: {
                                          type: 'number',
                                          minimum: -100000,
                                          maximum: 100000
                                        },
                                        mode: {
                                          type: 'string',
                                          enum: [
                                            'corner',
                                            'smooth',
                                            'symmetric'
                                          ]
                                        },
                                        in: {
                                          anyOf: [
                                            {
                                              type: 'object',
                                              properties: {
                                                x: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                },
                                                y: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                }
                                              },
                                              required: ['x', 'y'],
                                              additionalProperties: false
                                            },
                                            {
                                              type: 'null'
                                            }
                                          ]
                                        },
                                        out: {
                                          anyOf: [
                                            {
                                              type: 'object',
                                              properties: {
                                                x: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                },
                                                y: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                }
                                              },
                                              required: ['x', 'y'],
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
                                        'x',
                                        'y',
                                        'mode',
                                        'in',
                                        'out'
                                      ],
                                      additionalProperties: false
                                    }
                                  }
                                },
                                required: ['id', 'closed', 'nodes'],
                                additionalProperties: false
                              }
                            },
                            gradient: {
                              type: 'object',
                              properties: {
                                type: {
                                  type: 'string',
                                  enum: ['linear', 'radial']
                                },
                                transform: {
                                  minItems: 6,
                                  maxItems: 6,
                                  type: 'array',
                                  items: {
                                    type: 'number',
                                    minimum: -100000,
                                    maximum: 100000
                                  }
                                },
                                start: {
                                  type: 'object',
                                  properties: {
                                    x: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    },
                                    y: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    }
                                  },
                                  required: ['x', 'y'],
                                  additionalProperties: false
                                },
                                end: {
                                  type: 'object',
                                  properties: {
                                    x: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    },
                                    y: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    }
                                  },
                                  required: ['x', 'y'],
                                  additionalProperties: false
                                },
                                stops: {
                                  minItems: 2,
                                  maxItems: 32,
                                  type: 'array',
                                  items: {
                                    type: 'object',
                                    properties: {
                                      offset: {
                                        type: 'number',
                                        minimum: 0,
                                        maximum: 1
                                      },
                                      color: {
                                        type: 'string',
                                        pattern: '^#[\\da-f]{6}$'
                                      },
                                      opacity: {
                                        type: 'number',
                                        minimum: 0,
                                        maximum: 1
                                      }
                                    },
                                    required: ['offset', 'color', 'opacity'],
                                    additionalProperties: false
                                  }
                                }
                              },
                              required: ['type', 'start', 'end', 'stops'],
                              additionalProperties: false
                            },
                            fontFamily: {
                              type: 'string',
                              maxLength: 120,
                              pattern: '^[\\p{L}\\p{N} _-]+$'
                            },
                            lineHeight: {
                              type: 'number',
                              minimum: 0.1,
                              maximum: 10
                            },
                            letterSpacing: {
                              type: 'number',
                              minimum: -100,
                              maximum: 100
                            },
                            verticalAlign: {
                              type: 'string',
                              enum: ['top', 'center', 'bottom']
                            },
                            textPadding: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1000
                            },
                            clipContent: {
                              type: 'boolean'
                            },
                            prototype: {
                              type: 'object',
                              properties: {
                                trigger: {
                                  type: 'string',
                                  enum: ['click', 'hover']
                                },
                                action: {
                                  type: 'string',
                                  enum: ['navigate', 'overlay', 'back', 'close']
                                },
                                target: {
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
                                transition: {
                                  type: 'string',
                                  enum: ['instant', 'dissolve']
                                },
                                duration: {
                                  type: 'integer',
                                  minimum: 0,
                                  maximum: 3000
                                }
                              },
                              required: [
                                'trigger',
                                'action',
                                'target',
                                'transition',
                                'duration'
                              ],
                              additionalProperties: false
                            },
                            image: {
                              type: 'string',
                              maxLength: 2000000,
                              pattern:
                                '^(?:|data:image\\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+)$'
                            }
                          },
                          required: [
                            'id',
                            'kind',
                            'name',
                            'x',
                            'y',
                            'width',
                            'height',
                            'rotation',
                            'fill',
                            'stroke',
                            'strokeWidth',
                            'opacity',
                            'radius',
                            'text',
                            'fontSize',
                            'fontWeight',
                            'textColor',
                            'align',
                            'locked',
                            'hidden',
                            'group',
                            'points',
                            'image'
                          ],
                          additionalProperties: false
                        }
                      },
                      connectors: {
                        maxItems: 4000,
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
                            source: {
                              type: 'string',
                              format: 'uuid',
                              pattern:
                                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                            },
                            target: {
                              type: 'string',
                              format: 'uuid',
                              pattern:
                                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                            },
                            label: {
                              type: 'string',
                              maxLength: 200
                            },
                            color: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            style: {
                              type: 'string',
                              enum: ['curve', 'straight']
                            },
                            arrow: {
                              type: 'boolean'
                            }
                          },
                          required: [
                            'id',
                            'source',
                            'target',
                            'label',
                            'color',
                            'style',
                            'arrow'
                          ],
                          additionalProperties: false
                        }
                      }
                    },
                    required: [
                      'id',
                      'name',
                      'mode',
                      'background',
                      'elements',
                      'connectors'
                    ],
                    additionalProperties: false
                  }
                },
                components: {
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
                      name: {
                        type: 'string',
                        minLength: 1,
                        maxLength: 160
                      },
                      elements: {
                        minItems: 1,
                        maxItems: 500,
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
                            kind: {
                              type: 'string',
                              enum: [
                                'rectangle',
                                'ellipse',
                                'diamond',
                                'text',
                                'sticky',
                                'node',
                                'frame',
                                'path',
                                'image'
                              ]
                            },
                            name: {
                              type: 'string',
                              maxLength: 160
                            },
                            x: {
                              type: 'number',
                              minimum: -100000,
                              maximum: 100000
                            },
                            y: {
                              type: 'number',
                              minimum: -100000,
                              maximum: 100000
                            },
                            width: {
                              type: 'number',
                              minimum: 1,
                              maximum: 20000
                            },
                            height: {
                              type: 'number',
                              minimum: 1,
                              maximum: 20000
                            },
                            rotation: {
                              type: 'number',
                              minimum: -360,
                              maximum: 360
                            },
                            fill: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            fillOpacity: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1
                            },
                            stroke: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            strokeWidth: {
                              type: 'number',
                              minimum: 0,
                              maximum: 40
                            },
                            opacity: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1
                            },
                            radius: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1000
                            },
                            text: {
                              type: 'string',
                              maxLength: 10000
                            },
                            fontSize: {
                              type: 'number',
                              minimum: 8,
                              maximum: 400
                            },
                            fontWeight: {
                              type: 'string',
                              enum: ['400', '600', '700']
                            },
                            textColor: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            align: {
                              type: 'string',
                              enum: ['left', 'center', 'right']
                            },
                            locked: {
                              type: 'boolean'
                            },
                            hidden: {
                              type: 'boolean'
                            },
                            group: {
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
                            parent: {
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
                            layout: {
                              type: 'object',
                              properties: {
                                direction: {
                                  type: 'string',
                                  enum: ['horizontal', 'vertical']
                                },
                                gap: {
                                  type: 'number',
                                  minimum: 0,
                                  maximum: 2000
                                },
                                padding: {
                                  type: 'object',
                                  properties: {
                                    top: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    },
                                    right: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    },
                                    bottom: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    },
                                    left: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 2000
                                    }
                                  },
                                  required: ['top', 'right', 'bottom', 'left'],
                                  additionalProperties: false
                                },
                                align: {
                                  type: 'string',
                                  enum: ['start', 'center', 'end', 'stretch']
                                },
                                justify: {
                                  type: 'string',
                                  enum: [
                                    'start',
                                    'center',
                                    'end',
                                    'space-between'
                                  ]
                                },
                                wrap: {
                                  type: 'boolean'
                                }
                              },
                              required: [
                                'direction',
                                'gap',
                                'padding',
                                'align',
                                'justify',
                                'wrap'
                              ],
                              additionalProperties: false
                            },
                            widthMode: {
                              type: 'string',
                              enum: ['fixed', 'hug', 'fill']
                            },
                            heightMode: {
                              type: 'string',
                              enum: ['fixed', 'hug', 'fill']
                            },
                            component: {
                              type: 'object',
                              properties: {
                                definition: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                instance: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                key: {
                                  type: 'string',
                                  format: 'uuid',
                                  pattern:
                                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                },
                                overrides: {
                                  maxItems: 40,
                                  type: 'array',
                                  items: {
                                    type: 'string'
                                  }
                                }
                              },
                              required: [
                                'definition',
                                'instance',
                                'key',
                                'overrides'
                              ],
                              additionalProperties: false
                            },
                            points: {
                              maxItems: 10000,
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  x: {
                                    type: 'number',
                                    minimum: -100000,
                                    maximum: 100000
                                  },
                                  y: {
                                    type: 'number',
                                    minimum: -100000,
                                    maximum: 100000
                                  }
                                },
                                required: ['x', 'y'],
                                additionalProperties: false
                              }
                            },
                            pathData: {
                              type: 'string',
                              maxLength: 200000,
                              pattern: '^[MmLlHhVvCcSsQqTtAaZz0-9eE+.,\\s-]*$'
                            },
                            pathViewBox: {
                              type: 'object',
                              properties: {
                                x: {
                                  type: 'number',
                                  minimum: -100000,
                                  maximum: 100000
                                },
                                y: {
                                  type: 'number',
                                  minimum: -100000,
                                  maximum: 100000
                                },
                                width: {
                                  type: 'number',
                                  exclusiveMinimum: 0,
                                  maximum: 20000
                                },
                                height: {
                                  type: 'number',
                                  exclusiveMinimum: 0,
                                  maximum: 20000
                                }
                              },
                              required: ['x', 'y', 'width', 'height'],
                              additionalProperties: false
                            },
                            fillRule: {
                              type: 'string',
                              enum: ['nonzero', 'evenodd']
                            },
                            vector: {
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
                                  closed: {
                                    type: 'boolean'
                                  },
                                  nodes: {
                                    minItems: 1,
                                    maxItems: 2000,
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
                                        x: {
                                          type: 'number',
                                          minimum: -100000,
                                          maximum: 100000
                                        },
                                        y: {
                                          type: 'number',
                                          minimum: -100000,
                                          maximum: 100000
                                        },
                                        mode: {
                                          type: 'string',
                                          enum: [
                                            'corner',
                                            'smooth',
                                            'symmetric'
                                          ]
                                        },
                                        in: {
                                          anyOf: [
                                            {
                                              type: 'object',
                                              properties: {
                                                x: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                },
                                                y: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                }
                                              },
                                              required: ['x', 'y'],
                                              additionalProperties: false
                                            },
                                            {
                                              type: 'null'
                                            }
                                          ]
                                        },
                                        out: {
                                          anyOf: [
                                            {
                                              type: 'object',
                                              properties: {
                                                x: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                },
                                                y: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                }
                                              },
                                              required: ['x', 'y'],
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
                                        'x',
                                        'y',
                                        'mode',
                                        'in',
                                        'out'
                                      ],
                                      additionalProperties: false
                                    }
                                  }
                                },
                                required: ['id', 'closed', 'nodes'],
                                additionalProperties: false
                              }
                            },
                            gradient: {
                              type: 'object',
                              properties: {
                                type: {
                                  type: 'string',
                                  enum: ['linear', 'radial']
                                },
                                transform: {
                                  minItems: 6,
                                  maxItems: 6,
                                  type: 'array',
                                  items: {
                                    type: 'number',
                                    minimum: -100000,
                                    maximum: 100000
                                  }
                                },
                                start: {
                                  type: 'object',
                                  properties: {
                                    x: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    },
                                    y: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    }
                                  },
                                  required: ['x', 'y'],
                                  additionalProperties: false
                                },
                                end: {
                                  type: 'object',
                                  properties: {
                                    x: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    },
                                    y: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    }
                                  },
                                  required: ['x', 'y'],
                                  additionalProperties: false
                                },
                                stops: {
                                  minItems: 2,
                                  maxItems: 32,
                                  type: 'array',
                                  items: {
                                    type: 'object',
                                    properties: {
                                      offset: {
                                        type: 'number',
                                        minimum: 0,
                                        maximum: 1
                                      },
                                      color: {
                                        type: 'string',
                                        pattern: '^#[\\da-f]{6}$'
                                      },
                                      opacity: {
                                        type: 'number',
                                        minimum: 0,
                                        maximum: 1
                                      }
                                    },
                                    required: ['offset', 'color', 'opacity'],
                                    additionalProperties: false
                                  }
                                }
                              },
                              required: ['type', 'start', 'end', 'stops'],
                              additionalProperties: false
                            },
                            fontFamily: {
                              type: 'string',
                              maxLength: 120,
                              pattern: '^[\\p{L}\\p{N} _-]+$'
                            },
                            lineHeight: {
                              type: 'number',
                              minimum: 0.1,
                              maximum: 10
                            },
                            letterSpacing: {
                              type: 'number',
                              minimum: -100,
                              maximum: 100
                            },
                            verticalAlign: {
                              type: 'string',
                              enum: ['top', 'center', 'bottom']
                            },
                            textPadding: {
                              type: 'number',
                              minimum: 0,
                              maximum: 1000
                            },
                            clipContent: {
                              type: 'boolean'
                            },
                            prototype: {
                              type: 'object',
                              properties: {
                                trigger: {
                                  type: 'string',
                                  enum: ['click', 'hover']
                                },
                                action: {
                                  type: 'string',
                                  enum: ['navigate', 'overlay', 'back', 'close']
                                },
                                target: {
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
                                transition: {
                                  type: 'string',
                                  enum: ['instant', 'dissolve']
                                },
                                duration: {
                                  type: 'integer',
                                  minimum: 0,
                                  maximum: 3000
                                }
                              },
                              required: [
                                'trigger',
                                'action',
                                'target',
                                'transition',
                                'duration'
                              ],
                              additionalProperties: false
                            },
                            image: {
                              type: 'string',
                              maxLength: 2000000,
                              pattern:
                                '^(?:|data:image\\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+)$'
                            }
                          },
                          required: [
                            'id',
                            'kind',
                            'name',
                            'x',
                            'y',
                            'width',
                            'height',
                            'rotation',
                            'fill',
                            'stroke',
                            'strokeWidth',
                            'opacity',
                            'radius',
                            'text',
                            'fontSize',
                            'fontWeight',
                            'textColor',
                            'align',
                            'locked',
                            'hidden',
                            'group',
                            'points',
                            'image'
                          ],
                          additionalProperties: false
                        }
                      },
                      connectors: {
                        maxItems: 1000,
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
                            source: {
                              type: 'string',
                              format: 'uuid',
                              pattern:
                                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                            },
                            target: {
                              type: 'string',
                              format: 'uuid',
                              pattern:
                                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                            },
                            label: {
                              type: 'string',
                              maxLength: 200
                            },
                            color: {
                              type: 'string',
                              pattern: '^#[\\da-f]{6}$'
                            },
                            style: {
                              type: 'string',
                              enum: ['curve', 'straight']
                            },
                            arrow: {
                              type: 'boolean'
                            }
                          },
                          required: [
                            'id',
                            'source',
                            'target',
                            'label',
                            'color',
                            'style',
                            'arrow'
                          ],
                          additionalProperties: false
                        }
                      }
                    },
                    required: ['id', 'name', 'elements', 'connectors'],
                    additionalProperties: false
                  }
                }
              },
              required: ['version', 'pages'],
              additionalProperties: false
            }
          },
          required: [
            'id',
            'workspace_id',
            'title',
            'revision',
            'starred',
            'archived',
            'created',
            'updated',
            'document'
          ],
          additionalProperties: false
        }
      }
    }
  },
  collaboration: {
    sync: {
      method: 'post',
      description: 'Synchronize Redraw edits and live workspace presence',
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
            session: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            revision: {
              type: 'integer',
              minimum: 0,
              maximum: 9007199254740991
            },
            presence: {
              type: 'object',
              properties: {
                page: {
                  type: 'string',
                  format: 'uuid',
                  pattern:
                    '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                },
                cursor: {
                  anyOf: [
                    {
                      type: 'object',
                      properties: {
                        x: {
                          type: 'number',
                          minimum: -100000,
                          maximum: 100000
                        },
                        y: {
                          type: 'number',
                          minimum: -100000,
                          maximum: 100000
                        }
                      },
                      required: ['x', 'y'],
                      additionalProperties: false
                    },
                    {
                      type: 'null'
                    }
                  ]
                },
                selection: {
                  maxItems: 50,
                  type: 'array',
                  items: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  }
                }
              },
              required: ['page', 'cursor', 'selection'],
              additionalProperties: false
            },
            change: {
              type: 'object',
              properties: {
                sequence: {
                  type: 'integer',
                  exclusiveMinimum: 0,
                  maximum: 2147483647
                },
                base: {
                  type: 'object',
                  properties: {
                    title: {
                      type: 'string',
                      minLength: 1,
                      maxLength: 160
                    },
                    document: {
                      type: 'object',
                      properties: {
                        version: {
                          type: 'number',
                          const: 1
                        },
                        tags: {
                          maxItems: 30,
                          type: 'array',
                          items: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 80
                          }
                        },
                        prototypeStart: {
                          type: 'string',
                          format: 'uuid',
                          pattern:
                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                        },
                        pages: {
                          minItems: 1,
                          maxItems: 40,
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
                                minLength: 1,
                                maxLength: 160
                              },
                              mode: {
                                type: 'string',
                                enum: ['blackboard', 'canvas']
                              },
                              background: {
                                type: 'string',
                                pattern: '^#[\\da-f]{6}$'
                              },
                              elements: {
                                maxItems: 2000,
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
                                    kind: {
                                      type: 'string',
                                      enum: [
                                        'rectangle',
                                        'ellipse',
                                        'diamond',
                                        'text',
                                        'sticky',
                                        'node',
                                        'frame',
                                        'path',
                                        'image'
                                      ]
                                    },
                                    name: {
                                      type: 'string',
                                      maxLength: 160
                                    },
                                    x: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    },
                                    y: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    },
                                    width: {
                                      type: 'number',
                                      minimum: 1,
                                      maximum: 20000
                                    },
                                    height: {
                                      type: 'number',
                                      minimum: 1,
                                      maximum: 20000
                                    },
                                    rotation: {
                                      type: 'number',
                                      minimum: -360,
                                      maximum: 360
                                    },
                                    fill: {
                                      type: 'string',
                                      pattern: '^#[\\da-f]{6}$'
                                    },
                                    fillOpacity: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 1
                                    },
                                    stroke: {
                                      type: 'string',
                                      pattern: '^#[\\da-f]{6}$'
                                    },
                                    strokeWidth: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 40
                                    },
                                    opacity: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 1
                                    },
                                    radius: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 1000
                                    },
                                    text: {
                                      type: 'string',
                                      maxLength: 10000
                                    },
                                    fontSize: {
                                      type: 'number',
                                      minimum: 8,
                                      maximum: 400
                                    },
                                    fontWeight: {
                                      type: 'string',
                                      enum: ['400', '600', '700']
                                    },
                                    textColor: {
                                      type: 'string',
                                      pattern: '^#[\\da-f]{6}$'
                                    },
                                    align: {
                                      type: 'string',
                                      enum: ['left', 'center', 'right']
                                    },
                                    locked: {
                                      type: 'boolean'
                                    },
                                    hidden: {
                                      type: 'boolean'
                                    },
                                    group: {
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
                                    parent: {
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
                                    layout: {
                                      type: 'object',
                                      properties: {
                                        direction: {
                                          type: 'string',
                                          enum: ['horizontal', 'vertical']
                                        },
                                        gap: {
                                          type: 'number',
                                          minimum: 0,
                                          maximum: 2000
                                        },
                                        padding: {
                                          type: 'object',
                                          properties: {
                                            top: {
                                              type: 'number',
                                              minimum: 0,
                                              maximum: 2000
                                            },
                                            right: {
                                              type: 'number',
                                              minimum: 0,
                                              maximum: 2000
                                            },
                                            bottom: {
                                              type: 'number',
                                              minimum: 0,
                                              maximum: 2000
                                            },
                                            left: {
                                              type: 'number',
                                              minimum: 0,
                                              maximum: 2000
                                            }
                                          },
                                          required: [
                                            'top',
                                            'right',
                                            'bottom',
                                            'left'
                                          ],
                                          additionalProperties: false
                                        },
                                        align: {
                                          type: 'string',
                                          enum: [
                                            'start',
                                            'center',
                                            'end',
                                            'stretch'
                                          ]
                                        },
                                        justify: {
                                          type: 'string',
                                          enum: [
                                            'start',
                                            'center',
                                            'end',
                                            'space-between'
                                          ]
                                        },
                                        wrap: {
                                          type: 'boolean'
                                        }
                                      },
                                      required: [
                                        'direction',
                                        'gap',
                                        'padding',
                                        'align',
                                        'justify',
                                        'wrap'
                                      ],
                                      additionalProperties: false
                                    },
                                    widthMode: {
                                      type: 'string',
                                      enum: ['fixed', 'hug', 'fill']
                                    },
                                    heightMode: {
                                      type: 'string',
                                      enum: ['fixed', 'hug', 'fill']
                                    },
                                    component: {
                                      type: 'object',
                                      properties: {
                                        definition: {
                                          type: 'string',
                                          format: 'uuid',
                                          pattern:
                                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                        },
                                        instance: {
                                          type: 'string',
                                          format: 'uuid',
                                          pattern:
                                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                        },
                                        key: {
                                          type: 'string',
                                          format: 'uuid',
                                          pattern:
                                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                        },
                                        overrides: {
                                          maxItems: 40,
                                          type: 'array',
                                          items: {
                                            type: 'string'
                                          }
                                        }
                                      },
                                      required: [
                                        'definition',
                                        'instance',
                                        'key',
                                        'overrides'
                                      ],
                                      additionalProperties: false
                                    },
                                    points: {
                                      maxItems: 10000,
                                      type: 'array',
                                      items: {
                                        type: 'object',
                                        properties: {
                                          x: {
                                            type: 'number',
                                            minimum: -100000,
                                            maximum: 100000
                                          },
                                          y: {
                                            type: 'number',
                                            minimum: -100000,
                                            maximum: 100000
                                          }
                                        },
                                        required: ['x', 'y'],
                                        additionalProperties: false
                                      }
                                    },
                                    pathData: {
                                      type: 'string',
                                      maxLength: 200000,
                                      pattern:
                                        '^[MmLlHhVvCcSsQqTtAaZz0-9eE+.,\\s-]*$'
                                    },
                                    pathViewBox: {
                                      type: 'object',
                                      properties: {
                                        x: {
                                          type: 'number',
                                          minimum: -100000,
                                          maximum: 100000
                                        },
                                        y: {
                                          type: 'number',
                                          minimum: -100000,
                                          maximum: 100000
                                        },
                                        width: {
                                          type: 'number',
                                          exclusiveMinimum: 0,
                                          maximum: 20000
                                        },
                                        height: {
                                          type: 'number',
                                          exclusiveMinimum: 0,
                                          maximum: 20000
                                        }
                                      },
                                      required: ['x', 'y', 'width', 'height'],
                                      additionalProperties: false
                                    },
                                    fillRule: {
                                      type: 'string',
                                      enum: ['nonzero', 'evenodd']
                                    },
                                    vector: {
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
                                          closed: {
                                            type: 'boolean'
                                          },
                                          nodes: {
                                            minItems: 1,
                                            maxItems: 2000,
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
                                                x: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                },
                                                y: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                },
                                                mode: {
                                                  type: 'string',
                                                  enum: [
                                                    'corner',
                                                    'smooth',
                                                    'symmetric'
                                                  ]
                                                },
                                                in: {
                                                  anyOf: [
                                                    {
                                                      type: 'object',
                                                      properties: {
                                                        x: {
                                                          type: 'number',
                                                          minimum: -100000,
                                                          maximum: 100000
                                                        },
                                                        y: {
                                                          type: 'number',
                                                          minimum: -100000,
                                                          maximum: 100000
                                                        }
                                                      },
                                                      required: ['x', 'y'],
                                                      additionalProperties: false
                                                    },
                                                    {
                                                      type: 'null'
                                                    }
                                                  ]
                                                },
                                                out: {
                                                  anyOf: [
                                                    {
                                                      type: 'object',
                                                      properties: {
                                                        x: {
                                                          type: 'number',
                                                          minimum: -100000,
                                                          maximum: 100000
                                                        },
                                                        y: {
                                                          type: 'number',
                                                          minimum: -100000,
                                                          maximum: 100000
                                                        }
                                                      },
                                                      required: ['x', 'y'],
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
                                                'x',
                                                'y',
                                                'mode',
                                                'in',
                                                'out'
                                              ],
                                              additionalProperties: false
                                            }
                                          }
                                        },
                                        required: ['id', 'closed', 'nodes'],
                                        additionalProperties: false
                                      }
                                    },
                                    gradient: {
                                      type: 'object',
                                      properties: {
                                        type: {
                                          type: 'string',
                                          enum: ['linear', 'radial']
                                        },
                                        transform: {
                                          minItems: 6,
                                          maxItems: 6,
                                          type: 'array',
                                          items: {
                                            type: 'number',
                                            minimum: -100000,
                                            maximum: 100000
                                          }
                                        },
                                        start: {
                                          type: 'object',
                                          properties: {
                                            x: {
                                              type: 'number',
                                              minimum: -100000,
                                              maximum: 100000
                                            },
                                            y: {
                                              type: 'number',
                                              minimum: -100000,
                                              maximum: 100000
                                            }
                                          },
                                          required: ['x', 'y'],
                                          additionalProperties: false
                                        },
                                        end: {
                                          type: 'object',
                                          properties: {
                                            x: {
                                              type: 'number',
                                              minimum: -100000,
                                              maximum: 100000
                                            },
                                            y: {
                                              type: 'number',
                                              minimum: -100000,
                                              maximum: 100000
                                            }
                                          },
                                          required: ['x', 'y'],
                                          additionalProperties: false
                                        },
                                        stops: {
                                          minItems: 2,
                                          maxItems: 32,
                                          type: 'array',
                                          items: {
                                            type: 'object',
                                            properties: {
                                              offset: {
                                                type: 'number',
                                                minimum: 0,
                                                maximum: 1
                                              },
                                              color: {
                                                type: 'string',
                                                pattern: '^#[\\da-f]{6}$'
                                              },
                                              opacity: {
                                                type: 'number',
                                                minimum: 0,
                                                maximum: 1
                                              }
                                            },
                                            required: [
                                              'offset',
                                              'color',
                                              'opacity'
                                            ],
                                            additionalProperties: false
                                          }
                                        }
                                      },
                                      required: [
                                        'type',
                                        'start',
                                        'end',
                                        'stops'
                                      ],
                                      additionalProperties: false
                                    },
                                    fontFamily: {
                                      type: 'string',
                                      maxLength: 120,
                                      pattern: '^[\\p{L}\\p{N} _-]+$'
                                    },
                                    lineHeight: {
                                      type: 'number',
                                      minimum: 0.1,
                                      maximum: 10
                                    },
                                    letterSpacing: {
                                      type: 'number',
                                      minimum: -100,
                                      maximum: 100
                                    },
                                    verticalAlign: {
                                      type: 'string',
                                      enum: ['top', 'center', 'bottom']
                                    },
                                    textPadding: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 1000
                                    },
                                    clipContent: {
                                      type: 'boolean'
                                    },
                                    prototype: {
                                      type: 'object',
                                      properties: {
                                        trigger: {
                                          type: 'string',
                                          enum: ['click', 'hover']
                                        },
                                        action: {
                                          type: 'string',
                                          enum: [
                                            'navigate',
                                            'overlay',
                                            'back',
                                            'close'
                                          ]
                                        },
                                        target: {
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
                                        transition: {
                                          type: 'string',
                                          enum: ['instant', 'dissolve']
                                        },
                                        duration: {
                                          type: 'integer',
                                          minimum: 0,
                                          maximum: 3000
                                        }
                                      },
                                      required: [
                                        'trigger',
                                        'action',
                                        'target',
                                        'transition',
                                        'duration'
                                      ],
                                      additionalProperties: false
                                    },
                                    image: {
                                      type: 'string',
                                      maxLength: 2000000,
                                      pattern:
                                        '^(?:|data:image\\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+)$'
                                    }
                                  },
                                  required: [
                                    'id',
                                    'kind',
                                    'name',
                                    'x',
                                    'y',
                                    'width',
                                    'height',
                                    'rotation',
                                    'fill',
                                    'stroke',
                                    'strokeWidth',
                                    'opacity',
                                    'radius',
                                    'text',
                                    'fontSize',
                                    'fontWeight',
                                    'textColor',
                                    'align',
                                    'locked',
                                    'hidden',
                                    'group',
                                    'points',
                                    'image'
                                  ],
                                  additionalProperties: false
                                }
                              },
                              connectors: {
                                maxItems: 4000,
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
                                    source: {
                                      type: 'string',
                                      format: 'uuid',
                                      pattern:
                                        '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                    },
                                    target: {
                                      type: 'string',
                                      format: 'uuid',
                                      pattern:
                                        '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                    },
                                    label: {
                                      type: 'string',
                                      maxLength: 200
                                    },
                                    color: {
                                      type: 'string',
                                      pattern: '^#[\\da-f]{6}$'
                                    },
                                    style: {
                                      type: 'string',
                                      enum: ['curve', 'straight']
                                    },
                                    arrow: {
                                      type: 'boolean'
                                    }
                                  },
                                  required: [
                                    'id',
                                    'source',
                                    'target',
                                    'label',
                                    'color',
                                    'style',
                                    'arrow'
                                  ],
                                  additionalProperties: false
                                }
                              }
                            },
                            required: [
                              'id',
                              'name',
                              'mode',
                              'background',
                              'elements',
                              'connectors'
                            ],
                            additionalProperties: false
                          }
                        },
                        components: {
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
                              name: {
                                type: 'string',
                                minLength: 1,
                                maxLength: 160
                              },
                              elements: {
                                minItems: 1,
                                maxItems: 500,
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
                                    kind: {
                                      type: 'string',
                                      enum: [
                                        'rectangle',
                                        'ellipse',
                                        'diamond',
                                        'text',
                                        'sticky',
                                        'node',
                                        'frame',
                                        'path',
                                        'image'
                                      ]
                                    },
                                    name: {
                                      type: 'string',
                                      maxLength: 160
                                    },
                                    x: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    },
                                    y: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    },
                                    width: {
                                      type: 'number',
                                      minimum: 1,
                                      maximum: 20000
                                    },
                                    height: {
                                      type: 'number',
                                      minimum: 1,
                                      maximum: 20000
                                    },
                                    rotation: {
                                      type: 'number',
                                      minimum: -360,
                                      maximum: 360
                                    },
                                    fill: {
                                      type: 'string',
                                      pattern: '^#[\\da-f]{6}$'
                                    },
                                    fillOpacity: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 1
                                    },
                                    stroke: {
                                      type: 'string',
                                      pattern: '^#[\\da-f]{6}$'
                                    },
                                    strokeWidth: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 40
                                    },
                                    opacity: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 1
                                    },
                                    radius: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 1000
                                    },
                                    text: {
                                      type: 'string',
                                      maxLength: 10000
                                    },
                                    fontSize: {
                                      type: 'number',
                                      minimum: 8,
                                      maximum: 400
                                    },
                                    fontWeight: {
                                      type: 'string',
                                      enum: ['400', '600', '700']
                                    },
                                    textColor: {
                                      type: 'string',
                                      pattern: '^#[\\da-f]{6}$'
                                    },
                                    align: {
                                      type: 'string',
                                      enum: ['left', 'center', 'right']
                                    },
                                    locked: {
                                      type: 'boolean'
                                    },
                                    hidden: {
                                      type: 'boolean'
                                    },
                                    group: {
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
                                    parent: {
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
                                    layout: {
                                      type: 'object',
                                      properties: {
                                        direction: {
                                          type: 'string',
                                          enum: ['horizontal', 'vertical']
                                        },
                                        gap: {
                                          type: 'number',
                                          minimum: 0,
                                          maximum: 2000
                                        },
                                        padding: {
                                          type: 'object',
                                          properties: {
                                            top: {
                                              type: 'number',
                                              minimum: 0,
                                              maximum: 2000
                                            },
                                            right: {
                                              type: 'number',
                                              minimum: 0,
                                              maximum: 2000
                                            },
                                            bottom: {
                                              type: 'number',
                                              minimum: 0,
                                              maximum: 2000
                                            },
                                            left: {
                                              type: 'number',
                                              minimum: 0,
                                              maximum: 2000
                                            }
                                          },
                                          required: [
                                            'top',
                                            'right',
                                            'bottom',
                                            'left'
                                          ],
                                          additionalProperties: false
                                        },
                                        align: {
                                          type: 'string',
                                          enum: [
                                            'start',
                                            'center',
                                            'end',
                                            'stretch'
                                          ]
                                        },
                                        justify: {
                                          type: 'string',
                                          enum: [
                                            'start',
                                            'center',
                                            'end',
                                            'space-between'
                                          ]
                                        },
                                        wrap: {
                                          type: 'boolean'
                                        }
                                      },
                                      required: [
                                        'direction',
                                        'gap',
                                        'padding',
                                        'align',
                                        'justify',
                                        'wrap'
                                      ],
                                      additionalProperties: false
                                    },
                                    widthMode: {
                                      type: 'string',
                                      enum: ['fixed', 'hug', 'fill']
                                    },
                                    heightMode: {
                                      type: 'string',
                                      enum: ['fixed', 'hug', 'fill']
                                    },
                                    component: {
                                      type: 'object',
                                      properties: {
                                        definition: {
                                          type: 'string',
                                          format: 'uuid',
                                          pattern:
                                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                        },
                                        instance: {
                                          type: 'string',
                                          format: 'uuid',
                                          pattern:
                                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                        },
                                        key: {
                                          type: 'string',
                                          format: 'uuid',
                                          pattern:
                                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                        },
                                        overrides: {
                                          maxItems: 40,
                                          type: 'array',
                                          items: {
                                            type: 'string'
                                          }
                                        }
                                      },
                                      required: [
                                        'definition',
                                        'instance',
                                        'key',
                                        'overrides'
                                      ],
                                      additionalProperties: false
                                    },
                                    points: {
                                      maxItems: 10000,
                                      type: 'array',
                                      items: {
                                        type: 'object',
                                        properties: {
                                          x: {
                                            type: 'number',
                                            minimum: -100000,
                                            maximum: 100000
                                          },
                                          y: {
                                            type: 'number',
                                            minimum: -100000,
                                            maximum: 100000
                                          }
                                        },
                                        required: ['x', 'y'],
                                        additionalProperties: false
                                      }
                                    },
                                    pathData: {
                                      type: 'string',
                                      maxLength: 200000,
                                      pattern:
                                        '^[MmLlHhVvCcSsQqTtAaZz0-9eE+.,\\s-]*$'
                                    },
                                    pathViewBox: {
                                      type: 'object',
                                      properties: {
                                        x: {
                                          type: 'number',
                                          minimum: -100000,
                                          maximum: 100000
                                        },
                                        y: {
                                          type: 'number',
                                          minimum: -100000,
                                          maximum: 100000
                                        },
                                        width: {
                                          type: 'number',
                                          exclusiveMinimum: 0,
                                          maximum: 20000
                                        },
                                        height: {
                                          type: 'number',
                                          exclusiveMinimum: 0,
                                          maximum: 20000
                                        }
                                      },
                                      required: ['x', 'y', 'width', 'height'],
                                      additionalProperties: false
                                    },
                                    fillRule: {
                                      type: 'string',
                                      enum: ['nonzero', 'evenodd']
                                    },
                                    vector: {
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
                                          closed: {
                                            type: 'boolean'
                                          },
                                          nodes: {
                                            minItems: 1,
                                            maxItems: 2000,
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
                                                x: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                },
                                                y: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                },
                                                mode: {
                                                  type: 'string',
                                                  enum: [
                                                    'corner',
                                                    'smooth',
                                                    'symmetric'
                                                  ]
                                                },
                                                in: {
                                                  anyOf: [
                                                    {
                                                      type: 'object',
                                                      properties: {
                                                        x: {
                                                          type: 'number',
                                                          minimum: -100000,
                                                          maximum: 100000
                                                        },
                                                        y: {
                                                          type: 'number',
                                                          minimum: -100000,
                                                          maximum: 100000
                                                        }
                                                      },
                                                      required: ['x', 'y'],
                                                      additionalProperties: false
                                                    },
                                                    {
                                                      type: 'null'
                                                    }
                                                  ]
                                                },
                                                out: {
                                                  anyOf: [
                                                    {
                                                      type: 'object',
                                                      properties: {
                                                        x: {
                                                          type: 'number',
                                                          minimum: -100000,
                                                          maximum: 100000
                                                        },
                                                        y: {
                                                          type: 'number',
                                                          minimum: -100000,
                                                          maximum: 100000
                                                        }
                                                      },
                                                      required: ['x', 'y'],
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
                                                'x',
                                                'y',
                                                'mode',
                                                'in',
                                                'out'
                                              ],
                                              additionalProperties: false
                                            }
                                          }
                                        },
                                        required: ['id', 'closed', 'nodes'],
                                        additionalProperties: false
                                      }
                                    },
                                    gradient: {
                                      type: 'object',
                                      properties: {
                                        type: {
                                          type: 'string',
                                          enum: ['linear', 'radial']
                                        },
                                        transform: {
                                          minItems: 6,
                                          maxItems: 6,
                                          type: 'array',
                                          items: {
                                            type: 'number',
                                            minimum: -100000,
                                            maximum: 100000
                                          }
                                        },
                                        start: {
                                          type: 'object',
                                          properties: {
                                            x: {
                                              type: 'number',
                                              minimum: -100000,
                                              maximum: 100000
                                            },
                                            y: {
                                              type: 'number',
                                              minimum: -100000,
                                              maximum: 100000
                                            }
                                          },
                                          required: ['x', 'y'],
                                          additionalProperties: false
                                        },
                                        end: {
                                          type: 'object',
                                          properties: {
                                            x: {
                                              type: 'number',
                                              minimum: -100000,
                                              maximum: 100000
                                            },
                                            y: {
                                              type: 'number',
                                              minimum: -100000,
                                              maximum: 100000
                                            }
                                          },
                                          required: ['x', 'y'],
                                          additionalProperties: false
                                        },
                                        stops: {
                                          minItems: 2,
                                          maxItems: 32,
                                          type: 'array',
                                          items: {
                                            type: 'object',
                                            properties: {
                                              offset: {
                                                type: 'number',
                                                minimum: 0,
                                                maximum: 1
                                              },
                                              color: {
                                                type: 'string',
                                                pattern: '^#[\\da-f]{6}$'
                                              },
                                              opacity: {
                                                type: 'number',
                                                minimum: 0,
                                                maximum: 1
                                              }
                                            },
                                            required: [
                                              'offset',
                                              'color',
                                              'opacity'
                                            ],
                                            additionalProperties: false
                                          }
                                        }
                                      },
                                      required: [
                                        'type',
                                        'start',
                                        'end',
                                        'stops'
                                      ],
                                      additionalProperties: false
                                    },
                                    fontFamily: {
                                      type: 'string',
                                      maxLength: 120,
                                      pattern: '^[\\p{L}\\p{N} _-]+$'
                                    },
                                    lineHeight: {
                                      type: 'number',
                                      minimum: 0.1,
                                      maximum: 10
                                    },
                                    letterSpacing: {
                                      type: 'number',
                                      minimum: -100,
                                      maximum: 100
                                    },
                                    verticalAlign: {
                                      type: 'string',
                                      enum: ['top', 'center', 'bottom']
                                    },
                                    textPadding: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 1000
                                    },
                                    clipContent: {
                                      type: 'boolean'
                                    },
                                    prototype: {
                                      type: 'object',
                                      properties: {
                                        trigger: {
                                          type: 'string',
                                          enum: ['click', 'hover']
                                        },
                                        action: {
                                          type: 'string',
                                          enum: [
                                            'navigate',
                                            'overlay',
                                            'back',
                                            'close'
                                          ]
                                        },
                                        target: {
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
                                        transition: {
                                          type: 'string',
                                          enum: ['instant', 'dissolve']
                                        },
                                        duration: {
                                          type: 'integer',
                                          minimum: 0,
                                          maximum: 3000
                                        }
                                      },
                                      required: [
                                        'trigger',
                                        'action',
                                        'target',
                                        'transition',
                                        'duration'
                                      ],
                                      additionalProperties: false
                                    },
                                    image: {
                                      type: 'string',
                                      maxLength: 2000000,
                                      pattern:
                                        '^(?:|data:image\\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+)$'
                                    }
                                  },
                                  required: [
                                    'id',
                                    'kind',
                                    'name',
                                    'x',
                                    'y',
                                    'width',
                                    'height',
                                    'rotation',
                                    'fill',
                                    'stroke',
                                    'strokeWidth',
                                    'opacity',
                                    'radius',
                                    'text',
                                    'fontSize',
                                    'fontWeight',
                                    'textColor',
                                    'align',
                                    'locked',
                                    'hidden',
                                    'group',
                                    'points',
                                    'image'
                                  ],
                                  additionalProperties: false
                                }
                              },
                              connectors: {
                                maxItems: 1000,
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
                                    source: {
                                      type: 'string',
                                      format: 'uuid',
                                      pattern:
                                        '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                    },
                                    target: {
                                      type: 'string',
                                      format: 'uuid',
                                      pattern:
                                        '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                    },
                                    label: {
                                      type: 'string',
                                      maxLength: 200
                                    },
                                    color: {
                                      type: 'string',
                                      pattern: '^#[\\da-f]{6}$'
                                    },
                                    style: {
                                      type: 'string',
                                      enum: ['curve', 'straight']
                                    },
                                    arrow: {
                                      type: 'boolean'
                                    }
                                  },
                                  required: [
                                    'id',
                                    'source',
                                    'target',
                                    'label',
                                    'color',
                                    'style',
                                    'arrow'
                                  ],
                                  additionalProperties: false
                                }
                              }
                            },
                            required: ['id', 'name', 'elements', 'connectors'],
                            additionalProperties: false
                          }
                        }
                      },
                      required: ['version', 'pages'],
                      additionalProperties: false
                    }
                  },
                  required: ['title', 'document'],
                  additionalProperties: false
                },
                next: {
                  type: 'object',
                  properties: {
                    title: {
                      type: 'string',
                      minLength: 1,
                      maxLength: 160
                    },
                    document: {
                      type: 'object',
                      properties: {
                        version: {
                          type: 'number',
                          const: 1
                        },
                        tags: {
                          maxItems: 30,
                          type: 'array',
                          items: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 80
                          }
                        },
                        prototypeStart: {
                          type: 'string',
                          format: 'uuid',
                          pattern:
                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                        },
                        pages: {
                          minItems: 1,
                          maxItems: 40,
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
                                minLength: 1,
                                maxLength: 160
                              },
                              mode: {
                                type: 'string',
                                enum: ['blackboard', 'canvas']
                              },
                              background: {
                                type: 'string',
                                pattern: '^#[\\da-f]{6}$'
                              },
                              elements: {
                                maxItems: 2000,
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
                                    kind: {
                                      type: 'string',
                                      enum: [
                                        'rectangle',
                                        'ellipse',
                                        'diamond',
                                        'text',
                                        'sticky',
                                        'node',
                                        'frame',
                                        'path',
                                        'image'
                                      ]
                                    },
                                    name: {
                                      type: 'string',
                                      maxLength: 160
                                    },
                                    x: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    },
                                    y: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    },
                                    width: {
                                      type: 'number',
                                      minimum: 1,
                                      maximum: 20000
                                    },
                                    height: {
                                      type: 'number',
                                      minimum: 1,
                                      maximum: 20000
                                    },
                                    rotation: {
                                      type: 'number',
                                      minimum: -360,
                                      maximum: 360
                                    },
                                    fill: {
                                      type: 'string',
                                      pattern: '^#[\\da-f]{6}$'
                                    },
                                    fillOpacity: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 1
                                    },
                                    stroke: {
                                      type: 'string',
                                      pattern: '^#[\\da-f]{6}$'
                                    },
                                    strokeWidth: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 40
                                    },
                                    opacity: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 1
                                    },
                                    radius: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 1000
                                    },
                                    text: {
                                      type: 'string',
                                      maxLength: 10000
                                    },
                                    fontSize: {
                                      type: 'number',
                                      minimum: 8,
                                      maximum: 400
                                    },
                                    fontWeight: {
                                      type: 'string',
                                      enum: ['400', '600', '700']
                                    },
                                    textColor: {
                                      type: 'string',
                                      pattern: '^#[\\da-f]{6}$'
                                    },
                                    align: {
                                      type: 'string',
                                      enum: ['left', 'center', 'right']
                                    },
                                    locked: {
                                      type: 'boolean'
                                    },
                                    hidden: {
                                      type: 'boolean'
                                    },
                                    group: {
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
                                    parent: {
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
                                    layout: {
                                      type: 'object',
                                      properties: {
                                        direction: {
                                          type: 'string',
                                          enum: ['horizontal', 'vertical']
                                        },
                                        gap: {
                                          type: 'number',
                                          minimum: 0,
                                          maximum: 2000
                                        },
                                        padding: {
                                          type: 'object',
                                          properties: {
                                            top: {
                                              type: 'number',
                                              minimum: 0,
                                              maximum: 2000
                                            },
                                            right: {
                                              type: 'number',
                                              minimum: 0,
                                              maximum: 2000
                                            },
                                            bottom: {
                                              type: 'number',
                                              minimum: 0,
                                              maximum: 2000
                                            },
                                            left: {
                                              type: 'number',
                                              minimum: 0,
                                              maximum: 2000
                                            }
                                          },
                                          required: [
                                            'top',
                                            'right',
                                            'bottom',
                                            'left'
                                          ],
                                          additionalProperties: false
                                        },
                                        align: {
                                          type: 'string',
                                          enum: [
                                            'start',
                                            'center',
                                            'end',
                                            'stretch'
                                          ]
                                        },
                                        justify: {
                                          type: 'string',
                                          enum: [
                                            'start',
                                            'center',
                                            'end',
                                            'space-between'
                                          ]
                                        },
                                        wrap: {
                                          type: 'boolean'
                                        }
                                      },
                                      required: [
                                        'direction',
                                        'gap',
                                        'padding',
                                        'align',
                                        'justify',
                                        'wrap'
                                      ],
                                      additionalProperties: false
                                    },
                                    widthMode: {
                                      type: 'string',
                                      enum: ['fixed', 'hug', 'fill']
                                    },
                                    heightMode: {
                                      type: 'string',
                                      enum: ['fixed', 'hug', 'fill']
                                    },
                                    component: {
                                      type: 'object',
                                      properties: {
                                        definition: {
                                          type: 'string',
                                          format: 'uuid',
                                          pattern:
                                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                        },
                                        instance: {
                                          type: 'string',
                                          format: 'uuid',
                                          pattern:
                                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                        },
                                        key: {
                                          type: 'string',
                                          format: 'uuid',
                                          pattern:
                                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                        },
                                        overrides: {
                                          maxItems: 40,
                                          type: 'array',
                                          items: {
                                            type: 'string'
                                          }
                                        }
                                      },
                                      required: [
                                        'definition',
                                        'instance',
                                        'key',
                                        'overrides'
                                      ],
                                      additionalProperties: false
                                    },
                                    points: {
                                      maxItems: 10000,
                                      type: 'array',
                                      items: {
                                        type: 'object',
                                        properties: {
                                          x: {
                                            type: 'number',
                                            minimum: -100000,
                                            maximum: 100000
                                          },
                                          y: {
                                            type: 'number',
                                            minimum: -100000,
                                            maximum: 100000
                                          }
                                        },
                                        required: ['x', 'y'],
                                        additionalProperties: false
                                      }
                                    },
                                    pathData: {
                                      type: 'string',
                                      maxLength: 200000,
                                      pattern:
                                        '^[MmLlHhVvCcSsQqTtAaZz0-9eE+.,\\s-]*$'
                                    },
                                    pathViewBox: {
                                      type: 'object',
                                      properties: {
                                        x: {
                                          type: 'number',
                                          minimum: -100000,
                                          maximum: 100000
                                        },
                                        y: {
                                          type: 'number',
                                          minimum: -100000,
                                          maximum: 100000
                                        },
                                        width: {
                                          type: 'number',
                                          exclusiveMinimum: 0,
                                          maximum: 20000
                                        },
                                        height: {
                                          type: 'number',
                                          exclusiveMinimum: 0,
                                          maximum: 20000
                                        }
                                      },
                                      required: ['x', 'y', 'width', 'height'],
                                      additionalProperties: false
                                    },
                                    fillRule: {
                                      type: 'string',
                                      enum: ['nonzero', 'evenodd']
                                    },
                                    vector: {
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
                                          closed: {
                                            type: 'boolean'
                                          },
                                          nodes: {
                                            minItems: 1,
                                            maxItems: 2000,
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
                                                x: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                },
                                                y: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                },
                                                mode: {
                                                  type: 'string',
                                                  enum: [
                                                    'corner',
                                                    'smooth',
                                                    'symmetric'
                                                  ]
                                                },
                                                in: {
                                                  anyOf: [
                                                    {
                                                      type: 'object',
                                                      properties: {
                                                        x: {
                                                          type: 'number',
                                                          minimum: -100000,
                                                          maximum: 100000
                                                        },
                                                        y: {
                                                          type: 'number',
                                                          minimum: -100000,
                                                          maximum: 100000
                                                        }
                                                      },
                                                      required: ['x', 'y'],
                                                      additionalProperties: false
                                                    },
                                                    {
                                                      type: 'null'
                                                    }
                                                  ]
                                                },
                                                out: {
                                                  anyOf: [
                                                    {
                                                      type: 'object',
                                                      properties: {
                                                        x: {
                                                          type: 'number',
                                                          minimum: -100000,
                                                          maximum: 100000
                                                        },
                                                        y: {
                                                          type: 'number',
                                                          minimum: -100000,
                                                          maximum: 100000
                                                        }
                                                      },
                                                      required: ['x', 'y'],
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
                                                'x',
                                                'y',
                                                'mode',
                                                'in',
                                                'out'
                                              ],
                                              additionalProperties: false
                                            }
                                          }
                                        },
                                        required: ['id', 'closed', 'nodes'],
                                        additionalProperties: false
                                      }
                                    },
                                    gradient: {
                                      type: 'object',
                                      properties: {
                                        type: {
                                          type: 'string',
                                          enum: ['linear', 'radial']
                                        },
                                        transform: {
                                          minItems: 6,
                                          maxItems: 6,
                                          type: 'array',
                                          items: {
                                            type: 'number',
                                            minimum: -100000,
                                            maximum: 100000
                                          }
                                        },
                                        start: {
                                          type: 'object',
                                          properties: {
                                            x: {
                                              type: 'number',
                                              minimum: -100000,
                                              maximum: 100000
                                            },
                                            y: {
                                              type: 'number',
                                              minimum: -100000,
                                              maximum: 100000
                                            }
                                          },
                                          required: ['x', 'y'],
                                          additionalProperties: false
                                        },
                                        end: {
                                          type: 'object',
                                          properties: {
                                            x: {
                                              type: 'number',
                                              minimum: -100000,
                                              maximum: 100000
                                            },
                                            y: {
                                              type: 'number',
                                              minimum: -100000,
                                              maximum: 100000
                                            }
                                          },
                                          required: ['x', 'y'],
                                          additionalProperties: false
                                        },
                                        stops: {
                                          minItems: 2,
                                          maxItems: 32,
                                          type: 'array',
                                          items: {
                                            type: 'object',
                                            properties: {
                                              offset: {
                                                type: 'number',
                                                minimum: 0,
                                                maximum: 1
                                              },
                                              color: {
                                                type: 'string',
                                                pattern: '^#[\\da-f]{6}$'
                                              },
                                              opacity: {
                                                type: 'number',
                                                minimum: 0,
                                                maximum: 1
                                              }
                                            },
                                            required: [
                                              'offset',
                                              'color',
                                              'opacity'
                                            ],
                                            additionalProperties: false
                                          }
                                        }
                                      },
                                      required: [
                                        'type',
                                        'start',
                                        'end',
                                        'stops'
                                      ],
                                      additionalProperties: false
                                    },
                                    fontFamily: {
                                      type: 'string',
                                      maxLength: 120,
                                      pattern: '^[\\p{L}\\p{N} _-]+$'
                                    },
                                    lineHeight: {
                                      type: 'number',
                                      minimum: 0.1,
                                      maximum: 10
                                    },
                                    letterSpacing: {
                                      type: 'number',
                                      minimum: -100,
                                      maximum: 100
                                    },
                                    verticalAlign: {
                                      type: 'string',
                                      enum: ['top', 'center', 'bottom']
                                    },
                                    textPadding: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 1000
                                    },
                                    clipContent: {
                                      type: 'boolean'
                                    },
                                    prototype: {
                                      type: 'object',
                                      properties: {
                                        trigger: {
                                          type: 'string',
                                          enum: ['click', 'hover']
                                        },
                                        action: {
                                          type: 'string',
                                          enum: [
                                            'navigate',
                                            'overlay',
                                            'back',
                                            'close'
                                          ]
                                        },
                                        target: {
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
                                        transition: {
                                          type: 'string',
                                          enum: ['instant', 'dissolve']
                                        },
                                        duration: {
                                          type: 'integer',
                                          minimum: 0,
                                          maximum: 3000
                                        }
                                      },
                                      required: [
                                        'trigger',
                                        'action',
                                        'target',
                                        'transition',
                                        'duration'
                                      ],
                                      additionalProperties: false
                                    },
                                    image: {
                                      type: 'string',
                                      maxLength: 2000000,
                                      pattern:
                                        '^(?:|data:image\\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+)$'
                                    }
                                  },
                                  required: [
                                    'id',
                                    'kind',
                                    'name',
                                    'x',
                                    'y',
                                    'width',
                                    'height',
                                    'rotation',
                                    'fill',
                                    'stroke',
                                    'strokeWidth',
                                    'opacity',
                                    'radius',
                                    'text',
                                    'fontSize',
                                    'fontWeight',
                                    'textColor',
                                    'align',
                                    'locked',
                                    'hidden',
                                    'group',
                                    'points',
                                    'image'
                                  ],
                                  additionalProperties: false
                                }
                              },
                              connectors: {
                                maxItems: 4000,
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
                                    source: {
                                      type: 'string',
                                      format: 'uuid',
                                      pattern:
                                        '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                    },
                                    target: {
                                      type: 'string',
                                      format: 'uuid',
                                      pattern:
                                        '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                    },
                                    label: {
                                      type: 'string',
                                      maxLength: 200
                                    },
                                    color: {
                                      type: 'string',
                                      pattern: '^#[\\da-f]{6}$'
                                    },
                                    style: {
                                      type: 'string',
                                      enum: ['curve', 'straight']
                                    },
                                    arrow: {
                                      type: 'boolean'
                                    }
                                  },
                                  required: [
                                    'id',
                                    'source',
                                    'target',
                                    'label',
                                    'color',
                                    'style',
                                    'arrow'
                                  ],
                                  additionalProperties: false
                                }
                              }
                            },
                            required: [
                              'id',
                              'name',
                              'mode',
                              'background',
                              'elements',
                              'connectors'
                            ],
                            additionalProperties: false
                          }
                        },
                        components: {
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
                              name: {
                                type: 'string',
                                minLength: 1,
                                maxLength: 160
                              },
                              elements: {
                                minItems: 1,
                                maxItems: 500,
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
                                    kind: {
                                      type: 'string',
                                      enum: [
                                        'rectangle',
                                        'ellipse',
                                        'diamond',
                                        'text',
                                        'sticky',
                                        'node',
                                        'frame',
                                        'path',
                                        'image'
                                      ]
                                    },
                                    name: {
                                      type: 'string',
                                      maxLength: 160
                                    },
                                    x: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    },
                                    y: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    },
                                    width: {
                                      type: 'number',
                                      minimum: 1,
                                      maximum: 20000
                                    },
                                    height: {
                                      type: 'number',
                                      minimum: 1,
                                      maximum: 20000
                                    },
                                    rotation: {
                                      type: 'number',
                                      minimum: -360,
                                      maximum: 360
                                    },
                                    fill: {
                                      type: 'string',
                                      pattern: '^#[\\da-f]{6}$'
                                    },
                                    fillOpacity: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 1
                                    },
                                    stroke: {
                                      type: 'string',
                                      pattern: '^#[\\da-f]{6}$'
                                    },
                                    strokeWidth: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 40
                                    },
                                    opacity: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 1
                                    },
                                    radius: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 1000
                                    },
                                    text: {
                                      type: 'string',
                                      maxLength: 10000
                                    },
                                    fontSize: {
                                      type: 'number',
                                      minimum: 8,
                                      maximum: 400
                                    },
                                    fontWeight: {
                                      type: 'string',
                                      enum: ['400', '600', '700']
                                    },
                                    textColor: {
                                      type: 'string',
                                      pattern: '^#[\\da-f]{6}$'
                                    },
                                    align: {
                                      type: 'string',
                                      enum: ['left', 'center', 'right']
                                    },
                                    locked: {
                                      type: 'boolean'
                                    },
                                    hidden: {
                                      type: 'boolean'
                                    },
                                    group: {
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
                                    parent: {
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
                                    layout: {
                                      type: 'object',
                                      properties: {
                                        direction: {
                                          type: 'string',
                                          enum: ['horizontal', 'vertical']
                                        },
                                        gap: {
                                          type: 'number',
                                          minimum: 0,
                                          maximum: 2000
                                        },
                                        padding: {
                                          type: 'object',
                                          properties: {
                                            top: {
                                              type: 'number',
                                              minimum: 0,
                                              maximum: 2000
                                            },
                                            right: {
                                              type: 'number',
                                              minimum: 0,
                                              maximum: 2000
                                            },
                                            bottom: {
                                              type: 'number',
                                              minimum: 0,
                                              maximum: 2000
                                            },
                                            left: {
                                              type: 'number',
                                              minimum: 0,
                                              maximum: 2000
                                            }
                                          },
                                          required: [
                                            'top',
                                            'right',
                                            'bottom',
                                            'left'
                                          ],
                                          additionalProperties: false
                                        },
                                        align: {
                                          type: 'string',
                                          enum: [
                                            'start',
                                            'center',
                                            'end',
                                            'stretch'
                                          ]
                                        },
                                        justify: {
                                          type: 'string',
                                          enum: [
                                            'start',
                                            'center',
                                            'end',
                                            'space-between'
                                          ]
                                        },
                                        wrap: {
                                          type: 'boolean'
                                        }
                                      },
                                      required: [
                                        'direction',
                                        'gap',
                                        'padding',
                                        'align',
                                        'justify',
                                        'wrap'
                                      ],
                                      additionalProperties: false
                                    },
                                    widthMode: {
                                      type: 'string',
                                      enum: ['fixed', 'hug', 'fill']
                                    },
                                    heightMode: {
                                      type: 'string',
                                      enum: ['fixed', 'hug', 'fill']
                                    },
                                    component: {
                                      type: 'object',
                                      properties: {
                                        definition: {
                                          type: 'string',
                                          format: 'uuid',
                                          pattern:
                                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                        },
                                        instance: {
                                          type: 'string',
                                          format: 'uuid',
                                          pattern:
                                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                        },
                                        key: {
                                          type: 'string',
                                          format: 'uuid',
                                          pattern:
                                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                        },
                                        overrides: {
                                          maxItems: 40,
                                          type: 'array',
                                          items: {
                                            type: 'string'
                                          }
                                        }
                                      },
                                      required: [
                                        'definition',
                                        'instance',
                                        'key',
                                        'overrides'
                                      ],
                                      additionalProperties: false
                                    },
                                    points: {
                                      maxItems: 10000,
                                      type: 'array',
                                      items: {
                                        type: 'object',
                                        properties: {
                                          x: {
                                            type: 'number',
                                            minimum: -100000,
                                            maximum: 100000
                                          },
                                          y: {
                                            type: 'number',
                                            minimum: -100000,
                                            maximum: 100000
                                          }
                                        },
                                        required: ['x', 'y'],
                                        additionalProperties: false
                                      }
                                    },
                                    pathData: {
                                      type: 'string',
                                      maxLength: 200000,
                                      pattern:
                                        '^[MmLlHhVvCcSsQqTtAaZz0-9eE+.,\\s-]*$'
                                    },
                                    pathViewBox: {
                                      type: 'object',
                                      properties: {
                                        x: {
                                          type: 'number',
                                          minimum: -100000,
                                          maximum: 100000
                                        },
                                        y: {
                                          type: 'number',
                                          minimum: -100000,
                                          maximum: 100000
                                        },
                                        width: {
                                          type: 'number',
                                          exclusiveMinimum: 0,
                                          maximum: 20000
                                        },
                                        height: {
                                          type: 'number',
                                          exclusiveMinimum: 0,
                                          maximum: 20000
                                        }
                                      },
                                      required: ['x', 'y', 'width', 'height'],
                                      additionalProperties: false
                                    },
                                    fillRule: {
                                      type: 'string',
                                      enum: ['nonzero', 'evenodd']
                                    },
                                    vector: {
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
                                          closed: {
                                            type: 'boolean'
                                          },
                                          nodes: {
                                            minItems: 1,
                                            maxItems: 2000,
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
                                                x: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                },
                                                y: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                },
                                                mode: {
                                                  type: 'string',
                                                  enum: [
                                                    'corner',
                                                    'smooth',
                                                    'symmetric'
                                                  ]
                                                },
                                                in: {
                                                  anyOf: [
                                                    {
                                                      type: 'object',
                                                      properties: {
                                                        x: {
                                                          type: 'number',
                                                          minimum: -100000,
                                                          maximum: 100000
                                                        },
                                                        y: {
                                                          type: 'number',
                                                          minimum: -100000,
                                                          maximum: 100000
                                                        }
                                                      },
                                                      required: ['x', 'y'],
                                                      additionalProperties: false
                                                    },
                                                    {
                                                      type: 'null'
                                                    }
                                                  ]
                                                },
                                                out: {
                                                  anyOf: [
                                                    {
                                                      type: 'object',
                                                      properties: {
                                                        x: {
                                                          type: 'number',
                                                          minimum: -100000,
                                                          maximum: 100000
                                                        },
                                                        y: {
                                                          type: 'number',
                                                          minimum: -100000,
                                                          maximum: 100000
                                                        }
                                                      },
                                                      required: ['x', 'y'],
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
                                                'x',
                                                'y',
                                                'mode',
                                                'in',
                                                'out'
                                              ],
                                              additionalProperties: false
                                            }
                                          }
                                        },
                                        required: ['id', 'closed', 'nodes'],
                                        additionalProperties: false
                                      }
                                    },
                                    gradient: {
                                      type: 'object',
                                      properties: {
                                        type: {
                                          type: 'string',
                                          enum: ['linear', 'radial']
                                        },
                                        transform: {
                                          minItems: 6,
                                          maxItems: 6,
                                          type: 'array',
                                          items: {
                                            type: 'number',
                                            minimum: -100000,
                                            maximum: 100000
                                          }
                                        },
                                        start: {
                                          type: 'object',
                                          properties: {
                                            x: {
                                              type: 'number',
                                              minimum: -100000,
                                              maximum: 100000
                                            },
                                            y: {
                                              type: 'number',
                                              minimum: -100000,
                                              maximum: 100000
                                            }
                                          },
                                          required: ['x', 'y'],
                                          additionalProperties: false
                                        },
                                        end: {
                                          type: 'object',
                                          properties: {
                                            x: {
                                              type: 'number',
                                              minimum: -100000,
                                              maximum: 100000
                                            },
                                            y: {
                                              type: 'number',
                                              minimum: -100000,
                                              maximum: 100000
                                            }
                                          },
                                          required: ['x', 'y'],
                                          additionalProperties: false
                                        },
                                        stops: {
                                          minItems: 2,
                                          maxItems: 32,
                                          type: 'array',
                                          items: {
                                            type: 'object',
                                            properties: {
                                              offset: {
                                                type: 'number',
                                                minimum: 0,
                                                maximum: 1
                                              },
                                              color: {
                                                type: 'string',
                                                pattern: '^#[\\da-f]{6}$'
                                              },
                                              opacity: {
                                                type: 'number',
                                                minimum: 0,
                                                maximum: 1
                                              }
                                            },
                                            required: [
                                              'offset',
                                              'color',
                                              'opacity'
                                            ],
                                            additionalProperties: false
                                          }
                                        }
                                      },
                                      required: [
                                        'type',
                                        'start',
                                        'end',
                                        'stops'
                                      ],
                                      additionalProperties: false
                                    },
                                    fontFamily: {
                                      type: 'string',
                                      maxLength: 120,
                                      pattern: '^[\\p{L}\\p{N} _-]+$'
                                    },
                                    lineHeight: {
                                      type: 'number',
                                      minimum: 0.1,
                                      maximum: 10
                                    },
                                    letterSpacing: {
                                      type: 'number',
                                      minimum: -100,
                                      maximum: 100
                                    },
                                    verticalAlign: {
                                      type: 'string',
                                      enum: ['top', 'center', 'bottom']
                                    },
                                    textPadding: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 1000
                                    },
                                    clipContent: {
                                      type: 'boolean'
                                    },
                                    prototype: {
                                      type: 'object',
                                      properties: {
                                        trigger: {
                                          type: 'string',
                                          enum: ['click', 'hover']
                                        },
                                        action: {
                                          type: 'string',
                                          enum: [
                                            'navigate',
                                            'overlay',
                                            'back',
                                            'close'
                                          ]
                                        },
                                        target: {
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
                                        transition: {
                                          type: 'string',
                                          enum: ['instant', 'dissolve']
                                        },
                                        duration: {
                                          type: 'integer',
                                          minimum: 0,
                                          maximum: 3000
                                        }
                                      },
                                      required: [
                                        'trigger',
                                        'action',
                                        'target',
                                        'transition',
                                        'duration'
                                      ],
                                      additionalProperties: false
                                    },
                                    image: {
                                      type: 'string',
                                      maxLength: 2000000,
                                      pattern:
                                        '^(?:|data:image\\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+)$'
                                    }
                                  },
                                  required: [
                                    'id',
                                    'kind',
                                    'name',
                                    'x',
                                    'y',
                                    'width',
                                    'height',
                                    'rotation',
                                    'fill',
                                    'stroke',
                                    'strokeWidth',
                                    'opacity',
                                    'radius',
                                    'text',
                                    'fontSize',
                                    'fontWeight',
                                    'textColor',
                                    'align',
                                    'locked',
                                    'hidden',
                                    'group',
                                    'points',
                                    'image'
                                  ],
                                  additionalProperties: false
                                }
                              },
                              connectors: {
                                maxItems: 1000,
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
                                    source: {
                                      type: 'string',
                                      format: 'uuid',
                                      pattern:
                                        '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                    },
                                    target: {
                                      type: 'string',
                                      format: 'uuid',
                                      pattern:
                                        '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                    },
                                    label: {
                                      type: 'string',
                                      maxLength: 200
                                    },
                                    color: {
                                      type: 'string',
                                      pattern: '^#[\\da-f]{6}$'
                                    },
                                    style: {
                                      type: 'string',
                                      enum: ['curve', 'straight']
                                    },
                                    arrow: {
                                      type: 'boolean'
                                    }
                                  },
                                  required: [
                                    'id',
                                    'source',
                                    'target',
                                    'label',
                                    'color',
                                    'style',
                                    'arrow'
                                  ],
                                  additionalProperties: false
                                }
                              }
                            },
                            required: ['id', 'name', 'elements', 'connectors'],
                            additionalProperties: false
                          }
                        }
                      },
                      required: ['version', 'pages'],
                      additionalProperties: false
                    }
                  },
                  required: ['title', 'document'],
                  additionalProperties: false
                }
              },
              required: ['sequence', 'base', 'next'],
              additionalProperties: false
            }
          },
          required: ['id', 'session', 'revision', 'presence'],
          additionalProperties: false
        }
      },
      output: {
        OK: {
          $schema: 'https://json-schema.org/draft/2020-12/schema',
          type: 'object',
          properties: {
            project: {
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
                    workspace_id: {
                      type: 'string',
                      format: 'uuid',
                      pattern:
                        '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                    },
                    title: {
                      type: 'string',
                      minLength: 1,
                      maxLength: 160
                    },
                    revision: {
                      type: 'integer',
                      exclusiveMinimum: 0,
                      maximum: 9007199254740991
                    },
                    starred: {
                      type: 'boolean'
                    },
                    archived: {
                      type: 'boolean'
                    },
                    created: {
                      type: 'string'
                    },
                    updated: {
                      type: 'string'
                    },
                    document: {
                      type: 'object',
                      properties: {
                        version: {
                          type: 'number',
                          const: 1
                        },
                        tags: {
                          maxItems: 30,
                          type: 'array',
                          items: {
                            type: 'string',
                            minLength: 1,
                            maxLength: 80
                          }
                        },
                        prototypeStart: {
                          type: 'string',
                          format: 'uuid',
                          pattern:
                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                        },
                        pages: {
                          minItems: 1,
                          maxItems: 40,
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
                                minLength: 1,
                                maxLength: 160
                              },
                              mode: {
                                type: 'string',
                                enum: ['blackboard', 'canvas']
                              },
                              background: {
                                type: 'string',
                                pattern: '^#[\\da-f]{6}$'
                              },
                              elements: {
                                maxItems: 2000,
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
                                    kind: {
                                      type: 'string',
                                      enum: [
                                        'rectangle',
                                        'ellipse',
                                        'diamond',
                                        'text',
                                        'sticky',
                                        'node',
                                        'frame',
                                        'path',
                                        'image'
                                      ]
                                    },
                                    name: {
                                      type: 'string',
                                      maxLength: 160
                                    },
                                    x: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    },
                                    y: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    },
                                    width: {
                                      type: 'number',
                                      minimum: 1,
                                      maximum: 20000
                                    },
                                    height: {
                                      type: 'number',
                                      minimum: 1,
                                      maximum: 20000
                                    },
                                    rotation: {
                                      type: 'number',
                                      minimum: -360,
                                      maximum: 360
                                    },
                                    fill: {
                                      type: 'string',
                                      pattern: '^#[\\da-f]{6}$'
                                    },
                                    fillOpacity: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 1
                                    },
                                    stroke: {
                                      type: 'string',
                                      pattern: '^#[\\da-f]{6}$'
                                    },
                                    strokeWidth: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 40
                                    },
                                    opacity: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 1
                                    },
                                    radius: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 1000
                                    },
                                    text: {
                                      type: 'string',
                                      maxLength: 10000
                                    },
                                    fontSize: {
                                      type: 'number',
                                      minimum: 8,
                                      maximum: 400
                                    },
                                    fontWeight: {
                                      type: 'string',
                                      enum: ['400', '600', '700']
                                    },
                                    textColor: {
                                      type: 'string',
                                      pattern: '^#[\\da-f]{6}$'
                                    },
                                    align: {
                                      type: 'string',
                                      enum: ['left', 'center', 'right']
                                    },
                                    locked: {
                                      type: 'boolean'
                                    },
                                    hidden: {
                                      type: 'boolean'
                                    },
                                    group: {
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
                                    parent: {
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
                                    layout: {
                                      type: 'object',
                                      properties: {
                                        direction: {
                                          type: 'string',
                                          enum: ['horizontal', 'vertical']
                                        },
                                        gap: {
                                          type: 'number',
                                          minimum: 0,
                                          maximum: 2000
                                        },
                                        padding: {
                                          type: 'object',
                                          properties: {
                                            top: {
                                              type: 'number',
                                              minimum: 0,
                                              maximum: 2000
                                            },
                                            right: {
                                              type: 'number',
                                              minimum: 0,
                                              maximum: 2000
                                            },
                                            bottom: {
                                              type: 'number',
                                              minimum: 0,
                                              maximum: 2000
                                            },
                                            left: {
                                              type: 'number',
                                              minimum: 0,
                                              maximum: 2000
                                            }
                                          },
                                          required: [
                                            'top',
                                            'right',
                                            'bottom',
                                            'left'
                                          ],
                                          additionalProperties: false
                                        },
                                        align: {
                                          type: 'string',
                                          enum: [
                                            'start',
                                            'center',
                                            'end',
                                            'stretch'
                                          ]
                                        },
                                        justify: {
                                          type: 'string',
                                          enum: [
                                            'start',
                                            'center',
                                            'end',
                                            'space-between'
                                          ]
                                        },
                                        wrap: {
                                          type: 'boolean'
                                        }
                                      },
                                      required: [
                                        'direction',
                                        'gap',
                                        'padding',
                                        'align',
                                        'justify',
                                        'wrap'
                                      ],
                                      additionalProperties: false
                                    },
                                    widthMode: {
                                      type: 'string',
                                      enum: ['fixed', 'hug', 'fill']
                                    },
                                    heightMode: {
                                      type: 'string',
                                      enum: ['fixed', 'hug', 'fill']
                                    },
                                    component: {
                                      type: 'object',
                                      properties: {
                                        definition: {
                                          type: 'string',
                                          format: 'uuid',
                                          pattern:
                                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                        },
                                        instance: {
                                          type: 'string',
                                          format: 'uuid',
                                          pattern:
                                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                        },
                                        key: {
                                          type: 'string',
                                          format: 'uuid',
                                          pattern:
                                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                        },
                                        overrides: {
                                          maxItems: 40,
                                          type: 'array',
                                          items: {
                                            type: 'string'
                                          }
                                        }
                                      },
                                      required: [
                                        'definition',
                                        'instance',
                                        'key',
                                        'overrides'
                                      ],
                                      additionalProperties: false
                                    },
                                    points: {
                                      maxItems: 10000,
                                      type: 'array',
                                      items: {
                                        type: 'object',
                                        properties: {
                                          x: {
                                            type: 'number',
                                            minimum: -100000,
                                            maximum: 100000
                                          },
                                          y: {
                                            type: 'number',
                                            minimum: -100000,
                                            maximum: 100000
                                          }
                                        },
                                        required: ['x', 'y'],
                                        additionalProperties: false
                                      }
                                    },
                                    pathData: {
                                      type: 'string',
                                      maxLength: 200000,
                                      pattern:
                                        '^[MmLlHhVvCcSsQqTtAaZz0-9eE+.,\\s-]*$'
                                    },
                                    pathViewBox: {
                                      type: 'object',
                                      properties: {
                                        x: {
                                          type: 'number',
                                          minimum: -100000,
                                          maximum: 100000
                                        },
                                        y: {
                                          type: 'number',
                                          minimum: -100000,
                                          maximum: 100000
                                        },
                                        width: {
                                          type: 'number',
                                          exclusiveMinimum: 0,
                                          maximum: 20000
                                        },
                                        height: {
                                          type: 'number',
                                          exclusiveMinimum: 0,
                                          maximum: 20000
                                        }
                                      },
                                      required: ['x', 'y', 'width', 'height'],
                                      additionalProperties: false
                                    },
                                    fillRule: {
                                      type: 'string',
                                      enum: ['nonzero', 'evenodd']
                                    },
                                    vector: {
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
                                          closed: {
                                            type: 'boolean'
                                          },
                                          nodes: {
                                            minItems: 1,
                                            maxItems: 2000,
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
                                                x: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                },
                                                y: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                },
                                                mode: {
                                                  type: 'string',
                                                  enum: [
                                                    'corner',
                                                    'smooth',
                                                    'symmetric'
                                                  ]
                                                },
                                                in: {
                                                  anyOf: [
                                                    {
                                                      type: 'object',
                                                      properties: {
                                                        x: {
                                                          type: 'number',
                                                          minimum: -100000,
                                                          maximum: 100000
                                                        },
                                                        y: {
                                                          type: 'number',
                                                          minimum: -100000,
                                                          maximum: 100000
                                                        }
                                                      },
                                                      required: ['x', 'y'],
                                                      additionalProperties: false
                                                    },
                                                    {
                                                      type: 'null'
                                                    }
                                                  ]
                                                },
                                                out: {
                                                  anyOf: [
                                                    {
                                                      type: 'object',
                                                      properties: {
                                                        x: {
                                                          type: 'number',
                                                          minimum: -100000,
                                                          maximum: 100000
                                                        },
                                                        y: {
                                                          type: 'number',
                                                          minimum: -100000,
                                                          maximum: 100000
                                                        }
                                                      },
                                                      required: ['x', 'y'],
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
                                                'x',
                                                'y',
                                                'mode',
                                                'in',
                                                'out'
                                              ],
                                              additionalProperties: false
                                            }
                                          }
                                        },
                                        required: ['id', 'closed', 'nodes'],
                                        additionalProperties: false
                                      }
                                    },
                                    gradient: {
                                      type: 'object',
                                      properties: {
                                        type: {
                                          type: 'string',
                                          enum: ['linear', 'radial']
                                        },
                                        transform: {
                                          minItems: 6,
                                          maxItems: 6,
                                          type: 'array',
                                          items: {
                                            type: 'number',
                                            minimum: -100000,
                                            maximum: 100000
                                          }
                                        },
                                        start: {
                                          type: 'object',
                                          properties: {
                                            x: {
                                              type: 'number',
                                              minimum: -100000,
                                              maximum: 100000
                                            },
                                            y: {
                                              type: 'number',
                                              minimum: -100000,
                                              maximum: 100000
                                            }
                                          },
                                          required: ['x', 'y'],
                                          additionalProperties: false
                                        },
                                        end: {
                                          type: 'object',
                                          properties: {
                                            x: {
                                              type: 'number',
                                              minimum: -100000,
                                              maximum: 100000
                                            },
                                            y: {
                                              type: 'number',
                                              minimum: -100000,
                                              maximum: 100000
                                            }
                                          },
                                          required: ['x', 'y'],
                                          additionalProperties: false
                                        },
                                        stops: {
                                          minItems: 2,
                                          maxItems: 32,
                                          type: 'array',
                                          items: {
                                            type: 'object',
                                            properties: {
                                              offset: {
                                                type: 'number',
                                                minimum: 0,
                                                maximum: 1
                                              },
                                              color: {
                                                type: 'string',
                                                pattern: '^#[\\da-f]{6}$'
                                              },
                                              opacity: {
                                                type: 'number',
                                                minimum: 0,
                                                maximum: 1
                                              }
                                            },
                                            required: [
                                              'offset',
                                              'color',
                                              'opacity'
                                            ],
                                            additionalProperties: false
                                          }
                                        }
                                      },
                                      required: [
                                        'type',
                                        'start',
                                        'end',
                                        'stops'
                                      ],
                                      additionalProperties: false
                                    },
                                    fontFamily: {
                                      type: 'string',
                                      maxLength: 120,
                                      pattern: '^[\\p{L}\\p{N} _-]+$'
                                    },
                                    lineHeight: {
                                      type: 'number',
                                      minimum: 0.1,
                                      maximum: 10
                                    },
                                    letterSpacing: {
                                      type: 'number',
                                      minimum: -100,
                                      maximum: 100
                                    },
                                    verticalAlign: {
                                      type: 'string',
                                      enum: ['top', 'center', 'bottom']
                                    },
                                    textPadding: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 1000
                                    },
                                    clipContent: {
                                      type: 'boolean'
                                    },
                                    prototype: {
                                      type: 'object',
                                      properties: {
                                        trigger: {
                                          type: 'string',
                                          enum: ['click', 'hover']
                                        },
                                        action: {
                                          type: 'string',
                                          enum: [
                                            'navigate',
                                            'overlay',
                                            'back',
                                            'close'
                                          ]
                                        },
                                        target: {
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
                                        transition: {
                                          type: 'string',
                                          enum: ['instant', 'dissolve']
                                        },
                                        duration: {
                                          type: 'integer',
                                          minimum: 0,
                                          maximum: 3000
                                        }
                                      },
                                      required: [
                                        'trigger',
                                        'action',
                                        'target',
                                        'transition',
                                        'duration'
                                      ],
                                      additionalProperties: false
                                    },
                                    image: {
                                      type: 'string',
                                      maxLength: 2000000,
                                      pattern:
                                        '^(?:|data:image\\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+)$'
                                    }
                                  },
                                  required: [
                                    'id',
                                    'kind',
                                    'name',
                                    'x',
                                    'y',
                                    'width',
                                    'height',
                                    'rotation',
                                    'fill',
                                    'stroke',
                                    'strokeWidth',
                                    'opacity',
                                    'radius',
                                    'text',
                                    'fontSize',
                                    'fontWeight',
                                    'textColor',
                                    'align',
                                    'locked',
                                    'hidden',
                                    'group',
                                    'points',
                                    'image'
                                  ],
                                  additionalProperties: false
                                }
                              },
                              connectors: {
                                maxItems: 4000,
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
                                    source: {
                                      type: 'string',
                                      format: 'uuid',
                                      pattern:
                                        '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                    },
                                    target: {
                                      type: 'string',
                                      format: 'uuid',
                                      pattern:
                                        '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                    },
                                    label: {
                                      type: 'string',
                                      maxLength: 200
                                    },
                                    color: {
                                      type: 'string',
                                      pattern: '^#[\\da-f]{6}$'
                                    },
                                    style: {
                                      type: 'string',
                                      enum: ['curve', 'straight']
                                    },
                                    arrow: {
                                      type: 'boolean'
                                    }
                                  },
                                  required: [
                                    'id',
                                    'source',
                                    'target',
                                    'label',
                                    'color',
                                    'style',
                                    'arrow'
                                  ],
                                  additionalProperties: false
                                }
                              }
                            },
                            required: [
                              'id',
                              'name',
                              'mode',
                              'background',
                              'elements',
                              'connectors'
                            ],
                            additionalProperties: false
                          }
                        },
                        components: {
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
                              name: {
                                type: 'string',
                                minLength: 1,
                                maxLength: 160
                              },
                              elements: {
                                minItems: 1,
                                maxItems: 500,
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
                                    kind: {
                                      type: 'string',
                                      enum: [
                                        'rectangle',
                                        'ellipse',
                                        'diamond',
                                        'text',
                                        'sticky',
                                        'node',
                                        'frame',
                                        'path',
                                        'image'
                                      ]
                                    },
                                    name: {
                                      type: 'string',
                                      maxLength: 160
                                    },
                                    x: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    },
                                    y: {
                                      type: 'number',
                                      minimum: -100000,
                                      maximum: 100000
                                    },
                                    width: {
                                      type: 'number',
                                      minimum: 1,
                                      maximum: 20000
                                    },
                                    height: {
                                      type: 'number',
                                      minimum: 1,
                                      maximum: 20000
                                    },
                                    rotation: {
                                      type: 'number',
                                      minimum: -360,
                                      maximum: 360
                                    },
                                    fill: {
                                      type: 'string',
                                      pattern: '^#[\\da-f]{6}$'
                                    },
                                    fillOpacity: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 1
                                    },
                                    stroke: {
                                      type: 'string',
                                      pattern: '^#[\\da-f]{6}$'
                                    },
                                    strokeWidth: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 40
                                    },
                                    opacity: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 1
                                    },
                                    radius: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 1000
                                    },
                                    text: {
                                      type: 'string',
                                      maxLength: 10000
                                    },
                                    fontSize: {
                                      type: 'number',
                                      minimum: 8,
                                      maximum: 400
                                    },
                                    fontWeight: {
                                      type: 'string',
                                      enum: ['400', '600', '700']
                                    },
                                    textColor: {
                                      type: 'string',
                                      pattern: '^#[\\da-f]{6}$'
                                    },
                                    align: {
                                      type: 'string',
                                      enum: ['left', 'center', 'right']
                                    },
                                    locked: {
                                      type: 'boolean'
                                    },
                                    hidden: {
                                      type: 'boolean'
                                    },
                                    group: {
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
                                    parent: {
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
                                    layout: {
                                      type: 'object',
                                      properties: {
                                        direction: {
                                          type: 'string',
                                          enum: ['horizontal', 'vertical']
                                        },
                                        gap: {
                                          type: 'number',
                                          minimum: 0,
                                          maximum: 2000
                                        },
                                        padding: {
                                          type: 'object',
                                          properties: {
                                            top: {
                                              type: 'number',
                                              minimum: 0,
                                              maximum: 2000
                                            },
                                            right: {
                                              type: 'number',
                                              minimum: 0,
                                              maximum: 2000
                                            },
                                            bottom: {
                                              type: 'number',
                                              minimum: 0,
                                              maximum: 2000
                                            },
                                            left: {
                                              type: 'number',
                                              minimum: 0,
                                              maximum: 2000
                                            }
                                          },
                                          required: [
                                            'top',
                                            'right',
                                            'bottom',
                                            'left'
                                          ],
                                          additionalProperties: false
                                        },
                                        align: {
                                          type: 'string',
                                          enum: [
                                            'start',
                                            'center',
                                            'end',
                                            'stretch'
                                          ]
                                        },
                                        justify: {
                                          type: 'string',
                                          enum: [
                                            'start',
                                            'center',
                                            'end',
                                            'space-between'
                                          ]
                                        },
                                        wrap: {
                                          type: 'boolean'
                                        }
                                      },
                                      required: [
                                        'direction',
                                        'gap',
                                        'padding',
                                        'align',
                                        'justify',
                                        'wrap'
                                      ],
                                      additionalProperties: false
                                    },
                                    widthMode: {
                                      type: 'string',
                                      enum: ['fixed', 'hug', 'fill']
                                    },
                                    heightMode: {
                                      type: 'string',
                                      enum: ['fixed', 'hug', 'fill']
                                    },
                                    component: {
                                      type: 'object',
                                      properties: {
                                        definition: {
                                          type: 'string',
                                          format: 'uuid',
                                          pattern:
                                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                        },
                                        instance: {
                                          type: 'string',
                                          format: 'uuid',
                                          pattern:
                                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                        },
                                        key: {
                                          type: 'string',
                                          format: 'uuid',
                                          pattern:
                                            '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                        },
                                        overrides: {
                                          maxItems: 40,
                                          type: 'array',
                                          items: {
                                            type: 'string'
                                          }
                                        }
                                      },
                                      required: [
                                        'definition',
                                        'instance',
                                        'key',
                                        'overrides'
                                      ],
                                      additionalProperties: false
                                    },
                                    points: {
                                      maxItems: 10000,
                                      type: 'array',
                                      items: {
                                        type: 'object',
                                        properties: {
                                          x: {
                                            type: 'number',
                                            minimum: -100000,
                                            maximum: 100000
                                          },
                                          y: {
                                            type: 'number',
                                            minimum: -100000,
                                            maximum: 100000
                                          }
                                        },
                                        required: ['x', 'y'],
                                        additionalProperties: false
                                      }
                                    },
                                    pathData: {
                                      type: 'string',
                                      maxLength: 200000,
                                      pattern:
                                        '^[MmLlHhVvCcSsQqTtAaZz0-9eE+.,\\s-]*$'
                                    },
                                    pathViewBox: {
                                      type: 'object',
                                      properties: {
                                        x: {
                                          type: 'number',
                                          minimum: -100000,
                                          maximum: 100000
                                        },
                                        y: {
                                          type: 'number',
                                          minimum: -100000,
                                          maximum: 100000
                                        },
                                        width: {
                                          type: 'number',
                                          exclusiveMinimum: 0,
                                          maximum: 20000
                                        },
                                        height: {
                                          type: 'number',
                                          exclusiveMinimum: 0,
                                          maximum: 20000
                                        }
                                      },
                                      required: ['x', 'y', 'width', 'height'],
                                      additionalProperties: false
                                    },
                                    fillRule: {
                                      type: 'string',
                                      enum: ['nonzero', 'evenodd']
                                    },
                                    vector: {
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
                                          closed: {
                                            type: 'boolean'
                                          },
                                          nodes: {
                                            minItems: 1,
                                            maxItems: 2000,
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
                                                x: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                },
                                                y: {
                                                  type: 'number',
                                                  minimum: -100000,
                                                  maximum: 100000
                                                },
                                                mode: {
                                                  type: 'string',
                                                  enum: [
                                                    'corner',
                                                    'smooth',
                                                    'symmetric'
                                                  ]
                                                },
                                                in: {
                                                  anyOf: [
                                                    {
                                                      type: 'object',
                                                      properties: {
                                                        x: {
                                                          type: 'number',
                                                          minimum: -100000,
                                                          maximum: 100000
                                                        },
                                                        y: {
                                                          type: 'number',
                                                          minimum: -100000,
                                                          maximum: 100000
                                                        }
                                                      },
                                                      required: ['x', 'y'],
                                                      additionalProperties: false
                                                    },
                                                    {
                                                      type: 'null'
                                                    }
                                                  ]
                                                },
                                                out: {
                                                  anyOf: [
                                                    {
                                                      type: 'object',
                                                      properties: {
                                                        x: {
                                                          type: 'number',
                                                          minimum: -100000,
                                                          maximum: 100000
                                                        },
                                                        y: {
                                                          type: 'number',
                                                          minimum: -100000,
                                                          maximum: 100000
                                                        }
                                                      },
                                                      required: ['x', 'y'],
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
                                                'x',
                                                'y',
                                                'mode',
                                                'in',
                                                'out'
                                              ],
                                              additionalProperties: false
                                            }
                                          }
                                        },
                                        required: ['id', 'closed', 'nodes'],
                                        additionalProperties: false
                                      }
                                    },
                                    gradient: {
                                      type: 'object',
                                      properties: {
                                        type: {
                                          type: 'string',
                                          enum: ['linear', 'radial']
                                        },
                                        transform: {
                                          minItems: 6,
                                          maxItems: 6,
                                          type: 'array',
                                          items: {
                                            type: 'number',
                                            minimum: -100000,
                                            maximum: 100000
                                          }
                                        },
                                        start: {
                                          type: 'object',
                                          properties: {
                                            x: {
                                              type: 'number',
                                              minimum: -100000,
                                              maximum: 100000
                                            },
                                            y: {
                                              type: 'number',
                                              minimum: -100000,
                                              maximum: 100000
                                            }
                                          },
                                          required: ['x', 'y'],
                                          additionalProperties: false
                                        },
                                        end: {
                                          type: 'object',
                                          properties: {
                                            x: {
                                              type: 'number',
                                              minimum: -100000,
                                              maximum: 100000
                                            },
                                            y: {
                                              type: 'number',
                                              minimum: -100000,
                                              maximum: 100000
                                            }
                                          },
                                          required: ['x', 'y'],
                                          additionalProperties: false
                                        },
                                        stops: {
                                          minItems: 2,
                                          maxItems: 32,
                                          type: 'array',
                                          items: {
                                            type: 'object',
                                            properties: {
                                              offset: {
                                                type: 'number',
                                                minimum: 0,
                                                maximum: 1
                                              },
                                              color: {
                                                type: 'string',
                                                pattern: '^#[\\da-f]{6}$'
                                              },
                                              opacity: {
                                                type: 'number',
                                                minimum: 0,
                                                maximum: 1
                                              }
                                            },
                                            required: [
                                              'offset',
                                              'color',
                                              'opacity'
                                            ],
                                            additionalProperties: false
                                          }
                                        }
                                      },
                                      required: [
                                        'type',
                                        'start',
                                        'end',
                                        'stops'
                                      ],
                                      additionalProperties: false
                                    },
                                    fontFamily: {
                                      type: 'string',
                                      maxLength: 120,
                                      pattern: '^[\\p{L}\\p{N} _-]+$'
                                    },
                                    lineHeight: {
                                      type: 'number',
                                      minimum: 0.1,
                                      maximum: 10
                                    },
                                    letterSpacing: {
                                      type: 'number',
                                      minimum: -100,
                                      maximum: 100
                                    },
                                    verticalAlign: {
                                      type: 'string',
                                      enum: ['top', 'center', 'bottom']
                                    },
                                    textPadding: {
                                      type: 'number',
                                      minimum: 0,
                                      maximum: 1000
                                    },
                                    clipContent: {
                                      type: 'boolean'
                                    },
                                    prototype: {
                                      type: 'object',
                                      properties: {
                                        trigger: {
                                          type: 'string',
                                          enum: ['click', 'hover']
                                        },
                                        action: {
                                          type: 'string',
                                          enum: [
                                            'navigate',
                                            'overlay',
                                            'back',
                                            'close'
                                          ]
                                        },
                                        target: {
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
                                        transition: {
                                          type: 'string',
                                          enum: ['instant', 'dissolve']
                                        },
                                        duration: {
                                          type: 'integer',
                                          minimum: 0,
                                          maximum: 3000
                                        }
                                      },
                                      required: [
                                        'trigger',
                                        'action',
                                        'target',
                                        'transition',
                                        'duration'
                                      ],
                                      additionalProperties: false
                                    },
                                    image: {
                                      type: 'string',
                                      maxLength: 2000000,
                                      pattern:
                                        '^(?:|data:image\\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+)$'
                                    }
                                  },
                                  required: [
                                    'id',
                                    'kind',
                                    'name',
                                    'x',
                                    'y',
                                    'width',
                                    'height',
                                    'rotation',
                                    'fill',
                                    'stroke',
                                    'strokeWidth',
                                    'opacity',
                                    'radius',
                                    'text',
                                    'fontSize',
                                    'fontWeight',
                                    'textColor',
                                    'align',
                                    'locked',
                                    'hidden',
                                    'group',
                                    'points',
                                    'image'
                                  ],
                                  additionalProperties: false
                                }
                              },
                              connectors: {
                                maxItems: 1000,
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
                                    source: {
                                      type: 'string',
                                      format: 'uuid',
                                      pattern:
                                        '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                    },
                                    target: {
                                      type: 'string',
                                      format: 'uuid',
                                      pattern:
                                        '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                                    },
                                    label: {
                                      type: 'string',
                                      maxLength: 200
                                    },
                                    color: {
                                      type: 'string',
                                      pattern: '^#[\\da-f]{6}$'
                                    },
                                    style: {
                                      type: 'string',
                                      enum: ['curve', 'straight']
                                    },
                                    arrow: {
                                      type: 'boolean'
                                    }
                                  },
                                  required: [
                                    'id',
                                    'source',
                                    'target',
                                    'label',
                                    'color',
                                    'style',
                                    'arrow'
                                  ],
                                  additionalProperties: false
                                }
                              }
                            },
                            required: ['id', 'name', 'elements', 'connectors'],
                            additionalProperties: false
                          }
                        }
                      },
                      required: ['version', 'pages'],
                      additionalProperties: false
                    }
                  },
                  required: [
                    'id',
                    'workspace_id',
                    'title',
                    'revision',
                    'starred',
                    'archived',
                    'created',
                    'updated',
                    'document'
                  ],
                  additionalProperties: false
                },
                {
                  type: 'null'
                }
              ]
            },
            peers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  page: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  cursor: {
                    anyOf: [
                      {
                        type: 'object',
                        properties: {
                          x: {
                            type: 'number',
                            minimum: -100000,
                            maximum: 100000
                          },
                          y: {
                            type: 'number',
                            minimum: -100000,
                            maximum: 100000
                          }
                        },
                        required: ['x', 'y'],
                        additionalProperties: false
                      },
                      {
                        type: 'null'
                      }
                    ]
                  },
                  selection: {
                    maxItems: 50,
                    type: 'array',
                    items: {
                      type: 'string',
                      format: 'uuid',
                      pattern:
                        '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                    }
                  },
                  user: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  session: {
                    type: 'string',
                    format: 'uuid',
                    pattern:
                      '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
                  },
                  name: {
                    type: 'string'
                  },
                  color: {
                    type: 'string',
                    pattern: '^#[\\da-f]{6}$'
                  },
                  role: {
                    type: 'string',
                    enum: ['owner', 'editor', 'viewer']
                  }
                },
                required: [
                  'page',
                  'cursor',
                  'selection',
                  'user',
                  'session',
                  'name',
                  'color',
                  'role'
                ],
                additionalProperties: false
              }
            },
            role: {
              type: 'string',
              enum: ['owner', 'editor', 'viewer']
            }
          },
          required: ['project', 'peers', 'role'],
          additionalProperties: false
        }
      }
    }
  },
  comments: {
    create: {
      method: 'post',
      description: 'Add a pinned comment or reply',
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
            project_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            }
          },
          required: ['workspace_id', 'project_id'],
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
            page_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            element_id: {
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
            parent_id: {
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
            x: {
              type: 'number',
              minimum: -100000,
              maximum: 100000
            },
            y: {
              type: 'number',
              minimum: -100000,
              maximum: 100000
            },
            body: {
              type: 'string',
              minLength: 1,
              maxLength: 5000
            }
          },
          required: [
            'id',
            'page_id',
            'element_id',
            'parent_id',
            'x',
            'y',
            'body'
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
            project_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            page_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            element_id: {
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
            parent_id: {
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
            actor_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            },
            name: {
              type: 'string'
            },
            x: {
              type: 'number',
              minimum: -100000,
              maximum: 100000
            },
            y: {
              type: 'number',
              minimum: -100000,
              maximum: 100000
            },
            body: {
              type: 'string',
              minLength: 1,
              maxLength: 5000
            },
            resolved: {
              type: 'boolean'
            },
            created: {
              type: 'string'
            }
          },
          required: [
            'id',
            'project_id',
            'page_id',
            'element_id',
            'parent_id',
            'actor_id',
            'name',
            'x',
            'y',
            'body',
            'resolved',
            'created'
          ],
          additionalProperties: false
        }
      }
    },
    list: {
      method: 'get',
      description: 'Read Redraw comment threads',
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
            project_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            }
          },
          required: ['workspace_id', 'project_id'],
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
              project_id: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
              },
              page_id: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
              },
              element_id: {
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
              parent_id: {
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
              actor_id: {
                type: 'string',
                format: 'uuid',
                pattern:
                  '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
              },
              name: {
                type: 'string'
              },
              x: {
                type: 'number',
                minimum: -100000,
                maximum: 100000
              },
              y: {
                type: 'number',
                minimum: -100000,
                maximum: 100000
              },
              body: {
                type: 'string',
                minLength: 1,
                maxLength: 5000
              },
              resolved: {
                type: 'boolean'
              },
              created: {
                type: 'string'
              }
            },
            required: [
              'id',
              'project_id',
              'page_id',
              'element_id',
              'parent_id',
              'actor_id',
              'name',
              'x',
              'y',
              'body',
              'resolved',
              'created'
            ],
            additionalProperties: false
          }
        }
      }
    },
    remove: {
      method: 'post',
      description: 'Delete your own comment or moderate as workspace owner',
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
            project_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            }
          },
          required: ['workspace_id', 'project_id'],
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
    resolve: {
      method: 'post',
      description: 'Resolve or reopen a Redraw thread',
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
            project_id: {
              type: 'string',
              format: 'uuid',
              pattern:
                '^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$'
            }
          },
          required: ['workspace_id', 'project_id'],
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
            resolved: {
              type: 'boolean'
            }
          },
          required: ['id', 'resolved'],
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
