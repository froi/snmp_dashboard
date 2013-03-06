
console.log('starting app');
var express = require('express');
var mongo =  require('mongoskin');
var BSON = mongo.BSONPure;
var app = express();
var dbConfig = {
    'dbUser' : 'dashboard-user',
    'dbPass' : '123456',
    'dataBase' : 'snmp-logs',
    'dbHost' : 'linus.mongohq.com',
    'dbPort' : '10038'};

var dbConnStr = dbConfig.dbUser + ':' +
        dbConfig.dbPass + '@' +
        dbConfig.dbHost + ':' +
        dbConfig.dbPort + '/' +
        dbConfig.dataBase;

app.get('/alerts', function(req,res){
    console.log('entered get alerts');
    var conn = mongo.db(dbConnStr);
    
    console.log('Quering mongoDB with user: ' + dbConfig.dbUser +
                'server: ' + dbConfig.dbHost +
                'port: ' + + dbConfig.dbPort +
                ' data base: ' + dbConfig.dataBase );
    var filterObj = {};
    
    for(var prop in req.query) {
        console.log('prop: ' + prop);
        filterObj[prop] = prop === 'dscr' ? new RegExp('.*' + req.query[prop] + '.*', 'i') : 
            prop === 'value' ? new RegExp('.*' + req.query[prop] + '.*', 'i') :  req.query[prop];
    }
    console.log(filterObj);
    conn.collection("snmp_logs").find(filterObj).toArray(function(err, items){
        if(err) throw err;
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With');
        res.status(200).send(JSON.stringify(items));
    });
});

app.post('/alerts/:id/close', function(req, res){
    var objId = req.params.id;
    console.log(objId);
    var conn = mongo.db(dbConnStr);
    
    var o_id = new BSON.ObjectID(objId);
    
    conn.collection('snmp_logs').update(
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
});

app.post('/alerts/:id/update', function(req, res){
    var objId = req.params.id;
    console.log(objId);
    var conn = mongo.db(dbConnStr);
    var o_id = new BSON.ObjectID(objId);
    var updateObj = {};

    updateObj.udpDate = new Date();

    for(var prop in req.query) {
        console.log('prop: ' + prop);
        updateObj[prop] = req.query[prop];
    }

    conn.collection('snmp_logs').update( {'_id': o_id},
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
    
});

console.log('App listening on port 9100');
app.listen(process.env.PORT);