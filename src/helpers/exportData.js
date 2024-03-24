import path from 'path'
import excelJS from 'exceljs'
import _ from 'lodash'

import { logger } from '../utils/utils'
import { Tasks } from '../models/tasks'
import { Notes } from '../models/notes'
import { Users } from '../models/users'
import { Forms } from '../models/forms'
import { Contacts } from '../models/contacts'
import { Groups } from '../models/groups'
import { Status } from '../models/status'
import { Category } from '../models/category'
import { Tags } from '../models/tags'
import { Pipeline } from '../models/pipeline'
import { CustomField } from '../models/customField'
import { EmailTemplates } from '../models/emailTemplate'
import { SMSTemplates } from '../models/smsTemplate'
import { Document } from '../models/document'
import { MassSMS } from '../models/mass-sms'
import { ScheduledMassSMS } from '../models/scheduled-mass-sms'
import { MassEmail } from '../models/mass-email'
import { ScheduledMassEmail } from '../models/scheduled-mass-email'
import { Quotes } from '../models/quote'
import { Invoices } from '../models/invoice'
import { BillingTemplate } from '../models/billingTemplate'
import { Products } from '../models/product'
import { ProductCategory } from '../models/productCategory'
import { InventoryProducts } from '../models/inventoryProduct'

import taskColumnsData from '../mapper/exportData/task'
import notesColumnsData from '../mapper/exportData/notes'
import userColumnsData from '../mapper/exportData/user'
import companyColumnsData from '../mapper/exportData/company'
import formColumnsData from '../mapper/exportData/form'
import contactColumnsData from '../mapper/exportData/contact'
import groupColumnsData from '../mapper/exportData/group'
import statusColumnsData from '../mapper/exportData/status'
import categoryColumnsData from '../mapper/exportData/category'
import tagColumnsData from '../mapper/exportData/tag'
import pipelineColumnsData from '../mapper/exportData/pipeline'
import customFieldColumnsData from '../mapper/exportData/customField'
import emailTemplateColumnsData from '../mapper/exportData/emailTemplate'
import smsTemplateColumnsData from '../mapper/exportData/smsTemplate'
import documentColumnsData from '../mapper/exportData/document'
import massSMSColumnsData from '../mapper/exportData/massSMS'
import scheduledMassSMSColumnsData from '../mapper/exportData/scheduledMassSMS'
import massEmailColumnsData from '../mapper/exportData/massEmail'
import scheduledMassEmailColumnsData from '../mapper/exportData/scheduledMassEmail'
import quoteColumnsData from '../mapper/exportData/quote'
import invoiceColumnsData from '../mapper/exportData/invoice'
import billingColumnsData from '../mapper/exportData/billingTemplate'
import productColumnsData from '../mapper/exportData/product'
import productCategoryColumnsData from '../mapper/exportData/productCategory'
import inventoryProductColumnsData from '../mapper/exportData/inventoryProduct'
import inventoryOfflineOrderColumnsData from '../mapper/exportData/inventoryOfflineOrder'
import { InventoryOfflineOrder } from '../models/inventoryOfflineOrder'
import moment from 'moment'
import { parseHtmlToText } from './generalHelper'
import { Companies } from '../models/companies'

