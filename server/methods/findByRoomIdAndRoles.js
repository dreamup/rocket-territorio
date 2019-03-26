import { Subscriptions } from '../../app/models/server';
import { Meteor } from 'meteor/meteor';

Meteor.methods({
	async findByRoomIdAndRoles(roomId, roles) {
		const result = await Subscriptions.findByRoomIdAndRoles(roomId, roles, {
			rid: 1,
			name: 1,
			roles: 1,
			u: 1,
		});

		console.log(result);

		return { result };
	},
});
