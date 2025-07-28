# Couple Chat

A private chat application designed exclusively for long-distance couples. This application provides a secure and intimate space for you and your partner to communicate in real-time.

## Features

- **Private Messaging**: Real-time messaging between you and your partner
- **Message Persistence**: Messages are stored in a database and loaded when you log in
- **WhatsApp-Style Chat**: Your messages appear on the right side with your avatar, and your partner's messages appear on the left side with their avatar
- **Typing Indicators**: See when your partner is typing
- **Online Status**: Know when your partner is online
- **Responsive Design**: Works on both desktop and mobile devices
- **Dark Theme**: Easy on the eyes, especially during night conversations

## Tech Stack

- **Frontend**: React, Material-UI, Socket.io-client
- **Backend**: Node.js, Express, Socket.io
- **Database**: MongoDB with Mongoose

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository or download the files

2. Install server dependencies
   ```
   npm install
   ```

3. Install client dependencies
   ```
   cd client
   npm install
   ```

### Running the Application

1. Start the server (from the root directory)
   ```
   npm start
   ```

2. In a new terminal, start the client
   ```
   cd client
   npm start
   ```

3. Open your browser and navigate to `http://localhost:3000`

## How to Use

1. **Login**: Enter your name and your partner's name
2. **Chat**: Start sending messages to your partner
3. **Logout**: Click the logout button when you're done

## Notes

- This application is designed for just two users
- Messages are stored in MongoDB and will persist between sessions
- If MongoDB is not available, the application will fall back to in-memory storage

## Future Enhancements

- Image and file sharing
- Video calling
- Message reactions
- Message read receipts
- Custom themes
- End-to-end encryption

## Deployment Guide

### Prerequisites
1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) account
2. [Vercel](https://vercel.com/) account
3. [GitHub](https://github.com/) account

### MongoDB Atlas Setup
1. Create a free MongoDB Atlas account
2. Create a new cluster (M0 free tier is sufficient)
3. Create a database user with read/write permissions
4. Whitelist all IP addresses (0.0.0.0/0) for development or specific IPs for production
5. Get your MongoDB connection string

### Vercel Deployment

#### Full Stack Deployment
1. Push your code to a GitHub repository
2. Log in to Vercel and create a new project
3. Import your GitHub repository
4. Configure the project:
   - Build Command: `npm run vercel-build`
   - Output Directory: Leave empty
   - Install Command: `npm install`
   - Development Command: `npm run dev`
5. Add environment variables:
   - `MONGO_URI`: Your MongoDB Atlas connection string
   - `JWT_SECRET`: A secure random string for JWT token generation
   - `NODE_ENV`: Set to `production`
6. Deploy the project

**Note**: The project is configured to build both the backend and frontend automatically using custom build scripts. The `vercel.json` file uses Vercel's new configuration format with a single build command and rewrites for routing API requests to the backend and serving the frontend static files.

#### Important Notes
- Vercel's free tier has limitations for WebSocket connections. The chat application may experience disconnections after periods of inactivity.
- For production use with heavy traffic, consider upgrading to a paid plan or using a different hosting provider that better supports WebSockets.

## License

This project is licensed under the MIT License