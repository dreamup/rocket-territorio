import { Meteor } from 'meteor/meteor';

Meteor.methods({
	getRolesAndChannels() {
		return [{
			role: 'admin',
			channel: 'euganei-supporto',
			channel_id: 'KADYujaAd7GyTkRxQ',
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
