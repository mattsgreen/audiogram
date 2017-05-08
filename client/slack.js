
function sendMessage(payload) {
	// Whitelist logging is done direclty within whitelist.html, so update the webook there too if it changes
	var webhook = {
					"live" : "https://hooks.slack.com/services/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",
					"dev" : "https://hooks.slack.com/services/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"
				  };
	var url = (window.location.href.includes("localhost")) ? webhook.dev : webhook.live;
	jQuery.ajax({
		url: url,
		data: JSON.stringify(payload),
		cache: false,
		contentType: false,
		processData: false,
		type: 'POST',
		success: function(data){
			// console.log(data);
		}
	});
}

function info(msg,fields,fallback) {
	fallback = fallback || msg.split("\n")[0];
	var text = msg ? USER.email ? msg.replace(USER.name,"<http://ad-lookup.bs.bbc.co.uk/adlookup.php?q=" + USER.email + "|" + USER.name + ">") : msg : null,
		payload = { "attachments": [{
	                "fallback": fallback,
	                "text": text,
	                "color": "#007ab8",
	                "mrkdwn_in": ["text", "pretext"]
	              }]};
	if (fields) {
		payload.attachments[0].fields = fields;
	}
	sendMessage(payload);
}

function error(msg,err) {
	var stack = err.stack,
		trace = stack ? stack.replace(/    at /g, '').replace(/    at /g, '').split("\n")[2].replace(err.path,"") : null,
		user = USER.email ? "<http://ad-lookup.bs.bbc.co.uk/adlookup.php?q=" + USER.email + "|" + USER.name + ">" : USER.name,
		payload = { "attachments": [{
	                "fallback": "NodeJS Error: " + msg,
	                "pretext": "ATTN: <!channel>...",
	                "fields": [
	                	{
	                		"title": "NodeJS Error",
	                		"value": msg,
	                		"short": false
	                	},
	                	{
	                		"title": "Trace",
	                		"value": trace,
	                		"short": true
	                	},
	                	{
	                		"title": "User",
	                		"value": user,
	                		"short": true
	                	}
	                ],
	                "color": "#FF0000",
	                "mrkdwn_in": ["text", "pretext"]
	              }]};
	sendMessage(payload);
}

function warn(msg,err) {
	var stack = err.stack,
		trace = stack ? stack.replace(/    at /g, '').replace(/    at /g, '').split("\n")[2].replace(window.location.href,"/") : null,
		url = window.location.href + trace.match(/\(?\/(.*):(.*):/)[1];
	if (trace.includes("(")) {
		trace = trace.replace("(","(<"+url+"|").replace(")",">)");
	} else {
		trace = "<"+url+"|"+trace+">";
	}
	var user = USER.email ? "<http://ad-lookup.bs.bbc.co.uk/adlookup.php?q=" + USER.email + "|" + USER.name + ">" : USER.name,
		payload = { "attachments": [{
	                "fallback": "Warning: " + msg,
	                "fields": [
	                	{
	                		"title": "Warning",
	                		"value": msg,
	                		"short": false
	                	},
	                	{
	                		"title": "Trace",
	                		"value": trace,
	                		"short": true
	                	},
	                	{
	                		"title": "User",
	                		"value": user,
	                		"short": true
	                	},
	                	{
	                		"title": "User Agent",
	                		"value": navigator.userAgent,
	                		"short": false
	                	}
	                ],
	                "color": "#DE9E31",
	                "mrkdwn_in": ["text", "pretext"]
	              }]};
	sendMessage(payload);
}

function success(result) {
	var url = window.location.href.slice(0,-1) + result.url,
		user = USER.email ? "<http://ad-lookup.bs.bbc.co.uk/adlookup.php?q=" + USER.email + "|" + USER.name + ">" : USER.name,
		payload = { "attachments": [{
	                "fallback": USER.name + "'s video is ready.",
	                "fields": [
	                	{
	                		"title": "Audiogram Finished",
	                		"value": "<" + url + "|..." + result.id.split("-").pop() +">",
	                		"short": true
	                	},
	                	{
	                		"title": "User",
	                		"value": user,
	                		"short": true
	                	}
	                ],
	                "color": "#2ab27b",
	                "mrkdwn_in": ["text", "pretext"]
	              }]};
	sendMessage(payload);
}

module.exports = {
  info: info,
  warn: warn,
  error: error,
  success: success
}