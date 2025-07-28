/**
 * Client Vercel Build Script
 * 
 * This script is executed during the Vercel build process for the client.
 * It ensures that the React application is properly built.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting Client Vercel build process...');

// Check if we're in a Vercel environment
const isVercel = process.env.VERCEL === '1';

console.log(`Build environment: ${isVercel ? 'Vercel' : 'Local'}`);
console.log(`Current directory: ${__dirname}`);
console.log(`Node version: ${process.version}`);
console.log(`NPM version: ${execSync('npm --version').toString().trim()}`);

// List files in current directory
console.log('\nFiles in current directory:');
const files = fs.readdirSync(__dirname);
files.forEach(file => {
  console.log(`- ${file}`);
});

// Check if package.json exists
if (fs.existsSync(path.join(__dirname, 'package.json'))) {
  console.log('\npackage.json found. Checking contents...');
  const packageJson = require('./package.json');
  console.log(`- Name: ${packageJson.name}`);
  console.log(`- Version: ${packageJson.version}`);
  console.log(`- Dependencies: ${Object.keys(packageJson.dependencies).length}`);
  console.log(`- Scripts: ${Object.keys(packageJson.scripts).join(', ')}`);
} else {
  console.error('package.json not found!');
  process.exit(1);
}

// Install dependencies
console.log('\nInstalling client dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('Client dependencies installed successfully.');
} catch (error) {
  console.error('Failed to install client dependencies:', error.message);
  process.exit(1);
}

// Check if node_modules exists after installation
if (fs.existsSync(path.join(__dirname, 'node_modules'))) {
  console.log('node_modules directory exists.');
  console.log('Checking for react-scripts in node_modules...');
  
  if (fs.existsSync(path.join(__dirname, 'node_modules', 'react-scripts'))) {
    console.log('react-scripts found in node_modules.');
    
    // Check react-scripts bin directory
    const binPath = path.join(__dirname, 'node_modules', 'react-scripts', 'bin');
    if (fs.existsSync(binPath)) {
      console.log('react-scripts bin directory exists. Contents:');
      const binFiles = fs.readdirSync(binPath);
      binFiles.forEach(file => {
        console.log(`- ${file}`);
      });
    } else {
      console.error('react-scripts bin directory not found!');
    }
  } else {
    console.error('react-scripts not found in node_modules!');
  }
} else {
  console.error('node_modules directory not found after npm install!');
}

// Build the React application
console.log('\nBuilding client application...');
try {
  // Use npx to ensure we're using the local react-scripts
  execSync('npx react-scripts build', { stdio: 'inherit' });
  console.log('Client built successfully.');
} catch (error) {
  console.error('Failed to build client:', error.message);
  process.exit(1);
}

// Check if build directory was created
if (fs.existsSync(path.join(__dirname, 'build'))) {
  console.log('\nbuild directory created. Contents:');
  const buildFiles = fs.readdirSync(path.join(__dirname, 'build'));
  buildFiles.forEach(file => {
    console.log(`- ${file}`);
  });
} else {
  console.error('build directory not created!');
  process.exit(1);
}

console.log('\nClient Vercel build process completed successfully!');