const queryObj = {
  task: {
    populate: {
      assigned: { select: 'firstName,lastName' },
      contact: { select: 'firstName,lastName,company_name' },
      priority: { select: 'label' },
      status: { select: 'label' },
      parent_task: { select: 'name' }
    },
    projection: 'name,startDate,endDate,est_time_complete,frequency'
  },
  notes: {
    populate: {
      modelId: { path: 'modelId', ref: 'Contacts', as: 'contact', select: 'firstName,lastName' },
      updatedBy: { select: 'firstName,lastName' }
    },
    projection: 'title,note,modelId,updatedBy'
  },
  company: { projection: 'name,email,phone,status,archived' },
  user: {
    projection: 'firstName,lastName,email,role,phone'
  },
  form: {
    projection: 'title,active'
  },
  contact: {
    populate: {
      'group.id': { select: 'groupName' },
      'status.id': { select: 'statusName' },
      'category.id': { select: 'categoryName' },
      tags: { select: 'tagName' }
    },
    projection: 'firstName,lastName,email,website,company_name,phone,address1,address2,city,state,country,zip'
  },
  group: {
    projection: 'groupName,active'
  },
  status: {
    populate: {
      groupId: { select: 'groupName' }
    },
    projection: 'statusName,active'
  },
  category: {
    populate: {
      groupId: { select: 'groupName' }
    },
    projection: 'categoryName,active'
  },
  tag: {
    populate: {
      groupId: { select: 'groupName' },
      folder: { select: 'folderName' }
    },
    projection: 'tagName,folder'
  },
  pipeline: {
    populate: {
      groupId: { select: 'groupName' }
    },
    projection: 'pipelineName,active'
  },
  customField: {
    populate: {
      groupId: { select: 'groupName' }
    },
    projection: 'fieldName,active'
  },
  emailTemplate: {
    projection: 'name,subject'
  },
  smsTemplate: {
    projection: 'name,body'
  },
  document: {
    projection: 'name,documentURL,createdAt'
  },
  massSMS: {
    projection: 'title,createdAt'
  },
  scheduledMassSMS: {
    projection: 'scheduledJobName,scheduledTime,status,createdAt'
  },
  massEmail: {
    projection: 'title,createdAt'
  },
  scheduledMassEmail: {
    projection: 'scheduledJobName,scheduledTime,status,createdAt'
  },
  quote: {
    populate: {
      customer: { select: 'firstName,lastName', ref: 'Contacts' }
    },
    projection: 'quoteId,quoteDate,expiryDate,status,createdAt'
  },
  invoice: {
    populate: {
      customer: { select: 'firstName,lastName', ref: 'Contacts' }
    },
    projection: 'invoiceId,invoiceDate,dueDate,status,createdAt'
  },
  billingTemplate: {
    projection: 'name,createdAt'
  },
  product: {
    populate: {
      category: { select: 'name', ref: 'ProductCategory' }
    },
    projection: 'name,price,description,createdAt'
  },
  productCategory: {
    projection: 'name,createdAt'
  },
  inventoryproducts: {
    populate: {
      category: { select: 'name', ref: 'InventoryProductCategory' },
      warehouse: { select: 'name', ref: 'InventoryWarehouseLocations' },
      createdBy: { select: 'firstName,lastName', ref: 'Users' }
    },
    projection:
      'title,price,salePrice,barcode,sku,manufacturerBarcode,quantity,description,location,length,width,height,weight,productLocations'
  },
  inventoryOfflineOrder: {
    projection: 'totalAmount,customerDetails,orderDetails,shippingDetails,paymentDetails,orderNumber,createdAt'
  }
}

export const getModel = (model) => {
  switch (model) {
    case 'company':
      return Companies
    case 'task':
      return Tasks
    case 'notes':
      return Notes
    case 'user':
      return Users
    case 'form':
      return Forms
    case 'contact':
      return Contacts
    case 'group':
      return Groups
    case 'status':
      return Status
    case 'category':
      return Category
    case 'tag':
      return Tags
    case 'pipeline':
      return Pipeline
    case 'customField':
      return CustomField
    case 'emailTemplate':
      return EmailTemplates
    case 'smsTemplate':
      return SMSTemplates
    case 'document':
      return Document
    case 'massSMS':
      return MassSMS
    case 'scheduledMassSMS':
      return ScheduledMassSMS
    case 'massEmail':
      return MassEmail
    case 'scheduledMassEmail':
      return ScheduledMassEmail
    case 'quote':
      return Quotes
    case 'invoice':
      return Invoices
    case 'billingTemplate':
      return BillingTemplate
    case 'product':
      return Products
    case 'productCategory':
      return ProductCategory
    case 'inventoryproducts':
      return InventoryProducts
    case 'inventoryOfflineOrder':
      return InventoryOfflineOrder
  }
}

