
// server.js

// BASE SETUP
// =============================================================================

// call the packages we need
var express    	= require('express');        // call express
var bodyParser 	= require('body-parser');
var morgan 			= require('morgan');
var mongoose 		= require('mongoose');
var randtoken = require('rand-token');
var jwt = require('jsonwebtoken');
var bcrypt = require('bcrypt');
var generatePassword = require("password-generator");
var cookieParser = require('cookie-parser');
var passport = require('passport');
var cors = require('cors');

//social auth
var FacebookStrategy = require('passport-facebook').Strategy;

//for terminal colors ()
var chalk = require('chalk');

//config for chalk
var error = chalk.bold.red;

//API configuration
var app         = express();                 // define our app using express
var config      = require('./config');

//Schema
var User        = require('./schema/user');
var Token       = require('./schema/token');
var Device       = require('./schema/device');

//setup
mongoose.connect(config.database);
app.set('superSecret', config.secret);

//bodyparser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
//morgan to log stuff and other dev stuff
app.use(morgan('dev'));
app.use(cors());

/**
*
*
*
* 			PASPORT SETUP AND CONFIG
*
*
**/

// @TODO check the password token/auth stuff with Avery

app.use(passport.initialize());
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

// used to deserialize the user
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
      done(err, user);
  });
});

passport.use(new FacebookStrategy({
	  clientID: config.auth.facebook.clientID,
	  clientSecret: config.auth.facebook.clientSecret,
	  callbackURL: config.auth.facebook.callbackURL,
	  profileFields: ['id', 'displayName', 'photos', 'email']
  },
  function(accessToken, refreshToken, profile, done) {

  	//find user or create a new one.
  	User.findOne({
  		'facebook.id': profile.id
  	}, function(err, user){
  			if (err) {
  				console.log(chalk.red.bold('Error'))
					return done(err);
        }
        //we do not have a user
        if(!user){
        	console.log(chalk.blue.bold("Creating a new user from facebook"));

        	//setup the new user
        	user = new User({
        		name: profile.displayName,
            email: profile.emails[0].value,
            username: profile.emails[0].value,
            password: bcrypt.hashSync(generatePassword(32, false, /[\w\d\?\-]/), bcrypt.genSaltSync(config.saltRounds)),
            provider: 'facebook',
            //now in the future searching on User.findOne({'facebook.id': profile.id } will match because of this next line
            facebook: profile._json
        	});
        	//add the access_token (its not in profile)
        	user.facebook.access_token = accessToken;

        	//save the user
        	user.save(function(err) {
        		//if we have an error
						if (err) console.log(err);
						// create the site token
						var token = new Token({
			        user_id: user._id,
			        token_type: 'self',
			        token: randtoken.generate(32)
			      })
						//saving the self token
			      token.save(function(err){
			      	//if we have an error
			        if(err) throw err;

			        //if we are here that means that the user was created and has a token
			        //we have a user and a token
			        console.log(chalk.blue('User saved successfully'));
			      })
			      //return
						return done(err, user);
					});
      	}
      	else {
      		//@TODO update the users profile with facebook here! -- or not TBD
					console.log(chalk.yellow.bold("User already exists"));
					return done(err, user);
				}
  	})
  }
));

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();              // get an instance of the express Router

// test route to make sure everything is working (accessed at GET http://localhost:8080/api)
app.get('/', function(req, res) {
    res.json({ message: '---------- IOT BACKEND API ---------' });
});


// FOR TESTING ONLY -- just creates a user to test with
app.get('/setup', function(req, res) {
  // create a sample user
  var pass = 'password';
  bcrypt.hash(pass, config.saltRounds, function(err,hash){
    var user = new User({
      name: 'Jason Walker',
      password: hash,
      username: "user",
      email: "user@domain.com",
      admin: true
    });

    // save the sample user
    user.save(function(err) {
      if (err) throw err;

      var token = new Token({
        user_id: user._id,
        token_type: 'self',
        token: randtoken.generate(32)
      })

      token.save(function(err){
        if(err) throw err;

        //if we are here that means that the user was created and has a token
        console.log(chalk.blue('User saved successfully'));
        res.json({ success: true });
      })
    });
  })
});



