import { Router, Response } from 'express';
import { google } from 'googleapis';
import { User } from '../models';
import { protect, AuthRequest } from '../middleware/auth';
import { GOOGLE_CONFIG, SERVER } from '../config/config';

const router = Router();

// Create OAuth2 client
const getOAuth2Client = () =>
  new google.auth.OAuth2(
    GOOGLE_CONFIG.CLIENT_ID,
    GOOGLE_CONFIG.CLIENT_SECRET,
    GOOGLE_CONFIG.REDIRECT_URI
  );

// Scopes for Google Calendar
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
];

// @route   GET /api/calendar/google/auth
// @desc    Get Google OAuth URL
// @access  Private
router.get('/google/auth', protect, async (req: AuthRequest, res: Response) => {
  try {
    const oauth2Client = getOAuth2Client();

    // Store user ID in state to retrieve after callback
    const state = Buffer.from(
      JSON.stringify({ userId: req.user?._id.toString() })
    ).toString('base64');

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      state,
      prompt: 'consent', // Force to get refresh token
    });

    res.status(200).json({
      success: true,
      data: { authUrl },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error generating auth URL',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// @route   GET /api/calendar/google/callback
// @desc    Handle Google OAuth callback
// @access  Public (but requires state with user ID)
router.get('/google/callback', async (req: AuthRequest, res: Response) => {
  try {
    const { code, state } = req.query;

    if (!code || !state) {
      res.redirect(`${SERVER.CORS_ORIGIN}/settings?error=missing_params`);
      return;
    }

    // Decode state to get user ID
    const decodedState = JSON.parse(
      Buffer.from(state as string, 'base64').toString()
    );
    const { userId } = decodedState;

    if (!userId) {
      res.redirect(`${SERVER.CORS_ORIGIN}/settings?error=invalid_state`);
      return;
    }

    const oauth2Client = getOAuth2Client();

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code as string);
    oauth2Client.setCredentials(tokens);

    // Get user email from Google
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    const googleEmail = userInfo.data.email;

    // Update user with Google Calendar tokens
    await User.findByIdAndUpdate(userId, {
      googleCalendar: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date,
        email: googleEmail,
      },
    });

    // Redirect back to settings page with success
    res.redirect(`${SERVER.CORS_ORIGIN}/settings?google_calendar=connected`);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    res.redirect(`${SERVER.CORS_ORIGIN}/settings?error=oauth_failed`);
  }
});

// @route   GET /api/calendar/google/status
// @desc    Get Google Calendar connection status
// @access  Private
router.get(
  '/google/status',
  protect,
  async (req: AuthRequest, res: Response) => {
    try {
      const user = await User.findById(req.user?._id);

      if (!user) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      const isConnected = !!(
        user.googleCalendar?.accessToken && user.googleCalendar?.refreshToken
      );

      res.status(200).json({
        success: true,
        data: {
          connected: isConnected,
          email: isConnected ? user.googleCalendar?.email : null,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching status',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// @route   DELETE /api/calendar/google/disconnect
// @desc    Disconnect Google Calendar
// @access  Private
router.delete(
  '/google/disconnect',
  protect,
  async (req: AuthRequest, res: Response) => {
    try {
      await User.findByIdAndUpdate(req.user?._id, {
        $unset: { googleCalendar: 1 },
      });

      res.status(200).json({
        success: true,
        message: 'Google Calendar disconnected successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error disconnecting Google Calendar',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// Helper to get authenticated OAuth2 client for a user
const getAuthenticatedClient = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user?.googleCalendar?.accessToken) {
    throw new Error('Google Calendar not connected');
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials({
    access_token: user.googleCalendar.accessToken,
    refresh_token: user.googleCalendar.refreshToken,
    expiry_date: user.googleCalendar.expiryDate,
  });

  // Set up token refresh handler
  oauth2Client.on('tokens', async tokens => {
    if (tokens.access_token) {
      await User.findByIdAndUpdate(userId, {
        'googleCalendar.accessToken': tokens.access_token,
        ...(tokens.expiry_date && {
          'googleCalendar.expiryDate': tokens.expiry_date,
        }),
      });
    }
  });

  return oauth2Client;
};

// @route   GET /api/calendar/google/events
// @desc    Get Google Calendar events
// @access  Private
router.get(
  '/google/events',
  protect,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id.toString();
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const oauth2Client = await getAuthenticatedClient(userId);
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      // Get query parameters for date range
      const timeMin = (req.query.timeMin as string) || new Date().toISOString();
      const timeMax =
        (req.query.timeMax as string) ||
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // Default to 30 days ahead

      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 100,
      });

      const events = response.data.items?.map(event => ({
        id: event.id,
        title: event.summary,
        description: event.description,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        location: event.location,
        htmlLink: event.htmlLink,
        isAllDay: !event.start?.dateTime,
      }));

      res.status(200).json({
        success: true,
        data: events,
      });
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching calendar events',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// @route   GET /api/calendar/google/calendars
// @desc    Get list of user's calendars
// @access  Private
router.get(
  '/google/calendars',
  protect,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?._id.toString();
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
        return;
      }

      const oauth2Client = await getAuthenticatedClient(userId);
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

      const response = await calendar.calendarList.list();

      const calendars = response.data.items?.map(cal => ({
        id: cal.id,
        summary: cal.summary,
        description: cal.description,
        primary: cal.primary,
        backgroundColor: cal.backgroundColor,
      }));

      res.status(200).json({
        success: true,
        data: calendars,
      });
    } catch (error) {
      console.error('Error fetching calendars:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching calendars',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;
