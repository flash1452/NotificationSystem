
/**
* Module dependencies.
*/

var express = require('express')
, routes = require('./routes');
var mysql = require('mysql');
var fs = require("fs");
var bodyParser = require('body-parser');
const crypto = require('crypto');
var session = require('express-session');
var path = require('path');
var Q = require('q');


var connection = mysql.createConnection({
host     : 'localhost',
user     : 'root',
password : 'vishal',
database : 'socialcops_db'
});


connection.connect();

var app = module.exports = express.createServer();

// Configuration
app.set('port', process.env.PORT || 3000);
app.configure(function(){
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.set('port', process.env.PORT || 3000);
app.use(session({secret: 'ssshhhhh'}));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(__dirname + '/'));
app.use(express.cookieParser());
});

app.configure('development', function(){
app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
app.use(express.errorHandler());
});


// Routes

app.get('/home', function (req, res) {
  fs.readFile("index.html", function(err, data){
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.write(data);
    res.end();
  });
})



app.post('/login', function (req, res) {
  // console.log(req.body.username);
  // console.log(req.body.password);
  var TABLE = 'users';
  var USERNAME = req.body.username;
  var PASSWORD = req.body.password;
  connection.query("SELECT * FROM " +TABLE+" WHERE username = ?",[USERNAME],
  function(err, result, fields) {
      if (err) throw err;
      else {
          // console.log('Checking if user already exists');
          // console.log('----------------------------------');

           //Insert the user details if user is a new user.

          if (result.length == 0) {
              var post = {
                 username: USERNAME,
                 password: PASSWORD
              };
              connection.query("INSERT INTO users SET ?", post, function (err, insresult) {
                  if (err) throw err;
                  else {
                      // console.log("User successfully inserted.");
                      //set session values to make authentication easy.
                      var sess = req.session;
                      sess.userid = insresult.insertId;
                      sess.userhash = generatehash();
                      sess.username = USERNAME;
                      setHashandId(insresult.insertId, sess.userhash);
                      res.send("Logged in successfully");
                  }
              });

          } else {

            //Just check for password if the username matches means user has already visited once.
              if (result.length == 1) {
                  if (result[0].password == PASSWORD) {
                      // console.log("User authentication successful");
                      //set session variables for authentication
                      // console.log(result[0].userid);
                      var sess = req.session;
                      sess.userid = result[0].userid;
                      sess.userhash = generatehash();
                      sess.username = USERNAME;
                      setHashandId(sess.userid, sess.userhash);
                      res.send("Logged in successfully");
                  } else {
                    //If password doesn't match means the creddentials are wrong.
                      // console.log("User wrong password.");
                      res.render('error', { title: 'Error Message' , message: 'User wrong password.'});
                  }
              }
          }
      }
  });
    //set userid along with its hash in currentusers table to check for authentication.
  function setHashandId(userid, userhash) {
    var post = {
                  userid: userid,
                  userhash: userhash
                };
    connection.query("INSERT INTO currentusers SET ?", post, function (err, insresult) {

    });

  }

})


//getUsers - get all users who have registered and return their ids and username.
app.get('/getUsers', function (req, res) {
  var USERHASH = req.session.userhash;
  var USERID = req.session.userid;
  checkauth(USERID, USERHASH).then(function(access){
    // console.log(access);
    if(access) {
        connection.query("SELECT userid , username FROM users", function (err, result) {
            var userdetail = [];
           for (index in result) {
              if (result[index].userid != USERID) {

                userdetail.push({userid:result[index].userid, username:result[index].username});
              }
           }
           userdetail.push({userid:USERID, username:""});
           mapUserDetail(userdetail);
        });
        function mapUserDetail(detailarray, USERID) {
            var userdetail = detailarray.concat();
            res.send(JSON.stringify(userdetail));
        }
    } else {
        res.render('error', { title: 'Error Message' , message: 'You need to login first.'});
    }
  })

})



////get subscribers for currently loggedin user and return an array of userids.
app.post('/getsubscribedUsers',function(req, res) {
  var USERHASH = req.session.userhash;
  var USERID = req.session.userid;
  checkauth(USERID, USERHASH).then(function(access){
    // console.log(access);
    if(access) {
        connection.query("SELECT subscribedto FROM submapping WHERE subscribedby = ?",[USERID] ,function (err, result) {
           if(result.length > 0) {

            var subscriberlist = result[0].subscribedto.split("&");
            res.send(subscriberlist);
          } else {

            res.send([]);
          }
        });
    } else {
        res.render('error', { title: 'Error Message' , message: 'You need to login first.'});
    }
  })
})


