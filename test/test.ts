/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';

import {parse} from '../src/main';
import * as fs from 'fs';
import * as path from 'path';
import * as assert from 'assert';
import * as sax from 'sax';

const FIXTURES_FOLDER_PATH = path.join(__dirname, '../../test/fixtures');

describe('parse', () => {
	let fixtures = fs.readdirSync(FIXTURES_FOLDER_PATH);

	fixtures.forEach((fixture) => {
		it('should work for ' + fixture, () => {
			let contents = fs.readFileSync(path.join(FIXTURES_FOLDER_PATH, fixture)).toString();

			let expected = parseWithSAX(contents).value;
			let actual = parse(contents);

			assert.deepEqual(actual, expected);
		});
	});
});

describe('parse', () => {

	let header = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
		'<plist version="1.0">'
	];

	let footer = [
		'</plist>'
	];

	function _assertParse(str:string, expected:any): void {
		let actual = parse(str);
		assert.deepEqual(actual, expected);
	}

	function assertParse(lines:string[], expected:any): void {
		_assertParse(header.concat(lines).concat(footer).join('\n'), expected);
	}

	function _assertThrows(str:string): void {
		try {
			parse(str);
			assert.ok(false, 'throws');
		} catch(err) {
			assert.ok(true, 'throws');
		}
	}

	function assertThrows(lines:string[]): void {
		_assertThrows(header.concat(lines).concat(footer).join('\n'));
	}

	it('invalid', function() {
		// not a tag
		assertThrows([
			'bar'
		]);

		// unclosed tag 1
		_assertThrows('<');

		// unclosed tag 2
		_assertThrows('<?');

		// unclosed tag 3
		_assertThrows('<string>Hello world');

		// unexpected closed tag 1
		assertThrows([
			'</dict>'
		]);

		// unexpected closed tag 2
		assertThrows([
			'</array>'
		]);

		// unexpected closed tag 3
		assertThrows([
			'</string>'
		]);

		// unexpected tag
		assertThrows([
			'<bar></bar>'
		]);

		// missing key
		assertThrows([
			'<dict>',
				'<dict>',
				'</dict>',
			'</dict>'
		]);

		// missing key
		assertThrows([
			'<dict>',
				'<array>',
				'</array>',
			'</dict>'
		]);

		// missing key
		assertThrows([
			'<dict>',
				'<string>bar</string>',
			'</dict>'
		]);

		// missing key
		assertThrows([
			'<dict>',
				'<integer>1</integer>',
			'</dict>'
		]);

		// missing key
		assertThrows([
			'<dict>',
				'<real>1.2</real>',
			'</dict>'
		]);

		// missing key
		assertThrows([
			'<dict>',
				'<date>2016-08-18</date>',
			'</dict>'
		]);

		// missing key
		assertThrows([
			'<dict>',
				'<true/>',
			'</dict>'
		]);

		// two keys
		assertThrows([
			'<dict>',
				'<key>bar</key>',
				'<key>bar</key>',
			'</dict>'
		]);

		// key not allowed outside dict
		assertThrows([
			'<array>',
				'<key>bar</key>',
			'</array>'
		]);

		// key not allowed outside dict
		assertThrows([
			'<key>bar</key>',
		]);

		// wrong close tag 1
		assertThrows([
			'<array></dict>',
		]);

		// wrong close tag 2
		assertThrows([
			'<dict></array>',
		]);
	});


	it('String', function() {
		assertParse(
			[
				'<string>foo</string>'
			],
			"foo"
		);

		assertParse(
			[
				'<string></string>'
			],
			""
		);

		assertParse(
			[
				'<string>',
				'</string>'
			],
			"\n"
		);

		assertParse(
			[
				'<string>&lt;foo&gt;</string>'
			],
			"<foo>"
		);

		assertParse(
			[
				'<string>&quot;&apos;</string>'
			],
			"\"'"
		);

		assertParse(
			[
				'<string>&unknown;</string>'
			],
			"&unknown;"
		);

		assertParse(
			[
				'<string>Ol&#225;</string>'
			],
			"Olá"
		);
	});


	it('Numbers', function() {
		assertParse(
			[
				'<integer>0</integer>'
			],
			0
		);

		assertParse(
			[
				'<real>1.123</real>'
			],
			1.123
		);

		assertThrows(
			[
				'<integer>ab</integer>'
			]
		);

		assertThrows(
			[
				'<real>ab</real>'
			]
		);
	});


	it('Booleans', function() {
		assertParse(
			[
				'<true />'
			],
			true
		);

		assertParse(
			[
				'<false />'
			],
			false
		);

		assertParse(
			[
				'<false></false>'
			],
			false
		);
	});


	it('Dictionaries', function() {

		// empty
		assertParse(
			[
				'<dict>',
				'</dict>'
			],
			{}
		);

		// keys and nesting
		assertParse(
			[
				'<dict>',
					'<key>name</key>',
					'<string>Variable</string>',
					'<key>scope</key>',
					'<string>variable</string>',
					'<key>settings</key>',
					'<dict>',
						'<key>fontStyle</key>',
						'<string></string>',
						'<key>fontSize</key>',
						'<real>2.3</real>',
						'<key>date</key>',
						'<date>2016-08-18</date>',
					'</dict>',
				'</dict>'
			],
			{
				name: "Variable",
				scope: "variable",
				settings: {
					fontStyle: "",
					fontSize: 2.3,
					date: new Date('2016-08-18')
				}
			}
		);
	});


	it('Arrays', function() {

		// empty
		assertParse(
			[
				'<array>',
				'</array>'
			],
			[]
		);

		// multiple elements
		assertParse(
			[
				'<array>',
					'<string>1</string>',
					'<string>2</string>',
				'</array>'
			],
			[ "1", "2" ]
		);

		// nesting
		assertParse(
			[
				'<array>',
					'<array>',
						'<integer>1</integer>',
						'<integer>2</integer>',
						'<real>2.3</real>',
						'<date>2016-08-18</date>',
					'</array>',
					'<array>',
						'<true />',
					'</array>',
				'</array>'
			],
			[ [ 1, 2, 2.3, new Date('2016-08-18') ], [ true ]]
		);
	});


	it('Dates', () => {
		// https://en.wikipedia.org/wiki/ISO_8601
		assertParse(
			[
				'<date>2016-08-18</date>'
			],
			new Date('2016-08-18')
		);
		assertParse(
			[
				'<date>2016-08-18T07:05:03+00:00</date>'
			],
			new Date('2016-08-18T07:05:03+00:00')
		);
		assertParse(
			[
				'<date>2016-08-18T07:05:03Z</date>'
			],
			new Date('2016-08-18T07:05:03Z')
		);
	});
});

