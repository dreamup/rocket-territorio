import { Meteor } from 'meteor/meteor';

import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { AutoComplete } from 'meteor/mizzao:autocomplete';
import { Blaze } from 'meteor/blaze';
import _ from 'underscore';

import { TAPi18n } from 'meteor/tap:i18n';
import toastr from 'toastr';

import { call } from '../../../../ui-utils';
import { roomTypes } from '../../../../utils/client';
import { callbacks } from '../../../../callbacks/client';
import { ChatRoom, ChatSubscription } from '../../../../models/client';

import './CreateDiscussion.html';

Template.CreateDiscussion.helpers({
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
			coltura: ['vite', 'olivo', 'cereali'],
			// tipo: ['campo', 'trasformazione', 'cert bio', 'altro'],
			genere: ['Agronomico', 'Fitosanitario'],
			// motivo: ['parassita', 'patogeno', 'qualità'],
		};
	},
	extendedInformations() {
		const selectedTags = Template.instance().selectedTags.get();
		const isViteOn = selectedTags.coltura.toLowerCase() === 'vite';
		const isFitosanitarioOn = selectedTags.genere.toLowerCase() === 'fitosanitario';
		const index = Template.instance().modalSlideState.get();
		if (index === 1 && isViteOn) {
			return [
				{ i18n: 'Discussion_extended_info_eta', name: 'eta', values: ['0-5', '6-15', '> 15'] },
				{ i18n: 'Discussion_extended_info_varieta', name: 'varieta', values: ['cabernet sauvignon ', 'merlot', 'carmenere', 'moscati', 'chardonnay', 'pinot', 'glera', 'altro'] },
				{ i18n: 'Discussion_extended_info_allevamento', name: 'allevamento', values: ['cordone speronato', 'guyot', 'sylvoz', 'capovolto', 'altro'] },
				{ i18n: 'Discussion_extended_info_posizione', name: 'posizione', values: ['collina', 'pianura'] },
				{ i18n: 'Discussion_extended_info_esposizione', name: 'esposizione', values: ['nord', 'sud', 'ovest', 'est'] },
			];
		}
		if (index === 2 && isFitosanitarioOn) {
			return [
				{
					i18n: 'Discussion_extended_info_tipoFitosanitario',
					name: 'tipoFitosanitario',
					values: ['Funghi', 'Insetti', 'Acari', 'Altro'],
				},
			];
		}
	},
	needExtendedInfos() {
		const selectedTags = Template.instance().selectedTags.get();
		const isViteOn = selectedTags.coltura.toLowerCase() === 'vite';
		const isFitosanitarioOn = selectedTags.genere.toLowerCase() === 'fitosanitario';

		if (!isViteOn && !isFitosanitarioOn) {
			return false;
		}

		return isViteOn ? 'vite' : 'fitosanitario';
	},
	isSlide0() {
		return Template.instance().modalSlideState.get() === 0;
	},
	// coltura
	isSlide1() {
		return Template.instance().modalSlideState.get() === 1;
	},
	// genere
	isSlide2() {
		return Template.instance().modalSlideState.get() === 2;
	},
	isLastSlide() {
		return Template.instance().modalSlideState.get() === 3;
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
			if (selectedTags.coltura !== 'vite') {
				return '';
			}
			if (selectedTags.eta &&
				selectedTags.varieta &&
				selectedTags.allevamento &&
				selectedTags.posizione &&
				selectedTags.esposizione) {
				return '';
			}
			return 'disabled';
		}

		if (modalSlideState === 2 && selectedTags.genere) {
			if (selectedTags.genere.toLowerCase() !== 'fitosanitario') {
				return '';
			}
			return (selectedTags.tipoFitosanitario ? '' : 'disabled');
		}

		// the last slide is the reply
		if (modalSlideState === 3 && instance.reply.get()) {
			return '';
		}

		return 'disabled';
	},
	targetChannelText() {
		const instance = Template.instance();
		const parentChannel = instance.parentChannel.get();
		return parentChannel && `${ TAPi18n.__('Discussion_target_channel_prefix') } "${ parentChannel }"`;
	},
	createIsDisabled() {
		const { parentChannel, discussionName } = Template.instance();
		return parentChannel.get() && discussionName.get() ? '' : 'disabled';
	},
	parentChannel() {
		const instance = Template.instance();
		return instance.parentChannel.get();
	},
	selectedUsers() {
		const myUsername = Meteor.user().username;
		const { message } = this;
		const users = Template.instance().selectedUsers.get().map((e) => e);
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
		return Template.instance().discussionName.get();
	},
});

