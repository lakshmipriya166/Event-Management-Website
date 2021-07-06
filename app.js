//jshint esversion:6

require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
//const _ = require("lodash");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.use(express.static("public"));

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.DB, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String
});

const serviceSchema = new mongoose.Schema({
  service: String,
  about: String,
  imageURL: String
});

const bookingSchema = new mongoose.Schema({
  userid: String,
  email: String,
  description: String,
  stdate: Date,
  enddate: Date
});

const employeeSchema = new mongoose.Schema({
  email: String,
  password: String
});


userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
employeeSchema.plugin(passportLocalMongoose);
employeeSchema.plugin(findOrCreate);
bookingSchema.plugin(findOrCreate);

const User = new mongoose.model("users", userSchema);
const Service = new mongoose.model("services", serviceSchema);
const Employee = new mongoose.model("employee", employeeSchema);
const Booking = new mongoose.model("bookings", bookingSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/events",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);

    User.findOrCreate({
      googleId: profile.id,
      name: profile.displayName
    }, function(err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res) {
  res.render("home");
});

app.get("/auth/google",
  passport.authenticate('google', {
    scope: ["profile"]
  })
);

app.get("/auth/google/events",
  passport.authenticate('google', {
    failureRedirect: "/login"
  }),
  function(req, res) {
    // Successful authentication, redirect to events.

    //////////////////////////
    console.log(req.user._id);
    res.redirect("/main");
  });

app.get("/main", function(req, res) {
  console.log(req.user._id);
  res.render("main", {
    id: req.user._id
  });
})

app.get("/login", function(req, res) {
  res.render("login");
});

app.get("/register", function(req, res) {
  res.render("register");
});

app.get("/emplogin", function(req, res) {
  res.render("emplogin");
});

// app.get("/secrets", function(req, res){
//   User.find({"secret": {$ne: null}}, function(err, foundUsers){
//     if (err){
//       console.log(err);
//     } else {
//       if (foundUsers) {
//         res.render("secrets", {usersWithSecrets: foundUsers});
//       }
//     }
//   });
// });

// app.get("/submit", function(req, res){
//   if (req.isAuthenticated()){
//     User.findById(req.user.id, function(err, foundUser){
//       if (err) {
//         res.render("register");
//       } else {
//         if (foundUser) {
//           // foundUser.secret = submittedSecret;
//           foundUser.save(function(){
//             res.render("main");;
//           });
//         }
//       }
//     });
//
//   } else {
//     res.render("login");
//   }
// });

// app.post("/submit", function(req, res){
//
// //Once the user is authenticated and their session gets saved, their user details are saved to req.user.
//   // console.log(req.user.id);
//
//   User.findById(req.user.id, function(err, foundUser){
//     if (err) {
//       console.log(err);
//     } else {
//       if (foundUser) {
//         foundUser.secret = submittedSecret;
//         foundUser.save(function(){
//           res.redirect("/secrets");
//         });
//       }
//     }
//   });
// });

app.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/");
});

app.post("/register", function(req, res) {
  console.log("!");
  User.register({
    username: req.body.email
  }, req.body.password, function(err, user) {
    console.log("!!");
    if (err) {
      console.log("!!!");
      console.log(err);
      res.redirect("/register");
    } else {
      console.log("!!!!");
      console.log(req.body);
      passport.authenticate("local")(req, res, function() {
        console.log("@");
        res.render("home");
        console.log("@@");
      });
    }
  });

});

app.post("/login", function(req, res) {

  const user = new User({
    username: req.body.email,
    password: req.body.password
  });

  req.login(user, function(err) {
    console.log("wef");
    console.log(req.user);

    if (err) {
      console.log("1");
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function() {
        console.log("2");
        console.log(req.user._id);
        res.render("main", {
          id: req.user._id
        });
      });
    }
  });

});

app.post("/emplogin", function(req, res) {

  const emp = new Employee({
    email: req.body.email,
    password: req.body.password
  });

  req.login(user, function(err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function() {
        console.log(req.emp._id);
        res.render("main", {
          id: req.emp._id
        });
      });
    }
  });

});

app.post("/services", function(req, res) {
  //console.log(req.body.service);
  Service.findOne({
    service: req.body.service
  }, function(err, service) {

    res.render("services", {
      service: req.body.service,
      about: service.about,
      imageURL: service.imageURL
    });

  });
});

var myobj;

app.post("/book", function(req, res) {
  console.log(req.body);
  res.render("book", {
    id: req.body.id
  });
});

app.post("/booking", function(req, res) {
  myobj = new Booking({
    userid: req.body.userid,
    email: req.body.email,
    description: req.body.description,
    stdate: req.body.date1,
    enddate: req.body.date2
  });

  console.log(myobj);

  Booking.insertMany([myobj]).then(function() {
    console.log("Data inserted") // Success
    res.render("main", {
      id: myobj.userid
    });

  }).catch(function(error) {
    console.log(error) // Failure
  });
});

app.listen(3000, function() {
  console.log("Server started on port 3000.");
});
