import { Meteor } from 'meteor/meteor';
import { roomTypes } from '../../../../utils';
import { callbacks } from '../../../../callbacks';
import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { AutoComplete } from 'meteor/mizzao:autocomplete';
import { ChatRoom, ChatSubscription } from '../../../../models';
import { Blaze } from 'meteor/blaze';
import { call } from '../../../../ui-utils';
import _ from 'underscore';

import { TAPi18n } from 'meteor/tap:i18n';
import toastr from 'toastr';


Template.CreateThread.helpers({

	onSelectUser() {
		return Template.instance().onSelectUser;
	},
	selectedTags() {
		return Template.instance().selectedTags.get();
	},
	disabled() {
		if (Template.instance().selectParent.get()) {
			return 'disabled';
		}
	},
	tags() {
		return {
			coltura: ['cereali', 'frutta', 'ortaggi', 'vite', 'olivo', 'prati', 'altro'],
			tipo: ['campo', 'trasformazione', 'cert bio', 'altro'],
			genere: ['manutenzione', 'suolo', 'infestanti', 'difesa'],
			motivo: ['parassita', 'patogeno', 'qualità'],
		};
	},
	isSlide0() {
		return Template.instance().modalSlideState.get() === 0;
	},
	// coltura
	isSlide1() {
		return Template.instance().modalSlideState.get() === 1;
	},
	// tipo
	isSlide2() {
		return Template.instance().modalSlideState.get() === 2;
	},
	// genere
	isSlide3() {
		return Template.instance().modalSlideState.get() === 3;
	},
	// motivo
	isSlide4() {
		return Template.instance().modalSlideState.get() === 4;
	},
	isLastSlide() {
		return Template.instance().modalSlideState.get() === 5;
	},
	prevIsDisabled() {
		if (Template.instance().modalSlideState.get() > 0) {
			return '';
		}
		return 'disabled';
	},
	nextIsDisabled() {
		const instance = Template.instance();
		const modalSlideState = instance.modalSlideState.get();
		const selectedTags = instance.selectedTags.get();
		// the first slide is the thread name
		if (modalSlideState === 0 && instance.threadName.get()) {
			return '';
		}

		if (modalSlideState === 1 && selectedTags.coltura) {
			return '';
		}

		if (modalSlideState === 2 && selectedTags.tipo) {
			return '';
		}

		if (modalSlideState === 3 && selectedTags.genere) {
			return '';
		}

		if (modalSlideState === 4 && selectedTags.motivo) {
			return '';
		}

		// the last slide is the reply
		if (modalSlideState === 5 && instance.reply.get()) {
			return '';
		}

		return 'disabled';
	},
	targetChannelText() {
		const instance = Template.instance();
		const parentChannel = instance.parentChannel.get();
		return parentChannel && `${ TAPi18n.__('Thread_target_channel_prefix') } "${ parentChannel }"`;
	},
	createIsDisabled() {
		const instance = Template.instance();
		if (instance.reply.get() && instance.parentChannel.get()) {
			return '';
		}
		return 'disabled';
	},
	parentChannel() {
		const instance = Template.instance();
		return instance.parentChannel.get();
	},
	selectedUsers() {
		const myUsername = Meteor.user().username;
		const { message } = this;
		const users = Template.instance().selectedUsers.get();
		if (message) {
			users.unshift(message.u);
		}
		return users.filter(({ username }) => myUsername !== username);
	},

	onClickTagUser() {
		return Template.instance().onClickTagUser;
	},
	deleteLastItemUser() {
		return Template.instance().deleteLastItemUser;
	},
	onClickTagRoom() {
		return Template.instance().onClickTagRoom;
	},
	deleteLastItemRoom() {
		return Template.instance().deleteLastItemRoom;
	},
	selectedRoom() {
		return Template.instance().selectedRoom.get();
	},
	onSelectRoom() {
		return Template.instance().onSelectRoom;
	},
	roomCollection() {
		return ChatRoom;
	},
	roomSelector() {
		return (expression) => ({ name: { $regex: `.*${ expression }.*` } });
	},
	roomModifier() {
		return (filter, text = '') => {
			const f = filter.get();
			return `#${ f.length === 0 ? text : text.replace(new RegExp(filter.get()), (part) => `<strong>${ part }</strong>`) }`;
		};
	},
	userModifier() {
		return (filter, text = '') => {
			const f = filter.get();
			return `@${ f.length === 0 ? text : text.replace(new RegExp(filter.get()), (part) => `<strong>${ part }</strong>`) }`;
		};
	},
	channelName() {
		return Template.instance().threadName.get();
	},
});

