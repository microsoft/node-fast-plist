/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';

/**
 * A very fast plist parser
 */
export function parse(content: string): any {
	const len = content.length;

	let i = 0;

	// Skip UTF8 BOM
	if (len > 0 && content.charCodeAt(0) === 65279) {
		i = 1;
	}

	function skipWhitespace(): void {
		while (i < len) {
			let chCode = content.charCodeAt(i);
			if (chCode !== 32 /*<space>*/ && chCode !== 9 /*<tab>*/ && chCode !== 13 /*<CarriageReturn>*/ && chCode !== 10/*<LineFeed>*/) {
				break;
			}
			i++;
		}
	}

	function advanceIfStartsWith(str:string): boolean {
		if (content.substr(i, str.length) === str) {
			i += str.length;
			return true;
		}
		return false;
	}

	function advanceUntil(str:string): void {
		let nextOccurence = content.indexOf(str, i);
		if (nextOccurence !== -1) {
			i = nextOccurence + str.length;
		} else {
			// EOF
			i = len;
		}
	}

	function captureUntil(str:string): string {
		let nextOccurence = content.indexOf(str, i);
		if (nextOccurence !== -1) {
			let r = content.substring(i, nextOccurence);
			i = nextOccurence + str.length;
			return r;
		} else {
			// EOF
			let r = content.substr(i);
			i = len;
			return r;
		}
	}

	const ROOT_STATE = 0;
	const DICT_STATE = 1;
	const ARR_STATE = 2;

	let state = ROOT_STATE;

	let cur:any = null;
	let stateStack:number[] = [];
	let objStack:any[] = [];
	let curKey:string = null;

	function pushState(newState:number, newCur:any): void {
		stateStack.push(state);
		objStack.push(cur);
		state = newState;
		cur = newCur;
	}

	function popState(): void {
		state = stateStack.pop();
		cur = objStack.pop();
	}

	function fail(msg:string): void {
		throw new Error('Near offset ' + i + ': ' + msg + ' ~~~' + content.substr(i, 50) + '~~~');
	}

	const dictState = {
		enterDict: function() {
			if (curKey === null) {
				fail('missing <key>');
			}
			let newDict = {};
			cur[curKey] = newDict;
			curKey = null;
			pushState(DICT_STATE, newDict);
		},
		enterArray: function() {
			if (curKey === null) {
				fail('missing <key>');
			}
			let newArr:any[] = [];
			cur[curKey] = newArr;
			curKey = null;
			pushState(ARR_STATE, newArr);
		}
	};

	const arrState = {
		enterDict: function() {
			let newDict = {};
			cur.push(newDict);
			pushState(DICT_STATE, newDict);
		},
		enterArray: function() {
			let newArr:any[] = [];
			cur.push(newArr);
			pushState(ARR_STATE, newArr);
		}
	};


	function enterDict() {
		if (state === DICT_STATE) {
			dictState.enterDict();
		} else if (state === ARR_STATE) {
			arrState.enterDict();
		} else { // ROOT_STATE
			cur = {};
			pushState(DICT_STATE, cur);
		}
	}
	function leaveDict() {
		if (state === DICT_STATE) {
			popState();
		} else if (state === ARR_STATE) {
			fail('unexpected </dict>');
		} else { // ROOT_STATE
			fail('unexpected </dict>');
		}
	}
	function enterArray() {
		if (state === DICT_STATE) {
			dictState.enterArray();
		} else if (state === ARR_STATE) {
			arrState.enterArray();
		} else { // ROOT_STATE
			cur = [];
			pushState(ARR_STATE, cur);
		}
	}
	function leaveArray() {
		if (state === DICT_STATE) {
			fail('unexpected </array>');
		} else if (state === ARR_STATE) {
			popState();
		} else { // ROOT_STATE
			fail('unexpected </array>');
		}
	}
	function acceptKey(val:string) {
		if (state === DICT_STATE) {
			if (curKey !== null) {
				fail('too many <key>');
			}
			curKey = val;
		} else if (state === ARR_STATE) {
			fail('unexpected <key>');
		} else { // ROOT_STATE
			fail('unexpected <key>');
		}
	}
	function acceptString(val:string) {
		if (state === DICT_STATE) {
			if (curKey === null) {
				fail('missing <key>');
			}
			cur[curKey] = val;
			curKey = null;
		} else if (state === ARR_STATE) {
			cur.push(val);
		} else { // ROOT_STATE
			cur = val;
		}
	}
	function acceptReal(val:number) {
		if (isNaN(val)) {
			fail('cannot parse float');
		}
		if (state === DICT_STATE) {
			if (curKey === null) {
				fail('missing <key>');
			}
			cur[curKey] = val;
			curKey = null;
		} else if (state === ARR_STATE) {
			cur.push(val);
		} else { // ROOT_STATE
			cur = val;
		}
	}
	function acceptInteger(val:number) {
		if (isNaN(val)) {
			fail('cannot parse integer');
		}
		if (state === DICT_STATE) {
			if (curKey === null) {
				fail('missing <key>');
			}
			cur[curKey] = val;
			curKey = null;
		} else if (state === ARR_STATE) {
			cur.push(val);
		} else { // ROOT_STATE
			cur = val;
		}
	}
	function acceptDate(val:Date) {
		if (state === DICT_STATE) {
			if (curKey === null) {
				fail('missing <key>');
			}
			cur[curKey] = val;
			curKey = null;
		} else if (state === ARR_STATE) {
			cur.push(val);
		} else { // ROOT_STATE
			cur = val;
		}
	}
	function acceptData(val:string) {
		if (state === DICT_STATE) {
			if (curKey === null) {
				fail('missing <key>');
			}
			cur[curKey] = val;
			curKey = null;
		} else if (state === ARR_STATE) {
			cur.push(val);
		} else { // ROOT_STATE
			cur = val;
		}
	}
	function acceptBool(val:boolean) {
		if (state === DICT_STATE) {
			if (curKey === null) {
				fail('missing <key>');
			}
			cur[curKey] = val;
			curKey = null;
		} else if (state === ARR_STATE) {
			cur.push(val);
		} else { // ROOT_STATE
			cur = val;
		}
	}

	function escapeVal(str:string): string {
		return str.replace(/&#([0-9]+);/g, function(_:string, m0:string) {
			return (<any>String).fromCodePoint(parseInt(m0, 10));
		}).replace(/&#x([0-9a-f]+);/g, function(_:string, m0:string) {
			return (<any>String).fromCodePoint(parseInt(m0, 16));
		}).replace(/&amp;|&lt;|&gt;|&quot;|&apos;/g, function(_:string) {
			switch (_) {
				case '&amp;': return '&';
				case '&lt;': return '<';
				case '&gt;': return '>';
				case '&quot;': return '"';
				case '&apos;': return '\'';
			}
			return _;
		})
	}

	interface IParsedTag {
		name: string;
		isClosed: boolean;
	}

	function parseOpenTag(): IParsedTag {
		let r = captureUntil('>');
		let isClosed = false;
		if (r.charCodeAt(r.length - 1) === 47 /*/*/) {
			isClosed = true;
			r = r.substring(0, r.length - 1);
		}

		return {
			name: r.trim(),
			isClosed: isClosed
		};
	}

	function parseTagValue(tag:IParsedTag): string {
		if (tag.isClosed) {
			return '';
		}
		let val = captureUntil('</');
		advanceUntil('>');
		return escapeVal(val);
	}

	while (i < len) {
		skipWhitespace();
		if (i >= len) {
			break;
		}

		const chCode = content.charCodeAt(i++);
		if (chCode !== 60 /*<*/) {
			fail('expected <');
		}

		if (i >= len) {
			fail('unexpected end of input');
		}

		const peekChCode = content.charCodeAt(i);

		if (peekChCode === 63 /*?*/) {
			i++;
			advanceUntil('?>');
			continue;
		}

		if (peekChCode === 33 /*!*/) {
			i++;

			if (advanceIfStartsWith('--')) {
				advanceUntil('-->');
				continue;
			}

			advanceUntil('>');
			continue;
		}

		if (peekChCode === 47 /*/*/) {
			i++;
			skipWhitespace();

			if (advanceIfStartsWith('plist')) {
				advanceUntil('>');
				continue;
			}

			if (advanceIfStartsWith('dict')) {
				advanceUntil('>');
				leaveDict();
				continue;
			}

			if (advanceIfStartsWith('array')) {
				advanceUntil('>');
				leaveArray();
				continue;
			}

			fail('unexpected closed tag');
		}

		let tag = parseOpenTag();

		switch (tag.name) {
			case 'dict':
				enterDict();
				if (tag.isClosed) {
					leaveDict();
				}
				continue;

			case 'array':
				enterArray();
				if (tag.isClosed) {
					leaveArray();
				}
				continue;

			case 'key':
				acceptKey(parseTagValue(tag));
				continue;

			case 'string':
				acceptString(parseTagValue(tag));
				continue;

			case 'real':
				acceptReal(parseFloat(parseTagValue(tag)));
				continue;

			case 'integer':
				acceptInteger(parseInt(parseTagValue(tag), 10));
				continue;

			case 'date':
				acceptDate(new Date(parseTagValue(tag)));
				continue;

			case 'data':
				acceptData(parseTagValue(tag));
				continue;

			case 'true':
				parseTagValue(tag);
				acceptBool(true);
				continue;

			case 'false':
				parseTagValue(tag);
				acceptBool(false);
				continue;
		}

		if (/^plist/.test(tag.name)) {
			continue;
		}

		fail('unexpected opened tag ' + tag.name);
	}

	return cur;
}
