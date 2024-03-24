import Joi from 'joi'
import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

const schema = new Schema(
  {
    userProfile: {
      type: String,
      required: false,
      default: null
    },
    firstName: {
      type: String,
      default: ''
    },
    lastName: {
      type: String,
      default: ''
    },
    email: {
      type: String
    },
    website: {
      type: String
    },
    company_name: {
      type: String,
      default: null
    },
    companyType: {
      type: String,
      default: null
    },
    phone: {
      type: String,
      default: null
    },
    address1: {
      type: String
    },
    address2: {
      type: String
    },
    city: {
      type: String
    },
    state: {
      type: String
    },
    country: {
      type: String
    },
    zip: {
      type: String
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies',
      default: null
    },
    enableBilling: { type: Boolean, default: false },
    billingCustomerId: { type: String, default: null },
    group: {
      type: { id: { type: mongoose.Schema.Types.ObjectId, ref: 'Groups' } },
      default: null
    },
    groupHistory: {
      type: [
        {
          changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
          createdAt: { type: String, default: new Date() },
          status: {
            type: {
              code: { type: String },
              title: { type: String },
              id: { type: mongoose.Schema.Types.ObjectId, ref: 'Status' }
            }
          },
          group: {
            type: {
              code: { type: String },
              title: { type: String },
              id: { type: mongoose.Schema.Types.ObjectId, ref: 'Groups' }
            }
          },
          statusHistory: {
            type: [
              {
                changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
                createdAt: { type: String, default: new Date() },
                status: {
                  type: {
                    code: { type: String },
                    title: { type: String }
                  },
                  required: true
                }
              }
            ],
            default: []
          },
          category: {
            type: {
              code: { type: String },
              title: { type: String },
              id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' }
            }
          },
          categoryHistory: {
            type: [
              {
                changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
                createdAt: { type: String, default: new Date() },
                category: {
                  type: {
                    code: { type: String },
                    title: { type: String }
                  },
                  required: true
                }
              }
            ],
            default: []
          },
          tags: {
            type: [
              {
                code: { type: String },
                title: { type: String },
                id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tags' }
              }
            ],
            default: []
          },
          tagsHistory: {
            type: [
              {
                changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
                createdAt: { type: String, default: new Date() },
                tags: {
                  type: [
                    {
                      code: { type: String },
                      title: { type: String }
                    }
                  ],
                  required: true
                }
              }
            ],
            default: []
          },
          pipelineDetails: {
            type: [
              {
                pipeline: {
                  type: {
                    id: { type: mongoose.Schema.Types.ObjectId, ref: 'Pipeline' }
                  },
                  required: true
                },
                status: {
                  type: {
                    id: { type: mongoose.Schema.Types.ObjectId, ref: 'Status' }
                  },
                  required: true
                },
                statusHistory: {
                  type: [
                    {
                      changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
                      createdAt: { type: String, default: new Date() },
                      note: { type: String, default: null },
                      status: {
                        type: { code: { type: String }, title: { type: String } },
                        required: true
                      }
                    }
                  ],
                  default: []
                }
              }
            ],
            default: []
          },
          pipelineHistory: {
            type: [
              {
                changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
                createdAt: { type: String, default: new Date() },
                pipelines: {
                  type: [
                    {
                      code: { type: String },
                      title: { type: String }
                    }
                  ],
                  required: true
                }
              }
            ],
            default: []
          },
          questions: {
            type: [
              {
                question: { type: String },
                answer: { type: String }
              }
            ],
            default: {}
          }
        }
      ],
      default: []
    },
    status: {
      type: { id: { type: mongoose.Schema.Types.ObjectId, ref: 'Status' } },
      default: null
    },
    statusHistory: {
      type: [
        {
          changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
          createdAt: { type: String, default: new Date() },
          status: {
            type: {
              code: { type: String },
              title: { type: String }
            },
            required: true
          }
        }
      ],
      default: []
    },
    category: {
      type: { id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' } },
      default: null
    },
    categoryHistory: {
      type: [
        {
          changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
          createdAt: { type: String, default: new Date() },
          category: {
            type: {
              code: { type: String },
              title: { type: String }
            },
            required: true
          }
        }
      ],
      default: []
    },
    tags: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tags' }],
      default: []
    },
    tagsHistory: {
      type: [
        {
          changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
          createdAt: { type: String, default: new Date() },
          tags: {
            type: [
              {
                code: { type: String },
                title: { type: String }
              }
            ],
            required: true
          }
        }
      ],
      default: []
    },
    questions: {
      type: [
        {
          question: { type: String },
          answer: { type: String }
        }
      ],
      default: []
    },
    pipelineDetails: {
      type: [
        {
          pipeline: {
            type: {
              id: { type: mongoose.Schema.Types.ObjectId, ref: 'Pipeline' }
              // label: { type: String },
              // value: { type: String },
            },
            required: true
          },
          status: {
            type: {
              id: { type: mongoose.Schema.Types.ObjectId, ref: 'Status' }
              // code: { type: String },
              // title: { type: String },
            },
            default: null,
            required: true
          },
          statusHistory: {
            type: [
              {
                changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
                createdAt: { type: String, default: new Date() },
                note: { type: String, default: null },
                status: {
                  type: { code: { type: String }, title: { type: String } },
                  required: true
                }
              }
            ],
            default: []
          }
        }
      ],
      default: []
    },
    pipelineHistory: {
      type: [
        {
          changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
          createdAt: { type: String, default: new Date() },
          pipelines: {
            type: [
              {
                code: { type: String },
                title: { type: String }
              }
            ],
            required: true
          }
        }
      ],
      default: []
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
      default: null
    },
    archived: {
      type: Boolean,
      default: false
    },
    hasUnsubscribed: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
)

export const validateContact = (companies) => {
  const JoiSchema = Joi.object({
    // email: Joi.string().required().email().min(5).max(50),
    firstName: Joi.string().required(),
    companyDetail: Joi.object().required()
  })
    .options({ abortEarly: false })
    .unknown()

  return JoiSchema.validate(companies)
}

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const Contacts = model('Contacts', schema)
