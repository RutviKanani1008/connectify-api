import { Pages } from '../models/pages'

const findPage = (params) => {
  return Pages.findOne(params)
}

const findAllPage = (params) => {
  return Pages.find(params).sort({ createdAt: -1 })
}

const createPage = (data) => {
  return Pages.create(data)
}

const updatePage = (search, updateValue) => {
  return Pages.updateOne(search, updateValue)
}

const deletePage = (pages) => {
  return Pages.delete(pages)
}

const aggregatePages = () => {
  return Pages.aggregate([
    {
      $match: {
        parentPage: null
      }
    },
    {
      $graphLookup: {
        from: 'pages',
        startWith: '$_id',
        connectFromField: '_id',
        connectToField: 'parentPage',
        as: 'children',
        maxDepth: 10,
        depthField: 'depth'
      }
    },
    {
      $project: {
        _id: 1,
        pageName: 1,
        pageId: 1,
        allow_guide: 1,
        allowCms: 1,
        order: 1,
        children: {
          $map: {
            input: '$children',
            as: 'child',
            in: {
              _id: '$$child._id',
              pageName: '$$child.pageName',
              pageId: '$$child.pageId',
              allow_guide: '$$child.allow_guide',
              allowCms: '$$child.allowCms',
              order: '$$child.order',
              children: {
                $filter: {
                  input: '$children',
                  as: 'subChild',
                  cond: { $eq: ['$$subChild.parentPage', '$$child._id'] }
                }
              }
            }
          }
        }
        // hasChildren: {
        //   $cond: {
        //     if: { $isArray: '$children' },
        //     then: { $ne: [{ $size: '$children' }, 0] },
        //     else: false
        //   }
        // }
      }
    }
    // {
    //   $project: {
    //     _id: 1,
    //     pageName: 1,
    //     children: {
    //       $cond: {
    //         if: '$hasChildren',
    //         then: '$children',
    //         else: []
    //       }
    //     }
    //   }
    // }
  ])
}

export { aggregatePages, createPage, findPage, findAllPage, updatePage, deletePage }
