var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var ObjectID = require('mongodb').ObjectID;

var db = require('./db');

passport.use('login', new LocalStrategy(
	// Check if user is in the database
	function(username, password, done) {
		console.log("lala");
		console.log(username + " " + password);
		process.nextTick(function() {
			db.execute(function(database) {
				database.collection('user_collection', function(err, collection) {
					collection.findOne({username: username}, function(err, result) {
						if(err)
							return done(err);
						if(!result) {
							console.log('user doesnt exist');
							return done(null, false);
						}
						if(result.password === password) {
							console.log('logged in');
							return done(null, {username: username, uid: result._id});
						}
						console.log('incorrect password');
						return done(null, false);
					});
				});
			});
		});
	}
));

passport.use('signup', new LocalStrategy(
	function(username, password, done) {
		process.nextTick(function() {
			db.execute(function(database) {
				database.collection('user_collection', function(err, collection) {
					collection.findOne( {username: username }, function(err, result) {
						if(err)
							return done(err);
						if(result) {
							console.log("username taken");
							return done(null, false);
						} else {
							/* Insert user into database */
							var user = { username: username, password: password };
							collection.insertOne(user, {w:1}, function(err, result) {
								if(err)
									return done(err);
								return done(null, {username: user.username, uid: user._id});
							});
						}
					});
				});
			});
		});
	}
));

/* fix this so that the id is serialized as an objectid */
passport.serializeUser(function(user, done) {
	/*console.log('serialize');
	console.log(user);*/
	done(null, user);
});

passport.deserializeUser(function(user, done) {
	//console.log('deserialize');
	user.uid = new ObjectID(user.uid);
	//console.log(user);
	done(null, user);
});

module.exports = passport;