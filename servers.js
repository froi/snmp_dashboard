var http = require('http');

http.createServer(function(req,res){
    var path = require("url").path;
    
    if(path === '/hello') {
        res.writeHead(200, {'content-type':'text/plain'});
        res.end('Hello');
    }
}).listen(process.env.PORT, process.env.IP);
console.log("server started");