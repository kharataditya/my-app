/**
 * Vercel Build Script
 * 
 * This script is executed during the Vercel build process.
 * It ensures that both the server and client are properly built.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting Vercel build process...');

// Check if we're in a Vercel environment
const isVercel = process.env.VERCEL === '1';

console.log(`Build environment: ${isVercel ? 'Vercel' : 'Local'}`);

// Install server dependencies
console.log('\nInstalling server dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('Server dependencies installed successfully.');
} catch (error) {
  console.error('Failed to install server dependencies:', error.message);
  process.exit(1);
}

// Check if client directory exists
if (fs.existsSync(path.join(__dirname, 'client'))) {
  console.log('\nClient directory found. Installing client dependencies...');
  
  try {
    // Use cross-platform path.join for directory navigation
    const clientDir = path.join(__dirname, 'client');
    execSync('npm install', { stdio: 'inherit', cwd: clientDir });
    console.log('Client dependencies installed successfully.');
  } catch (error) {
    console.error('Failed to install client dependencies:', error.message);
    process.exit(1);
  }
  
  console.log('\nBuilding client application...');
  try {
    const clientDir = path.join(__dirname, 'client');
    execSync('npm run vercel-build', { stdio: 'inherit', cwd: clientDir });
    console.log('Client built successfully.');
  } catch (error) {
    console.error('Failed to build client:', error.message);
    process.exit(1);
  }
} else {
  console.log('\nClient directory not found. Skipping client build.');
}

console.log('\nVercel build process completed successfully!');