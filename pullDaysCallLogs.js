if(!(process.argv[2]&&process.argv[3]&&process.argv[4])) {

	console.log("Please pass in the following variables: SID, Auth, Date");
	process.exit(1);

}

var rp = require('request-promise');
var fs = require('fs');
var async = require('async');
var moment = require('moment');
var Promise = require('bluebird');
var async = require('async');

var date = moment(process.argv[4], 'YYYY-MM-DD');

var sid = process.argv[2];
var auth = process.argv[3];

var stream = fs.createWriteStream('Call log for ' + sid + ' on ' + date.format('YYYY-MM-DD')+'.csv');
stream.write('Account SID,Call SID,Parent Call SID,From,To,Status,Direction,Start Time,End Time,Duration,Price\n');

if(process.argv[5]) {
	var concurrency = process.argv[5];
} else {
	var concurrency = 25;
}

var q = async.queue(function(task,callback){

	if(task.next_page_uri) {
		var uri = 'https://api.twilio.com' + task.next_page_uri;
	} else {
		var uri = 'https://api.twilio.com/2010-04-01/Accounts/' + sid + '/Calls.json?PageSize=1000&StartTime>=' + task.start + '&StartTime<=' + task.end;
	}
	options = {
		json: true,
		uri: uri,
		method: 'GET',
		auth: {
			user: sid,
			pass: auth
		}
	}

	rp(options)
	.then(function(response){

		// console.log(response);

		async.forEachOf(response.calls, function(item,key){

			stream.write(sid+','+item.sid+','+item.parent_call_sid+','+item.from+','+item.to+','+item.direction+','+item.status+','+item.start_time+','+item.end_time+','+item.duration+','+item.price+'\n');

		});

		if(response.next_page_uri){
			q.push({next_page_uri: response.next_page_uri});
		}

		callback();

	})
	.catch(function(err){
		console.log(err);
	});

},concurrency);

q.drain = function(){
	console.log('All calls pulled');
}

var dates=[];
for(i = 0; i < 48; i++) {

	dates.push({
		start: moment(date).add(30*i,'m').format(),
		end: moment(date).add(30*(i+1),'m').format()
	})

}

q.push(dates);