const getMappedColumns = (model) => {
  switch (model) {
    case 'task':
      return taskColumnsData
    case 'notes':
      return notesColumnsData
    case 'company':
      return companyColumnsData
    case 'user':
      return userColumnsData
    case 'form':
      return formColumnsData
    case 'contact':
      return contactColumnsData
    case 'group':
      return groupColumnsData
    case 'status':
      return statusColumnsData
    case 'category':
      return categoryColumnsData
    case 'tag':
      return tagColumnsData
    case 'pipeline':
      return pipelineColumnsData
    case 'customField':
      return customFieldColumnsData
    case 'emailTemplate':
      return emailTemplateColumnsData
    case 'smsTemplate':
      return smsTemplateColumnsData
    case 'document':
      return documentColumnsData
    case 'massSMS':
      return massSMSColumnsData
    case 'scheduledMassSMS':
      return scheduledMassSMSColumnsData
    case 'massEmail':
      return massEmailColumnsData
    case 'scheduledMassEmail':
      return scheduledMassEmailColumnsData
    case 'quote':
      return quoteColumnsData
    case 'invoice':
      return invoiceColumnsData
    case 'billingTemplate':
      return billingColumnsData
    case 'product':
      return productColumnsData
    case 'productCategory':
      return productCategoryColumnsData
    case 'inventoryproducts':
      return inventoryProductColumnsData
    case 'inventoryOfflineOrder':
      return inventoryOfflineOrderColumnsData
  }
}

const getData = ({ model, query, sort = { createdAt: -1 } }) => {
  const getPopulate = () => {
    return Object.keys(queryObj[model].populate || {}).map((key) => ({
      path: key,
      select: queryObj[model].populate[key].select.split(',').reduce((obj, value) => ({ ...obj, [value]: 1 }), {}),
      ...(queryObj[model].populate[key]?.ref && { ref: queryObj[model].populate[key]?.ref })
    }))
  }

  const getProjection = () => {
    return queryObj[model].projection.split(',').reduce((obj, value) => ({ ...obj, [value]: 1 }), {})
  }
  return getModel(model).find(query, getProjection()).sort(sort).populate(getPopulate())
}

const reArrangeTheData = ({ model, data, query }) => {
  if (model === 'task') {
    data = reArrangeTheTaskData({ data, query })
  }
  if (model === 'inventoryproducts') {
    data = reArrangeTheInventoryData({ data, query })
  }

  if (model === 'inventoryOfflineOrder') {
    data = reArrangeOfflineOrderData({ data, query })
  }

  const nestedData = queryObj[model].populate
  const nestedKeys = Object.keys(nestedData || {})
  const tempData = data.map((obj) => {
    const tempObj = { ...obj }
    nestedKeys.forEach((key) => {
      const labelArray = nestedData?.[key]?.select.split(',')
      const keyArray = key.split('.')
      let tempData = null
      if (keyArray.length === 2) {
        keyArray.forEach((tempKey) => {
          if (tempData) {
            tempData = tempData[tempKey]
          } else {
            tempData = tempObj[tempKey]
          }
        })
      } else {
        tempData = tempObj[key]
      }
      if (_.isArray(labelArray)) {
        tempObj[keyArray[0]] = labelArray.reduce((label, value) => `${label} ${tempData?.[value] || ''}`, '')
      }
    })
    return tempObj
  })
  return tempData
}

export const exportDataHelper = async ({ model, query, fileName, sort }) => {
  try {
    const __dirname = path.resolve()
    const workbook = new excelJS.Workbook()
    const worksheet = workbook.addWorksheet(model)

    // fetch data
    const data = (await getData({ model, query, sort })) || []

    // set columns
    const columnData = getMappedColumns(model)
    worksheet.columns = Object.keys(columnData).map((key) => ({ header: columnData[key], key }))

    // arrange the data & nested data
    const arrangedData = reArrangeTheData({ model, data: JSON.parse(JSON.stringify(data)), query })
    if (_.isArray(arrangedData)) {
      if (model === 'notes') {
        arrangedData.forEach((individualNote) => {
          if (individualNote.note) {
            const formattedText = parseHtmlToText(individualNote.note)
            worksheet.addRow({ ...individualNote, note: formattedText })
          }
        })
      } else {
        arrangedData.forEach((obj) => {
          worksheet.addRow({ ...obj })
        })
      }
    }
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true }
    })
    const filePath = `/files/${fileName || model}-${Date.now()}.xlsx`
    await workbook.xlsx.writeFile(`${__dirname}/public${filePath}`)
    return filePath
  } catch (error) {
    console.log(error)
    logger(error)
  }
}

