var clientconn_obj = [];
var client_no = [];
var clientid_list = [];
var clientconn_list = [];
var n = 0;
var server = require('websocket').server, http = require('http');

var socket = new server({
    httpServer: http.createServer().listen(8080)
});
socket.on("connect", function ( client ) {
    // client.send("welcome");
    console.log("connection established with client");

    clientconn_list.push(client);
});

socket.on('request', function(request) {
    var sockconnection = request.accept(null, request.origin);
    console.log("client connected");
    n = n + 1;
    client_no.push(n);

    sockconnection.on('message', function(message) {
         var msg = JSON.parse(message.utf8Data);
         console.log(msg);
        if(msg.hasOwnProperty('userid')){
            clientconn_obj.push(sockconnection);
    		clientid_list.push(msg.userid);
    		console.log(clientid_list);

        } else {
            if(msg.hasOwnProperty('subscribers')) {
                for(var sub=0;sub<msg.subscribers.length;sub++) {
                    for(var client in clientid_list) {
                        if(clientid_list[client] == msg.subscribers[sub] && clientid_list[client] != msg.loginid) {
                            clientconn_list[client].send(JSON.stringify({notification: "User " + msg.loginname + " has changed his subscription", clientid: msg.subscribers[sub] }));
                        }
                    }
                }
            }
        }

    });

    sockconnection.on('close', function(connec) {
        for (var i in clientconn_obj) {
            //console.log("hello");
              if(clientconn_obj[i] == sockconnection){
                console.log("it is present");
                clientconn_obj.splice(i, 1);
                clientconn_list.splice(i,1);
                clientid_list.splice(i,1);
              }

        }

        console.log('connection closed');
        n = n - 1;
    });

});
