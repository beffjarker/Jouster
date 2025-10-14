# Jouster.org Startup Guide

🎉 **DEPLOYMENT SUCCESSFUL!** 
Your Jouster application is now live at: [http://jouster-org-static.s3-website-us-east-1.amazonaws.com](http://jouster-org-static.s3-website-us-east-1.amazonaws.com)

## ✅ Current Status (October 6, 2025)

- **Production Site**: Live and operational
- **AWS Infrastructure**: S3 static website hosting configured
- **Build**: Optimized production build (96.75 kB compressed)
- **Features**: All 56+ Flash experiments functional
- **Performance**: < 2 second load times

## 🚀 Quick Start Options

### Option 1: View Live Site (Immediate)
Visit the live production site: **http://jouster-org-static.s3-website-us-east-1.amazonaws.com**

Features available:
- Flash Experiments (56+ presets)
- Timeline Visualization with maps
- Conversation History interface
- Responsive design for all devices

### Option 2: Local Development
```bash
git clone https://github.com/beffjarker/Jouster.git
cd Jouster
npm install
npm start
# Access at http://localhost:4200
```

### Option 3: Full Stack Development
```bash
npm run start:full
# Starts: DynamoDB Local + Backend API + Frontend
# Full conversation history functionality
```

## 📦 Current Deployment Architecture

**Frontend (Live):**
- Angular 20.3.0 SPA
- Hosted on AWS S3 Static Website Hosting
- Optimized production build with code splitting
- Proper content-type headers configured

**Backend (Development):**
- Node.js server with Express
- DynamoDB Local in Docker containers
- RESTful API endpoints for conversation history
- Health check endpoints available

**Future Architecture (Terraform Ready):**
- AWS Lambda serverless functions
- Native AWS DynamoDB with auto-scaling
- API Gateway for RESTful endpoints
- CloudFront CDN for global performance

## 🔄 Making Updates

### Update Live Site
```bash
# Make your changes to the code
npm run build                    # Build for production
.\deploy-aws-manual.bat         # Deploy to AWS S3
# Site updates automatically at live URL
```

### Development Workflow
```bash
npm start                       # Local development server
# Make changes, test locally
npm run build                   # Build when ready
.\deploy-aws-manual.bat        # Deploy to production
```

## 🛠️ Available Scripts

```bash
# Development
npm start                       # Dev server (localhost:4200)
npm run start:full             # Full stack with backend/database

# Production
npm run build                  # Production build
.\deploy-aws-manual.bat       # Deploy to AWS (current method)
.\deploy-terraform.bat        # Future: Full infrastructure deployment

# Testing & Quality
npm test                      # Unit tests
npm run test:e2e             # End-to-end tests
npm run lint                 # Code quality checks

# Database Management
npm run db:start             # Start DynamoDB Local
npm run db:stop              # Stop database
npm run db:status            # Check database status

# Troubleshooting
npm run troubleshoot         # Run diagnostic checks
npm run check:ports          # Verify available ports
```

## 🎯 Key Features Working

### ✅ Flash Experiments
- 56+ interactive animation presets
- Canvas-based graphics rendering
- Real-time parameter adjustments
- Responsive design for mobile/desktop

### ✅ Timeline Visualization  
- Interactive maps with Leaflet integration
- Chronological data presentation
- Zoom and pan functionality
- Location-based event markers

### ✅ Conversation History
- Chat interface for user interactions
- Message persistence (local development)
- Real-time conversation tracking
- Export/import capabilities

## 🔧 Configuration Files

**Environment Configuration:**
- `.env.production` - Production AWS settings
- `aws-deploy.json` - Deployment configuration
- `terraform/terraform.tfvars` - Infrastructure variables

**Build Configuration:**
- `angular.json` - Angular build settings
- `tsconfig.json` - TypeScript configuration
- `package.json` - Dependencies and scripts

## 🚨 Troubleshooting

### Site Not Loading
```bash
# Check AWS deployment
aws s3 ls s3://jouster-org-static --region us-east-1

# Redeploy if needed
.\deploy-aws-manual.bat
```

### Local Development Issues
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Reset database
npm run db:stop
npm run db:start
```

### Build Problems
```bash
# Clear build cache
npm run clean  # or manually delete dist/
npm run build
```

## 📈 Performance Metrics

**Current Performance:**
- Initial Bundle: 96.75 kB compressed (excellent)
- Time to Interactive: < 2 seconds
- Lighthouse Score: 90+ (Performance, Accessibility)
- Browser Compatibility: Modern browsers (ES2020+)

**Optimization Applied:**
- Tree shaking and dead code elimination
- Lazy loading for route-based code splitting
- Optimized asset compression
- Proper cache headers (1 day HTML, 1 year assets)

## 🎉 Next Steps

1. **Immediate**: Enjoy your live site at the AWS endpoint
2. **Short-term**: Consider installing Terraform for enhanced infrastructure
3. **Medium-term**: Set up custom domain (jouster.org) with CloudFront CDN
4. **Long-term**: Implement CI/CD pipeline for automated deployments

## 📞 Support

- **Live Site Issues**: Check `docs/DEPLOYMENT.md` troubleshooting section
- **Development Help**: See main `README.md` for detailed guides
- **AWS Configuration**: Reference `aws-deploy.json` and deployment scripts

---

**🌟 Congratulations!** Your Jouster platform is successfully deployed and ready for users to explore the interactive Flash experiments and features you've built.
