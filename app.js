const express = require('express')
const app = express()
const path = require('path')
const session = require('express-session')
const flash = require('connect-flash');
const nocache=require('nocache');



// Import the database connection function 
const connectToDatabase = require('./config/database')
connectToDatabase();

//Set up views and view engine
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'ejs')

//Serve static files form the public directory
app.use(express.static(path.join(__dirname, 'public')));

//Use body parsing middlewares before session middleware
app.use(express.json());
app.use(express.urlencoded({
   extended: true
}));

//Session configuration
app.use(session({
   secret: 'secret-key',
   resave: false,
   saveUninitialized: true,
   cookie: {
      maxAge: 3600000
   }
}))

app.use(flash());
app.use(nocache());



//Routes
const userRouter = require('./routes/user')
const adminRouter = require('./routes/admin')

app.use('/', userRouter)
app.use('/admin', adminRouter)




const PORT = process.env.PORT || 7000
app.listen(PORT, () => {
   console.log(`Server started on http://localhost:${PORT}`)
})

module.exports = app