//
//  REST_execute.js
//
//	a RESTful handler for the /start /stop /query request handling
//	NOTE: these are currently loaded in SR.Component.REST
//

var l_name = 'Monitor.execute';
var l_handles = exports.REST_handles = {};

const ansi_up = require('ansi_up');				// converts console message to colorful HTML
const humanize = require('humanize');			// better human readability

// handle server starting requests
l_handles.start = function (path_array, res, para, req) {
	var owner = path_array[2];
	var project = path_array[3];
	var name = path_array[4];

	if (owner === undefined || project === undefined) {
		return SR.REST.reply(res, 'cannot start server, missing owner/project');
	}

	var size = (path_array[5] === undefined ? 1 : parseInt(path_array[5]));

	SR.API._START_SERVER({
		owner: owner, 
		project: project, 
		name: name,
		size: size,
		onOutput: function (output) {

			// make output HTML displable
			// TODO: do this at the client to save bandwidth?
			if (SR.Settings.REFORMAT_HTML_TEXT === true)
				output.data = humanize.nl2br(ansi_up.ansi_to_html(output.data));
			
			// record to file	
			SR.StreamManager.publish(output.id, output);
		}	
	}, function (err, list) {
		if (err) {
			LOG.error(err, l_name);
			return SR.REST.reply(res, []);
		}

		LOG.warn('execute success:', l_name);
		LOG.warn(list, l_name);
		SR.REST.reply(res, list);
	});
}

// handle server stopping requests
l_handles.stop = function (path_array, res, para, req) {
	var id = path_array[2];
	var project = path_array[3]
	LOG.warn('id: [' + id + '], project: [' + project + ']', 'stop');

	if (id === undefined && !project) {
		return SR.REST.reply(res, 'need to specify serverID');
	} else if (id === 'self') {
		LOG.warn('received self shutdown request', 'SR.REST');
		SR.Settings.FRONTIER.dispose();
		return;
	}

	SR.Execute.stop(id, project, function (msg) {
		LOG.warn('SR.Execute.stop done', 'SR.REST');
		SR.REST.reply(res, msg);
		l_deleteStoppedServer(id);
	});
}

function l_deleteStoppedServer(serverID) {
	delete SR.startedServers[serverID];
	var logfile = SR.path.resolve(SR.Settings.LOG_PATH, SR.Settings.Project.serverList);
	
	SR.fs.writeFile(logfile, JSON.stringify(SR.startedServers), function (err) {
		if (err) {
			return LOG.error(err, l_name);
		}
		LOG.warn("Delete log from startedServers.", l_name);
	}); 
}

// handle server query requests
l_handles.query = function (path_array, res, para, req) {

	var owner   = path_array[2];
	var project = path_array[3];
	var name    = path_array[4];

	SR.Execute.query({owner: owner, project: project, name: name}, function (list) {
		LOG.sys('SR.Execute.query return info on ' + list.length + ' servers', 'SR.REST');
		SR.REST.reply(res, list);
	});
}

SR.REST.addHandler(l_handles);
