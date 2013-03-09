#!/bin/env node
//  OpenShift sample Node application
var express = require('express');
var fs      = require('fs');


/**
 *  Define the sample application.
 */
var SampleApp = function() {

    //  Scope.
    var self = this;

    /*  ================================================================  */
    /*  Helper functions.                                                 */
    /*  ================================================================  */

    /**
     *  Set up server IP address and port # using env variables/defaults.
     */
    self.setupVariables = function() {
        //  Set the environment variables we need.
        self.ipaddress = process.env.OPENSHIFT_INTERNAL_IP;
        self.port      = process.env.OPENSHIFT_INTERNAL_PORT || 8080;
        self.mongo = require('mongoskin');
		self.BSON = self.mongo.BSONPure;

		self.dbConfig = {
			'dbUser' : 'dashboard-user',
			'dbPass' : '123456',
			'dataBase' : 'snmp-logs',
			'dbHost' : 'linus.mongohq.com',
			'dbPort' : '10038'};

		self.dbConnStr = self.dbConfig.dbUser + ':' +
			self.dbConfig.dbPass + '@' +
			self.dbConfig.dbHost + ':' +
			self.dbConfig.dbPort + '/' +
			self.dbConfig.dataBase;

		self.conn = self.mongo.db(self.dbConnStr)

        if (typeof self.ipaddress === "undefined") {
            //  Log errors on OpenShift but continue w/ 127.0.0.1 - this
            //  allows us to run/test the app locally.
            console.warn('No OPENSHIFT_INTERNAL_IP var, using 127.0.0.1');
            self.ipaddress = "127.0.0.1";
        };
    };


    /**
     *  Populate the cache.
     */
    self.populateCache = function() {
        if (typeof self.zcache === "undefined") {
            self.zcache = { 'index.html': '' };
        }

        //  Local cache for static content.
        self.zcache['index.html'] = fs.readFileSync('./index.html');
    };


    /**
     *  Retrieve entry (content) from cache.
     *  @param {string} key  Key identifying content to retrieve from cache.
     */
    self.cache_get = function(key) { return self.zcache[key]; };


    /**
     *  terminator === the termination handler
     *  Terminate server on receipt of the specified signal.
     *  @param {string} sig  Signal to terminate on.
     */
    self.terminator = function(sig){
        if (typeof sig === "string") {
           console.log('%s: Received %s - terminating sample app ...',
                       Date(Date.now()), sig);
           process.exit(1);
        }
        console.log('%s: Node server stopped.', Date(Date.now()) );
    };


    /**
     *  Setup termination handlers (for exit and a list of signals).
     */
    self.setupTerminationHandlers = function(){
        //  Process on exit and signals.
        process.on('exit', function() { self.terminator(); });

        // Removed 'SIGPIPE' from the list - bugz 852598.
        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
         'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function(element, index, array) {
            process.on(element, function() { self.terminator(element); });
        });
    };


    /*  ================================================================  */
    /*  App server functions (main app logic here).                       */
    /*  ================================================================  */

    /**
     *  Create the routing table entries + handlers for the application.
     */
    self.createRoutes = function() {
        self.httpGetRoutes = { };
        self.httpPostRoutes = { };
		
        // Get paths for /alerts, /
		self.httpGetRoutes['/alerts'] = function (req, res) {
			console.log('entered get alerts');
			
			console.log('Quering mongoDB with user: ' + self.dbConfig.dbUser +
						'server: ' + self.dbConfig.dbHost +
						'port: ' + + self.dbConfig.dbPort +
						' data base: ' + self.dbConfig.dataBase );
			var filterObj = {};
			
			for(var prop in req.query) {
				console.log('prop: ' + prop);
				filterObj[prop] = prop === 'dscr' ? new RegExp('.*' + req.query[prop] + '.*', 'i') : 
					prop === 'value' ? new RegExp('.*' + req.query[prop] + '.*', 'i') :  req.query[prop];
			}
			console.log(filterObj);
			self.conn.collection("snmp_logs").find(filterObj).toArray(function(err, items){
				if(err) throw err;
				res.setHeader('Access-Control-Allow-Origin', '*');
				res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With');
				res.status(200).send(JSON.stringify(items));
			});
		};

        self.httpGetRoutes['/'] = function(req, res) {
            res.setHeader('Content-Type', 'text/html');
            //res.send(self.cache_get('index.html') );
            for( var item in self.zcache) {
				res.send(self.cache_get(item));
			}
        };

        self.httpPostRoutes['/alerts/:id/close'] = function(req, res) {
			var objId = req.params.id;
			console.log(objId);
			
			var o_id = new BSON.ObjectID(objId);
			
			self.conn.collection('snmp_logs').update(
					{'_id': o_id},
					{$set:{status:'closed', 'udpDate': new Date()}}, function(err, result) {
				res.setHeader('Access-Control-Allow-Origin', '*');
				res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With');
				if (!err) {
					console.log('Status updated! ' + result);
					
					res.status(200).setHeader('Content-Type', 'text/plain');
					res.end('Update successful.');
				} else {
					console.log('Error occured' + err);
					res.status(500).setHeader('Content-Type', 'text/plain');
					res.end('Update had an unforseen error.');
				}
			});
		};

		self.httpPostRoutes['/alerts/:id/update'] = function(req, res) {
			var objId = req.params.id;
			console.log(objId);

			var o_id = new BSON.ObjectID(objId);
			var updateObj = {};

			updateObj.udpDate = new Date();

			for(var prop in req.query) {
				console.log('prop: ' + prop);
				updateObj[prop] = req.query[prop];
			}

			self.conn.collection('snmp_logs').update( {'_id': o_id},
					{$set: updateObj}, function(err, result) {
				res.setHeader('Access-Control-Allow-Origin', '*');
				res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With');
				if (!err) {
					console.log('Record with id: ' + o_id + ' updated! ' + result);
					
					res.status(200).setHeader('Content-Type', 'text/plain');
					res.end('Update successful.');
				} else {
					console.log('Error occured' + err);
					res.status(500).setHeader('Content-Type', 'text/plain');
					res.end('Update had an unforseen error.');
				}
			});
		};
    };

    /**
     *  Initialize the server (express) and create the routes and register
     *  the handlers.
     */
    self.initializeServer = function() {
        self.createRoutes();
        self.app = express();

		self.app.use('/assets/scripts', express.static(__dirname + '/assets/scripts'));
		self.app.use('/assets/styles', express.static(__dirname + '/assets/styles'));
        //  Add handlers for the app (from the routes).
        for (var getRoute in self.httpGetRoutes) {
            self.app.get(getRoute, self.httpGetRoutes[getRoute]);
        }
        for (var postRoute in self.httpPostRoutes) {
            self.app.post(postRoute, self.httpPostRoutes[postRoute]);
        }
    };


    /**
     *  Initializes the sample application.
     */
    self.initialize = function() {
        self.setupVariables();
        self.populateCache();
        self.setupTerminationHandlers();

        // Create the express server and routes.
        self.initializeServer();
    };


    /**
     *  Start the server (starts up the sample application).
     */
    self.start = function() {
        //  Start the app on the specific interface (and port).
        self.app.listen(self.port, self.ipaddress, function() {
            console.log('%s: Node server started on %s:%d ...',
                        Date(Date.now() ), self.ipaddress, self.port);
        });
    };

};   /*  Sample Application.  */



/**
 *  main():  Main code.
 */
var zapp = new SampleApp();
zapp.initialize();
zapp.start();

