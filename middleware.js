module.exports.isLoggedIn = (req, res, next) => {
    // req.isAuthenticated() is a method added by Passport.js
    // It checks if a user is currently in a valid session (logged in).
    if (!req.isAuthenticated()) {
        // Store the URL they are trying to access in the session.
        // This allows you to redirect them back after they log in.
        req.session.returnTo = req.originalUrl;

        // Set a flash message to inform the user.
        req.flash('error', 'You must be signed in to do that!');

        // Redirect them to the login page.
        return res.redirect('/login');
    }
    // If they are authenticated, proceed to the next function in the chain (the route handler).
    next();
};