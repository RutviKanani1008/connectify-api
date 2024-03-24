// ** others **
import { logger } from '../utils/utils.js'
import dbConnection from '../db/connection.js'
import { Permission } from '../models/permission.js'

/**
 *  script: ts-node ./src/seeder/addPermission.js
 *  add slug in all invoices
 */

const addPermissions = async () => {
  try {
    dbConnection()
    await Permission.insertMany([
      {
        _id: '647b628f399b21d5018b8359',
        name: 'Dashboard',
        slug: 'home',
        parent: null
      },

      // Company
      {
        _id: '647b628f399b21d5018b835a',
        name: 'Company',
        slug: 'company',
        parent: null
      },
      {
        name: 'Profile',
        slug: 'company-profile',
        parent: '647b628f399b21d5018b835a'
      },
      {
        name: 'Users',
        slug: 'users',
        parent: '647b628f399b21d5018b835a'
      },
      {
        name: 'Checklist',
        slug: 'templates',
        parent: '647b628f399b21d5018b835a'
      },
      {
        name: 'Files',
        slug: 'documents',
        parent: '647b628f399b21d5018b835a'
      },

      // Contacts
      {
        _id: '647b628f399b21d5018b835b',
        name: 'Contacts',
        slug: 'contacts',
        parent: null
      },
      {
        name: 'Contacts',
        slug: 'contacts-list',
        parent: '647b628f399b21d5018b835b'
      },
      {
        name: 'Manage Groups',
        slug: 'manage-groups',
        parent: '647b628f399b21d5018b835b'
      },
      {
        name: 'Status',
        slug: 'status',
        parent: '647b628f399b21d5018b835b'
      },
      {
        name: 'Category',
        slug: 'categories',
        parent: '647b628f399b21d5018b835b'
      },
      {
        name: 'Tags',
        slug: 'tags',
        parent: '647b628f399b21d5018b835b'
      },
      {
        name: 'Custom Fields',
        slug: 'custom-fields',
        parent: '647b628f399b21d5018b835b'
      },

      //
      {
        _id: '647b628f399b21d5018b835c',
        name: 'Pipelines',
        slug: 'pipeline',
        parent: null
      },

      // Marketing
      {
        _id: '647b628f399b21d5018b835d',
        name: 'Marketing',
        slug: 'campaigns',
        parent: null
      },
      {
        name: 'Forms',
        slug: 'forms',
        parent: '647b628f399b21d5018b835d'
      },
      {
        name: 'Mass SMS Tool',
        slug: 'mass-sms-tool',
        parent: '647b628f399b21d5018b835d'
      },
      {
        name: 'Mass Email Tool',
        slug: 'mass-email-tool',
        parent: '647b628f399b21d5018b835d'
      },

      //
      {
        _id: '647b628f399b21d5018b835e',
        name: 'Reports',
        slug: 'reports',
        parent: null
      },

      //
      {
        _id: '647b628f399b21d5018b835f',
        name: 'Billing',
        slug: 'billing',
        parent: null
      },
      {
        name: 'Quote',
        slug: 'quote',
        parent: '647b628f399b21d5018b835f'
      },
      {
        name: 'Invoice',
        slug: 'invoice',
        parent: '647b628f399b21d5018b835f'
      },
      {
        name: 'Products',
        slug: 'products',
        parent: '647b628f399b21d5018b835f'
      },
      {
        name: 'Billing Profiles',
        slug: 'billing-profiles',
        parent: '647b628f399b21d5018b835f'
      },
      {
        name: 'Templates',
        slug: 'billing-templates',
        parent: '647b628f399b21d5018b835f'
      },

      {
        _id: '647b628f399b21d5018b8360',
        name: 'Task Manager',
        slug: 'task-manager',
        parent: null
      },
      {
        _id: '64faec7dbfd4c631615c248e',
        name: 'Task Manager',
        slug: 'task-manager',
        parent: '647b628f399b21d5018b8360'
      },
      {
        _id: '64faecefbfd4c631615c248f',
        name: 'Task Timer',
        slug: 'task-manager-timer',
        parent: '647b628f399b21d5018b8360'
      },
      {
        _id: '647b628f399b21d5018b8361',
        name: 'Settings',
        slug: 'settings',
        parent: null
      }
    ])
    console.log('Permission added successfully!')
    return
  } catch (error) {
    logger(error)
  }
}

addPermissions()