Template.CreateDiscussion.events({
	'input #discussion_name'(e, t) {
		t.discussionName.set(e.target.value);
	},
	'change .rc-input__radio'(e, t) {
		const selectedTags = _.extend({}, t.selectedTags.get());
		selectedTags[e.target.name] = e.target.value.toLowerCase();
		console.log(selectedTags);

		if (selectedTags.coltura.toLowerCase() !== 'vite') {
			delete selectedTags.eta;
			delete selectedTags.varieta;
			delete selectedTags.allevamento;
			delete selectedTags.posizione;
			delete selectedTags.esposizione;
		}

		if (selectedTags.genere.toLowerCase() !== 'fitosanitario') {
			delete selectedTags.tipoFitosanitario;
		}

		t.selectedTags.set(selectedTags);
	},
	'input #discussion_message'(e, t) {
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
	async 'submit #create-discussion, click .js-save-discussion'(event, instance) {
		event.preventDefault();
		const parentChannel = instance.parentChannel.get();

		const { pmid } = instance;
		const t_name = instance.discussionName.get();
		const users = instance.selectedUsers.get().map(({ username }) => username).filter((value, index, self) => self.indexOf(value) === index);
		const tags = instance.selectedTags.get();
		const prid = instance.parentChannelId.get();
		const reply = instance.reply.get();

		if (!prid) {
			const errorText = TAPi18n.__('Invalid_room_name', `${ parentChannel }...`);
			return toastr.error(errorText);
		}
		const result = await call('createDiscussion', { prid, pmid, t_name, reply, users, tags });
		// callback to enable tracking
		callbacks.run('afterDiscussion', Meteor.user(), result);

		if (instance.data.onCreate) {
			instance.data.onCreate(result);
		}

		roomTypes.openRouteLink(result.t, result);
	},
});

Template.CreateDiscussion.onRendered(function() {
	this.find(this.data.rid ? '#discussion_name' : '#parentChannel').focus();
});

const suggestName = (name, msg) => [name, msg].filter((e) => e).join(' - ').substr(0, 140);

Template.CreateDiscussion.onCreated(function() {
	const { rid, message: msg } = this.data;

	const parentRoom = rid && ChatSubscription.findOne({ rid });

	// if creating a discussion from inside a discussion, uses the same channel as parent channel
	const room = parentRoom && parentRoom.prid ? ChatSubscription.findOne({ rid: parentRoom.prid }) : parentRoom;

	if (room) {
		room.text = room.name;
	}

	const roomName = room && roomTypes.getRoomName(room.t, room);
	this.discussionName = new ReactiveVar(suggestName(roomName, msg && msg.msg));

	this.pmid = msg && msg._id;

	this.parentChannel = new ReactiveVar(roomName);
	this.parentChannelId = new ReactiveVar(room && room.rid);

	this.selectParent = new ReactiveVar(room && room.rid);

	this.reply = new ReactiveVar('');
	this.modalSlideState = new ReactiveVar(0);

	this.selectedRoom = new ReactiveVar(room ? [room] : []);

	this.selectedTags = new ReactiveVar({
		coltura: '',
		genere: '',
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

		if (user.username === Meteor.user().username) {
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
		// console.log('user roles', roles, role);
		// console.log('roles and channels', error, users);

		// find the channell connected to the role
		const userType = _.findWhere(users, { role });
		console.log('user type', userType);

		// get channel by name
		const roomByName = ChatRoom.findOne({ name: userType.channel });
		console.log('room by name:', roomByName); // roomByName._id

		// set the parent channell
		this.parentChannel.set(roomByName.name);
		this.parentChannelId.set(roomByName._id);
		this.selectParent.set(true);

		// get all the users of a specific room, the true flag means "all users" not only the online ones
		// set them as selected users
		Meteor.call('getUsersOfRoom', roomByName._id, true, (error, roomUsers) => {
			const userId = Meteor.userId();
			const usersToInsert = [];
			for (let i = 0; i < roomUsers.records.length; i++) {
				const user = roomUsers.records[i];
				// se l'utente e' un euganei o un biovenezie e non e' il creatore, skippa
				if ((user.roles.includes('euganei') || user.roles.includes('biovenezie')) && user._id !== userId) {
					continue;
				}
				usersToInsert.push(user);
			}
			console.log('room users', roomUsers, 'users to insert', usersToInsert);
			// setta gli utenti su usersToInsert
			this.selectedUsers.set(usersToInsert);
		});

		// callback to allow setting a parent Channel or e. g. tracking the event using Piwik or GA
		callbacks.run('openThreadCreationScreen');
	});


});

Template.SetTag.helpers({
	isFieldChecked(field, value, selected) {
		// console.log(selected);
		// const selectedTags = Template.instance().selectedTags.get();
		return selected[field] === String(value);
	},
});

Template.SearchCreateDiscussion.helpers({
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

Template.SearchCreateDiscussion.events({
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
Template.SearchCreateDiscussion.onRendered(function() {

	const { name } = this.data;

	this.ac.element = this.firstNode.querySelector(`[name=${ name }]`);
	this.ac.$element = $(this.ac.element);
});

Template.SearchCreateDiscussion.onCreated(function() {
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
