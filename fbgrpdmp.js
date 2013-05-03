//Stuff
var graph = require('fbgraph');
var fs = require('fs');

graph.setAccessToken('YOUR ACCESS TOKEN FROM https://developers.facebook.com/tools/explorer/');

var fetchFeed = function (id, callback) {
	var data = [];

	var oldTime = false;

	var getCallback = function (err, res) {
		if (!res.data || !res.data.length) {
			callback(data);

			return;
		}

		//Are we in a loop?
		var time = res.data[res.data.length-1].created_time;
		if (oldTime!==false && oldTime===time) {
			callback(data);

			return;
		}

		oldTime = time;

		data = data.concat(res.data);

		if (!res.paging || !res.paging.next) {
			callback(data);

			return;
		}

		graph.get(id+'/feed', {until: time}, getCallback);
	};

	graph.get(id+'/feed', getCallback);
};

//
var groupID = process.argv[2];

if (!groupID) {
	console.log('Please pass a group ID.');

	return;
}

console.log('Fetching data for group ID: '+groupID+'...');

//
graph.get(groupID, function (err, res) {
	if (res.error) {
		console.error('Bad stuff happened!', res);
		return;
	}

	var group = res;

	console.log('Fetching feed of '+(group.owner?group.owner.name:'Unknown Person')+'\'s '+group.name+'...');

	fetchFeed(group.id, function (feed) {
		console.log('Parsing feed...');

		var feedHTML = '<!doctype html><html><head><meta charset="utf8"></head><body>';

		for (var i = 0; i < feed.length; i++) {
			feedHTML += '<div>';
			feedHTML += '<h1>'+feed[i].from.name+'</h1>';
			feedHTML += '<span>'+feed[i].message+'</span>';
			feedHTML += '<div>';
			if (feed[i].comments && feed[i].comments.data)
				for (var j = 0; j < feed[i].comments.data.length; j++) {
					feedHTML += '<div>';
					feedHTML += '<h2>'+feed[i].comments.data[j].from.name+'</h2>';
					feedHTML += '<span>'+feed[i].comments.data[j].message+'</span>';
					feedHTML += '</div>';
				}
			feedHTML += '</div>';
			feedHTML += '</div>';
			feedHTML += '<hr>';
		}
		
		feedHTML += '</body></html>';

		console.log('Writing data...');

		fs.writeFileSync(group.name+'('+group.id+')_data.json', JSON.stringify(group));
		fs.writeFileSync(group.name+'('+group.id+')_feed.json', JSON.stringify(feed));
		fs.writeFileSync(group.name+'('+group.id+')_feed.html', feedHTML);

		console.log('Done!');
	});
});