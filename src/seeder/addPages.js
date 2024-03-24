// ** others **
import { logger } from '../utils/utils.js'
import dbConnection from '../db/connection.js'
import { Pages } from '../models/pages.js'
import { ObjectId } from 'mongodb'

/**
 *  script: ts-node ./src/seeder/addPages.js
 *  add Pages
 */

const addPages = async () => {
  try {
    dbConnection()
    setTimeout(async () => {
      await Pages.insertMany([
        {
          _id: ObjectId('64ca4900c721b2a31b6d7e6f'),
          pageName: 'Dashboard',
          pageId: 'dashboard',
          parentPage: null,
          allow_guide: true,
          allowCms: true,
          order: 0
        },
        {
          _id: ObjectId('64ca4900c721b2a31b6d7e70'),
          pageName: 'Company',
          pageId: 'company',
          parentPage: null,
          allow_guide: false,
          aallowCms: false,
          order: 1
        },
        {
          _id: ObjectId('64ca4900c721b2a31b6d7e71'),
          pageName: 'Contacts',
          pageId: 'contacts',
          parentPage: null,
          allow_guide: false,
          aallowCms: false,
          order: 6
        },
        {
          _id: ObjectId('64ca4900c721b2a31b6d7e72'),
          pageName: 'Pipeline',
          pageId: 'pipeline',
          parentPage: null,
          allow_guide: true,
          allowCms: false,
          order: 13
        },
        {
          _id: ObjectId('64cdfa3cba94f1c104153397'),
          pageName: 'Events',
          pageId: 'events',
          parentPage: null,
          allow_guide: true,
          allowCms: false,
          order: 14
        },
        {
          _id: ObjectId('64ca4900c721b2a31b6d7e73'),
          pageName: 'Marketing',
          pageId: 'marketing',
          parentPage: null,
          allow_guide: false,
          aallowCms: false,
          order: 15
        },
        {
          _id: ObjectId('64ca4900c721b2a31b6d7e74'),
          pageName: 'Report',
          pageId: 'report',
          parentPage: null,
          allow_guide: true,
          allowCms: false,
          order: 26
        },
        {
          _id: ObjectId('64ca4900c721b2a31b6d7e75'),
          pageName: 'Billing',
          pageId: 'billing',
          parentPage: null,
          allow_guide: false,
          aallowCms: false,
          order: 27
        },
        {
          _id: ObjectId('64ca4900c721b2a31b6d7e76'),
          pageName: 'Task Manager',
          pageId: 'task-manager',
          parentPage: null,
          allow_guide: true,
          allowCms: false,
          order: 36
        },
        {
          _id: ObjectId('64ca4900c721b2a31b6d7e77'),
          pageName: 'Communication',
          pageId: 'communication',
          parentPage: null,
          allow_guide: false,
          aallowCms: false,
          order: 37
        },
        {
          _id: ObjectId('64ca4900c721b2a31b6d7e78'),
          pageName: 'Inventory',
          pageId: 'inventory',
          parentPage: null,
          allow_guide: false,
          aallowCms: false,
          order: 40
        },
        {
          _id: ObjectId('64ca4900c721b2a31b6d7e79'),
          pageName: 'Settings',
          pageId: 'settings',
          parentPage: null,
          allow_guide: false,
          aallowCms: false,
          order: 44
        },
        {
          _id: ObjectId('64ca49dfc721b2a31b6d7e7a'),
          pageName: 'Profile',
          pageId: 'company-profile',
          parentPage: ObjectId('64ca4900c721b2a31b6d7e70'),
          allow_guide: true,
          allowCms: false,
          order: 2
        },
        {
          _id: ObjectId('64ca49dfc721b2a31b6d7e7b'),
          pageName: 'Users',
          pageId: 'company-users',
          parentPage: ObjectId('64ca4900c721b2a31b6d7e70'),
          allow_guide: true,
          allowCms: false,
          order: 3
        },
        {
          _id: ObjectId('64ca49dfc721b2a31b6d7e7c'),
          pageName: 'Checklist',
          pageId: 'company-checklist',
          parentPage: ObjectId('64ca4900c721b2a31b6d7e70'),
          allow_guide: true,
          allowCms: false,
          order: 4
        },
        {
          _id: ObjectId('64ca49dfc721b2a31b6d7e7d'),
          pageName: 'Files',
          pageId: 'company-files',
          parentPage: ObjectId('64ca4900c721b2a31b6d7e70'),
          allow_guide: true,
          allowCms: false,
          order: 5
        },
        {
          _id: ObjectId('64ca4abcc721b2a31b6d7e7e'),
          pageName: 'Contacts',
          pageId: 'contacts-contacts',
          parentPage: ObjectId('64ca4900c721b2a31b6d7e71'),
          allow_guide: true,
          allowCms: false,
          order: 7
        },
        {
          _id: ObjectId('64ca4abcc721b2a31b6d7e7f'),
          pageName: 'Manage Groups',
          pageId: 'contacts-manage-groups',
          parentPage: ObjectId('64ca4900c721b2a31b6d7e71'),
          allow_guide: true,
          allowCms: false,
          order: 8
        },
        {
          _id: ObjectId('64ca4abcc721b2a31b6d7e80'),
          pageName: 'Status',
          pageId: 'contacts-status',
          parentPage: ObjectId('64ca4900c721b2a31b6d7e71'),
          allow_guide: true,
          allowCms: false,
          order: 9
        },
        {
          _id: ObjectId('64ca4abcc721b2a31b6d7e81'),
          pageName: 'Category',
          pageId: 'contacts-category',
          parentPage: ObjectId('64ca4900c721b2a31b6d7e71'),
          allow_guide: true,
          allowCms: false,
          order: 10
        },
        {
          _id: ObjectId('64ca4abcc721b2a31b6d7e82'),
          pageName: 'Tags',
          pageId: 'contacts-tags',
          parentPage: ObjectId('64ca4900c721b2a31b6d7e71'),
          allow_guide: true,
          allowCms: false,
          order: 11
        },
        {
          _id: ObjectId('64ca4abcc721b2a31b6d7e83'),
          pageName: 'Custom Fields',
          pageId: 'contacts-custom-fields',
          parentPage: ObjectId('64ca4900c721b2a31b6d7e71'),
          allow_guide: true,
          allowCms: false,
          order: 12
        },
        {
          _id: ObjectId('64ca4b88c721b2a31b6d7e84'),
          pageName: 'Forms',
          pageId: 'marketing-forms',
          parentPage: ObjectId('64ca4900c721b2a31b6d7e73'),
          allow_guide: true,
          allowCms: false,
          order: 16
        },
        {
          _id: ObjectId('64ca4b88c721b2a31b6d7e85'),
          pageName: 'Mass SMS Tools',
          pageId: 'marketing-mass-sms-tools',
          parentPage: ObjectId('64ca4900c721b2a31b6d7e73'),
          allow_guide: false,
          aallowCms: false,
          order: 17
        },
        {
          _id: ObjectId('64ca4b88c721b2a31b6d7e86'),
          pageName: 'Mass Email Tools',
          pageId: 'marketing-mass-email-tools',
          parentPage: ObjectId('64ca4900c721b2a31b6d7e73'),
          allow_guide: false,
          aallowCms: false,
          order: 20
        },
        {
          _id: ObjectId('64d4fa358c1df9e9a2af22fd'),
          pageName: 'Direct Mail',
          pageId: 'marketing-direct-mail',
          parentPage: ObjectId('64ca4900c721b2a31b6d7e73'),
          allow_guide: false,
          aallowCms: false,
          order: 23
        },
        {
          _id: ObjectId('64ca4e34c721b2a31b6d7e87'),
          pageName: 'Mass SMS Tool > SMS Templates',
          pageId: 'marketing-sms-templates',
          parentPage: ObjectId('64ca4b88c721b2a31b6d7e85'),
          allow_guide: true,
          allowCms: false,
          order: 18
        },
        {
          _id: ObjectId('64ca4e34c721b2a31b6d7e88'),
          pageName: 'Mass SMS Tool > Mass SMS Blast',
          pageId: 'marketing-mass-sms-blast',
          parentPage: ObjectId('64ca4b88c721b2a31b6d7e85'),
          allow_guide: true,
          allowCms: false,
          order: 19
        },
        {
          _id: ObjectId('64ca4e34c721b2a31b6d7e89'),
          pageName: 'Mass Email Tool > Email Templates',
          pageId: 'marketing-mass-email-templates',
          parentPage: ObjectId('64ca4b88c721b2a31b6d7e86'),
          allow_guide: true,
          allowCms: false,
          order: 21
        },
        {
          _id: ObjectId('64ca4e34c721b2a31b6d7e8a'),
          pageName: 'Mass Email Tool > Mass Email Blast',
          pageId: 'marketing-mass-email-blast',
          parentPage: ObjectId('64ca4b88c721b2a31b6d7e86'),
          allow_guide: true,
          allowCms: false,
          order: 22
        },

        {
          _id: ObjectId('64d4fb608c1df9e9a2af22fe'),
          pageName: 'Direct Mail > Direct Mail Templates',
          pageId: 'marketing-direct-mail-templates',
          parentPage: ObjectId('64d4fa358c1df9e9a2af22fd'),
          allow_guide: true,
          allowCms: false,
          order: 24
        },
        {
          _id: ObjectId('64d4fb898c1df9e9a2af22ff'),
          pageName: 'Direct Mail > Create Direct Mail',
          pageId: 'marketing-create-direct-mail',
          parentPage: ObjectId('64d4fa358c1df9e9a2af22fd'),
          allow_guide: true,
          allowCms: false,
          order: 25
        },

        {
          _id: ObjectId('64ca4f04c721b2a31b6d7e8b'),
          pageName: 'Quote',
          pageId: 'billing-quote',
          parentPage: ObjectId('64ca4900c721b2a31b6d7e75'),
          allow_guide: true,
          allowCms: false,
          order: 28
        },
        {
          _id: ObjectId('64ca4f04c721b2a31b6d7e8c'),
          pageName: 'Invoice',
          pageId: 'billing-invoice',
          parentPage: ObjectId('64ca4900c721b2a31b6d7e75'),
          allow_guide: true,
          allowCms: false,
          order: 29
        },
        {
          _id: ObjectId('64ca4f04c721b2a31b6d7e8d'),
          pageName: 'Products',
          pageId: 'billing-products',
          parentPage: ObjectId('64ca4900c721b2a31b6d7e75'),
          allow_guide: false,
          aallowCms: false,
          order: 30
        },
        {
          _id: ObjectId('64ca4f04c721b2a31b6d7e8e'),
          pageName: 'Billing Profiles',
          pageId: 'billing-billing-profiles',
          parentPage: ObjectId('64ca4900c721b2a31b6d7e75'),
          allow_guide: true,
          allowCms: false,
          order: 34
        },
        {
          _id: ObjectId('64ca4f04c721b2a31b6d7e8f'),
          pageName: 'Templates',
          pageId: 'billing-templates',
          parentPage: ObjectId('64ca4900c721b2a31b6d7e75'),
          allow_guide: true,
          allowCms: false,
          order: 35
        },
        {
          _id: ObjectId('64ca4f86c721b2a31b6d7e90'),
          pageName: 'Products > One Time Products',
          pageId: 'billing-one-time-products',
          parentPage: ObjectId('64ca4f04c721b2a31b6d7e8d'),
          allow_guide: true,
          allowCms: false,
          order: 31
        },
        {
          _id: ObjectId('64ca4f86c721b2a31b6d7e91'),
          pageName: 'Products > Reccurring Products',
          pageId: 'billing-reccurring-products',
          parentPage: ObjectId('64ca4f04c721b2a31b6d7e8d'),
          allow_guide: true,
          allowCms: false,
          order: 32
        },
        {
          _id: ObjectId('64ca4f86c721b2a31b6d7e92'),
          pageName: 'Products > Product Categories',
          pageId: 'billing-product-categories',
          parentPage: ObjectId('64ca4f04c721b2a31b6d7e8d'),
          allow_guide: true,
          allowCms: false,
          order: 33
        },
        {
          _id: ObjectId('64ca50bec721b2a31b6d7e93'),
          pageName: 'Emails',
          pageId: 'communication-emails',
          parentPage: ObjectId('64ca4900c721b2a31b6d7e77'),
          allow_guide: true,
          allowCms: false,
          order: 38
        },
        {
          _id: ObjectId('64ce08b8ba94f1c10415339b'),
          pageName: 'Settings',
          pageId: 'communication-settings',
          parentPage: ObjectId('64ca4900c721b2a31b6d7e77'),
          allow_guide: true,
          allowCms: false,
          order: 39
        },
        {
          _id: ObjectId('64ca5469c721b2a31b6d7e94'),
          pageName: 'Products',
          pageId: 'inventory-products',
          parentPage: ObjectId('64ca4900c721b2a31b6d7e78'),
          allow_guide: true,
          allowCms: false,
          order: 41
        },
        {
          _id: ObjectId('64ca5469c721b2a31b6d7e95'),
          pageName: 'Orders',
          pageId: 'inventory-orders',
          parentPage: ObjectId('64ca4900c721b2a31b6d7e78'),
          allow_guide: true,
          allowCms: false,
          order: 42
        },
        {
          _id: ObjectId('64ca5469c721b2a31b6d7e96'),
          pageName: 'Settings',
          pageId: 'inventory-settings',
          parentPage: ObjectId('64ca4900c721b2a31b6d7e78'),
          allow_guide: true,
          allowCms: false,
          order: 43
        },
        {
          _id: ObjectId('64ca555bc721b2a31b6d7e97'),
          pageName: 'Profiles',
          pageId: 'settings-profiles',
          parentPage: ObjectId('64ca4900c721b2a31b6d7e79'),
          allow_guide: true,
          allowCms: false,
          order: 45
        },
        {
          _id: ObjectId('64ca555bc721b2a31b6d7e98'),
          pageName: 'Integration',
          pageId: 'settings-integration',
          parentPage: ObjectId('64ca4900c721b2a31b6d7e79'),
          allow_guide: true,
          allowCms: false,
          order: 46
        },
        {
          _id: ObjectId('64ca555bc721b2a31b6d7e99'),
          pageName: 'Notifications',
          pageId: 'settings-notifications',
          parentPage: ObjectId('64ca4900c721b2a31b6d7e79'),
          allow_guide: true,
          allowCms: false,
          order: 47
        },
        {
          _id: ObjectId('64ca555bc721b2a31b6d7e9a'),
          pageName: 'Feature Requests',
          pageId: 'settings-feature-requests',
          parentPage: ObjectId('64ca4900c721b2a31b6d7e79'),
          allow_guide: true,
          allowCms: false,
          order: 48
        },
        {
          _id: ObjectId('64ca555bc721b2a31b6d7e9b'),
          pageName: 'Support Tickets',
          pageId: 'settings-support-tickets',
          parentPage: ObjectId('64ca4900c721b2a31b6d7e79'),
          allow_guide: true,
          allowCms: false,
          order: 49
        },
        {
          _id: ObjectId('64ca555bc721b2a31b6d7e9c'),
          pageName: 'FAQ',
          pageId: 'settings-faq',
          parentPage: ObjectId('64ca4900c721b2a31b6d7e79'),
          allow_guide: true,
          allowCms: false,
          order: 50
        },
        {
          _id: ObjectId('64ca555bc721b2a31b6d7e9d'),
          pageName: 'Change Logs',
          pageId: 'settings-change-logs',
          parentPage: ObjectId('64ca4900c721b2a31b6d7e79'),
          allow_guide: true,
          allowCms: false,
          order: 51
        }
      ])
      console.log('Pages added successfully!')
    }, 5000)
    return
  } catch (error) {
    logger(error)
  }
}

addPages()
