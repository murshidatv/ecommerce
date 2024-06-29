const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth2').Strategy;

// Configure Google Strategy
passport.use(new GoogleStrategy({

  clientID: process.env.CLIENT_ID,//credentials here
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:4000/userVerification/google/callback", // Adjust the callback URL
  passReqToCallback: true,
},


  function (request, accessToken, refreshToken, profile, done) {
    
    // Add this
    done(null, profile);//profile contains user information
  }
));

// Serialize and deserialize user (store user data in session)
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));