Template.CreateThread.events({
	'input #thread_name'(e, t) {
		t.threadName.set(e.target.value);
	},
	'change .rc-input__radio'(e, t) {
		const selectedTags = _.extend({}, t.selectedTags.get());
		selectedTags[e.target.name] = e.target.value;
		console.log(selectedTags);
		t.selectedTags.set(selectedTags);
	},
	'input #thread_message'(e, t) {
		const { value } = e.target;
		t.reply.set(value);
	},
	'click #next'(e, t) {
		const oldModalSlideState = t.modalSlideState.get();
		if (oldModalSlideState > 4) {
			return false;
		}
		const newModalSlideState = oldModalSlideState + 1;
		t.modalSlideState.set(newModalSlideState);
		// console.log(t.modalSlideState.get());
	},
	'click #prev'(e, t) {
		const oldModalSlideState = t.modalSlideState.get();
		if (oldModalSlideState === 0) {
			return false;
		}
		const newModalSlideState = oldModalSlideState - 1;
		t.modalSlideState.set(newModalSlideState);
		// console.log(t.modalSlideState.get());
	},
	async 'submit #create-thread, click .js-save-thread'(event, instance) {
		event.preventDefault();
		const parentChannel = instance.parentChannel.get();

		const { pmid } = instance;
		const t_name = instance.threadName.get();
		const users = instance.selectedUsers.get().map(({ username }) => username).filter((value, index, self) => self.indexOf(value) === index);
		const tags = instance.selectedTags.get();
		const prid = instance.parentChannelId.get();
		const reply = instance.reply.get();

		if (!prid) {
			const errorText = TAPi18n.__('Invalid_room_name', `${ parentChannel }...`);
			return toastr.error(errorText);
		}
		const result = await call('createThread', { prid, pmid, t_name, reply, users, tags });
		// callback to enable tracking
		callbacks.run('afterCreateThread', Meteor.user(), result);

		if (instance.data.onCreate) {
			instance.data.onCreate(result);
		}

		roomTypes.openRouteLink(result.t, result);
	},
});

Template.CreateThread.onRendered(function() {
	this.find(this.data.rid ? '#thread_name' : '#parentChannel').focus();
});
const suggestName = (name, msg) => [name, msg].filter((e) => e).join(' - ').substr(0, 140);
Template.CreateThread.onCreated(function() {
	const { rid, message: msg } = this.data;

	const parentRoom = rid && ChatSubscription.findOne({ rid });

	// if creating a thread from inside a thread, uses the same channel as parent channel
	const room = parentRoom && parentRoom.prid ? ChatSubscription.findOne({ rid: parentRoom.prid }) : parentRoom;

	if (room) {
		room.text = room.name;
	}

	const roomName = room && roomTypes.getRoomName(room.t, room);
	this.threadName = new ReactiveVar(suggestName(roomName, msg && msg.msg));

	this.pmid = msg && msg._id;

	this.parentChannel = new ReactiveVar(roomName);
	this.parentChannelId = new ReactiveVar(room && room.rid);

	this.selectParent = new ReactiveVar(room && room.rid);

	this.reply = new ReactiveVar('');
	this.modalSlideState = new ReactiveVar(0);

	this.selectedRoom = new ReactiveVar(room ? [room] : []);

	this.selectedTags = new ReactiveVar({
		coltura: '',
		tipo: '',
		genere: '',
		motivo: '',
	});

	this.onClickTagRoom = () => {
		this.selectedRoom.set([]);
	};
	this.deleteLastItemRoom = () => {
		this.selectedRoom.set([]);
	};

	this.onSelectRoom = ({ item: room }) => {
		room.text = room.name;
		this.selectedRoom.set([room]);
	};

	this.autorun(() => {
		const [room = {}] = this.selectedRoom.get();
		this.parentChannel.set(roomTypes.getRoomName(room.t, room)); // determine parent Channel from setting and allow to overwrite
		this.parentChannelId.set(room && (room.rid || room._id));
	});


	this.selectedUsers = new ReactiveVar([]);
	this.onSelectUser = ({ item: user }) => {

		if (user.username === (msg && msg.u.username)) {
			return;
		}

		const users = this.selectedUsers.get();
		if (!users.find((u) => user.username === u.username)) {
			this.selectedUsers.set([...users, user]);
		}
	};
	this.onClickTagUser = (({ username }) => {
		this.selectedUsers.set(this.selectedUsers.get().filter((user) => user.username !== username));
	});
	this.deleteLastItemUser = (() => {
		const arr = this.selectedUsers.get();
		arr.pop();
		this.selectedUsers.set(arr);
	});


	// callback to allow setting a parent Channel or e. g. tracking the event using Piwik or GA
	// const { parentChannel, reply } = callbacks.run('openThreadCreationScreen') || {};

	// if (parentChannel) {
	// 	this.parentChannel.set(parentChannel);
	// }
	// if (reply) {
	// 	this.reply.set(reply);
	// }

	Meteor.call('getRolesAndChannels', true, (error, users) => {
		// get user roles
		const { roles } = Meteor.user();
		// get the first
		const role = roles[0];
		console.log('user roles', roles, role);
		console.log('roles and channels', error, users);

		// find the channell connected to the role
		const userType = _.findWhere(users, { role });
		console.log(userType);

		// get channel by name
		const roomByName = ChatRoom.findOne({ name: userType.channel });
		console.log(roomByName); // roomByName._id

		// set the parent channell
		this.parentChannel.set(roomByName.name);
		this.parentChannelId.set(roomByName._id);
		this.selectParent.set(true);

		// get all the users of a specific room, the true flag means "all users" not only the online ones
		// set them as selected users
		Meteor.call('getUsersOfRoom', roomByName._id, true, (error, users) => {
			console.log('room users', users);
			this.selectedUsers.set(users.records); // maybe this should be this.selectedUsers
		});

		// callback to allow setting a parent Channel or e. g. tracking the event using Piwik or GA
		callbacks.run('openThreadCreationScreen');
	});


});

