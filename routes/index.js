var express = require('express');
var router = express.Router();
var path = require('path');
var formidable = require('formidable');
var fs = require('fs-extra');
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectID = require('mongodb').ObjectID;

var isAuthenticated = function (req, res, next) {
	// if user is authenticated in the session, call the next() to call the next request handler 
	// Passport adds this method to request object. A middleware is allowed to add properties to
	// request and response objects
	if (req.isAuthenticated())
		return next();
	// if the user is not authenticated then redirect him to the login page
	res.redirect('/');
}

var db = require('../db');

module.exports = function(passport) {

	/* GET login page. */
	router.get('/', function(req, res) {
		// Display the Login page with any flash message, if any
		if(req.isAuthenticated()) {
			res.statusCode = 302;
			res.setHeader("Location", '/home');
			res.end();
		} else {
			res.render('index', { message: req.flash('message') });
		}
	});

	/* Handle Login POST */
	/*router.post('/login', passport.authenticate('login', {
		successRedirect: '/home',
		failureRedirect: '/',
		failureFlash : true 
	}));*/
	
	router.post('/login', 
		passport.authenticate('login'), 
		function(req, res) {
			//res.send("successful");
			//res.send({user: req.body.username});
			res.statusCode = 200;
			res.end();
		}
	);

	/* GET Registration Page */
	router.get('/signup', function(req, res){
		res.render('register',{message: req.flash('message')});
	});

	/* Handle Registration POST */
	/*router.post('/signup', passport.authenticate('signup', {
		successRedirect: '/home',
		failureRedirect: '/signup',
		failureFlash : true 
	}));*/
	
	router.post('/signup', 
		passport.authenticate('signup'), 
		function(req, res) {
			//res.send("successful");
			res.statusCode = 200;
			res.end();
		}
	);
	
	/* GET Home Page */
	router.get('/home', isAuthenticated, function(req, res){
		//res.render('home', { user: req.user });
		console.log(req.session.passport.user);
		res.sendfile('./views/home.html');
	});
	
	/* Handle Logout */
	router.get('/signout', function(req, res) {
		req.logout();
		res.redirect('/');
	});
	
	router.get('/discover', isAuthenticated, function(req, res) {
		res.sendfile('./views/discover.html');
	});
	
	router.get('/event', isAuthenticated, function(req, res) {
		res.sendfile('./views/event.html');
	});
	
	router.get('/profile', isAuthenticated, function(req, res) {
		res.sendfile('./views/profile.html');
	});
	
	router.get('/post', isAuthenticated, function(req, res) {
		res.sendfile('./views/post.html');
	});
	
	router.get('/createEvent', isAuthenticated, function(req, res) {
		res.sendfile('./views/createEvent.html');
	});
	
	
	
	/* Follow a user */
	router.post('/followUser', isAuthenticated, function(req,res) {
		console.log('follow user');
		console.log(req.body);
		
		var user1 = req.session.passport.user.uid;
		var user2 = new ObjectID(req.body.following_user_id);
		
		/* We want to add the usernames as well so that when we query the followers and who user is following, we can instantly display the usernmae without additional queries */
		
		var rel = {
			uid_1: user1,
			//uname_1 : username1,
			uid_2: user2
			//uname_2 : username2
		};
		
		console.log(rel);
		
		db.execute(function(database) {
			database.collection('user_user_collection', function(err, collection) {
				collection.insertOne(rel, {w:1}, function(err, result) {
					if(err)
						console.log(err);
				});
			});
		});
	});
	
	/* Follow an event */
	router.post('/followEvent', isAuthenticated, function(req,res) {
		var user = req.session.passport.user.uid;
		var event = new ObjectID(req.body.following_event_id);	
		
		var rel = {
			uid_1: user,
			//uname_1: username,
			eid_2: event
			//ename_2: eventname
		};
		
		db.execute(function(database) {
			database.collection('user_event_collection', function(err, collection) {
				collection.insertOne(rel, {w:1}, function(err, result) {
					if(err)
						console.log(err);
				});
			});
		});
	});


	/* Insert event into database */
	router.post('/createEvent', isAuthenticated, function(req, res) {	
		var event;
		var eventInstances = [];
		/* Process the form uploads */
		var form = new formidable.IncomingForm();
		form.parse(req, function(err, fields, files) {
			console.log(fields);
			console.log("received upload");
			console.log(req.session.passport.user);
			event = {
				created_at: new Date(),
				created_by: req.session.passport.user,
				title: fields.eventTitle,
				description: fields.eventDescription
				//image: file_name
			};

			var tmp = JSON.parse(fields.eventInstances);
			console.log(tmp.length);
			for(var i=0; i<tmp.length; ++i) {
				var e = {
					//event_id: result[0]._id,
					date: tmp[i].date,
					location: tmp[i].loc,
					title: fields.eventTitle,
					description: fields.eventDescription
				};
				eventInstances.push(e);
			}
		});

		form.on('end', function(fields, files) {
			/* Temporary location of our uploaded file */
			var temp_path = this.openedFiles[0].path;
			/* The file name of the uploaded file */
			var file_name = this.openedFiles[0].name;
			/* Location where we want to copy the uploaded file */
			var new_location = './public/img/';

			fs.copy(temp_path, new_location + file_name, function(err) {  
				if (err) {
					console.error(err);
				} else {
					console.log("success!")
				}
			});
			
			event.image = file_name;
			db.execute(function(database) {
				database.collection('event_collection', function(err, collection) {
					collection.insertOne(event, {w:1}, function(err, result) {
						console.log(result.ops[0]);
						for(var i=0; i<eventInstances.length; ++i) {
							eventInstances[i].event_id = new ObjectID(result.ops[0]._id);
							eventInstances[i].image = file_name;
						}
						database.collection('event_instance_collection', function(err, collection) {
							collection.insertMany(eventInstances, {w:1}, function(err, result){});
						});
					});
				});
			});
			
			res.statusCode = 302;
			res.setHeader("Location", '/createevent');
			res.end();
		});
	});
	
	/* Insert post into database */
	router.post('/post', function(req, res) {
		var post;
		var eventid;
		
		console.log(req.body);
		
		var form = new formidable.IncomingForm();
		form.parse(req, function(err, fields, files) {
			eventid = fields.eventid;
			console.log(fields);
			console.log("received upload");
			console.log(req.session.passport.user);
			post = {
				created_at: new Date(),
				created_by: req.session.passport.user,
				event_id: new ObjectID(fields.eventid),
				message: fields.message,
				upvotes: 0,
				downvotes: 0
			};
		});

		form.on('end', function(fields, files) {
			/* Temporary location of our uploaded file */
			var temp_path = this.openedFiles[0].path;
			/* The file name of the uploaded file */
			var file_name = this.openedFiles[0].name;
			/* Location where we want to copy the uploaded file */
			var new_location = './public/img/';

			fs.copy(temp_path, new_location + file_name, function(err) {  
				if (err) {
					console.error(err);
				} else {
					console.log("success!")
				}
			});
			
			post.image = file_name;
			db.execute(function(database) {
				database.collection('post_collection', function(err, collection) {
					collection.insertOne(post, {w:1}, function(err, result) {
						if(err)
							console.log(err);
					});
				});
			});
			res.statusCode = 302;
			res.setHeader("Location", '/event?eid=' + eventid);
			res.end();
		});
	});
	

	/* Take a location and a radius and return the nearby events */
	router.get('/nearbyEvents', function(req, res) {
		var loc = req.query.location;//.split(',').map(Number);
		loc = loc.map(Number);
		var rad = Number(req.query.radius);
		console.log(rad);
		db.execute(function(database) {
			database.collection('event_instance_collection',function(err, collection) {
				collection.ensureIndex({location:"2dsphere"}, function(err) {
					collection.find( 
						{ 
							location : { 
								$near : { 
									$geometry : { 
										type : "Point" ,
										coordinates : loc 
									},
									$maxDistance : rad
								}
							}
						} ).toArray(function(err, result) {
						res.send(result);
					});
				});
			});
		});
	});
	
	/* Get user profile information */
	router.get('/userInfo', function(req, res) {
		var uid = new ObjectID(req.query.uid);
		if(!uid)
			uid = req.session.passport.user.uid;
			
			
		db.execute(function(database) {
			database.collection('user_collection', function(err, collection) {
				collection.findOne({ _id: uid }, function(err, result) {
					res.send(result);
				});
			});		
		});
	});
	
	/* Get posts by a user */
	router.get('/userPosts', function(req, res) {
		var uid = req.query.uid;
		if(!uid)
			uid = req.session.passport.user.uid;
		
		db.execute(function(database) {
			//TODO find all posts created by user
			database.collection('post_collection', function(err, collection) {
				collection.find({ 'created_by.uid': new ObjectID(uid) }).toArray(function(err, result) {
					res.send(result);
				});
			});
		});
	});
	
	/* Get event information */
	router.get('/eventInfo', isAuthenticated, function(req, res) {
		var eventid = new ObjectID(req.query.eventid);
		// TODO get event information from req.query.eventID
		db.execute(function(database) {
			database.collection('event_collection', function(err, collection) {
				collection.findOne({ _id: eventid }, function(err, result) {
					res.send(result);
				});
			});
		});
	});
	
	/* Get posts about an event */
	router.get('/eventPosts', function(req, res) {
		// TODO get all posts with eventID = req.query.eventID
		var eventid = new ObjectID(req.query.eventid);
		db.execute(function(database) {
			database.collection('post_collection', function(err, collection) {
				collection.find({ event_id: eventid }).toArray(function(err, result) {
					res.send(result);
				});
			});
		});
	});

	return router;
}
