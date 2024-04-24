const mongoose = require("mongoose");
require('dotenv').config();
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


//to resolve validation error
app.use(
  express.urlencoded({ extended: true })
);

app.use(express.json());
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

app.listen(process.env.PORT,function(){
    console.log("server is running...");
});