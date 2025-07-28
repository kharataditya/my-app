/**
 * Deployment Helper Script
 * 
 * This script helps prepare the application for deployment to Vercel.
 * It checks for required environment variables and creates necessary files.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n=== Couple Chat Deployment Helper ===\n');

// Check if vercel.json exists
if (!fs.existsSync(path.join(__dirname, 'vercel.json'))) {
  console.log('❌ vercel.json not found. Creating it...');
  
  const vercelConfig = {
    "version": 2,
    "builds": [
      {
        "src": "server.js",
        "use": "@vercel/node"
      }
    ],
    "routes": [
      {
        "src": "/api/(.*)",
        "dest": "server.js"
      },
      {
        "src": "/(.*)",
        "dest": "/client/build/$1"
      }
    ]
  };
  
  fs.writeFileSync(
    path.join(__dirname, 'vercel.json'),
    JSON.stringify(vercelConfig, null, 2)
  );
  
  console.log('✅ vercel.json created successfully.');
} else {
  console.log('✅ vercel.json already exists.');
}

// Check if .env file exists and has required variables
const checkEnvFile = () => {
  const envPath = path.join(__dirname, '.env');
  
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found. Creating it...');
    fs.writeFileSync(envPath, 'PORT=5000\nNODE_ENV=development\nJWT_SECRET=your_jwt_secret_key_change_this_in_production\n# MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority');
    console.log('✅ .env file created successfully.');
  } else {
    console.log('✅ .env file already exists.');
  }
  
  // Check for required variables
  const envContent = fs.readFileSync(envPath, 'utf8');
  const missingVars = [];
  
  if (!envContent.includes('MONGO_URI=')) missingVars.push('MONGO_URI');
  if (!envContent.includes('JWT_SECRET=')) missingVars.push('JWT_SECRET');
  if (!envContent.includes('NODE_ENV=')) missingVars.push('NODE_ENV');
  
  if (missingVars.length > 0) {
    console.log(`⚠️ Warning: The following environment variables are missing in your .env file: ${missingVars.join(', ')}`);
    console.log('Please add them before deploying to Vercel.');
  }
};

checkEnvFile();

// Check if server.js exports the app
const checkServerExport = () => {
  const serverPath = path.join(__dirname, 'server.js');
  const serverContent = fs.readFileSync(serverPath, 'utf8');
  
  if (!serverContent.includes('module.exports = app')) {
    console.log('❌ server.js does not export the app. Adding export statement...');
    
    fs.appendFileSync(serverPath, '\n// Export for Vercel deployment\nmodule.exports = app;');
    console.log('✅ Export statement added to server.js.');
  } else {
    console.log('✅ server.js already exports the app.');
  }
};

checkServerExport();

// Check if package.json has required scripts
const checkPackageJson = () => {
  const packagePath = path.join(__dirname, 'package.json');
  const packageJson = require(packagePath);
  
  let modified = false;
  
  if (!packageJson.scripts.build) {
    packageJson.scripts.build = 'cd client && npm install && npm run build';
    modified = true;
  }
  
  if (!packageJson.scripts['vercel-build']) {
    packageJson.scripts['vercel-build'] = 'npm run build';
    modified = true;
  }
  
  if (modified) {
    console.log('❌ Required scripts missing in package.json. Adding them...');
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    console.log('✅ Scripts added to package.json.');
  } else {
    console.log('✅ package.json has all required scripts.');
  }
};

checkPackageJson();

// Provide deployment instructions
console.log('\n=== Deployment Instructions ===\n');
console.log('1. Create a MongoDB Atlas account and get your connection string');
console.log('2. Update your .env file with the MongoDB Atlas connection string');
console.log('3. Push your code to GitHub');
console.log('4. Create a Vercel account and link it to your GitHub account');
console.log('5. Import your GitHub repository in Vercel');
console.log('6. Add the following environment variables in Vercel:');
console.log('   - MONGO_URI: Your MongoDB Atlas connection string');
console.log('   - JWT_SECRET: A secure random string for JWT token generation');
console.log('   - NODE_ENV: Set to "production"');
console.log('7. Deploy your application');

console.log('\nFor detailed instructions, please refer to the DEPLOYMENT_GUIDE.md file.');

rl.question('\nDo you want to run the build script now? (y/n) ', (answer) => {
  if (answer.toLowerCase() === 'y') {
    console.log('\nRunning build script...');
    console.log('This will install dependencies and build the client application.');
    console.log('Please wait, this may take a few minutes...');
    
    const { execSync } = require('child_process');
    
    try {
      execSync('npm run build', { stdio: 'inherit' });
      console.log('\n✅ Build completed successfully.');
    } catch (error) {
      console.error('\n❌ Build failed:', error.message);
    }
  }
  
  rl.close();
});