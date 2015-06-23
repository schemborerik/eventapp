var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var mongoURL = 'mongodb://localhost:27017/eventApp';

var database;

module.exports.connect = function() {
	MongoClient.connect(mongoURL, function(err, db) {
		assert.equal(null,err);
		database = db;
	});
}

module.exports.execute = function(callback) {
	if(typeof database != 'undefined')
		callback(database);
}