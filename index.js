const mongoose = require("mongoose");
require('dotenv').config();
const path = require('path');

/*
mongoose.connect("mongodb://127.0.0.1:27017/user_management_system", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  
});
*/
const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/zouq";
  mongoose.connect(uri, {
  
});


const express = require("express");
const app = express();
const session=require('express-session');

//to resolve validation error
app.use(
  express.urlencoded({ extended: true })
);

app.use(express.json());
const config=require('./config/config');

//session
app.use(session({
  secret:config.sessionSecret,
  resave:false,
  saveUninitialized:true
}))


// Set up EJS view engine
app.set('view engine', 'ejs');

// Replace with the actual path to your views directory
app.set('views', path.join(__dirname, 'views'));

// Serve static files from the 'public' directory
app.use('/static', express.static(path.join(__dirname, 'public')));


/*app.use(express.static(path.join(__userImages, "public")));

app.use(express.static('public',{ extensions: ['html', 'htm', 'webp', 'jpg', 'jpeg', 'png'] }));
app.use(express.static('public'));
*/



// Serve static files
app.use(express.static('public', {
  extensions: ['html', 'htm', 'webp', 'jpg', 'jpeg', 'png'], // Specify allowed file extensions
  setHeaders: (res, path, stat) => {
      if (path.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css');
      }
  }
}));


//for user routes
const userRoute = require('./routes/userRoute');
app.use('/',userRoute);


//for admin routes
const adminRoute = require('./routes/adminRoute');
app.use('/admin',adminRoute);

// Catch 404 and forward to error handler

app.use(function(req, res, next) {
  res.status(404).render('users/404', { pageTitle: 'Page Not Found' });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something went wrong!');
});
/*
app.get("*",(req,res)=>{
res.render("404")
})
*/
app.listen(process.env.PORT,function(){
    console.log("server is running...");
});