//submit new list of subcribed users for currently loggedin user if there is any change in subscriberlist
//push it to database and generate notification.
app.post('/submitsubscription',function(req,res){
  // console.log(req.body.userstring);
  var USERID = req.session.userid;
  var USERHASH = req.session.userhash;
  var USERNAME = req.session.username;
  var TABLE = 'submapping';
  checkauth(USERID, USERHASH).then(function(access){
    // console.log(access);
    if(access) {
        var userstring = req.body.userstring;
        connection.query("SELECT subscribedby, subscribedto FROM " +TABLE+" WHERE subscribedby = ?",[USERID], function(err, result) {
            if(err) throw err;
            else {
                if (result.length == 0) {
                    var post = {
                        subscribedto: userstring,
                        subscribedby: USERID
                    };
                    //Insert new subscriber list if user didn't subscribed to anyone before.
                    connection.query("INSERT INTO submapping SET ?", post, function (err, insresult) {
                        if (err) throw err;
                        else {
                            var subscriberlist = [];
                            connection.query("SELECT subscribedby, subscribedto FROM submapping", function(err, result) {
                                for(var index=0;index<result.length;index++) {
                                    var substo = result[index].subscribedto.split("&");
                                    if(substo.indexOf(USERID.toString()) > -1 ) {
                                        subscriberlist.push(result[index].subscribedby);
                                    }
                                }
                                // console.log(subscriberlist);
                                for(var subuser in subscriberlist) {
                                    if(subuser != USERID) {
                                        var post = {userid: subuser, message:"User " + USERNAME + " has changed his subscription"};
                                        //Insert into notification table and mark status as 1 in table meaning the
                                        //notifications are currently unread by user.
                                        connection.query("INSERT INTO notification SET ?", post, function (err, insresult) {
                                            if (err) throw err;
                                            else {
                                                // console.log("Notification successfully inserted");
                                            }
                                        });
                                    }
                                }
                                res.send(JSON.stringify({change:1, userid:USERID, subid:subscriberlist, username:USERNAME}));
                            });
                        }
                    });
                } else {
                    if (result.length == 1) {
                        var post = {
                           subscribedto: userstring,
                           subscribedby: USERID
                        };
                        if (result[0].subscribedto != userstring) {
                          //update the list of users to which the current loggedin user has subscribed to
                          //push it to database and generate notifications.
                            connection.query('UPDATE submapping SET subscribedto = ? WHERE subscribedby = ?', [userstring, USERID] , function(err, updresult) {
                                if (err) throw err;
                                else {
                                    // console.log("Subscription successfully updated.");
                                    var subscriberlist = [];
                                    connection.query("SELECT subscribedby, subscribedto FROM submapping", function(err, result) {
                                        for(var index=0;index<result.length;index++) {
                                            var substo = result[index].subscribedto.split("&");
                                            if(substo.indexOf(USERID.toString()) > -1 ) {
                                                subscriberlist.push(result[index].subscribedby);
                                            }
                                        }
                                        // console.log(subscriberlist);
                                        for(var subuser in subscriberlist) {
                                            if(subscriberlist[subuser] != USERID) {
                                                var post = {userid: subscriberlist[subuser], message:"User " + USERNAME + " has changed his subscription"};
                                                //Insert into notification table and mark status as 1 in table meaning the
                                                //notifications are currently unread by user.
                                                connection.query("INSERT INTO notification SET ?", post, function (err, insresult) {
                                                    if (err) throw err;
                                                    else {
                                                        // console.log("Notification successfully inserted");
                                                    }
                                                });
                                            }
                                        }
                                        res.send(JSON.stringify({change:1, userid:USERID, subid:subscriberlist,username:USERNAME}));
                                    });
                                }
                            });
                        } else {
                              res.send(JSON.stringify({change:0, userid:USERID}));
                        }
                    }
                }
            }
        });
    } else {
        res.render('error', { title: 'Error Message' , message: 'You need to login first.'});
    }
  })

})

app.post('/deletenotification',function(req, res) {
  var USERID = req.session.userid;
   connection.query('UPDATE notification SET status = 0 WHERE userid = ?',[USERID] ,function(err, updresult) {
   });
   res.end();
})

app.post('/getnotification', function(req, res){
  var USERID = req.session.userid;
  connection.query("SELECT message, userid FROM notification WHERE status = 1 AND userid = ?",[USERID] ,function(err, result) {
      var notification = [];
      for(var index=0;index<result.length;index++) {
        notification.push({msg: result[index].message, userid: result[index].userid});
      }
      pushnotification(notification);
  });
  function pushnotification(notification) {
    // console.log(notification);
    res.send(JSON.stringify(notification));
  }
})

//Destroy session and logout.
app.get('/logout',function(req,res){
  var USERID = req.session.userid;
  var USERHASH = req.session.userhash;
  deleteuser(USERID, USERHASH);
  req.session.destroy(function(err) {
      if(err) {
      // console.log(err);
      } else {
      res.redirect('/home');
      }
  });
})


app.listen(3000, function(){
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
});

//function for genearting randon hash to store in session.
function generatehash() {
  var id = crypto.randomBytes(20).toString('hex');
  return id;
}
//take userid and userhash from session and check in backend if the pairing is correct fro authentication.
function checkauth(userid, userhash) {
  // console.log("checking auth");
  var access = false;
  var defer = new Q.defer();
    connection.query("SELECT userhash FROM currentusers WHERE userid =  ? AND userhash = ?",[userid, userhash] , function (err, result) {
        if(result.length > 0) {
          // console.log("match found");
            access = true;
        } else {
          access = false;
        }
        defer.resolve(access);
    });
  return defer.promise;
}
// take userid and userhashfrom currentuser table and delete the corresponding pair in case of logout.
function deleteuser(userid, userhash) {
  connection.query("DELETE FROM currentusers WHERE userid =  ? AND userhash = ?",[userid, userhash] , function (err, result) {
    if (err) throw err;
  });
}
