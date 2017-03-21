var ws = new WebSocket("ws://localhost:8080/");
	ws.onopen = function()
   {
      // Web Socket is connected, send data using send()
      //ws.send("Message to send");
      alert("i HAVE CONNECTED");
      try{ ws.send(JSON.stringify({user_id:$.cookie("wms_id")}));}catch(err){
      console.log(err.message);
      }
   };

   ws.onmessage = function (evt)
   {
      var received_msg = evt.data;
      alert("Message is received...");
   };

   ws.onclose = function()
   {
      // websocket is closed.
      alert("Connection is closed...");
   };
