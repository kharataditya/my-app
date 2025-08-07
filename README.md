# Couple Chat

A private chat application designed exclusively for long-distance couples. This application provides a secure and intimate space for you and your partner to communicate in real-time.

## Features

- **Private Messaging**: Real-time messaging between you and your partner
- **Message Persistence**: Messages are stored in a database and loaded when you log in
- **WhatsApp-Style Chat**: Your messages appear on the right side with your avatar, and your partner's messages appear on the left side with their avatar
- **Typing Indicators**: See when your partner is typing
- **Online Status**: Know when your partner is online
- **Read Receipts**: See when your messages have been read
- **Responsive Design**: Works on both desktop and mobile devices
- **Dark Theme**: Easy on the eyes, especially during night conversations
- **Glassmorphism UI**: Modern, sleek interface with glass-like effects

## Tech Stack

### Current Version
- **Frontend**: React, Material-UI
- **Backend**: Supabase (PostgreSQL, Realtime)
- **Hosting**: Netlify

### Legacy Version
- **Frontend**: React, Material-UI, Socket.io-client
- **Backend**: Node.js, Express, Socket.io
- **Database**: MongoDB with Mongoose

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Supabase account (for the current version)

### Installation

1. Clone the repository or download the files

2. Install client dependencies
   ```
   cd client
   npm install
   ```

### Running the Application

#### Current Version (Supabase)

1. Start the client
   ```
   cd client
   npm start
   ```

2. Open your browser and navigate to `http://localhost:3000`

#### Legacy Version (MongoDB + Socket.io)

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
- Messages are stored in Supabase PostgreSQL database and will persist between sessions
- The application uses Supabase Realtime for live updates and presence tracking

## Future Enhancements

- Image and file sharing
- Video calling
- Message reactions
- Message read receipts
- Custom themes
- End-to-end encryption

## Deployment Guide

### Prerequisites
1. [Supabase](https://supabase.com/) account
2. [Netlify](https://www.netlify.com/) account
3. [GitHub](https://github.com/) account

### Supabase Setup
1. Create a free Supabase account
2. Create a new project
3. Run the SQL commands in `supabase_schema.sql` in the Supabase SQL editor to set up the database schema
4. Get your Supabase URL and anon key from the API settings

### Netlify Deployment

1. Push your code to a GitHub repository
2. Log in to Netlify and create a new project
3. Import your GitHub repository
4. Configure the project:
   - Build Command: `cd client && npm install && npm run build`
   - Publish Directory: `client/build`
5. Add environment variables in Netlify:
   - `REACT_APP_SUPABASE_URL`: Your Supabase URL
   - `REACT_APP_SUPABASE_ANON_KEY`: Your Supabase anon key
6. Deploy the site

Alternatively, you can use the Netlify CLI:
```bash
npx netlify deploy --prod
```
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