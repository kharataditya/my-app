# Deployment Guide for Couple Chat Application

This guide provides detailed instructions for deploying the Couple Chat application to Vercel with MongoDB Atlas as the database.

## Prerequisites

1. [GitHub](https://github.com/) account
2. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account
3. [Vercel](https://vercel.com/) account

## Step 1: Set Up MongoDB Atlas

1. **Create a MongoDB Atlas Account**:
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign up for a free account if you don't have one.

2. **Create a New Cluster**:
   - Click on "Build a Cluster" and select the free tier (M0).
   - Choose your preferred cloud provider and region (closest to your target users).
   - Click "Create Cluster" (this may take a few minutes).

3. **Set Up Database Access**:
   - In the left sidebar, click on "Database Access" under Security.
   - Click "Add New Database User".
   - Create a username and password (use a strong password and save it securely).
   - Set privileges to "Read and Write to Any Database".
   - Click "Add User".

4. **Configure Network Access**:
   - In the left sidebar, click on "Network Access" under Security.
   - Click "Add IP Address".
   - For development, you can allow access from anywhere by clicking "Allow Access From Anywhere" (0.0.0.0/0).
   - For production, consider adding only specific IP addresses.
   - Click "Confirm".

5. **Get Your Connection String**:
   - Once your cluster is created, click on "Connect".
   - Select "Connect your application".
   - Copy the connection string.
   - Replace `<password>` with your database user's password and `<dbname>` with "couple-chat".

## Step 2: Push Your Code to GitHub

1. **Create a New Repository on GitHub**:
   - Go to [GitHub](https://github.com/) and create a new repository.

2. **Initialize Git in Your Project** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

3. **Add GitHub Repository as Remote and Push**:
   ```bash
   git remote add origin https://github.com/yourusername/your-repo-name.git
   git branch -M main
   git push -u origin main
   ```

## Step 3: Deploy to Vercel

1. **Sign Up for Vercel**:
   - Go to [Vercel](https://vercel.com/) and sign up for an account if you don't have one.
   - You can sign up with your GitHub account for easier integration.

2. **Import Your GitHub Repository**:
   - Click on "New Project".
   - Select your GitHub repository from the list.
   - If you don't see it, you may need to configure Vercel to access your GitHub repositories.

3. **Configure Project Settings**:
   - Project Name: Choose a name for your project.
   - Framework Preset: Select "Other".
   - Root Directory: Leave as default (if your project is at the root of the repository).
   - Build Command: `npm run vercel-build`
   - Output Directory: Leave empty.
   - Install Command: `npm install`
   - Development Command: `npm run dev`
   
   **Note**: The updated `vercel.json` file uses Vercel's new configuration format with a single build command that builds both the backend and frontend. The build process is managed by custom build scripts (`vercel-build.js` in the root directory and client directory) that handle the installation of dependencies and building of both parts of the application.

4. **Add Environment Variables**:
   - Click on "Environment Variables" section.
   - Add the following variables:
     - `MONGO_URI`: Your MongoDB Atlas connection string
     - `JWT_SECRET`: A secure random string for JWT token generation
     - `NODE_ENV`: Set to `production`
     - `PORT`: Set to `5000` (though Vercel will override this)

5. **Deploy**:
   - Click on "Deploy".
   - Wait for the deployment to complete.

## Step 4: Verify Deployment

1. **Check Deployment Status**:
   - Once deployment is complete, Vercel will provide you with a URL.
   - Click on the URL to open your deployed application.

2. **Test the Application**:
   - Try logging in with your name and your partner's name.
   - Send a few messages to ensure everything is working correctly.

## Troubleshooting

### WebSocket Connection Issues

Vercel's free tier has limitations for WebSocket connections. If you experience disconnections:

1. **Check Vercel Logs**:
   - Go to your project on Vercel.
   - Click on "Deployments" and then on your latest deployment.
   - Click on "Functions" to see logs for your serverless functions.

2. **Consider Alternative Hosting**:
   - For production use with heavy WebSocket traffic, consider using a different hosting provider that better supports WebSockets, such as Render or Heroku.

### MongoDB Connection Issues

1. **Check Network Access**:
   - Ensure that your MongoDB Atlas cluster allows connections from Vercel's IP addresses.
   - Consider allowing access from anywhere (0.0.0.0/0) for testing.

2. **Verify Connection String**:
   - Double-check that your connection string is correct and properly formatted.
   - Ensure that you've replaced `<password>` and `<dbname>` with the correct values.

## Updating Your Deployment

When you make changes to your code:

1. **Push Changes to GitHub**:
   ```bash
   git add .
   git commit -m "Your commit message"
   git push
   ```

2. **Automatic Deployment**:
   - Vercel will automatically detect the changes and redeploy your application.
   - You can monitor the deployment status on your Vercel dashboard.

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Socket.IO with Vercel](https://vercel.com/guides/using-socket-io-with-vercel)

## Important Notes

- The free tier of Vercel has limitations for WebSocket connections, which may affect the real-time functionality of the chat application.
- For production use with heavy traffic, consider upgrading to a paid plan or using a different hosting provider that better supports WebSockets.
- MongoDB Atlas free tier (M0) has limitations on storage (512MB) and connections. For production use with many users, consider upgrading to a paid tier.