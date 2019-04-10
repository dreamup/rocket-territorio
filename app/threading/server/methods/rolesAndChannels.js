import { Meteor } from 'meteor/meteor';

Meteor.methods({
	getRolesAndChannels() {
		return [{
			role: 'admin',
			channel: 'euganei-supporto',
		},
		{
			role: 'euganei',
			channel: 'euganei-supporto',
		}, {
			role: 'biovenezie',
			channel: 'biovenezie-supporto',
		}];
	},
});
