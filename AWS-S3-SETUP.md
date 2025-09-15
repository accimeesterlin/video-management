# AWS S3 Setup Instructions for Video Management Platform

This guide will help you set up AWS S3 for video uploads in your video management platform.

## Prerequisites

- AWS Account
- AWS CLI installed (optional but recommended)
- Environment variables configured

## Step 1: Create an S3 Bucket

1. **Log into AWS Console**: Go to [AWS Console](https://console.aws.amazon.com/)

2. **Navigate to S3**: Search for "S3" in the services search bar

3. **Create Bucket**:
   - Click "Create bucket"
   - Enter a unique bucket name (e.g., `your-app-videos-bucket`)
   - Choose your preferred AWS region (e.g., `us-east-1`)
   - Keep default settings for now
   - Click "Create bucket"

## Step 2: Configure Bucket CORS

1. **Navigate to your bucket** and click on it

2. **Go to Permissions tab**

3. **Scroll to Cross-origin resource sharing (CORS)**

4. **Click Edit** and add the following CORS configuration:

```json
[
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "PUT",
            "POST",
            "DELETE",
            "GET"
        ],
        "AllowedOrigins": [
            "http://localhost:3000",
            "https://your-domain.com"
        ],
        "ExposeHeaders": [
            "ETag"
        ],
        "MaxAgeSeconds": 3000
    }
]
```

**Note**: Replace `https://your-domain.com` with your actual production domain.

## Step 3: Create IAM User for S3 Access

1. **Navigate to IAM**: Go to IAM service in AWS Console

2. **Create User**:
   - Click "Users" in the left sidebar
   - Click "Create user"
   - Enter username (e.g., `video-platform-s3-user`)
   - Select "Programmatic access"
   - Click "Next"

3. **Set Permissions**:
   - Click "Attach existing policies directly"
   - Search for and select `AmazonS3FullAccess` (for development)
   - For production, create a custom policy (see below)
   - Click "Next" and then "Create user"

4. **Save Credentials**:
   - **IMPORTANT**: Copy the Access Key ID and Secret Access Key
   - You won't be able to see the Secret Access Key again

## Step 4: Create Custom IAM Policy (Recommended for Production)

For better security, create a custom policy with minimal permissions:

1. **Go to IAM > Policies**
2. **Click "Create policy"**
3. **Select JSON tab** and paste:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:PutObjectAcl"
            ],
            "Resource": "arn:aws:s3:::your-bucket-name/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "s3:ListBucket"
            ],
            "Resource": "arn:aws:s3:::your-bucket-name"
        }
    ]
}
```

**Replace `your-bucket-name` with your actual bucket name.**

## Step 5: Configure Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_S3_BUCKET=your-bucket-name
```

**Important**: 
- Replace the values with your actual AWS credentials
- Never commit these credentials to your repository
- Add `.env.local` to your `.gitignore` file

## Step 6: Install Required Dependencies

The following dependencies are already included in the project:

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner react-dropzone
```

## Step 7: Test the Setup

1. **Start your development server**:
   ```bash
   npm run dev
   ```

2. **Navigate to the Videos page** in your application

3. **Try uploading a video**:
   - Click "Upload Video"
   - Drag and drop a video file or click to select
   - Fill in the optional metadata
   - Click "Upload Videos"

4. **Check AWS S3**:
   - Go to your S3 bucket in AWS Console
   - You should see the uploaded video in the `videos/` folder

## Troubleshooting

### Common Issues:

1. **"Access Denied" Error**:
   - Check your AWS credentials
   - Verify the IAM user has the correct permissions
   - Ensure the bucket name in your environment variables matches the actual bucket

2. **CORS Errors**:
   - Verify CORS configuration in your S3 bucket
   - Make sure your domain is listed in AllowedOrigins

3. **File Upload Fails**:
   - Check file size (max 5GB)
   - Verify file type is supported (MP4, AVI, MOV, WMV, FLV, WebM)
   - Check network connectivity

4. **Environment Variables Not Working**:
   - Restart your development server after adding environment variables
   - Ensure `.env.local` is in the project root
   - Check for typos in variable names

### Verification Commands:

Test your AWS credentials with AWS CLI (if installed):

```bash
aws s3 ls s3://your-bucket-name --region us-east-1
```

## Security Best Practices

1. **Use Custom IAM Policies**: Don't use `AmazonS3FullAccess` in production

2. **Rotate Access Keys**: Regularly rotate your AWS access keys

3. **Enable Bucket Versioning**: Turn on versioning for your S3 bucket

4. **Set Up Bucket Logging**: Enable access logging for audit trails

5. **Use VPC Endpoints**: For enhanced security in production

6. **Environment Variables**: Never hardcode credentials in your source code

## Cost Optimization

1. **Set Up Lifecycle Policies**: Automatically transition old videos to cheaper storage classes

2. **Enable Intelligent Tiering**: Let AWS automatically optimize storage costs

3. **Monitor Usage**: Use AWS Cost Explorer to track S3 costs

4. **Clean Up Test Uploads**: Regularly delete test files to avoid unnecessary charges

## Production Deployment

For production deployment:

1. **Use AWS IAM Roles** instead of access keys when deploying on AWS (EC2, Lambda, etc.)

2. **Set up CloudFront** for global content delivery

3. **Enable S3 Transfer Acceleration** for faster uploads

4. **Consider using S3 Multipart Upload** for large files

5. **Set up monitoring and alerting** with CloudWatch

## Support

If you encounter issues:

1. Check the browser console for error messages
2. Review the server logs
3. Verify AWS CloudTrail logs
4. Test with AWS CLI commands

For AWS-specific issues, refer to the [AWS S3 Documentation](https://docs.aws.amazon.com/s3/).