Template.SearchCreateThread.helpers({
	list() {
		return this.list;
	},
	items() {
		return Template.instance().ac.filteredList();
	},
	config() {
		const { filter } = Template.instance();
		const { noMatchTemplate, templateItem, modifier } = Template.instance().data;
		return {
			filter: filter.get(),
			template_item: templateItem,
			noMatchTemplate,
			modifier(text) {
				return modifier(filter, text);
			},
		};
	},
	autocomplete(key) {
		const instance = Template.instance();
		const param = instance.ac[key];
		return typeof param === 'function' ? param.apply(instance.ac) : param;
	},
});

Template.SearchCreateThread.events({
	'input input'(e, t) {
		const input = e.target;
		const position = input.selectionEnd || input.selectionStart;
		const { length } = input.value;
		document.activeElement === input && e && /input/i.test(e.type) && (input.selectionEnd = position + input.value.length - length);
		t.filter.set(input.value);
	},
	'click .rc-popup-list__item'(e, t) {
		t.ac.onItemClick(this, e);
	},
	'keydown input'(e, t) {
		t.ac.onKeyDown(e);
		if ([8, 46].includes(e.keyCode) && e.target.value === '') {
			const { deleteLastItem } = t;
			return deleteLastItem && deleteLastItem();
		}

	},
	'keyup input'(e, t) {
		t.ac.onKeyUp(e);
	},
	'focus input'(e, t) {
		t.ac.onFocus(e);
	},
	'blur input'(e, t) {
		t.ac.onBlur(e);
	},
	'click .rc-tags__tag'({ target }, t) {
		const { onClickTag } = t;
		return onClickTag & onClickTag(Blaze.getData(target));
	},
});
Template.SearchCreateThread.onRendered(function() {

	const { name } = this.data;

	this.ac.element = this.firstNode.querySelector(`[name=${ name }]`);
	this.ac.$element = $(this.ac.element);
});

Template.SearchCreateThread.onCreated(function() {
	this.filter = new ReactiveVar('');
	this.selected = new ReactiveVar([]);
	this.onClickTag = this.data.onClickTag;
	this.deleteLastItem = this.data.deleteLastItem;

	const { collection, subscription, field, sort, onSelect, selector = (match) => ({ term: match }) } = this.data;
	this.ac = new AutoComplete(
		{
			selector: {
				anchor: '.rc-input__label',
				item: '.rc-popup-list__item',
				container: '.rc-popup-list__list',
			},
			onSelect,
			position: 'fixed',
			limit: 10,
			inputDelay: 300,
			rules: [
				{
					collection,
					subscription,
					field,
					matchAll: true,
					// filter,
					doNotChangeWidth: false,
					selector,
					sort,
				},
			],

		});
	this.ac.tmplInst = this;
});