// rearrange the task data
const reArrangeTheTaskData = ({ data = [], query }) => {
  const tempData = [...data]
  const parentTasks = tempData.filter((obj) => obj.parent_task === null)

  parentTasks.forEach((f) =>
    tempData.splice(
      tempData.findIndex((e) => e._id === f._id),
      1
    )
  )

  let finalData = []
  parentTasks.forEach((parentTask) => {
    parentTask.company_name = parentTask?.contact?.company_name || '-'
    delete parentTask?.contact?.company_name
    const childTasks = tempData.filter((task) => task?.parent_task?._id === parentTask._id)

    parentTask.assigned_task = parentTask.assigned
      ?.map(
        (assignedTask) =>
          `${assignedTask?.firstName !== null ? assignedTask?.firstName : ''} ${
            assignedTask?.lastName !== null ? assignedTask?.lastName : ''
          }`
      )
      ?.toString()

    childTasks.forEach((child) => {
      child.company_name = child?.contact?.company_name || '-'
      delete child?.contact?.company_name
      child.sub_task = child?.name
      child.name = child?.parent_task?.name || ''
      child.assigned_task = child?.assigned
        ?.map(
          (assignedTask) =>
            `${assignedTask?.firstName !== null ? assignedTask?.firstName : ''} ${
              assignedTask?.lastName !== null ? assignedTask?.lastName : ''
            }`
        )
        ?.toString()
    })

    childTasks.forEach((f) =>
      tempData.splice(
        tempData.findIndex((e) => e._id === f._id),
        1
      )
    )
    finalData = [...finalData, parentTask, ...childTasks]
  })

  if (query?.trash === true) {
    finalData = [...finalData, ...tempData]
  }

  return finalData
}

const reArrangeTheInventoryData = ({ data = [], query }) => {
  const tempData = [...data]
  tempData.forEach((item) => {
    const productLocations = []
    item.manufacturerBarcode = item.manufacturerBarcode ? item.manufacturerBarcode : 'N/A'
    item.length = item.length ? item.length : ''
    item.width = item.width ? item.width : ''
    item.height = item.height ? item.height : ''
    item.weight = item.weight ? item.weight : ''
    item.productLocations.forEach((currentLocation) => {
      if (currentLocation.isSelected) {
        productLocations.push(currentLocation.location)
      }
    })
    item.locations = productLocations.toString()
  })
  return tempData
}

const reArrangeOfflineOrderData = ({ data = [], query }) => {
  const tempData = [...data]
  const productDetails = []

  tempData.forEach((item) => {
    item.orderDetails.orderItems.forEach((product) => {
      productDetails.push({
        name: product.title,
        purchaseQty: product.purchaseQty,
        purchaseTotal: product.purchaseTotal,
        orderNumber: item.orderNumber,
        customerDetails: item.customerDetails ? item.customerDetails.name : 'N/A',
        paymentDetails: item.paymentDetails ? item.paymentDetails.paymentMethod.label : '',
        paymentStatus: item.paymentDetails ? item.paymentDetails.paymentStatus.label : '',
        orderStatus: item.orderDetails.orderStatus ? item.orderDetails.orderStatus.label : '',
        address1: item.shippingDetails ? item.shippingDetails.address1 : '',
        address2: item.shippingDetails ? item.shippingDetails.address2 : '',
        city: item.shippingDetails ? item.shippingDetails.city : '',
        state: item.shippingDetails ? item.shippingDetails.state : '',
        country: item.shippingDetails ? item.shippingDetails.country : '',
        date: item.createdAt ? moment(item.createdAt).format('YYYY-MM-DD') : ''
      })
    })
  })
  return productDetails
}
