import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

export const paymentStatus = {
  draft: 'draft',
  pending: 'pending',
  paid: 'paid',
  partiallyPaid: 'partially_paid',
  cancelled: 'cancelled',
  expired: 'expired'
}

const schema = new Schema(
  {
    slug: {
      type: String,
      required: true
    },
    invoiceId: {
      type: Schema.Types.String,
      required: true
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies',
      default: true
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
          quantity: { type: Number, default: 0 },
          price: { type: Number, default: 0 },
          description: { type: String },
          productType: { type: String, enum: ['one-time', 'recurring'], default: 'one-time' },
          paymentMode: { type: String, enum: ['Manual', 'Automatic'], default: 'Manual' },
          reccuringDetails: {
            type: {
              schedule: String,
              startDate: Date,
              endDate: Date,
              neverEnd: Boolean,
              selectedWeekDay: Array,
              selectedMonthDay: Number,
              selectedYear: Date,
              rrule: String
            }
          },
          recurringPaymentDetails: {
            type: [
              {
                recurringInvoiceDate: Date,
                status: { type: String, default: paymentStatus.pending },
                stripe_price_id: { type: String, default: null },
                stripe_payment_link: { type: { id: { type: String }, url: { type: String } }, default: null }
              }
            ],
            default: []
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
                status: { type: String, default: paymentStatus.pending },
                stripe_price_id: { type: String, default: null },
                stripe_payment_link: { type: { id: { type: String }, url: { type: String } }, default: null }
              }
            ]
          },
          chargesType: { type: String, default: null },
          charges: { type: Number, default: 0 },
          paymentOption: { type: String, enum: ['Online', 'Offline'], default: 'Online' },
          paymentType: { type: String, enum: ['installment', 'fullPayment'], default: 'fullPayment' },
          totalInstallments: { type: Number, default: null },
          stripe_price_id: { type: String, default: null },
          stripe_payment_link: { type: { id: { type: String }, url: { type: String } } },
          status: {
            type: String,
            enum: Object.keys(paymentStatus),
            default: paymentStatus.pending
          }
        }
      ],
      default: []
    },
    description: {
      type: String
    },
    invoiceDate: {
      type: Date,
      required: true
    },
    dueDate: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: Object.keys(paymentStatus),
      default: 'draft'
    },
    invoiceStatusActions: {
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
          }
        }
      ],
      default: []
    },
    paymentOption: {
      type: String,
      enum: ['Manual', 'Online'],
      default: 'Manual'
    },
    // stripe_payment_link: {
    //   type: { payment_id: { type: String }, payment_link: { type: String } },
    //   default: null
    // },
    isInvoiceSent: {
      type: Boolean,
      default: false
    },
    showTerms: { type: Boolean, default: false },
    termsAndCondition: { type: String },
    enableStatusAction: { type: Boolean, default: false },
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

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })

export const Invoices = model('Invoices', schema)
