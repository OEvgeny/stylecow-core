(function (stylecow) {
	var Collection = function () {};

	Collection.prototype = Object.create(Array.prototype, {
		children: {
			value: function (match) {
				var result = new Collection;

				for (var i = 0, t = this.length; i < t; ++i) {
					if (this[i].is(match)) {
						result.push(this[i]);
					}
				};

				return result;
			}
		},

		firstChild: {
			value: function (match) {
				for (var i = 0, t = this.length; i < t; ++i) {
					if (this[i].is(match)) {
						return this[i];
					}
				};
			}
		},

		hasChild: {
			value: function (match) {
				return this.some(function (child) {
					return child.is(match);
				});
			}
		},

		search: {
			value: function (match, result) {
				result = result || new Collection;

				for (var i = 0, t = this.length; i < t; i++) {
					if (this[i].is(match)) {
						result.push(this[i]);
					}
					
					this[i].search(match, result);
				}

				return result;
			}
		},

		searchFirst: {
			value: function (match) {
				for (var i = 0, t = this.length; i < t; i++) {
					if (this[i].is(match)) {
						return this[i];
					}

					var found = this[i].searchFirst(match);

					if (found) {
						return found;
					}
				}
			}
		},

		has: {
			value: function (match) {
				for (var i = 0, t = this.length; i < t; i++) {
					if (this[i].is(match) || this[i].has(match)) {
						return true;
					}
				}

				return false;
			}
		},

		toArray: {
			value: function () {
				return this.map(function (child) {
					return child.toString();
				});
			}
		}
	});

	stylecow.Base = Object.create(Collection.prototype, {
		executeTasks: {
			value: function (tasks) {
				var k = 0;

				while (this[k]) {
					var child = this[k];

					if (child.executed) {
						++k;
						continue;
					}

					child.executeTasks(tasks);

					k = 0;
				}

				tasks.forEach(function (task) {
					if (!task.filter || this.is(task.filter)) {
						task.fn(this);
					}
				}, this);

				this.executed = true;
			}
		},

		executed: {
			set: function (value) {
				if (!this._data) {
					this._data = {};
				}

				this._data.executed = value;
			},
			get: function () {
				if (!this._data) {
					return false;
				}

				return this._data.executed;
			}
		},

		vendor: {
			set: function (value) {
				this._vendor = value;
			},
			get: function () {
				return this._vendor;
			}
		},

		cleanVendorElements: {
			value: function (vendor) {
				var k = 0;

				while (this[k]) {
					var child = this[k];
					var thisVendor = child.vendor;

					if (thisVendor && vendor && (thisVendor !== vendor)) {
						child.detach();
						continue;
					}

					child.cleanVendorElements(thisVendor || vendor);
					++k;
				}

				return this;
			}
		},

		clone: {
			value: function () {
				var clone = new stylecow[this.type]();
				clone.name = this.name;

				this.forEach(function (child) {
					clone.push(child.clone());
				});

				clone._data = this._data;
				return clone;
			}
		},

		cloneBefore: {
			value: function () {
				var clone = this.clone();
				this.before(clone);
				return clone;
			}
		},

		cloneAfter: {
			value: function () {
				var clone = this.clone();
				this.after(clone);
				return clone;
			}
		},

		set: {
			value: function (name, value) {
				this[name] = value;

				return this;
			}
		},

		is: {
			value: function (match) {
				if (!match) {
					return true;
				}

				if (match instanceof Function) {
					return match.call(this);
				}

				if (Object.prototype.toString.call(match) !== '[object Object]') {
					return equals(this.type, match);
				}

				if (match.type && !equals(this.type, match.type)) {
					return false;
				}

				if (match.name && !equals(this.name, match.name)) {
					return false;
				}

				if (match.vendor && !equals(this.vendor, match.vendor)) {
					return false;
				}

				if (match.string && !equals(this.toString(), match.string)) {
					return false;
				}

				return true;
			}
		},

		parent: {
			value: function (match) {
				if (this._parent) {
					if (!match || this._parent.is(match)) {
						return this._parent;
					}

					return this._parent.parent(match);
				}
			}
		},

		empty: {
			value: function () {
				this.splice(0);

				return this;
			}
		},

		getData: {
			value: function (key) {
				if (this._data && (key in this._data)) {
					return this._data[key];
				}

				if (this._parent) {
					return this._parent.getData(key);
				}
			}
		},

		setData: {
			value: function (key, value) {
				if (!('_data' in this)) {
					this._data = {};
				}

				this._data[key] = value;

				return this;
			}
		},

		index: {
			value: function () {
				if (this._parent) {
					return this._parent.indexOf(this);
				}

				return -1;
			}
		},

		push: {
			value: function () {
				prepareChildren(this, arguments, 0);

				return Array.prototype.push.apply(this, arguments);
			}
		},

		unshift: {
			value: function () {
				prepareChildren(this, arguments, 0);

				return Array.prototype.unshift.apply(this, arguments);
			}
		},

		splice: {
			value: function () {
				if (arguments.length > 2) {
					prepareChildren(this, arguments, 2);
				}

				return Array.prototype.splice.apply(this, arguments);
			}
		},

		next: {
			value: function () {
				var index = this.index();

				if (index !== -1) {
					return this._parent[index + 1];
				}
			}
		},

		prev: {
			value: function () {
				var index = this.index();

				if (index > 0) {
					return this._parent[index - 1];
				}
			}
		},

		before: {
			value: function (child) {
				var index = this.index();

				if (index !== -1) {
					return this._parent.splice(index, 0, child);
				}
			}
		},

		after: {
			value: function (child) {
				var index = this.index();

				if (index !== -1) {
					if (index === this._parent.length) {
						return this._parent.push(child);
					}

					return this._parent.splice(index + 1, 0, child);
				}
			}
		},

		replaceWith: {
			value: function (child) {
				var index = this.index();

				if (index !== -1) {
					var parent = this._parent;
					this.remove();

					return parent.splice(index, 0, child);
				}
			}
		},

		remove: {
			value: function () {
				this.detach();

				this.forEach(function (child) {
					child._parent = null;
					child.remove();
				});

				this.splice(0);

				return this;
			}
		},

		detach: {
			value: function () {
				if (this._parent) {
					var index = this.index();

					if (index !== -1) {
						this._parent.splice(index, 1);
						this._parent = null;
					}
				}

				return this;
			}
		}
	});

	function prepareChildren (parent, children, from) {
		for (var i = children.length - 1; i >= from; i--) {
			if (children[i]._parent) {
				var index = children[i].index();

				if (index !== -1) {
					children[i]._parent.splice(index, 1);
				}
			}

			children[i]._parent = parent;
		};
	}

	function equals (value, needle) {
		if (needle === true) {
			return value ? true : false;
		}

		if (typeof needle === 'string') {
			return (needle === value);
		}

		if (needle instanceof Array) {
			return (needle.indexOf(value) !== -1);
		}

		if (needle instanceof RegExp) {
			return needle.test(value);
		}

		return true;
	}

})(require('../index'));
