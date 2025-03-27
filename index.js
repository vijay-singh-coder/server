import dotenv from "dotenv";
import express from "express";
import session from "express-session";
import passport from "passport";
dotenv.config();
import cors from "cors";
import "./utils/passport.js";
import cookieParser from "cookie-parser";
import fs from "fs";
import { google } from "googleapis";

// intialize app and define the server port
const app = express();
const port = process.env.PORT || 8000;
app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}));

app.use(express.json());

app.use(cookieParser()); // parse cookies

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: "lax",
    }
}));

// initialize passport and session
app.use(passport.initialize());
app.use(passport.session());

const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ message: "Unauthorized! Please log in." });
};

// a view to check if the server is running properly
app.get("/", (req, res) => {
    res.send("<a href='/auth/google'>Login with Google</a>");
});

app.get("/auth/google",
    passport.authenticate("google",
        {
            scope: ["profile", "email"],
            prompt: "select_account",
        }
    ));

app.get("/auth/user", (req, res) => {
    if (req.isAuthenticated()) {
        res.json(req.user); // Send user data if logged in
    } else {
        res.status(401).json(
            { message: "Not authenticated" }
        );
    }
});

app.get("/profile", isAuthenticated, (req, res) => {
    if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    res.json({
        name: req.user.displayName,
        message: `Welcome, ${req.user.displayName}`,
    });
});


app.get("/auth/google/callback",
    passport.authenticate("google",
        {
            failureRedirect: "http://localhost:3000/login"
        }), (req, res) => {
            res.redirect("http://localhost:3000/letter");
        }
);

app.post("/auth/login", (req, res) => {
    if (req.isAuthenticated()) {
        return res.json({ success: true, user: req.user });
    }
    res.status(401).json({ success: false, message: "User not authenticated" });
});

app.get("/auth/logout", (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ message: "Logout failed" });
        }

        // Destroy session
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ message: "Failed to destroy session" });
            }

            // Clear cookie from browser
            res.clearCookie("connect.sid", {
                path: "/",
                httpOnly: true,
                sameSite: "lax",
                secure: false, // Set true if using HTTPS
            });

            res.json({ message: "Logged out successfully" });
        });
    });
});


app.get("/drive/files", async (req, res) => {
    try {
        const response = await drive.files.list({
            q: `'${"1GohfrXXyP3UDHgQ3YqfDAPYpNRps_M_V"}' in parents and trashed = false`, // Query files in the folder
            fields: "files(id, name, mimeType, webViewLink, webContentLink)", // Select fields to return
        });

        res.json({ files: response.data.files }); // Send the file list as JSON
    } catch (error) {
        console.error("Error fetching files:", error);
        res.status(500).json({ message: "Failed to fetch files", error: error.message });
    }
});

app.get("/drive/file-content/:fileId", async (req, res) => {
    try {
        const { fileId } = req.params;

        // Get file metadata to check if it's a Google Docs file
        const fileMetadata = await drive.files.get({
            fileId: fileId,
            fields: "mimeType",
        });

        const mimeType = fileMetadata.data.mimeType;

        if (mimeType === "application/vnd.google-apps.document") {
            // Export Google Docs as Plain Text
            const response = await drive.files.export(
                {
                    fileId: fileId,
                    mimeType: "text/plain",
                },
                { responseType: "text" }
            );

            res.setHeader("Content-Type", "text/plain"); // Ensure correct response type
            res.send(response.data);
        } else {
            // Fetch normal text files directly
            const response = await drive.files.get(
                {
                    fileId: fileId,
                    alt: "media",
                },
                { responseType: "text" }
            );

            res.setHeader("Content-Type", "text/plain");
            res.send(response.data);
        }
    } catch (error) {
        console.error("Error fetching file content:", error);
        res.status(500).json({ message: "Failed to fetch file content", error: error.message });
    }
});




// Authentication for Google APIs
const auth = new google.auth.GoogleAuth({
    keyFile: "credential1.json", // Ensure the path is correct
    scopes: [
        "https://www.googleapis.com/auth/documents",
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/drive"
    ],
});

// Initialize Google Drive and Docs API clients
const drive = google.drive({ version: "v3", auth });
const docs = google.docs({ version: "v1", auth });

const FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID


app.post("/save-text", isAuthenticated, async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ message: "Text is required" });
        }

        const fileMetadata = {
            name: `Document_${Date.now()}`,
            mimeType: "application/vnd.google-apps.document",
            parents: [FOLDER_ID],
        };

        const response = await drive.files.create({
            resource: fileMetadata,
            fields: "id",
        });

        const fileId = response.data.id;
        
        await drive.permissions.create({
            fileId,
            requestBody: {
                role: "writer",
                type: "user",
                emailAddress: "your-service-account@your-project.iam.gserviceaccount.com",
            },
        });

        await docs.documents.batchUpdate({
            documentId: fileId,
            requestBody: {
                requests: [
                    {
                        insertText: {
                            location: { index: 1 },
                            text: text,
                        },
                    },
                ],
            },
        });

        res.json({
            message: "File uploaded as Google Docs",
            fileId: fileId,
            fileUrl: `https://docs.google.com/document/d/${fileId}`,
        });
    } catch (error) {
        console.error("Error saving file:", error);
        res.status(500).json({ message: "Failed to upload to Google Docs", error: error.message });
    }
});

app.put('/drive/update-file/:fileId', isAuthenticated, async (req, res) => {
    try {
        const { fileId } = req.params;
        const { text } = req.body;

        if (!fileId || !text) {
            return res.status(400).json({ message: 'File ID and text are required' });
        }

        const doc = await docs.documents.get({
            documentId: fileId,
            fields: 'body/content',
        });

        // Calculate the end index of the existing content
        let contentLength = 1; // Default to 1 if empty
        if (doc.data.body.content) {
            contentLength = doc.data.body.content.reduce((max, element) => {
                if (element.endIndex) {
                    return Math.max(max, element.endIndex - 1);
                }
                return max;
            }, 1);
        }

        const requests = [];

        if (contentLength > 1) {
            requests.push({
                deleteContentRange: {
                    range: {
                        startIndex: 1,
                        endIndex: contentLength,
                    },
                },
            });
        }

        requests.push({
            insertText: {
                location: { index: 1 },
                text: text,
            },
        });

        await docs.documents.batchUpdate({
            documentId: fileId,
            requestBody: {
                requests,
            },
        });

        res.json({
            message: 'File updated successfully',
            fileId: fileId,
            fileUrl: `https://docs.google.com/document/d/${fileId}`,
        });
    } catch (error) {
        console.error('Error updating Google Docs file:', error.response?.data || error);
        res.status(500).json({ message: 'Failed to update Google Docs file', error: error.message });
    }
});
app.listen(port, () => {
    console.log(`Server is running at port ${port}`);
});