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

## License

This project is licensed under the MIT License