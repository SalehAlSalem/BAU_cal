# Deployment Guide for Vercel

## Steps

### 1. Install Vercel CLI (if not installed)
```bash
npm install -g vercel
```

### 2. Login
```bash
vercel login
```

### 3. Deploy
From the project directory:
```bash
vercel --prod
```

### 4. Configure Environment Variable
After deployment, add the environment variable:

1. Open Vercel Dashboard: https://vercel.com/dashboard
2. Select your project
3. Go to Settings > Environment Variables
4. Add:
   - Name: `SOURCE_URL`
   - Value: URL of the university calendar page
   - Environment: Production, Preview, Development

### 5. Redeploy
After adding the variable, redeploy:
```bash
vercel --prod
```

## Verify Deployment

After deployment, check these URLs:
- Landing page: `https://your-domain.vercel.app`
- Students calendar: `https://your-domain.vercel.app/calendar-students.ics`
- Full calendar: `https://your-domain.vercel.app/calendar-full.ics`

## Tips

- You can connect a custom domain from Vercel settings
- Vercel supports automatic deployments from GitHub
- Check logs in Vercel Dashboard if you encounter issues