/**
*
*
*
* 			FACEBOOK ROUTES
*
*
**/


app.get('/auth/facebook',
  passport.authenticate('facebook',{ scope : ['email'] }));

//Facebook Callback
app.get(
	'/auth/facebook/callback',
	passport.authenticate('facebook',
		{
			failureRedirect: '/auth/facebook/fail' //create this route
		}
	),
	function(req, res) {
		console.log(chalk.red.bold("Debugging-------"))
		console.log(req.params)
		user = req.res.req.user
		console.log(user);
		Token.findOne({
			token_type: 'self',
			user_id: user._id
		}, function(err, token){
			if(err) throw err;

			if(!token){
        //ruh roh we dont have a token
        console.log(chalk.bold.red("Token Not Found"));
        res.json({success: false, message: "Token Not Found"})
      }

      //if we got here we validated the user and got a token for the correct user.
      console.log(chalk.bold.green("User Validated"))
      var t = jwt.sign({token: token.token, user: user._id}, app.get('superSecret'), {
        expiresIn: "24h" // expires in 24 hours
      });

      console.log(chalk.bold.blue("Setting Cookie"));
      res.cookie(config.token_cookie, t, { domain: '.zaphyrr.com' });
      console.log(chalk.bold.blue("Sending token"))
      res.redirect(config.auth.facebook.redirectURL);
		})
		// User.findOne({}, function(err, user){})

	}
);



/**
*
*
*
* 			MAIN AUTHENTICATION ROUTE
*
*
**/


app.post('/authenticate', function(req, res) {
  // console.log(req.body)
  // find the user
  User.findOne({
    username: req.body.username,
  },function(err,user){
    if(err) throw err;

    if(!user){
      res.status(449).json({
        success: false,
        message: "There is no user with that associated username."
      })
    }else{
      if(!bcrypt.compareSync(req.body.password, user.password)) {
        res.status(449).json({ success: false, message: 'Username and password combination mismatch.' });
      }else{
        Token.findOne({
          token_type: 'self',
          user_id: user._id
        }, function(err, token){
          if(err) throw err;

          if(!token){
            res.status(449).json({
              success:false,
              message: "Token error please contact the system administrator. This might not resolve itself."
            })
          }

          var t = jwt.sign({token: token.token, user:user._id}, app.get('superSecret'),{
            expiresIn: '24h'
          })

          //set a cookie so we dont pass the user/pass back and forth
          res.cookie(config.token_cookie, t, {domain: '.zaphyrr.com'})

          //redirect them to the dashboard
          res.redirect(config.auth.facebook.redirectURL);
        })
      }
    }
  })
});


app.get('/auth/signout', function(req, res){
	res.clearCookie(config.token_cookie);
	//redirect to signin page
	res.redirect('/');
})


//for the device authentication
// we could probably rewrite this with some try/catch to eliminate some messy stuff
app.post('/device/auth', function(req,res){
  //if we have a token
  if(req.body.token){
    //find the token
    Token.findOne({
      token_type: 'self', //we are looking for a site token
      token: req.body.token
    }, function(err, token){
      if(err) throw err;  //throw the error if we have one

      User.findOne({      //we found the token now get the user for that token
        _id: token.user_id
      }, function(err, user){
        if(err) throw err;  //throw the error if we have one

        //sign the token as a JWT with the user_id as well
        var t = jwt.sign({token: token.token, user:user._id}, app.get('superSecret'),{
          expiresIn: '336h'
        })  


        //send it back
        return res.status(200).send({
          success: true,
          token: t
        })      
      })
    })
  }
  else{
    //we didnt provide the token send back a message
    return res.status(403).json({
        success: false,
        message: 'No token provided.',
    });
  }
})


