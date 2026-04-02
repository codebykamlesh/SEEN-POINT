/**
 * OneDrive Service
 * -----------------
 * Microsoft Graph API integration for listing and streaming movies.
 */
const { Client } = require('@microsoft/microsoft-graph-client');
const msal = require('@azure/msal-node');
const { query } = require('../config/database');
const crypto = require('crypto');

const msalConfig = {
    auth: {
        clientId: process.env.ONEDRIVE_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${process.env.ONEDRIVE_TENANT_ID || 'common'}`,
        clientSecret: process.env.ONEDRIVE_CLIENT_SECRET,
    }
};

const tokenCache = {
    accessToken: null,
    expiresAt: null
};

// Only initialize if we have the config
let pca;
if (process.env.ONEDRIVE_CLIENT_ID && process.env.ONEDRIVE_CLIENT_SECRET) {
    pca = new msal.ConfidentialClientApplication(msalConfig);
}

/**
 * Get the Microsoft OAuth2 login URL
 */
const getAuthUrl = async () => {
    if (!pca) throw new Error('OneDrive credentials not configured');
    
    const maxAge = 3600; // State valid for 1 hour
    const token = crypto.randomBytes(32).toString('hex');
    const authCodeUrlParameters = {
        scopes: ['Files.ReadWrite.All', 'offline_access'],
        redirectUri: process.env.ONEDRIVE_REDIRECT_URI,
        state: token
    };

    const url = await pca.getAuthCodeUrl(authCodeUrlParameters);
    return url;
};

/**
 * Handle the OAuth2 callback from Microsoft
 */
const handleCallback = async (code) => {
    if (!pca) throw new Error('OneDrive credentials not configured');

    const tokenRequest = {
        code,
        scopes: ['Files.ReadWrite.All'],
        redirectUri: process.env.ONEDRIVE_REDIRECT_URI,
    };

    const response = await pca.acquireTokenByCode(tokenRequest);
    
    // Store token in database
    await query(`
        INSERT INTO onedrive_settings (id, access_token, refresh_token, expires_at)
        VALUES (uuid_generate_v4(), $1, $2, $3)
        ON CONFLICT DO NOTHING
    `, [response.accessToken, response.account?.homeAccountId || 'unknown', new Date(response.expiresOn)]);

    tokenCache.accessToken = response.accessToken;
    tokenCache.expiresAt = response.expiresOn;

    return response;
};

/**
 * Ensures we have a valid access token in memory, refreshing if necessary
 */
const getValidAccessToken = async () => {
    // If we have a cached token that is valid for at least 5 more minutes, use it
    if (tokenCache.accessToken && tokenCache.expiresAt && new Date(tokenCache.expiresAt).getTime() > Date.now() + 300000) {
        return tokenCache.accessToken;
    }

    // Try to get token from DB (simulate getting a fresh token)
    // Note: A true refresh flow would use acquireTokenByRefreshToken, but Microsoft Graph often requires user interaction.
    // However, for daemon apps, client credentials flow is better, but since it's a personal account, we assume offline_access.
    // For MVP, we'll fetch whatever we have from DB.
    const { rows } = await query(`SELECT access_token FROM onedrive_settings ORDER BY updated_at DESC LIMIT 1`);
    if (rows.length > 0 && rows[0].access_token) {
        tokenCache.accessToken = rows[0].access_token;
        return tokenCache.accessToken; // Assumes we have a process for refreshing this separately, or it's long-lived.
    }
    
    throw new Error('No valid OneDrive access token found. Admin must reconnect OneDrive.');
};

/**
 * Initialize Microsoft Graph Client
 */
const getGraphClient = async () => {
    const accessToken = await getValidAccessToken();
    return Client.init({
        authProvider: (done) => {
            done(null, accessToken);
        }
    });
};

/**
 * Get a temporary streaming URL for a OneDrive file ID
 */
const getStreamUrl = async (fileId) => {
    const client = await getGraphClient();
    try {
        const file = await client.api(`/me/drive/items/${fileId}`).get();
        const downloadUrl = file['@microsoft.graph.downloadUrl'];
        if (!downloadUrl) throw new Error('Download URL not found in Graph API response');
        return downloadUrl;
    } catch (err) {
        console.error('OneDrive getStreamUrl API error:', err);
        throw new Error('Failed to retrieve stream URL from OneDrive');
    }
};

/**
 * Get details of a file
 */
const getFile = async (fileId) => {
    const client = await getGraphClient();
    const file = await client.api(`/me/drive/items/${fileId}`).get();
    return file;
};

/**
 * List files in the root or a specific folder
 */
const listFiles = async (folderId = 'root') => {
    const client = await getGraphClient();
    const url = folderId === 'root'
        ? '/me/drive/root/children'
        : `/me/drive/items/${folderId}/children`;
    const response = await client.api(url).select('id,name,size,folder,file,lastModifiedDateTime').top(100).get();
    // Return both folders and files so the admin browser can navigate
    return response.value.map(item => ({
        id: item.id,
        name: item.name,
        size: item.size,
        folder: item.folder || null,
        file: item.file || null,
        lastModified: item.lastModifiedDateTime,
    }));
};

/**
 * Check connection status (non-async, reads cache)
 */
const getConnectionStatus = () => {
    if (!process.env.ONEDRIVE_CLIENT_ID || !process.env.ONEDRIVE_CLIENT_SECRET) {
        return { connected: false, reason: 'OneDrive credentials not configured in .env' };
    }
    if (tokenCache.accessToken && tokenCache.expiresAt) {
        return {
            connected: true,
            expiresAt: tokenCache.expiresAt,
        };
    }
    return { connected: false, reason: 'No active session — admin must connect' };
};

module.exports = {
    getAuthUrl,
    handleCallback,
    getStreamUrl,
    getFile,
    listFiles,
    getConnectionStatus,
};
