// ============== Import Pakckages ========
import AWS from 'aws-sdk'
// ========================================
const AWSendpoint = new AWS.Endpoint(`s3.${process.env.WASABI_REGION}.wasabisys.com`)
const S3Object = new AWS.S3({
  endpoint: AWSendpoint,
  region: process.env.WASABI_REGION,
  accessKeyId: process.env.WASABI_ACCESS_KEY_ID,
  secretAccessKey: process.env.WASABI_SECRET_ACCESS_KEY
})

// load configuration
export const fileUploadBase64Data = (data) => {
  const { company, user, folderName, base64Data, contentType, fileName } = data

  return S3Object.upload({
    Bucket: process.env.WASABI_BUCKET_NAME,
    Key: `${company}/${user}/${folderName}/${fileName}`,
    Body: base64Data,
    ACL: 'public-read',
    ContentType: contentType
  }).promise()
}
