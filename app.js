var createError = require('http-errors');
const MongoStore = require('connect-mongo');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mongoose = require('mongoose');
var session = require('express-session');
var passport = require('passport');
var LocalStrategy = require('passport-local');
var flash = require('connect-flash');
var methodOverride = require('method-override'); // <-- ADD THIS
require('dotenv').config();


// =================================================================
// MODELS & ROUTERS
// =================================================================
var User = require('./models/user');
var indexRouter = require('./routes/index');

// =================================================================
// DATABASE CONNECTION
// =================================================================
mongoose.connect(process.env.DATABASE_URL);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => {
    console.log("Database connected successfully!");
});

// =================================================================
// EXPRESS APP CONFIGURATION
// =================================================================
var app = express();

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// General Middleware
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(methodOverride('_method')); // <-- AND ADD THIS

// Updated Session Configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false, // Good practice: don't save empty sessions
  store: MongoStore.create({
    mongoUrl: process.env.DATABASE_URL,
    touchAfter: 24 * 3600 // Optional: don't resave session if not modified (in seconds)
  }),
  cookie: {
    httpOnly: true,
    expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
    maxAge: 1000 * 60 * 60 * 24 * 7
  }
}));

// Flash Message Middleware
app.use(flash());

// Passport.js Configuration
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy({ usernameField: 'email' }, User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(express.static(path.join(__dirname, 'public')));
// Middleware to make user and flash messages available in all templates
app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

// =================================================================
app.use('/', indexRouter);

// =================================================================
app.use(function(req, res, next) {
  next(createError(404));
});

app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;