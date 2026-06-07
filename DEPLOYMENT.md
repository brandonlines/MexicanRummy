# Deployment Guide - GitHub Pages

Deploy your Mexican Rummy Scoring app to GitHub Pages in 5 minutes.

## Prerequisites

- GitHub account
- Git installed locally
- Project working locally (`npm run dev` works)

## Step 1: Create GitHub Repository

### Option A: Command Line
```bash
# Initialize git repo
git init
git add .
git commit -m "Initial commit: Mexican Rummy Scoring App"

# Create repo on GitHub.com, then:
git remote add origin https://github.com/yourusername/mexican-rummy-scoring.git
git branch -M main
git push -u origin main
```

### Option B: GitHub Web Interface
1. Go to [github.com/new](https://github.com/new)
2. Name: `mexican-rummy-scoring`
3. Description: "Real-time Mexican Rummy scoring tracker"
4. Make it **Public** (for GitHub Pages)
5. Create repository
6. Follow the instructions to push your code

## Step 2: Configure GitHub Pages

1. Go to your repo on GitHub
2. Navigate to **Settings** → **Pages**
3. Under "Build and deployment":
   - Source: **GitHub Actions**
   - This will automatically use our workflow

## Step 3: Push Your Code

```bash
git add .
git commit -m "Configure GitHub Pages deployment"
git push origin main
```

GitHub Actions will automatically:
1. Run `npm install`
2. Run `npm run build`
3. Deploy to GitHub Pages

Watch progress in repo → **Actions** tab.

## Step 4: View Your Live App

Once the workflow completes (✅ green checkmark):

1. Go to **Settings** → **Pages**
2. Find your site URL (e.g., `https://yourusername.github.io/mexican-rummy-scoring`)
3. Click the link to visit your app!

**Your app is now live and shareable! 🎉**

## Environment Variables (Important!)

Your `.env` file contains secrets and should **NOT** be committed to GitHub.

### Safe Way to Deploy:

#### Option 1: Use GitHub Secrets (Recommended)
1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add `VITE_SUPABASE_URL` (your Supabase URL)
4. Click **New repository secret**
5. Add `VITE_SUPABASE_ANON_KEY` (your Supabase key)

Then update `.github/workflows/deploy.yml`:
```yaml
- name: Build
  run: npm run build
  env:
    VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
    VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
```

#### Option 2: Keep .env Local Only
- Don't commit `.env` (should be in `.gitignore` ✅)
- Users cloning your repo must create their own `.env`
- Good for open-source projects

### Check .gitignore
Verify `.env` is in `.gitignore`:
```bash
cat .gitignore | grep .env
# Should show: .env
```

If not, run:
```bash
echo ".env" >> .gitignore
git add .gitignore
git commit -m "Add .env to gitignore"
git push
```

## Custom Domain (Optional)

Want to use your own domain? (e.g., myrummyapp.com)

1. **Go to GitHub Settings → Pages**
2. Under "Custom domain", enter your domain
3. Add a DNS record pointing to GitHub's servers:
   - Type: `A` or `CNAME`
   - Value: `185.199.108.153` (or follow GitHub's instructions)
4. Wait for DNS to propagate (up to 48 hours)

[Detailed instructions](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)

## Sharing Your App

Once deployed, share the link:

```
Play Mexican Rummy Online! 🎲
https://yourusername.github.io/mexican-rummy-scoring

Create a game or join with a code.
Real-time multiplayer scoring for up to 8 players.
```

## Updating Your App

Push changes and they auto-deploy:
```bash
# Make changes to code
nano src/js/app.js

# Commit and push
git add .
git commit -m "Add new feature"
git push origin main
```

GitHub Actions runs automatically. Check the **Actions** tab to watch deployment progress.

## Troubleshooting

### Workflow Fails to Run
- Check repo has **Settings → Actions → Allow all actions**
- Make sure workflow file is in `.github/workflows/deploy.yml`
- Try manual trigger: **Actions → Deploy to GitHub Pages → Run workflow**

### App Shows Blank Page
- Check browser console (F12)
- Look for errors about Supabase credentials
- Verify `.env` variables are set (or GitHub Secrets)
- Check **Actions** tab for build errors

### Supabase Connection Fails
- Verify `VITE_SUPABASE_URL` is correct
- Verify `VITE_SUPABASE_ANON_KEY` is correct
- Check that Supabase project is active
- Verify database tables exist (go to Supabase dashboard)

### Domain Not Working
- Check DNS records are correct
- Wait up to 48 hours for DNS propagation
- Use DNS checker: [mxtoolbox.com](https://mxtoolbox.com)

## Security Checklist

- ✅ `.env` in `.gitignore` (NOT committed)
- ✅ Secrets stored in GitHub (NOT in code)
- ✅ Repository is public (GitHub Pages requirement)
- ✅ Supabase RLS policies configured
- ✅ No sensitive data in frontend code

## Monitoring Your Deployment

### GitHub Actions
- Visit **Actions** tab
- Green ✅ = deployed successfully
- Red ❌ = build failed, check logs

### Supabase Dashboard
- Monitor database usage
- Check free tier limits:
  - 500MB storage
  - 2 concurrent realtime subscriptions
  - 50K+ requests/day

### Google Analytics (Optional)
Add to `src/index.html`:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'YOUR_GA_ID');
</script>
```

## Next Steps

1. ✅ Test deployed app on phone
2. ✅ Share link with friends
3. ✅ Play some games!
4. ✅ Gather feedback
5. ✅ Open issues for improvements

## Support

- GitHub Issues for bugs
- GitHub Discussions for questions
- Supabase docs for database help
- WCAG docs for accessibility

---

**Congratulations! Your app is live! 🎉**

Share your game code with friends and start playing!
