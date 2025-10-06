# Deployment Guide - Jouster.org

This guide covers all deployment options for the Jouster platform, from local development to production AWS infrastructure.

## 🌐 Current Live Deployment

**Production Site**: [http://jouster-org-static.s3-website-us-east-1.amazonaws.com](http://jouster-org-static.s3-website-us-east-1.amazonaws.com)

**Status**: ✅ Live and operational
**Last Deployed**: October 6, 2025
**Build Size**: 96.75 kB compressed
**Infrastructure**: AWS S3 Static Website Hosting

## 📋 Deployment Options

### 1. Manual AWS Deployment (Current Production)

This is the current live deployment method using direct AWS CLI commands.

**Prerequisites:**
- AWS CLI configured with credentials
- Node.js 18.x+ and npm
- Production build completed

**Steps:**
```bash
# 1. Build the application
npm run build

# 2. Deploy using manual script
.\deploy-aws-manual.bat

# 3. Verify deployment
# Site will be live at: http://jouster-org-static.s3-website-us-east-1.amazonaws.com
```

**What it creates:**
- S3 bucket: `jouster-org-static`
- Static website hosting configuration
- Public access policies
- Optimized cache headers

### 2. Terraform Deployment (Recommended for Future)

Infrastructure as Code approach for scalable, reproducible deployments.

**Prerequisites:**
- Terraform installed (`choco install terraform`)
- AWS CLI configured
- PowerUserAccess IAM permissions

**Steps:**
```bash
# 1. Install Terraform (if not installed)
choco install terraform

# 2. Run comprehensive deployment
.\deploy-terraform.bat
```

**What it creates:**
- S3 static website hosting
- CloudFront CDN distribution
- AWS Lambda serverless backend
- DynamoDB conversation history
- API Gateway for RESTful APIs
- CloudWatch monitoring

### 3. CloudFormation Deployment (Alternative)

For organizations preferring AWS-native infrastructure management.

**Steps:**
```bash
# Deploy infrastructure
.\deploy-aws.bat
```

**Note**: Requires additional CloudFormation IAM permissions beyond current setup.

## 🔧 Deployment Configurations

### Current AWS Configuration
```json
{
  "region": "us-east-1",
  "s3Bucket": "jouster-org-static",
  "websiteEndpoint": "jouster-org-static.s3-website-us-east-1.amazonaws.com"
}
```

### Environment Variables
```bash
# Production Environment (.env.production)
DOMAIN=jouster.org
PRODUCTION_URL=https://jouster.org
AWS_REGION=us-east-1
AWS_S3_BUCKET=jouster-org-static
NODE_ENV=production
BUILD_OPTIMIZATION=true
SOURCE_MAPS=false
```

## 🚨 Troubleshooting Deployments

### Common Issues and Solutions

**Issue**: "403 Forbidden" when accessing site
```bash
# Solution: Remove public access blocks
aws s3api delete-public-access-block --bucket jouster-org-static --region us-east-1

# Reapply bucket policy
aws s3api put-bucket-policy --bucket jouster-org-static --policy file://bucket-policy.json --region us-east-1
```

**Issue**: Browser downloads files instead of displaying site
```bash
# Solution: Configure S3 website hosting
aws s3 website s3://jouster-org-static --index-document index.html --error-document index.html --region us-east-1

# Set proper content-types
aws s3 sync dist/jouster/browser s3://jouster-org-static --content-type-by-extension --region us-east-1
```

**Issue**: CloudFormation permission errors
```bash
# Solution: Use manual deployment or install Terraform
.\deploy-aws-manual.bat  # Current working solution
```

### Performance Optimization

**Cache Headers Applied:**
- HTML files: 1 day cache (`max-age=86400`)
- JS/CSS files: 1 year cache with immutable flag (`max-age=31536000, immutable`)
- Images: 1 year cache (`max-age=31536000`)

**Content-Type Configuration:**
- `.html` files: `text/html; charset=utf-8`
- `.js` files: `application/javascript`
- `.css` files: `text/css`

## 🔄 Continuous Deployment

### Current Process
1. Code changes committed to `jstr-start` branch
2. Production build created locally (`npm run build`)
3. Manual deployment to AWS S3 (`.\deploy-aws-manual.bat`)
4. Site updated at live URL

### Future CI/CD (Terraform)
1. Code pushed to GitHub
2. GitHub Actions triggers Terraform deployment
3. Automatic infrastructure updates and application deployment
4. CloudFront cache invalidation for instant updates

## 📊 Deployment Monitoring

### Health Checks
```bash
# Check site availability
curl -I http://jouster-org-static.s3-website-us-east-1.amazonaws.com

# Verify S3 bucket configuration
aws s3api get-bucket-website --bucket jouster-org-static --region us-east-1

# Check file upload status
aws s3 ls s3://jouster-org-static --region us-east-1
```

### Performance Monitoring
- **Load Time**: < 2 seconds initial load
- **Bundle Size**: 96.75 kB compressed (excellent)
- **Browser Compatibility**: Modern browsers (ES2020+)

## 🔐 Security Considerations

### Current Security Measures
- Public read-only S3 bucket access
- CORS configuration for cross-origin requests
- Content-Security-Policy headers
- No sensitive data in client-side code

### Future Security Enhancements (Terraform)
- CloudFront with WAF (Web Application Firewall)
- HTTPS encryption with SSL certificates
- API Gateway request throttling
- DynamoDB encryption at rest

## 🎯 Deployment Checklist

### Pre-deployment
- [ ] Code committed to Git repository
- [ ] Dependencies installed (`npm ci`)
- [ ] Production build successful (`npm run build`)
- [ ] AWS credentials configured (`aws configure list`)

### Deployment
- [ ] Run deployment script (`.\deploy-aws-manual.bat`)
- [ ] Verify S3 bucket creation and configuration
- [ ] Check website hosting configuration
- [ ] Confirm public access policies applied

### Post-deployment
- [ ] Site accessible at live URL
- [ ] All pages and features working
- [ ] Performance metrics within acceptable range
- [ ] Error monitoring in place

## 📈 Scaling Considerations

### Current Limitations
- No CDN (direct S3 access)
- Regional deployment (us-east-1 only)
- Manual deployment process

### Future Scaling (Terraform Infrastructure)
- Global CDN with CloudFront
- Auto-scaling Lambda functions
- DynamoDB auto-scaling
- Multi-region deployment capability
- Automated CI/CD pipeline

---

## 📞 Support

For deployment issues:
1. Check this troubleshooting guide
2. Verify AWS permissions and configuration
3. Review deployment logs and error messages
4. Open GitHub issue with detailed error information

**Current Status**: Production deployment successful and operational at live URL.
