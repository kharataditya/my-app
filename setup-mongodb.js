/**
 * MongoDB Atlas Setup Helper
 * 
 * This script helps with setting up MongoDB Atlas connection for the Couple Chat application.
 * It guides the user through the process of creating a MongoDB Atlas account, cluster, and database user.
 * It then updates the .env file with the MongoDB Atlas connection string.
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n=== MongoDB Atlas Setup Helper ===\n');
console.log('This script will help you set up MongoDB Atlas for your Couple Chat application.');
console.log('Please follow the instructions carefully.\n');

// Step 1: Check if the user has a MongoDB Atlas account
console.log('Step 1: MongoDB Atlas Account');
console.log('Do you have a MongoDB Atlas account?');
console.log('If not, please create one at https://www.mongodb.com/cloud/atlas');

rl.question('Press Enter when you have a MongoDB Atlas account...', () => {
  // Step 2: Create a cluster
  console.log('\nStep 2: Create a Cluster');
  console.log('1. Log in to your MongoDB Atlas account');
  console.log('2. Click on "Build a Cluster"');
  console.log('3. Select the free tier (M0)');
  console.log('4. Choose your preferred cloud provider and region');
  console.log('5. Click "Create Cluster" (this may take a few minutes)');
  
  rl.question('Press Enter when your cluster is created...', () => {
    // Step 3: Create a database user
    console.log('\nStep 3: Create a Database User');
    console.log('1. In the left sidebar, click on "Database Access" under Security');
    console.log('2. Click "Add New Database User"');
    console.log('3. Create a username and password (use a strong password and save it securely)');
    console.log('4. Set privileges to "Read and Write to Any Database"');
    console.log('5. Click "Add User"');
    
    rl.question('Enter the username you created: ', (username) => {
      rl.question('Enter the password you created (it will be used in the connection string): ', (password) => {
        // Step 4: Configure network access
        console.log('\nStep 4: Configure Network Access');
        console.log('1. In the left sidebar, click on "Network Access" under Security');
        console.log('2. Click "Add IP Address"');
        console.log('3. For development, you can allow access from anywhere by clicking "Allow Access From Anywhere" (0.0.0.0/0)');
        console.log('4. For production, consider adding only specific IP addresses');
        console.log('5. Click "Confirm"');
        
        rl.question('Press Enter when you have configured network access...', () => {
          // Step 5: Get the connection string
          console.log('\nStep 5: Get the Connection String');
          console.log('1. Once your cluster is created, click on "Connect"');
          console.log('2. Select "Connect your application"');
          console.log('3. Copy the connection string');
          
          rl.question('Enter your cluster name (e.g., cluster0): ', (clusterName) => {
            rl.question('Enter your database name (or press Enter to use "couple-chat"): ', (dbName) => {
              dbName = dbName || 'couple-chat';
              
              // Construct the connection string
              const connectionString = `mongodb+srv://${username}:${password}@${clusterName}.mongodb.net/${dbName}?retryWrites=true&w=majority`;
              
              // Update the .env file
              const envPath = path.join(__dirname, '.env');
              let envContent = '';
              
              if (fs.existsSync(envPath)) {
                envContent = fs.readFileSync(envPath, 'utf8');
                
                // Replace the MONGO_URI line if it exists
                if (envContent.includes('MONGO_URI=')) {
                  envContent = envContent.replace(/MONGO_URI=.*/, `MONGO_URI=${connectionString}`);
                } else {
                  envContent += `\nMONGO_URI=${connectionString}`;
                }
              } else {
                envContent = `PORT=5000\nNODE_ENV=development\nJWT_SECRET=your_jwt_secret_key_change_this_in_production\nMONGO_URI=${connectionString}`;
              }
              
              fs.writeFileSync(envPath, envContent);
              
              console.log('\n✅ MongoDB Atlas connection string has been added to your .env file.');
              console.log('\nYou can now deploy your application to Vercel.');
              console.log('For detailed instructions, please refer to the DEPLOYMENT_GUIDE.md file.');
              
              rl.close();
            });
          });
        });
      });
    });
  });
});