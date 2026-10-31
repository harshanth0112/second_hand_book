import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { env } from './env.js';
import { AuthService } from '../services/auth.service.js';

/**
 * Configure Passport with the Google OAuth 2.0 strategy.
 *
 * session: false — Passport does NOT use Express sessions; JWTs in httpOnly
 * cookies handle session state instead.
 */
export const configurePassport = () => {
  // Only register the strategy when credentials are provided.
  // In test/dev without real credentials, OAuth routes are still reachable
  // but Passport authentication itself is mocked in tests.
  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
          callbackURL: env.GOOGLE_CALLBACK_URL,
          // We handle state ourselves via a signed cookie — let Passport
          // pass through the state parameter without its own validation.
          passReqToCallback: false,
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const email =
              profile.emails?.[0]?.value?.toLowerCase() ?? '';
            const name = profile.displayName || email.split('@')[0];
            const avatar = profile.photos?.[0]?.value || '';
            const googleId = profile.id;

            if (!email) {
              return done(new Error('Google account did not provide an email address'));
            }

            const { user, token } = await AuthService.findOrCreateGoogleUser({
              googleId,
              email,
              name,
              avatar,
            });

            return done(null, { user, token });
          } catch (err) {
            return done(err);
          }
        }
      )
    );
  }

  return passport;
};

