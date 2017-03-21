$(document).ready(function(){

	var ws = new WebSocket("ws://localhost:8080/");
	ws.onopen = function()
	{
			$.ajax({
		        type: "POST",
		        url: "/getsubscribedUsers",
		        async: false,
		        success: function(response) {
		        	// console.log(response);
					$.get( "/getUsers", function( data ) {
						// console.log(data);
						var ret = jQuery.parseJSON(data);
						$("#loginid").text(ret[ret.length-1].userid.toString());
						// console.log("userid:" + ret[ret.length-1].userid.toString());
						try{ws.send(JSON.stringify({userid: ret[ret.length-1].userid.toString()}));}catch(err){
					      // console.log(err.message);
					    }
						$('<input />', {
						        type : 'hidden',
						        id: 'count',
						        name: 'usercount',
						        value: ret.length
					    }).appendTo("#container");
						for (var i = 0; i < ret.length-1; i++) {
							// console.log(response);
							// console.log(ret[i].userid.toString());
							if(response.indexOf(ret[i].userid.toString()) > -1) {
								// console.log("userid found");
							    $('<input />', {
							        type : 'checkbox',
							        id: '' + ret[i].userid,
							        name: 'user',
							        value: ret[i].userid,
							        checked: "checked"
							    }).appendTo("#container");
							} else {
								$('<input />', {
							        type : 'checkbox',
							        id: '' + ret[i].userid,
							        name: 'user',
							        value: ret[i].userid
							    }).appendTo("#container");
							}
						    $('<label />', { 'for': 'cb-'+ret[i].userid, text: ret[i].username }).appendTo("#container");
						}
						$('<br>', {}).appendTo("#container")
						$('<button/>', {
					        text: "Submit Subscription", //set text 1 to 10
					        id: 'submit',
					        click: function () {
					        	// console.log("clicked");
					        	var userstring = '';
					        	var subarray = [];
					        	$("#container input[type=checkbox]").each(function() {

								    if (this.checked) {
								    	var id = $(this).attr('id');
								    	subarray.push(id);
								    }
								});
								userstring = subarray.join("&");
								// console.log(userstring);
								$.ajax({
							        type: "POST",
							        url: "/submitsubscription",
							        data: {userstring: userstring},
							        async: false,
							        success: function(response) {
							       		// console.log(response);
							       		var ret = jQuery.parseJSON(response);
							       		// console.log(response);
							       		if(ret.change == 1) {

							       			ws.send(JSON.stringify({loginid: ret.userid, subscribers: ret.subid, loginname: ret.username}));
							       		}
							       	}
							    });
					        }
					    }).appendTo("#container");
					});
		        }
		    });

	};

	ws.onmessage = function (evt)
	{
	  var received_msg = evt.data;
	  var parsed_data = JSON.parse(received_msg);
	  var msg = parsed_data.notification;
	  var clientid = parsed_data.clientid;
	  console.log(msg);
	  $('<li>' + msg + '</li>').appendTo("#notifications");
	  alert("You have received new notification");

	};

	ws.onclose = function()
	{

	};

	$(window).load(function(){
		$.ajax({
			type: "POST",
	        url: "/getnotification",
	        async: false,
	        success: function(response) {
	        	// console.log(response);
	        	var ret = jQuery.parseJSON(response);
	        	for(var index in ret) {
	        		$('<li>' + ret[index].msg + '</li>').appendTo("#notifications");
	        	}
	        	if(ret.length>0) {

	        		alert("You have received new notification");
	        	}
	        }
		});
	});

	$('#notification').hover(function(){
		console.log("hello");
		$.ajax({
			type: "POST",
	        url: "/deletenotification",
	        async: false,
	        success: function(response) {

	        }
		});
	});
});



