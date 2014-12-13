#!/usr/bin/env node

var assert = require('assert');

assert(process.env.MEETUP_KEY, 'MEETUP_KEY variable isn\'t set on enviroment (use \'set "MEETUP_KEY=key"\' on Windows)');

var meetup = require('../lib/meetup')();

var endpoints = require('../lib/endpoints.json');

console.log("%s ver %s Test\n\n", meetup.description, meetup.version);

assert(!meetup.authkey, 'Authkey getter failed');
console.log('Authkey getter\t\tPASS');
meetup.authkey = process.env.MEETUP_KEY;
assert(meetup.authkey, 'Authkey setter failed');
console.log('Authkey setter\t\tPASS');

meetup.dependencies.superagent = 0;
assert(meetup.dependencies.superagent !== 0, 'Read Only properties can be writed');
console.log('Read Only properties\t\tPASS');

console.log('\nModule functions check:\n')

function objectType(obj) {
	switch (typeof obj) {
		case 'object':
			return (Array.isArray(obj)) ? "array" : "object";
			break;
		default:
			return typeof obj;
	}
};

var checkEndpoint = {};

checkEndpoint.http = function (endpointkey) {
	meetup[endpointkey](endpoints[endpointkey].test.params, function(err, ret) {
		(function(errors) {
			ret.problem = errors || ret.problem;
			ret.code = errors && errors.code || ret.problem;
			ret.details = errors && errors.message || ret.details;

		})(
			ret && ret.errors && ret.errors.pop()
		);

		assert(!ret.problem, ret.code + ' (' + ret.details + ')\n');

		assert(!err, err);

		assert.equal(objectType(ret), endpoints[endpointkey].test.return.type, endpointkey + ' not return an ' + endpoints[endpointkey].test.return.type);

		switch (objectType(ret)) {
			case 'object':
				assert(endpoints[endpointkey].test.return.keys, endpointkey + ' hasn\'t defined keys on endpoints.json');

				endpoints[endpointkey].test.return.keys.forEach(function(returnkey) {
					assert(ret.hasOwnProperty(returnkey), endpointkey + ' not return the ' + returnkey + ' key');
				});

				break;
			default:
		}

		console.log('%s\t\tPASS', endpointkey);
	});
};

checkEndpoint.ws = function (endpointkey) {
	var ws = meetup[endpointkey](endpoints[endpointkey].params)
		.on('data', function(ret) {
			ws.abort();
			switch (objectType(ret)) {
				case 'object':
					assert(endpoints[endpointkey].test.return.keys, endpointkey + ' hasn\'t defined keys on endpoints.json');

					endpoints[endpointkey].test.return.keys.forEach(function(returnkey) {
						assert(ret.hasOwnProperty(returnkey), endpointkey + ' not return the ' + returnkey + ' key');
					});

					break;
				default:
			}
		})
		.on('close', function () {
			console.log('%s\t\tPASS', endpointkey);
		});
};

meetup.commands
	.filter(function(command) {
		return endpoints[command].hasOwnProperty('test') &&
			!endpoints[command].test.hasOwnProperty('disabled') &&
			!endpoints[command].resource.match(/^ws\:/);
	})
	.forEach(function(command, index) {
		setTimeout(function() {
			checkEndpoint.http(command);
		}, 1000 * index + 1);
	});

process.on('exit', function(code) {
	if (!code) {
		console.log("\nDone!");
	}
});