/**
 * Parse a PLIST file using `sax`.
 */
function parseWithSAX(content: string): { value: any; errors: string[]; } {

	interface PListObject {
		parent: PListObject|null;
		value: any;
		lastKey?: string|null;
	}

	let errors : string[] = [];
	let currObject : PListObject|null = null;
	let result : any = null;

	let text: string = '';

	let parser = sax.parser(false, { lowercase: true });
	parser.onerror = (e:any) => {
		errors.push(e.message);
	};
	parser.ontext = (s: string) => {
		text = s;
	};
	parser.onopentag = (tag: sax.Tag) => {
		switch (tag.name) {
			case 'dict':
				currObject = { parent: currObject, value: {} };
				break;
			case 'array':
				currObject = { parent: currObject, value: [] };
				break;
			case 'key':
				if (currObject) {
					currObject.lastKey = null;
				}
				break;
		}
		text = '';
	}

	parser.onclosetag = (tagName:  string) => {
		let value: any;
		switch (tagName) {
			case 'key':
				if (!currObject || Array.isArray(currObject.value)) {
					errors.push('key can only be used inside an open dict element');
					return;
				}
				currObject.lastKey = text;
				return;
			case 'dict':
			case 'array':
				if (!currObject) {
					errors.push(tagName + ' closing tag found, without opening tag');
					return;
				}
				value = currObject.value;
				currObject = currObject.parent;
				break;
			case 'string':
			case 'data':
				value = text;
				break;
			case 'date':
				value = new Date(text);
				break;
			case 'integer':
				value = parseInt(text);
				if (isNaN(value)) {
					errors.push(text + ' is not a integer');
					return;
				}
				break;
			case 'real':
				value = parseFloat(text);
				if (isNaN(value)) {
					errors.push(text + ' is not a float');
					return;
				}
				break;
			case 'true':
				value = true;
				break;
			case 'false':
				value = false;
				break;
			case 'plist':
				return;
			default:
				errors.push('Invalid tag name: ' + tagName);
				return;

		}
		if (!currObject) {
			result = value;
		} else if (Array.isArray(currObject.value)) {
			currObject.value.push(value);
		} else {
			if (currObject.lastKey) {
				currObject.value[currObject.lastKey] = value;
			} else {
				errors.push('Dictionary key missing for value ' + value);
			}
		}
	};
	parser.write(content);

	return { errors: errors, value: result };
}
