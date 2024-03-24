import mongoose from 'mongoose'
import MongooseDelete from 'mongoose-delete'

const { model, Schema } = mongoose

const schema = new Schema(
  {
    title: {
      type: String,
      required: true
    },
    sku: {
      type: String,
      default: null
    },
    barcode: {
      type: String,
      default: null
    },
    manufacturerBarcode: {
      type: String,
      default: null
    },
    description: {
      type: String,
      default: null
    },
    quantity: {
      type: String,
      default: null
    },
    price: {
      type: String,
      default: null
    },
    salePrice: {
      type: String,
      default: null
    },
    location: {
      type: String,
      default: null
    },
    locationType: {
      type: String,
      default: null
    },
    image: {
      type: String,
      default: null
    },
    syncToWooCommerce: {
      type: Boolean,
      default: false
    },
    galleryImages: {
      type: [
        {
          fileName: { type: String, default: '' },
          fileUrl: { type: String, default: '' }
        }
      ],
      default: []
    },
    length: {
      type: String,
      default: null
    },
    height: {
      type: String,
      default: null
    },
    width: {
      type: String,
      default: null
    },
    weight: {
      type: String,
      default: null
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Companies',
      default: null
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryProductCategory',
      default: null
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InventoryWarehouseLocations',
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
     default: null
    },
    history: {
      type: Array,
      default: []
    },
    totalHistoryUpdateCount: {
      type: Number,
      default: 0
    },
    productStatus: {
      type: Number,
      default: 0
    },
    wooID: {
      type: Number,
      default: null
    },
    discountType: {
      type: String,
      default: null
    },
    discount: {
      type: String,
      default: null
    },
    productLocationQuestion: {
      condition_of_item: { type: String, default: null },
      does_the_product_work: { type: String, default: null },
      is_factory_sealed: { type: String, default: null },
      is_broken_or_use: { type: String, default: null },
      is_item_in_new_condition: { type: String, default: null }
    },
    productLocations: [
      {
        criteria: { type: Object, default: null },
        isSelected: { type: Boolean, default: false },
        location: { type: String, default: null },
        productQuestions: { type: [Object], default: [] }
      }
    ]
  },
  {
    timestamps: true
  }
)

schema.plugin(MongooseDelete, { deletedAt: true, overrideMethods: true })
export const InventoryProducts = model('InventoryProducts', schema)