/**
*
*
*
* 			ROUTES BELOW NEED AUTHENTICATION!!!!!
*
*
**/
//PLACING THIS MIDDLEWARE BELOW ANY ROUTES THAT CAN BE ACCESS WITHOUT AUTHENTICATION!


app.use(function(req, res, next) {


  // check header or url parameters or post parameters for token
  if (req.headers.authorization) {
  	console.log(chalk.bold.green("Cookie Found"));
  	var t = req.headers.authorization.split(' ');
    // verifies secret and checks exp
    jwt.verify(t[1], config.secret, function(err, decoded) {
      if (err) {
        console.log(chalk.bold.red("Bad Token"));
        return res.json({ success: false, err:err });
      } else {
        // if everything is good, save to request for use in other routes
        req.decoded = decoded;
        next();
      }
    })

  } else {
    // if there is no token
    // return an error
    console.log(chalk.bold.red("No Token Provided"));
    return res.status(403).send({
        success: false,
        message: 'No token provided.'
    });
  }
});



// users
app.route('/users')
    // create a bear (accessed at POST http://localhost:8080/api/bears)
    .post(function(req, res) {

    })
    // get all the bears (accessed at GET http://localhost:8080/api/bears)
    .get(function(req, res) {
      //probably very insecure
        User.find(function(err, users) {
            if (err)
                res.send(err);
            for(var i=0; i < users.length; i++){
              users[i].password = "N/A"
            }
            res.json(users);
        });
    });

app.route('/user/:id')
	.get(function(req, res){
		// console.log(req.params.id)
		User.findOne({
			_id: req.params.id
		}, function(err, user) {
			if(err) throw err;
			user.password = 'N/A';
			res.json(user)
		})
	})

	.put(function(req, res){
		console.log(req,res)
    User.findOneAndUpdate({
      _id: req.params.id,
    }, req.body, {new:true}, function(err, user){
      if(err) throw err;
      console.log(user)
    })
	})

	.patch(function(req, res){
		console.log(req,res)
	})

	.delete(function(req, res){
		console.log(req,res)
	});


// more routes for our API will happen here

app.route('/device')
  .post(function(req,res){
    //create a device here
    //validation happens on the client side
    var device = new Device({
      user_id: req.body.user_id,
      name: req.body.name,
      description: req.body.description,
      states:req.body.states,
      current_state: req.body.current_state //index
    })

    device.save(function(err){
      if(err) throw err;

      res.json(device)
    })

  })
app.route('/devices')
  .get(function(req,res){
    //get all the devices for a user
    var t = req.headers.authorization.split(' ');
    console.log(req.decoded.user)
    Device.find({
      user_id: req.decoded.user
    }, function(err, device) {
      if(err) throw err;
      res.json(device)
    })
  })
app.route('/device/:id')
  .get(function(req,res){
    Device.findOne({
      _id: req.params.id
    }, function(err, device) {
      if(err) throw err;
      res.json(device)
    })
  })
  .put(function(req,res){
    //PUT and PATCH are implemented the same
    //PUT updates all data
    Device.findOneAndUpdate({
      _id: req.params.id,
    }, req.body, {new:true}, function(err, device){
      if(err) throw err;
      console.log(device)
    })
  })
  .patch(function(req,res){
    //PUT and PATCH are implemented the same
    //PATCH updates only changed data in backbone
    Device.findOneAndUpdate({
      _id: req.params.id,
    }, req.body, {new:true}, function(err, device){
      if(err) throw err;
      console.log(device)
    })
  })
  .delete(function(req,res){
    Device.find({
      _id: req.params.id,
    }, function(err, device) {
      if(err) throw err;
    }).remove().exec()
    res.json({success: true, message: "Device Removed"})
  })

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api

// START THE SERVER
// =============================================================================
app.listen(config.port);
console.log('Magic happens on port ' + config.port);