import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'
import { paymentStatus } from './invoice'
const { model, Schema } = mongoose

const quoteSchema = new Schema(
  {
    slug: {
      type: String,
      required: true
    },
    quoteId: {
      type: Schema.Types.String,
      required: true
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies',
      default: null
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'Contacts',
      required: true
    },
    sendInvoiceOnDueDate: {
      type: Boolean,
      default: false
    },
    sendInvoiceBefore: {
      type: Number,
      default: null
    },
    productDetails: {
      type: [
        {
          product: { type: mongoose.Schema.Types.ObjectId, ref: 'Products' },
          quantity: { type: Number, default: 1 },
          price: { type: Number },
          description: { type: String },
          productType: { type: String, enum: ['one-time', 'recurring'], default: 'one-time' },
          paymentMode: { type: String, enum: ['Manual', 'Automatic'], default: 'Manual' },
          reccuringDetails: {
            type: {
              schedule: String,
              startDate: Date,
              endDate: Date,
              neverEnd: Boolean,
              selectedMonthDay: Number,
              selectedYear: Date,
              selectedWeekDay: Array,
              rrule: String
            }
          },
          installmentCharge: {
            type: Number,
            default: null
          },
          installmentChargesType: {
            type: String,
            default: null
          },
          installments: {
            type: [
              {
                percentage: { type: Number, default: 0 },
                amount: { type: Number, default: 0 },
                dueDate: { type: Date, default: new Date() },
                status: { type: String, default: paymentStatus.pending }
              }
            ]
          },
          chargesType: { type: String, default: null },
          charges: { type: Number, default: 0 },
          paymentOption: { type: String, enum: ['Online', 'Offline'], default: 'Online' },
          paymentType: { type: String, enum: ['installment', 'fullPayment'], default: 'fullPayment' },
          totalInstallments: { type: Number, default: null }
        }
      ],
      default: []
    },
    description: {
      type: String
    },
    quoteDate: {
      type: Date,
      required: true
    },
    expiryDate: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: Object.keys(paymentStatus),
      default: 'draft'
    },
    quoteStatusActions: {
      type: [
        {
          status: String,
          newGroupInfo: {
            type: {
              group: {
                type: {
                  id: { type: mongoose.Schema.Types.ObjectId, ref: 'Groups' },
                  keepSame: { type: Boolean, default: false }
                }
              },
              status: {
                type: {
                  id: { type: mongoose.Schema.Types.ObjectId, ref: 'Status' },
                  keepSame: { type: Boolean, default: false }
                }
              },
              category: {
                type: {
                  id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
                  keepSame: { type: Boolean, default: false }
                }
              },
              tags: {
                type: [{ id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tags' } }],
                default: []
              },
              pipelineDetails: {
                type: [
                  {
                    pipeline: {
                      type: { id: { type: mongoose.Schema.Types.ObjectId, ref: 'Pipeline' } },
                      required: true
                    },
                    status: {
                      type: { id: { type: mongoose.Schema.Types.ObjectId } },
                      required: true
                    },
                    action: {
                      type: String,
                      enum: ['new', 'updated', 'deleted', 'keepSame'],
                      default: 'keepSame'
                    }
                  }
                ],
                default: []
              }
            }
          },
          convertToInvoice: { type: Boolean, default: false }
        }
      ],
      default: []
    },
    isQuoteSent: {
      type: Boolean,
      default: false
    },
    enableStatusAction: { type: Boolean, default: false },
    showTerms: { type: Boolean, default: false },
    termsAndCondition: { type: String },
    notes: {
      type: [
        {
          text: { type: String },
          status: { type: String, default: null },
          statusHistoryId: { type: mongoose.Schema.Types.ObjectId, default: null },
          createdAt: { type: Date, default: new Date() }
        }
      ],
      default: []
    }
  },
  { timestamps: true }
)

quoteSchema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })

export const Quotes = model('Quotes', quoteSchema)
