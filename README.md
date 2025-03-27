Letter App Backend

This is the backend server for the Letter App, a Node.js application built with Express.js that provides authentication via Google OAuth and integrates with Google Drive and Google Docs APIs to create, save, and manage text documents.
Features

    Authentication: Google OAuth 2.0 for user login.
    Google Drive Integration: Create and save text files as Google Docs in a specified Drive folder.
    API Endpoints: RESTful endpoints for saving text, retrieving file content, and managing user sessions.
    Security: Session management with cookies and environment variable configuration.

Tech Stack

    Node.js: Runtime environment.
    Express.js: Web framework for API routing.
    Passport.js: Authentication middleware for Google OAuth.
    Google APIs: Integration with Drive and Docs APIs.
    ES6 Modules: Modern JavaScript syntax with import statements.

Prerequisites

    Node.js (v16 or higher recommended)
    npm (Node Package Manager)
    Google Cloud Project with Drive and Docs APIs enabled
    Service account credentials (credential1.json)
    GitHub repository set up (optional)

Installation

    Clone the Repository:
    bash

git clone https://github.com/vijay-singh-coder/server.git
cd server
Install Dependencies:
bash
npm install
Set Up Environment Variables: Create a .env file in the root directory and add the following:
env
PORT=8000
SESSION_SECRET=your-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_DRIVE_FOLDER_ID=your-drive-folder-id
SERVICE_ACCOUNT_EMAIL=your-service-account-email

    Replace values with your own (see for details).

Add Google Service Account Credentials:

    Place your credential1.json file in the project root.
    Ensure it’s listed in .gitignore to prevent committing sensitive data:
    bash

    echo "credential1.json" >> .gitignore

Run the Server:
bash
node index.js
The server will start at http://localhost:8000.
